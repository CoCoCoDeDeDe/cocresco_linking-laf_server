<!-- docs/deploy/laf_migrate-hwc-centos.md -->

# this

## Process

1. 进入项目目录并检测环境

```bash
# 进入项目目录
cd /opt/cocresco_linking-laf_server

# 检查 Node.js 版本（需要 v16+，推荐 v18）
node -v

# 如果版本太低或没有，安装 Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

2. 安装项目依赖

```bash
# 初始化 package.json（如果还没有）
npm init -y

# 安装核心依赖
npm install @lafjs/cloud mongodb dotenv express
npm install -D typescript ts-node @types/node @types/express

# 创建 tsconfig.json（如果没有）
npx tsc --init
```

3. 启动 MongoDB（Docker 方式，避开 CentOS 8 仓库问题）

```bash
# 安装 Docker（如果还没装）
sudo yum install -y docker

# CentOS 8 使用 Podman（Docker 的替代品，命令与 Docker 兼容但不需要守护进程（没有 `docker.service`））
# sudo systemctl start docker
# sudo systemctl enable docker

# 创建数据目录
sudo mkdir -p /data/mongo
sudo chown -R linker:linker /data/mongo

# 用 podman 启动 MongoDB（命令和 docker 一样）
podman run -d \
  --name mongo \
  -p 27017:27017 \
  -v /data/mongo:/data/db \
  mongo:6.0

# image 选 `docker.io/library/mongo:6.0`

# 检查是否运行
podman ps

# 查看日志确认启动成功
podman logs mongo
```

- 当 `podman run -d ...` 网络请求失败
  - 使用阿里云镜像
```bash
# 创建镜像仓库配置文件
mkdir -p ~/.config/containers
cat > ~/.config/containers/registries.conf <<EOF
[[registry]]
location = "docker.io"
insecure = false
[[registry.mirror]]
location = "registry.aliyuncs.com"
[[registry.mirror]]
location = "docker.mirrors.sjtug.sjtu.edu.cn"
[[registry.mirror]]
location = "docker.mirror.ustc.edu.cn"
EOF

# 重新拉取
podman run -d --name mongo -p 27017:27017 -v /data/mongo:/data/db mongo:6.0
```
  - 使用阿里镜像失败后改用直接使用完整镜像地址
```bash
# 删除刚才的配置（导致问题了）
rm ~/.config/containers/registries.conf

# 使用完整镜像地址
# 中科大镜像（公开可用）
podman run -d \
  --name mongo \
  -p 27017:27017 \
  -v /data/mongo:/data/db \
  docker.mirrors.ustc.edu.cn/library/mongo:6.0
```
  - 若都失败，可能是 DNS 解析错误，服务器网络受限，选择直接安装 MongoDB 到系统
```bash
# 1. 添加 MongoDB 官方仓库
sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo <<EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

# 2. 安装
sudo yum install -y mongodb-org

# 3. 启动服务
sudo systemctl start mongod
sudo systemctl enable mongod

# 4. 验证
sudo systemctl status mongod
```

- 查看已有容器
```bash
# 查看所有容器（包括停止的）
podman ps -a | grep mongo
```



4. 创建本地兼容层文件

- 配置环境
  - package.json
    - 添加 `"type": "module"`
  - tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["*.ts", "functions/**/*.ts"],
  "exclude": ["node_modules"]
}
```
  - 安装 `tsx`（替代 `ts-ndoe`）：`npm install -D tsx`
    - 修改 `package.json` 的 `scripts`：`"dev": "npx ts-node --esm local-start.ts"`

- 兼容层

```ts
// local-cloud.ts
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let db: Db;
let client: MongoClient;

const uri = process.env.DB_URI || 'mongodb://localhost:27017/cocresco_linking_db';

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
```

5. 创建启动入口

- 新建文件 `local-start.ts`

```ts
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
```

6. 配置环境变量

- 新建 `.env` 文件

```bash
DB_URI=mongodb://localhost:27017/cocresco_linking_db
JWT_SECRET=your_jwt_secret_here
PORT=3000
```

- 保护 .env 文件

```bash
chmod 600 .env
echo ".env" >> .gitignore
```

7. 迁移云函数文件

- 把备份的 Laf 云函数文件放到 functions/ 目录下
- 批量修改 import（执行脚本）：
  - 新建 `migrate.js`：
```js
const fs = require('fs');
const path = require('path');

const funcDir = './functions';
if (!fs.existsSync(funcDir)) {
  fs.mkdirSync(funcDir);
  console.log('✅ 已创建 functions 目录，请把云函数文件放入此目录');
  process.exit(0);
}

const files = fs.readdirSync(funcDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(funcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 替换 import
  content = content.replace(
    /import\s+cloud\s+from\s+['"]@lafjs\/cloud['"]/,
    "import { cloud } from '../local-cloud'"
  );
  
  // 替换 FunctionContext 导入（如果需要）
  content = content.replace(
    /import\s+.*?FunctionContext.*?\n/,
    "import type { FunctionContext } from '@lafjs/cloud';\n"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ 已处理 ${file}`);
});

console.log('🎉 迁移完成！');
```

- 执行 `node migrate.js`

8. 测试启动

```bash
# 开发模式启动
npx ts-node local-start.ts
```

- 测试：
```bash
# 另一个终端（Ctrl+Shift+` 新开终端）
curl http://localhost:3000/your-function-name
```

9. 开放防火墙给华为云 IoTDA
```bash
# 开放 3000 端口（firewalld）
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# 检查是否开放
sudo firewall-cmd --list-ports
```

- 华为云控制台配置
  - 进入 安全组 → 入方向规则
  - 添加规则：
    - 协议：TCP
    - 端口：3000
    - 源地址：0.0.0.0/0（或华为云 IoTDA 的 IP 段）

10. 使用 PM2 后台运行（生产模式）

```bash
# 安装 PM2
sudo npm install -g pm2

# 启动服务
pm2 start local-start.ts --name "laf-server" --interpreter npx

# 保存配置（开机自启）
pm2 save
pm2 startup

# 查看状态
pm2 status
pm2 logs laf-server

# 重启/停止
pm2 restart laf-server
pm2 stop laf-server
```

11. 华为云 IoTDA 配置

  1. 进入 华为云 IoTDA 控制台
  2. 规则 → 数据转发 → 修改你的规则
  3. 推送地址改为 `http://你的服务器公网IP:3000/iot-handler`
  4. 保存并测试

### 故障排查

1. MongoDB 连接失败：
```bash
# 检查 MongoDB 容器
sudo docker logs mongo
sudo docker ps | grep mongo
```

2. 端口被占用
```bash
# 查看 3000 端口占用
sudo netstat -tlnp | grep 3000
# 杀掉占用进程
sudo kill -9 <PID>
```

3. 权限问题

```bash
# 确保 linker 用户对项目目录有权限
sudo chown -R linker:linker /opt/cocresco_linking-laf_server
```

## 当前本项目使用的是直接安装 MongoDB 无 Docker 的方案

### 运维

#### 检查是否已经安装 MongoDB

```bash
sudo systemctl status mongodb
```

#### 安装

```bash
sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo <<EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

sudo yum install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 检查是否运行

```bash
sudo systemctl status mongodb
```

#### 测试连接

```bash
mongosh --eval "db.version()"
```

#### 包装 `.env` 的连接字符串

```env
DB_URI=mongodb://localhost:27017/dachuang_db
```

##

