const CONFIG = {
    GRID_X: 80,
    START_X: 100,
    LINE_SPACING: 100,
    STAGE_H: 500,
    SCROLL_SIZE: 10,
    COLORS: {
        TRACK: '#444',
        TEXT: '#1c1c1c',
        CONNECTOR: '#0078d4',
        LABEL: '#4b5b5b',
        CONTROL_W: 'white',
        CONTROL_B: '#1a1a1a',
    }
};

let qCanvas;
let currentBestCircuit;
let epoch = 50;


function clearCanvas() { qCanvas.clearCanvas(); }

window.onload = () => {
    qCanvas = new QuantumCanvas('canvas-container');
    qCanvas.updateQubits();
};

class QuantumCanvas {
    constructor(containerId) {
        this.containerId = containerId; // 紀錄html中的id
        this.stage = null; // Konva最高層級物件
        // 圖層堆疊
        this.layers = {
            line: new Konva.Layer(),    // 水平軌道線
            conn: new Konva.Layer(),    // 元件連接線
            main: new Konva.Layer(),    // 元件放置層
            loading: new Konva.Layer(), // 載入動畫
            scroll: new Konva.Layer()   // 捲軸層
        };

        this.lineY = [];    // 儲存每條軌道的Y座標
        this.dragType = ''; // 紀錄正在拖曳的元件類型
        
        this.init();
    }

    init() {
        // 找尋html中是否有對應的容器
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // 建立最高層級的Konva物件並設置大小
        this.stage = new Konva.Stage({
            container: this.containerId,
            width: window.innerWidth - 75,
            height: CONFIG.STAGE_H
        });

        // 加入所有圖層
        Object.values(this.layers).forEach(layer => this.stage.add(layer));

        // this.bindEvents(); // 綁定事件(可新增拖放元件事件)
        this.initScrollbars(); // 初始化捲軸
        this.createLoadingUI();
    }


    // ------ 初始化捲軸 ------
    initScrollbars() {
        const { width: STAGE_W, height: STAGE_H } = this.stage.size();

        this.hScroll = this.createScrollRect(50, STAGE_H - 15, 
                                            STAGE_W - 100, CONFIG.SCROLL_SIZE, 
                                            true);
        this.vScroll = this.createScrollRect(STAGE_W - 15, 50, 
                                            CONFIG.SCROLL_SIZE, STAGE_H - 100, 
                                            false);
        
        this.layers.scroll.add(this.hScroll.track, this.hScroll.bar, this.vScroll.track, this.vScroll.bar);
    }

    createScrollRect(x, y, w, h, isHorizontal) {
        const track = new Konva.Rect({ x, y, width: w, height: h, fill: '#333', cornerRadius: 5, opacity: 0.5, visible: false });
        const bar = new Konva.Rect({
            x, y, width: isHorizontal ? 100 : w, height: isHorizontal ? h : 100,
            fill: '#888', cornerRadius: 5, draggable: true, visible: false,
            dragBoundFunc: (pos) => {
                if (isHorizontal) {
                    const minX = x, maxX = x + w - bar.width();
                    return { x: Math.max(minX, Math.min(pos.x, maxX)), y: bar.absolutePosition().y };
                } else {
                    const minY = y, maxY = y + h - bar.height();
                    return { x: bar.absolutePosition().x, y: Math.max(minY, Math.min(pos.y, maxY)) };
                }
            }
        });

        bar.on('dragmove', () => this.syncScroll());
        return { track, bar };
    }

    
    updateScrollbarVisual() {
        const STAGE_W = this.stage.width(), STAGE_H = this.stage.height();
        const vW = this.getVirtualWidth(), vH = this.getVirtualHeight();

        const updateBar = (bar, track, virtual, stage, isHorizontal) => {
            const need = virtual > stage + 10;
            if (isHorizontal) bar.width(Math.max(30, track.width() * (stage / virtual)));
            else bar.height(Math.max(30, track.height() * (stage / virtual)));
            bar.visible(need);
            track.visible(need);
        };

        updateBar(this.hScroll.bar, this.hScroll.track, vW, STAGE_W, true);
        updateBar(this.vScroll.bar, this.vScroll.track, vH, STAGE_H, false);
        this.layers.scroll.draw();
    }
    // ------------------------------------

    // ------ 渲染功能 ------
    clearCanvas() {
        this.layers.main.destroyChildren();
        this.layers.conn.destroyChildren();
        ['main', 'conn', 'line'].forEach(k => this.layers[k].position({x: 0, y: 0}));
        this.hScroll.bar.x(50);
        this.vScroll.bar.y(50);
        this.stage.draw();
    }

    renderAll() {
        this.drawTracks();
        this.renderConnectors();
        this.renderLabels();
        this.updateScrollbarVisual();
        this.stage.batchDraw();
    }

    drawTracks() {
        this.layers.line.destroyChildren();
        const fullWidth = Math.max(this.stage.width(), this.getVirtualWidth());

        this.lineY.forEach((y, i) => {
            // 繪製橫線
            this.layers.line.add(new Konva.Line({
                points: [50, y, fullWidth, y],
                stroke: CONFIG.COLORS.TRACK,
                strokeWidth: 2
            }));
            // 繪製標籤 Q0, Q1...
            this.layers.line.add(new Konva.Text({
                x: 15, y: y-10,
                text: `Q${i}`,
                fill: CONFIG.COLORS.TEXT,
                fontSize: 16
            }));
        });
    }

    renderConnectors() {
        this.layers.conn.destroyChildren();
        const groups = {};

        this.layers.main.getChildren().forEach(gate => {
            const x = Math.round(gate.x());
            if (!groups[x]) groups[x] = [];
            groups[x].push(gate.y());
        });

        for (let x in groups) {
            if (groups[x].length > 1) {
                this.layers.conn.add(new Konva.Line({
                    points: [parseInt(x), Math.min(...groups[x]), parseInt(x), Math.max(...groups[x])],
                    stroke: CONFIG.COLORS.CONNECTOR, strokeWidth: 2
                }));
            }
        }
    }

    renderLabels() {
        const xPositions = [...new Set(this.layers.main.getChildren().map(g => Math.round(g.x())))].sort((a, b) => a - b);
        xPositions.forEach((x, index) => {
            this.layers.conn.add(new Konva.Text({
                x: x - 20, y: this.lineY[0] - 50,
                text: `Gate ${index + 1}`,
                fontSize: 13, fontStyle: 'bold', fill: CONFIG.COLORS.LABEL, listening: false
            }));
        });
    }

    // 建立 Loading 介面（半透明遮罩 + 文字）
    createLoadingUI() {
        const stage = this.stage;
        const barWidth = 300; // 進度條總寬度
        const barHeight = 20;
        const centerX = stage.width() / 2 - barWidth / 2;
        const centerY = stage.height() / 2 + 30; // 放在文字下方

        // 半透明背景遮罩
        this.loadingRect = new Konva.Rect({
            x: 0, y: 0, width: stage.width(), height: stage.height(),
            fill: 'black', opacity: 0.4, visible: false
        });

        // 提示文字
        this.loadingText = new Konva.Text({
            x: stage.width() / 2 - 150, y: stage.height() / 2 - 40,
            text: '準備開始迭代...', fontSize: 20, fontStyle: 'bold',
            fill: 'white', align: 'center', width: 300, visible: false
        });

        // 進度條背景
        this.progressBarBg = new Konva.Rect({
            x: centerX, y: centerY, width: barWidth, height: barHeight,
            fill: '#333', stroke: '#555', strokeWidth: 2, cornerRadius: 5, visible: false
        });

        // 進度條填充
        this.progressBarFill = new Konva.Rect({
            x: centerX, y: centerY, width: 0, height: barHeight,
            fill: '#4caf50', cornerRadius: 5, visible: false
        });

        this.layers.loading.add(this.loadingRect, this.loadingText, this.progressBarBg, this.progressBarFill);
    }
    // ------------------------------------

    // ------ 核心邏輯 ------
    updateQubits() {
        const qubitInput = document.getElementById('qubitCount');
        const numQubits = parseInt(qubitInput?.value || 3);

        this.lineY = Array.from({ length: numQubits }, (_, i) => 120 + i * CONFIG.LINE_SPACING);
        
        this.clearCanvas(); // 清除畫布
        this.renderAll(); // 渲染
    }
    
    // 顯示/隱藏迭代提示圖層
    toggleLoading(show, message = '') {
        const elements = [this.loadingRect, this.loadingText, this.progressBarBg, this.progressBarFill];
        elements.forEach(el => el.visible(show));
        if (show && message) this.loadingText.text(message);
        if (!show) this.progressBarFill.width(0); // 關閉時重置進度
        this.layers.loading.batchDraw();
    }

    // 更新進度條的方法
    updateProgress(current, total) {
        const fullWidth = this.progressBarBg.width();
        const progressWidth = (current / total) * fullWidth;
        this.progressBarFill.width(progressWidth);
        this.layers.loading.batchDraw();
    }

    addGate(x, y, type) {
        let gate;
        if (type === 'target') {
            gate = this.createTargetGate(x, y);
        } else {
            gate = this.createControlGate(x, y, type);
        }
        // 不再需要 gate.on('dragend', ...)
        this.layers.main.add(gate);
    }

    // 解析 [[1,1,3], ...] 並畫出電路 (不變)
    drawCircuit(circuit) {
        if (!circuit || circuit.length === 0) return;

        this.clearCanvas(); 

        circuit.forEach((columnData, colIndex) => {
            const x = CONFIG.START_X + colIndex * CONFIG.GRID_X;
            columnData.forEach((value, rowIndex) => {
                const y = this.lineY[rowIndex];
                if (value === 3) {
                    this.addGate(x, y, 'target');
                } else if (value === 1) {
                    this.addGate(x, y, 'control-1');
                } else if (value === 0) {
                    this.addGate(x, y, 'control-w');
                }
            });
        });

        this.renderAll(); // 渲染連接線與標籤
    }
    // ------------------------------------

    // ------ 元件創建方法 ------
    createTargetGate(x, y) {
        const group = new Konva.Group({ x, y, draggable: false });
        group.add(new Konva.Circle({ radius: 16, fill: 'white', stroke: 'white', strokeWidth: 3 }));
        group.add(new Konva.Circle({ radius: 13, fill: 'white', stroke: 'black', strokeWidth: 1 }));
        group.add(new Konva.Line({ points: [-15, 0, 15, 0], stroke: 'black', strokeWidth: 2 }));
        group.add(new Konva.Line({ points: [0, -15, 0, 15], stroke: 'black', strokeWidth: 2 }));
        return group;
    }

    createControlGate(x, y, type) {
        return new Konva.Circle({
            x, y, radius: 8,
            fill: type === 'control-1' ? CONFIG.COLORS.CONTROL_B : CONFIG.COLORS.CONTROL_W,
            stroke: 'black', strokeWidth: 2, draggable: false
        });
    } 
    //draggable 能改變元件是否可拖曳
    // ------------------------------------

    // ------ 工具方法 ------
    getVirtualWidth() {
        let maxX = this.stage ? this.stage.width() : 800;
        this.layers.main.getChildren().forEach(g => { if (g.x() + 150 > maxX) maxX = g.x() + 150; });
        return maxX;
    }

    getVirtualHeight() {
        return (this.lineY.length === 0) ? this.stage.height() : this.lineY[this.lineY.length - 1] + 150;
    }
    // ------------------------------------
}

async function turnToPy() {
    const problemInputStr = document.getElementById('problemInput').value;
    const wantOutputStr = document.getElementById('wantOutput').value;

    qCanvas.toggleLoading(true, "連線中...");

    try {
        const pInput = JSON.parse(problemInputStr);
        const wOutput = JSON.parse(wantOutputStr);

        // 發送請求
        const response = await fetch('http://127.0.0.1:5000/api/run-algorithm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problemInput: pInput, wantOutput: wOutput })
        });

        // 取得讀取器
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 進入監聽狀態，等待後端不斷回傳最佳電路回來
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    try {
                        const rawData = line.replace('data: ', '').trim();
                        const result = JSON.parse(rawData);
                        //更新文字
                        const msg = `正在迭代第 ${result.epoch} / ${result.total_epochs} 次`;
                        qCanvas.toggleLoading(true, msg);
                        // 更新進度條視覺
                        qCanvas.updateProgress(result.epoch, result.total_epochs);
                        // 繪製電路
                        qCanvas.drawCircuit(result.circuit);
                    } catch (e) {
                        console.error("解析 JSON 失敗:", e);
                    }
                }
            }
        }

        alert("串流迭代完成！");

    } catch (error) {
        console.error("發生錯誤:", error);
        alert("串流連線失敗，請檢查後端是否支援 SSE 或 CORS 設定。");
    } finally {
        qCanvas.toggleLoading(false);
    }
}
