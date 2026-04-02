import { MongoClient, Db, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let db: Db;
let client: MongoClient;

const uri = process.env.DB_URI || 'mongodb://localhost:27017/dachuang_db';

// ==========================================
// 导出类型（供云函数使用）
// ==========================================
export interface FunctionContext {
  body: any;
  query: any;
  headers: any;
  method: string;
  auth?: any;
  user?: any;
  requestId?: string;
}

export async function initDB() {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  console.log('✅ MongoDB 已连接');
  return db;
}

// ==========================================
// cloud 对象（兼容 Laf API）
// ==========================================
export const cloud = {
  database: () => {
    if (!db) throw new Error('数据库未初始化');
    return {
      collection: (name: string) => db.collection(name),
    };
  },
  // 兼容 cloud.mongo.db() 写法
  mongo: {
    db: () => {
      if (!db) throw new Error('数据库未初始化');
      return db;
    }
  },
  storage: {},
  function: {
    invoke: async (name: string, params: any) => {
      console.log(`调用云函数 ${name}`, params);
    }
  }
};

// ==========================================
// 导出 MongoDB 类型和对象（供云函数使用）
// ==========================================
export { ObjectId };
export type { Db };

process.on('SIGINT', async () => {
  await client?.close();
  console.log('数据库连接已关闭');
  process.exit(0);
});
