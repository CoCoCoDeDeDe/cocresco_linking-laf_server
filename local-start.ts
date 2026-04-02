// local-start.ts
import express from 'express';
import { initDB, cloud } from './local-cloud';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const functionsDir = './functions';

app.all('/:funcName', async (req, res) => {
  try {
    const funcName = req.params.funcName;
    const funcModule = await import(`${functionsDir}/${funcName}`);
    
    const ctx = {
      body: req.body,
      query: req.query,
      headers: req.headers,
      method: req.method,
    };
    
    const result = await funcModule.default(ctx);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ code: -1, error: error.message });
  }
});

const PORT = parseInt(process.env.PORT || '3000', 10);

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 服务已启动: http://0.0.0.0:${PORT}`);
  });
});
