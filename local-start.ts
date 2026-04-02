// local-start.ts
import express from 'express';
import { initDB } from './local-cloud.js';
import dotenv from 'dotenv';
import path from 'path';
import { pathToFileURL } from 'url';

dotenv.config();

const app = express();
app.use(express.json());

// 排除静态资源
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/robots.txt', (req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /'));

// 健康检查
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
    const routePath = req.path.substring(1)
    if (!routePath) {
      return res.status(404).json({ code: 404, msg: 'Not found' });
    }

    // ✅ 修复：使用绝对路径，让 tsx 正确处理
    const filePath = `./functions/${routePath}.ts`;

    console.log(`[Request] ${req.method} ${req.path} -> ${filePath}`);
    console.log(`[Debug] CWD: ${process.cwd()}`);

    // 使用 tsx 的 import（去掉 .ts 后缀试试）
    const modulePath = pathToFileURL(
      path.join(process.cwd(), 'functions', routePath + '.ts')
    ).href;

    console.log(`[Debug] Importing: ${modulePath}`);

    const funcModule = await import(modulePath);

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

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 服务已启动: http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error('数据库连接失败:', err);
  process.exit(1);
});