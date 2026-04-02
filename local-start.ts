// local-start.ts
import express from 'express';
import { initDB } from './local-cloud.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// ==========================================
// 1. 排除常见静态资源请求（放在动态路由之前）
// ==========================================
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/robots.txt', (req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /'));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ==========================================
// 2. 动态云函数路由（排除已处理的路径）
// ==========================================
const functionsDir = './functions';

app.all('/:funcName', async (req, res) => {
  // 额外的安全检查，防止访问非法路径
  const funcName = req.params.funcName;
  
  // 排除静态资源和特殊路径
  if (funcName.includes('.') || funcName.includes('/') || funcName === 'favicon') {
    return res.status(404).json({ code: 404, msg: 'Not found' });
  }
  
  try {
    const funcModule = await import(`${functionsDir}/${funcName}.ts`);
    
    const ctx = {
      body: req.body,
      query: req.query,
      headers: req.headers,
      method: req.method,
    };
    
    const result = await funcModule.default(ctx);
    res.json(result);
  } catch (error: any) {
    console.error(`[Error] Function ${funcName}:`, error.message);
    res.status(500).json({ 
      code: -1, 
      error: error.message,
      hint: `Check if functions/${funcName}.ts exists`
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
