// functions/test-db.ts
import { cloud } from '../local-cloud.js'

export default async function testDb(ctx: any) {
  const db = cloud.mongo.db()
  
  try {
    // 插入测试数据
    const testCollection = db.collection('test')
    await testCollection.insertOne({
      message: 'Hello from CentOS',
      time: new Date(),
      source: 'api-test'
    })
    
    // 查询验证
    const count = await testCollection.countDocuments()
    const latest = await testCollection.findOne({}, { sort: { time: -1 } })
    
    return {
      code: 0,
      msg: '数据库测试成功',
      data: {
        totalDocuments: count,
        latestInsert: latest
      }
    }
  } catch (err: any) {
    return {
      code: -1,
      msg: '数据库错误',
      error: err.message
    }
  }
}