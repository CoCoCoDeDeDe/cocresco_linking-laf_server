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