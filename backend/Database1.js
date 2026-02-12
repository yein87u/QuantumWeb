require('dotenv').config();

const { MongoClient, ServerApiVersion } = require('mongodb');

const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const cluster = process.env.DB_CLUSTER;

const uri = `mongodb+srv://${user}:${password}@${cluster}/?appName=Cluster0`;;

const client = new MongoClient(uri, {
        serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        console.log("正在嘗試連線到雲端資料庫...");
        await client.connect();
    
        // 傳送一個 Ping 指令給資料庫，看它有沒有反應
        await client.db("admin").command({ ping: 1 });
        console.log("✅ 成功！你已經與 MongoDB 建立連線了！");
    } catch (error) {
        console.error("❌ 連線失敗：", error);
    } finally {
        // 測試完畢後關閉連線
        await client.close();
    }
}
run().catch(console.dir);