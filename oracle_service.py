import sys
import json
import io
import base64
import math
from qiskit import QuantumCircuit
# ✅ 修改：改用 PhaseOracleGate 以避免棄用警告
from qiskit.circuit.library import PhaseOracleGate 
from qiskit.qasm2 import dumps

def bitstring_to_logic(bitstring):
    """將真值表字串轉化為 PhaseOracleGate 可理解的邏輯表達式"""
    n = int(math.log2(len(bitstring)))
    variables = [f"x{i}" for i in range(n)]
    terms = []
    for i, bit in enumerate(bitstring):
        if bit == '1':
            # 將索引 i 轉為二進位，對應變數狀態
            bin_str = format(i, f'0{n}b')[::-1] # 逆序對應 q0, q1...
            term = " & ".join([v if b == '1' else f"~{v}" for v, b in zip(variables, bin_str)])
            terms.append(f"({term})")
    return " | ".join(terms)

def solve():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No input"}))
        return

    bitstring = sys.argv[1].strip().strip('"').strip("'")

    try:
        # 1. 轉換為表達式，避免 0110 被誤判為整數
        expression = bitstring_to_logic(bitstring)
        
        # 2. ✅ 使用新版 PhaseOracleGate 合成邏輯
        oracle_gate = PhaseOracleGate(expression)
        qc = QuantumCircuit(oracle_gate.num_qubits)
        qc.append(oracle_gate, range(oracle_gate.num_qubits))

        # 3. 強制展開兩次，直到看到直觀的邏輯閘 (Toffoli/CNOT)
        qc = qc.decompose().decompose()

        # 4. 視覺化處理
        buf = io.BytesIO()
        # 加入 scale 參數讓電路圖在網頁顯示更清晰
        qc.draw('mpl', style={'name': 'bw'}, scale=1.0).savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')

        print(json.dumps({
            "success": True,
            "num_qubits": qc.num_qubits,
            "qasm": dumps(qc),
            "image": img_str
        }))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"合成失敗: {str(e)}"}))

if __name__ == "__main__":
    solve()