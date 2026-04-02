// fix-imports.js
import fs from 'fs';
import path from 'path';

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

const files = getAllTsFiles('./functions');

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 修复 1: cloud.mongo.db -> cloud.mongo.db()
  if (content.includes('cloud.mongo.db') && !content.includes('cloud.mongo.db()')) {
    content = content.replace(/cloud\.mongo\.db(?!\(\))/g, 'cloud.mongo.db()');
    modified = true;
  }

  // 修复 2: 添加 ObjectId 导入（如果用了 new ObjectId）
  if (content.includes('new ObjectId') && !content.includes("import { ObjectId }")) {
    // 在第一个 import 行添加 ObjectId
    content = content.replace(
      /import\s+{([^}]*)}\s+from\s+['"]([^'"]+)['"]/,
      (match, imports, source) => {
        if (source.includes('local-cloud')) {
          return `import {${imports}, ObjectId} from '${source}'`;
        }
        return match;
      }
    );
    modified = true;
  }

  // 修复 3: 给 FunctionContext 添加 import（如果用了但没导入）
  if (content.includes('FunctionContext') && !content.includes('import.*FunctionContext')) {
    content = content.replace(
      /import\s+{([^}]*)}\s+from\s+['"]([^'"]+)['"]/,
      (match, imports, source) => {
        if (source.includes('local-cloud')) {
          return `import {${imports}, FunctionContext} from '${source}'`;
        }
        return match;
      }
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ 已修复 ${filePath}`);
  }
});

console.log('🎉 修复完成！');