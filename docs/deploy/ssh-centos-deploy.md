<!-- docs\deploy\ssh-centos-deploy.md -->

# this

## 从 windows VSCode 连接到 华为云 Linux 云主机

1. 在华为云控制台的 密码安全中心 DEW 生成密钥对并给云主机绑定公钥
   1. 下载密钥，保存到 windows 目录 `C:\Users\yeah\.ssh\` 下
2. windows CSCode 安装插件 `Remote SSH`
   1. 快捷键 `Ctrl + Shift + P` 调出命令快捷键输入框
   2. 执行命令 `Remote-SSH: Open SSH Configuration File...`
   3. Select SSH configuration file to update 选择 `C:\Users\yeah\.ssh\config`
   4. 编辑文件并保存
```s
# Read more about SSH config files: https://linux.die.net/man/5/ssh_config
Host huawei_cloud-server
    HostName 119.3.250.122
    User root
    Port 22
    IdentityFile C:\Users\yeah\.ssh\hw_cloud-hcss_ecs_1area-KeyPair-4ac6.pem
    IdentitiesOnly yes
    StrictHostKeyChecking no
```
  5. 点击 vscode 左下角 `><` 图标按钮进入命令输入框 Select an option to open a Remote Window
     1. 选择 `Connect to Host...    Remtoe-SSH`
     2. 进入下一个命令输入框 Select configured SSH host or enter user@host
     3. 选择 `.ssh\config` 文件中给云主机起的名字，比如 `huawei_cloud-server`

## VSCode Remote SSH Linux Operations

### 创建与切换普通用户

```bash
# 创建普通用户
useradd -m -s /bin/bash linker
passwd linker # 设置密码

# 给用户 linker sudo 权限
usermod -aG sudo linker   # Ubuntu/Debin
# 或
usermod -aG wheel linker # CentOS/RHEL

# 切换到 linker
su - linker
cd /opt/project
# 然后使用 VS Code 重新连接这个用户,或者继续在此操作
```

### 文件夹权限配置

- root 将文件夹所有权给 linker
```bash
chown -R linker:linker /opt/cocresco_linking-laf_server
```

### 文件夹操作

- 快捷键 `Ctrl + ·` 或 `Ctrl + J` 打开终端窗口

```bash
mkdir -p /opt/cocresco_linking-laf_server
cd /opt/cocresco_linking-laf_server
code .    # 在 VS Code 中打开这个文件夹

pwd   # 输出当前目录绝对路径
```

### 初始化项目目录

```bash
git init
```

### 安装 Node.js 环境（如果服务器上没有）

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或 CentOS
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证
node -v  # v18.x.x
npm -v
```

### 安装 MongoDB (Docker 方式最快)

```bash
docker run -d --name mongo -p 27017:27017 -v /data/mongo:/data/db mongo:6.0
```

### 上传项目代码

#### Plan A

- 直接在 Window VS Code 端将代码复制粘贴到控制的文件夹

#### Plan B

- 通 Git Clone 将已有 repo 克隆到 Linux 文件夹

## VS Code SSH 连接 Linux 后自动端口转发到 windows 控制端

- 当服务在 Linux 上运行后
```bash
# 在 VS Code 终端运行
npm start
# 输出：Server running on http://localhost:3000
```

VS Code 会自动把这个端口映射到 Windows 本地

## Git 基础身份配置

```bash
# 配置邮箱
git config --global user.email "xxx@example.com"

# 配置名字
git config --global user.name "yourname"
```

## 查看 Git 基础身份信息

- 查看 Git 配置的身份信息
```bash
# 查看全局配置 （--global）
git config --global user.name
git config --global user.email

# 或者一起查看所有的配置（带身份的部分）
git config --global --list | grep user
```

- 查看当前仓库的配置
```bash
# 在当前项目目录下执行
git config user.name
git config user.email

git config --list | grep user
```

- 查看 Git 配置文件内容
```bash
# 全局配置文件路径
cat ~/.gitconfig

# 当前仓库的配置
cat .git/config
```

## 配置 Git token

1. Github 上 `https://github.com/settings` 页面
2. Personal access tokens 页面
3. 生成 `Personal access tokens (classic)`
4. 复制与保存密钥

### 持久存储 Git token
 
- Plan A
  - 临时缓存（内存，默认 15 分钟）
  - `git config --global credential.helper cache`

- Plan B
  - 永久存储（磁盘，安全风险）
  - `git config --global credential.helper store`

## Git 库初始化与连接

```bash
echo "# cocresco_linking-laf_server" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main

# ssh 连接（需要配置密钥）
git remote add origin git@github.com:CoCoCoDeDeDe/cocresco_linking-laf_server.git
# 或 https 连接（需要配置 token）
git remote add origin https://github.com/CoCoCoDeDeDe/cocresco_linking-laf_server.git

git push -u origin main
```

- 修改 remote URL
```bash
git remote set-url origin git@github.com:CoCoCoDeDeDe/cocresco_linking-laf_server.git
```

- 查看当前配置
```bash
git remot -v
```

- 删除已有 remote URL
```bash
git remote remove origin
```

## Git SSH 连接

```bash
# 确认 SSH 密钥已添加到 GitHub
cat ~/.ssh/id_ed25519.pub

# 把 HTTPS 改成 SSH 链接
git remote set-url origin git@github.com:CoCoCoDeDeDe/cocresco_linking-laf_server.git

# 测试连接
ssh -T git@github.com
```

## Git 分支关联

### 第一次 push 时配置

- `-u`：`--set-upstream`，建立关联，告诉 Git 以后 main 分支默认推送到 origin 的 main

```bash
git push -u origin main
```

### 验证关联

```bash
git branch -vv
```

### 配置自动简历上有分支

- Git 版本：2.37+
- 配置全局自动上游

```bash
git config --global push.autoSetupRemote true
```

- 之后即使是新分支，直接 `git push` 也会自动推送到同名远程分支，无需任何一次 `-u`

## CentOS github 网络连接测试

```bash
# 检查 git 版本
git --version   # 至少需要2.20+

# 测试 ping
ping -c github.com

# 测试 443 端口（HTTPS）
curl -v https://github.com --connect-timeout 10

# 测试 22 端口连通性
ssh -v -T git@github.com

# 测试 DNS 解析
nslookup github.com
```

## 解决 443 端口问题

- 表现：
  - https git push 错误

- 解决：
  - 华为云安全组开发 TCP 0.0.0.0 443 入口

## 基础依赖安装

- 表现，比如：在 `npm install` 时遇到原生模块编译错误

```bash
# CentOS 安装必要的构建工具
sudo yum groupinstall "Development Tools"
sudo yum install python3
```

- 永久禁用 PostgreSQL 官方仓库（pgdg13）（仓库失效）
```bash
# 禁用损坏的 PostgreSQL 仓库
sudo yum-config-manager --disable pgdg13

# 或者用 sed 命令（如果上面不行）
sudo sed -i 's/enabled=1/enabled=0/g' /etc/yum.repos.d/pgdg-redhat-all.repo
```

## 环境全面检查

```bash
cd /opt/cocresco_linking-laf_server

# 1. 检查 Node 版本
node -v  # 建议 v18+

# 2. 检查 MongoDB
docker ps | grep mongo  # 或用 mongosh 连接测试

# 3. 安装依赖
npm install

# 4. 检查 .env 是否存在且正确
cat .env

# 5. 启动服务
npx ts-node local-start.ts
# 看到 ✅ 本地 MongoDB 已连接 和 🚀 服务已启动 即可

# 6. 测试（服务器本地）
curl http://localhost:3000/user

# 7. 开放防火墙给华为云（如果需要）
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

## 

