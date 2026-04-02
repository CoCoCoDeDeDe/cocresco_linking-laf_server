// local-cloud.ts
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let db: Db;
let client: MongoClient;

const uri = process.env.DB_URI || 'mongodb://localhost:27017/dachuang_db';

export async function initDB() {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  console.log('✅ MongoDB 已连接');
  return db;
}

export const cloud = {
  database: () => {
    if (!db) throw new Error('数据库未初始化');
    return {
      collection: (name: string) => db.collection(name),
    };
  },
  storage: {},
  function: {
    invoke: async (name: string, params: any) => {
      console.log(`调用云函数 ${name}`, params);
    }
  }
};

process.on('SIGINT', async () => {
  await client?.close();
  console.log('数据库连接已关闭');
  process.exit(0);
});
