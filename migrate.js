// migrate.js
const fs = require('fs');
const path = require('path');

const funcDir = './functions';

// 递归获取所有 .ts 文件
function getAllTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 递归进入子目录
      getAllTsFiles(fullPath, files);
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 检查目录是否存在
if (!fs.existsSync(funcDir)) {
  fs.mkdirSync(funcDir);
  console.log('✅ 已创建 functions 目录');
  process.exit(0);
}

const files = getAllTsFiles(funcDir);

if (files.length === 0) {
  console.log('⚠️ 没有找到 .ts 文件');
  process.exit(0);
}

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 替换 import cloud from '@lafjs/cloud'
  if (content.includes('@lafjs/cloud')) {
    content = content.replace(
      /import\s+cloud\s+from\s+['"]@lafjs\/cloud['"]/,
      "import { cloud } from '../local-cloud.js'"
    );
    
    // 对于深层目录（如 functions/images/xxx.ts），需要调整相对路径
    const depth = filePath.split('/').length - 2; // 计算深度
    const relativePath = '../'.repeat(depth) + 'local-cloud.js';
    
    content = content.replace(
      /import\s+cloud\s+from\s+['"]@lafjs\/cloud['"]/,
      `import { cloud } from '${relativePath}'`
    );
    
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ 已处理 ${filePath}`);
  }
});

console.log(`🎉 完成！共处理 ${files.length} 个文件`);