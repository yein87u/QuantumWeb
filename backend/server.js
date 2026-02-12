require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 靜態檔案託管
app.use(express.static(path.join(__dirname, '../frontend')));

const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const cluster = process.env.DB_CLUSTER;
const PORT = process.env.PORT || 3000;
const DBname = process.env.DB_NAME;
const uri = `mongodb+srv://${user}:${password}@${cluster}/?appName=Cluster0`;

const client = new MongoClient(uri);

app.use(express.static(path.join(__dirname, '../frontend')));

async function startServer() {
    try {
        await client.connect();
        console.log("✅ 成功連線至 MongoDB 資料庫");

        const database = client.db(DBname);
        const collection = database.collection("messagetest");
        
        // GET API
        app.get('/api/messages', async (req, res) => {
            try {
                const messages = await collection.find({}).toArray();
                res.json(messages);
            } catch (err) {
                res.status(500).json({ error: "讀取資料失敗" });
            }
        });

        // POST API
        app.post('/api/messages', async (req, res) => {
            try {
                const newMessage = {
                    content: req.body.content,
                    userName: req.body.userName,
                    timestamp: new Date()
                };
                await collection.insertOne(newMessage);
                res.status(201).json({ status: "success" });
            } catch (err) {
                res.status(500).json({ error: "儲存失敗" });
            }
        });

        // 建立qiskit oracle路由
        const { spawn } = require('child_process');
        app.get('/api/get-oracle', (req, res) => {
            const bits = req.query.bits || '01'; // 預設 01

            // 呼叫外部 Python 程式
            const python = spawn('python', ['oracle_service.py', bits]);

            python.stdout.on('data', (data) => {
                res.json(JSON.parse(data.toString()));
            });

            python.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });
        });

        app.listen(PORT, () => {
            console.log(`🚀 伺服器已啟動!請瀏覽:http://localhost:${PORT}`);
        });

    } catch (e) {
        console.error("❌ 無法啟動伺服器:", e);
    }
}


startServer();