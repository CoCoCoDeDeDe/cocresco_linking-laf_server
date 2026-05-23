import express from 'express';
import { initDB } from './local-cloud.js';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json());

// 创建 require 函数（用于动态加载 .ts 文件）
const require = createRequire(import.meta.url);

// 排除静态资源
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/robots.txt', (req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /'));
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const functionsDir = './functions';

// 处理所有路径（支持嵌套）
app.use(async (req, res, next) => {
  if (req.path === '/favicon.ico' || req.path === '/robots.txt' || req.path === '/health') {
    return next();
  }

  try {
    const routePath = req.path.substring(1);
    if (!routePath) {
      return res.status(404).json({ code: 404, msg: 'Not found' });
    }

    // 构建文件路径（相对路径）
    const filePath = `./functions/${routePath}.ts`;
    
    console.log(`[Request] ${req.method} ${req.path} -> ${filePath}`);

    // 使用 require 加载 .ts 文件（tsx 会处理）
    const funcModule = require(filePath);
    
    const ctx = {
      body: req.body,
      query: req.query,
      headers: req.headers,
      method: req.method,
    };
    
    const result = await funcModule.default(ctx);
    res.json(result);
  } catch (error: any) {
    console.error(`[Error] ${req.path}:`, error.message);
    res.status(500).json({ 
      code: -1, 
      error: error.message,
      hint: `Check if functions${req.path}.ts exists`
    });
  }
});

const PORT = parseInt(process.env.PORT || '3000', 10);

// local-start.ts 关键部分
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 服务已启动: http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error('数据库连接失败:', err);
  process.exit(1);
});