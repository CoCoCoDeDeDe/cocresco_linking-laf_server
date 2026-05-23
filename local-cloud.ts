// local-cloud.ts
import { MongoClient, Db, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// 使用全局变量确保 require 和 import 共享同一个 db 实例
const globalAny = global as any;
if (!globalAny.__mongoDB) {
  globalAny.__mongoDB = {
    db: null as Db | null,
    client: null as MongoClient | null,
    initPromise: null as Promise<Db> | null,
  };
}
const { __mongoDB } = globalAny;

const uri = process.env.DB_URI || 'mongodb://localhost:27017/dachuang_db';

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
  if (__mongoDB.initPromise) return __mongoDB.initPromise;
  
  __mongoDB.initPromise = (async () => {
    __mongoDB.client = new MongoClient(uri);
    await __mongoDB.client.connect();
    __mongoDB.db = __mongoDB.client.db();
    console.log('✅ MongoDB 已连接');
    return __mongoDB.db;
  })();
  
  return __mongoDB.initPromise;
}

export const cloud = {
  database: () => {
    if (!__mongoDB.db) throw new Error('数据库未初始化');
    return { collection: (name: string) => __mongoDB.db!.collection(name) };
  },
  mongo: {
    db: () => {
      if (!__mongoDB.db) throw new Error('数据库未初始化');
      return __mongoDB.db;
    }
  },
  storage: {},
  function: {
    invoke: async (name: string, params: any) => {
      console.log(`调用云函数 ${name}`, params);
    }
  }
};

export { ObjectId };
export type { Db };

process.on('SIGINT', async () => {
  await __mongoDB.client?.close();
  console.log('数据库连接已关闭');
  process.exit(0);
});