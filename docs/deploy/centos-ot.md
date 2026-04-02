<!-- docs/deploy/centos-ot.md -->

# this

## CentOS 本地防火墙放行

```bash
# 检查 3000 端口是否开放
sudo firewall-cmd --list-ports

# 如果没有 3000/tcp，添加
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# 验证
sudo firewall-cmd --list-ports | grep 3000
```

## 运行 SSH 密码登录

```bash
# 在 VSCode 终端执行（SSH 连上）
sudo vim /etc/ssh/sshd_config

# 找到这行，改为 yes
PasswordAuthentication yes  # i 进入编辑，esc 退出编辑，:wq 保存并退出

# 保存并重启 SSH
sudo systemctl restart sshd
```
