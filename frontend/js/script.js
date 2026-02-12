// 設定後端網址（相對路徑，適用於整合後的 Node 伺服器）
const API_URL = '/api/messages';

// 1. 讀取資料 (GET)
async function loadData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        const list = document.getElementById('messageList');
        if (data.length === 0) {
            list.innerHTML = '<p>目前沒有資料，快來留言吧！</p>';
            return;
        }

        list.innerHTML = data.map(m => `
            <div class="card">
                <b>👤 ${m.userName || '匿名'}:</b>
                <p>${m.content}</p>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('messageList').innerHTML = '<p style="color:red;">❌ 無法連線至後端伺服器</p>';
    }
}

// 2. 送出資料 (POST)
async function postData() {
    const input = document.getElementById('userInput');
    const text = input.value;

    if (!text) return alert("請輸入內容");

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text, userName: "新玩家" })
        });

        if (response.ok) {
            input.value = ''; // 清空輸入框
            loadData();       // 重新整理列表
        }
    } catch (error) {
        alert("送出失敗，請檢查後端是否啟動");
    }
}

