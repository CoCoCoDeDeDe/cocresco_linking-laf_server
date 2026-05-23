<!-- docs/deploy/mongodb-ot-centos.md -->

# this

## centos mongosh basic operations

### Connecting（contos）

#### 直接连接：

```bash
mongosh
```

#### 指定数据库：

```bash
mongosh <db_name>
```

如：
```bash
mongosh cocresco_linking_db
```

### 查看所有数据库 (连接后)

```bash
show dbs
```

### 切换数据库 (连接后)

```bash
use <db_name>
```

### 查看当前数据库所有集合（表）

```bash
show collection
```

### 查询表（集合）的所有数据

```bash
db.<col_name>.find().limit(10)
```

### 查询特定条件

- 如查找集合 `iot2_users` 中用户名为 test 的记录
```bash
db.iot2_users.find({ uesrname: "test" })
```

### 查询并格式化输出

```bash
db.iot2_users.find().pretty()
```

### 查看符合条件的记录数量

```bash
db.iot2_users.countDocuments()
```

### 查询时排序

- 如查询表 `iot2_users` 最近插入的 10 条记录（按时间排序）

```bash
db.iot2_users.find().sort({
  createdAt: -1
}).limit(10)
```

### 查看集合的索引

```bash
db.iot2_users.getIndexes()
```

### 查看集合的统计信息

```bash
db.iot2_users.stats()
```

## 

# 