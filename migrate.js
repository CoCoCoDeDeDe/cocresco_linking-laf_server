// migrate.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const funcDir = './functions';

// 递归获取所有 .ts 文件
function getAllTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

if (!fs.existsSync(funcDir)) {
  fs.mkdirSync(funcDir);
  console.log('✅ 已创建 functions 目录');
  process.exit(0);
}

const files = getAllTsFiles(funcDir);
console.log(`找到 ${files.length} 个 .ts 文件`);

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 替换 import cloud from '@lafjs/cloud'
  if (content.includes("from '@lafjs/cloud'") || content.includes('from "@lafjs/cloud"')) {
    // 计算相对路径深度
    const relativePath = path.relative(path.dirname(filePath), '.');
    const cloudPath = path.join(relativePath, 'local-cloud.js').replace(/\\/g, '/');
    
    content = content.replace(
      /import\s+cloud\s+from\s+['"]@lafjs\/cloud['"]/,
      `import { cloud } from '${cloudPath}'`
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ 已处理 ${filePath}`);
  }
});

console.log('🎉 迁移完成！');