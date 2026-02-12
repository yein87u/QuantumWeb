import time
import random
import json

def core_algorithm_v1(problemInput, wantOutput):
    # problemInput 與 wantOutput 會是 Python 的 list 格式
    total_epochs = 50
    base_gates = [[1, 1, 3], [1, 3, 1], [1, 0, 3], [0, 0, 3], [0, 1, 3]]
    
    for epoch in range(1, total_epochs+1):
        time.sleep(0.3)
        
        best_circuit = random.sample(base_gates, k=random.randint(3, 5))

        # 必須轉成 JSON 字串，並符合 SSE 格式: "data: <內容>\n\n"
        yield f"data: {json.dumps({'total_epochs': total_epochs, 'epoch': epoch, 'circuit': best_circuit})}\n\n"
