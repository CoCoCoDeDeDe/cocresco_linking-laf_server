<!-- docs/deploy/laf_migrate.md -->

# this

## 思路

从原 Sealos Laf 应用直接迁移到开发端 windows 或华为云服务器 centos，并保留 Laf 框架。
  - 保持云函数文件结构不变，但把 `cloud` 对象替换为本地 MongoDB 连接
  - 这样代码结构还是 Laf 云函数的样子（导出 default 函数、使用 cloud.database()），但实际上跑在本地 Windows + 本地 MongoDB 上。

## Migrate Process

### 安装 laf-cli 和依赖

```bash
# 安装全局 laf-cli
npm install -g laf-cli

# 进入项目目录
npm init -y
npm install @lafjs/cloud mongodb dotenv
npm install -D typescript ts-node @types/node
```

### 创建本地数据库兼容层

在本地项目根目录创建 `local-cloud.ts`，让云函数在本地能连接到我的 MongoDB：

```ts
// local-clous.ts
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let db: Db;
let client: MongoClient;

// 连接本地 MongoDB（默认端口 27017）
const uri = process.env.DB_URI || 'mongodb://localhost:27017/your_database_name';

export async function initDB() {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  console.log('✅ 本地 MongoDB 已连接');
  return db;
}

// 模拟 laf 的 cloud 对象
export const cloud = {
  database: () => {
    if (!db) throw new Error('数据库未初始化，请先调用 initDB()');
    return {
      collection: (name: string) => db.collection(name),
      // 其他用到的方法...
    };
  },
  // 模拟其他 cloud 功能（如存储、函数调用等，按需实现）
  storage: {
    // 本地文件存储 mock
  },
  function: {
    invoke: async (name: string, params: any) => {
      console.log(`调用云函数 ${name}`, params);
      // 本地模式下直接 import 对应文件执行
    }
  }
};

// 优雅关闭
process.on('SIGINT', async () => {
  await client?.close();
  console.log('数据库连接已关闭');
  process.exit(0);
});
```

### 修改云函数文件

- 例如原来的云函数可能如下 `functions/user.ts`

```ts
// 原来的代码（Laf 云端版本）
import cloud from '@lafjs/cloud';

export default async function (ctx: FunctionContext) {
  const { username, password } = ctx.body;
  
  // 使用 cloud.database()
  const db = cloud.database();
  const result = await db.collection('users').insertOne({
    username,
    password,
    createdAt: new Date()
  });
  
  return { code: 0, data: result };
}
```

- 修改为本地方案

```ts
// functions/user.ts（本地兼容版本）
import { cloud } from '../local-cloud';  // 改这里！
import type { FunctionContext } from '@lafjs/cloud';

export default async function (ctx: FunctionContext) {
  const { username, password } = ctx.body;
  
  //  cloud.database() 现在连接的是 windows 本地的 MongoDB
  const db = cloud.database();
  const result = await db.collection('users').insertOne({
    username,
    password,
    createdAt: new Date()
  });
  
  return { code: 0, data: result };
}
```

### 配置环境变量

在项目根目录创建 `.env` 文件，把原来在 Laf 控制台的键值对都搬过来

- 本地 MongoDB 连接
  - windows
```bash
DB_URI=mongodb://localhost:27017/dachuang_db
```
  - centos
```bash
DB_URI=mongodb://localhost:27017/dachuang_db
# 或(Docker 内网)
DB_URI=mongodb://mongo:27017
```

```bash
# 原来的其他环境变量（从 Laf 控制台抄过来）
JWT_SECRET=your_jwt_secret_key_here
APPID=your_app_id
ADMIN_KEY=your_admin_key
```

### 创建本地启动入口

创建 `local-start.ts` 作为本地服务器入口（模拟 Laf 的 HTTP 触发）：

```ts
// local-start.ts
import express from 'express';
import { initDB, cloud } from './local-cloud';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// 自动加载所有云函数作为路由
// 假设函数都在 functions/ 目录下，且导出 default 函数
const functionsDir = './functions';

// 简单的路由映射：/函数名 -> 执行对应文件
app.all('/:funcName', async (req, res) => {
  try {
    const funcName = req.params.funcName;
    const funcModule = await import(`${functionsDir}/${funcName}`);
    
    // 构造 FunctionContext
    const ctx: any = {
      body: req.body,
      query: req.query,
      headers: req.headers,
      method: req.method,
      // 其他上下文信息...
    };
    
    // 执行云函数
    const result = await funcModule.default(ctx);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ code: -1, error: error.message });
  }
});

// 启动
const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 本地 Laf 服务已启动: http://localhost:${PORT}`);
    console.log(`📁 可用接口示例: http://localhost:${PORT}/user`);
  });
});
```

### 安装其他模块

- express
`npm install express @types/express`

### 运行后端

- 启动 MongoDB
  - CentOS MongoDB Docker
```bash
# CentOS 上启动 MongoDB（Docker）
docker run -d --name mongo -p 27017:27017 -v /data/mongo:/data/db mongo:6.0
```

- 启动服务
  - windows 本地
```bash
# 启动本地服务
npx ts-node local-start.ts
```
  - CentOS 服务器
  
```bash
# 一样的命令！
npx ts-node local-start.ts

# 或者后台运行（推荐）
nohup npx ts-node local-start.ts > app.log 2>&1 &

# 查看日志
tail -f app.log
```

  - pm2 方案
```bash
# 用 pm2 专业管理（推荐安装）
npm install -g pm2
pm2 start local-start.ts --name "laf-server"
pm2 save
pm2 startup
```

### 测试 API

```bash
# 测试 user 云函数
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

### 针对 Windows 的注意事项

1. MongoDB 服务检查：

```powershell
# 检查 MongoDB 是否在运行
net start MongoDB
# 如果没启动，手动启动
net start MongoDB
```

2. 如果 MongoDB 需要认证（设置了用户名密码），修改 `.env`：

  1. windows
    `DB_URI=mongodb://username:password@localhost:27017/dachuang_db?authSource=admin`

  <!-- 2. centos
    `DB_URI=mongodb://localhost:27017/dachuang_db` 或 Docker 内网 `DB_URI=mongodb://mongo:27017` -->

3. 防火墙：确保 Windows 防火墙允许 3000 端口（当从手机或者其他设备访问）

### 批量修改现有代码的秘诀

如果云函数很多，不想一个个改 import，可以写一个批量替换脚本 `migrate.js`：

```js
const fs = require('fs');
const path = require('path');

const funcDir = './functions';
const files = fs.readdirSync(funcDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  let content = fs.readFileSync(path.join(funcDir, file), 'utf8');
  // 替换 import cloud from '@lafjs/cloud'
  content = content.replace(
    /import\s+cloud\s+from\s+['"]@lafjs\/cloud['"]/,
    "import { cloud } from '../local-cloud'"
  );
  fs.writeFileSync(path.join(funcDir, file), content);
  console.log(`✅ 已处理 ${file}`);
});
```

运行：`node migrate.js`

### 反向部署回到 Sealos

后续如果 Sealos 续费或者换其他云平台，把 `local-cloud.ts` 改回 `@lafjs/cloud` import 就能直接部署回去。

## 华为云 IoTDA 云服务连接到 Windows Dev 端

- 核心问题：本地 Windows 没有公网 IP，华为云 IoTDA 无法主动推送到 Dev 电脑。

### PlanA: Cloudflare Tunnel 内网穿透 (本地 Dev Windows)

- Tags：免费、最稳定

1. 安装 cloudflared

```powershell
# Windows PowerShell 下载安装
winget install --id Cloudflare.cloudflared
# 或手动下载：https://github.com/cloudflare/cloudflared/releases
```

2. 登录 Cloudflare

```powershell
cloudflared tunnel login
# 会弹浏览器让选域名，选一个要管理的域名（没有可以注册一个免费的 .workers.dev）
```

3. 创建隧道

```powershell
# 创建隧道，名叫 laf-local
cloudflared tunnel create laf-local

# 得到一串 UUID，记下来（比如 12345-abc...）
```

4. 配置隧道

- 编辑配置文件（在 `C:Users\用户名\.cloudflared\config.yml`）

```yaml
tunnel: <要配置的UUID>
credentials-file: C:\Users\用户名\.cloudflared\<UUID>.json

ingress:
  # 把 huawei.iot.yourdomain.com 指向本地 3000 端口
  - hostname: huawei.iot.yourdomain.com
    service: http://localhost:3000
  # 默认规则
  - service: http_status:404
```

5. 启动隧道

```powershell
cloudflared tunnel run laf-local
```

现在本地 Laf 就有了公网地址：https://huawei.iot.yourdomain.com

### 华为云 IoTDA 侧配置修改

1. 修改数据转发规则
  - 原配置：`http://<sealos-ip>:<port>/your-function`
  - 新配置：`https://huawei.iot.yourdomain.com/your-function`（Cloudflare 方案）

2. 本地 Laf 接收端代码示例

华为云 IoTDA 一般通过 HTTP POST 推送设备数据，接入的云函数大概长这样：

```ts
// functions/iot-handler.ts（或原来的处理函数）
import { cloud } from '../local-cloud';

export default async function (ctx: FunctionContext) {
  const { body, headers } = ctx;
  
  // 华为云会发送设备数据，格式大概如下：
  // {
  //   "resource": "device.message",
  //   "event": "report",
  //   "notify_data": {
  //     "header": { "device_id": "xxx" },
  //     "body": { "temperature": 26.5, "humidity": 60 }
  //   }
  // }
  
  console.log('收到华为云数据:', body);
  
  // 安全校验（如果配置了签名）
  const signature = headers['x-hws-signature'];
  // 验逻辑...
  
  // 存入本地 MongoDB
  const db = cloud.database();
  await db.collection('iot_data').insertOne({
    deviceId: body.notify_data?.header?.device_id,
    payload: body.notify_data?.body,
    receivedAt: new Date(),
    raw: body
  });
  
  // 华为云要求返回特定格式表示成功
  return { 
    code: 0, 
    msg: "success" 
  };
}
```

### 完整运行流畅

```powershell
# 1. 确保 MongoDB 已启动
net start MongoDB

# 2. 启动本地 Laf 服务
npx ts-node local-start.ts
# 输出: 🚀 本地 Laf 服务已启动: http://localhost:3000

# 3. 另一个终端，启动内网穿透（以 cloudflared 为例）
cloudflared tunnel run laf-local
# 输出: Connected, your tunnel is active: https://huawei.iot.yourdomain.com

# 4. 华为云 IoTDA 现在可以把数据推送到 https://huawei.iot.yourdomain.com/iot-handler
```

### 安全提醒

把本地服务暴露到公网有风险：

1. **IP 白名单**：在华为云 IoTDA 配置转发规则时，设置源 IP 白名单（Cloudflare 的 IP 段）
2. **签名验证：**务必校验华为云的 X-Hws-Signature 签名，防止伪造请求
3. **Token 验证：**在 .env 设置 IOT_TOKEN，华为云调用时携带，本地验证
4. **防火墙：**Windows 防火墙只允许 3000 端口本地访问，通过内网穿透暴露，不要直接开端口到公网

## CentOS 云服务器开放端口给华为云 IoTDA 接入服务

1. 华为云 IoTDA 控制台 -> 数据转发规则
  1. 填写：`http://服务器公网IP:3000/iot-handler`
2. 云服务器安全组方向 3000 端口（入方向）
```bash
# CentOS 防火墙（如果开了 firewalld）
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 进程管理

### 原生运行

1. Linux

```bash
# 查看 MongoDB 是否运行（Docker 方式）
docker ps | grep mongo

# 查看 Node 服务
ps aux | grep ts-node

# 停止服务
pkill -f "ts-node"
```

### 使用 pm2

```bash
npm install -g pm2
pm2 start local-start.ts --name "laf-server"
pm2 save
pm2 startup
```

## 
