from flask import Flask, request, jsonify, Response
from flask_cors import CORS # 解決跨網域問題
from core_algorithm import core_algorithm_v1

app = Flask(__name__)
CORS(app) 

@app.route('/api/run-algorithm', methods=['POST'])
def run_algorithm():
    data = request.json
    p_input = data.get('problemInput')
    w_output = data.get('wantOutput')
    
    return Response(core_algorithm_v1(p_input, w_output), 
                    mimetype='text/event-stream')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
