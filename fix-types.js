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

  // 修复：拆分类型导入（FunctionContext 用 import type）
  if (content.includes('FunctionContext') && content.includes('local-cloud.js')) {
    // 如果在一行里混合导入，拆分成两行
    content = content.replace(
      /import\s+{\s*([^}]*?)FunctionContext([^}]*?)\s*}\s+from\s+(['"][^'"]+['"])/g,
      "import { $1$2 } from $3\nimport type { FunctionContext } from $3"
    );
    modified = true;
  }

  // 修复：ObjectId 可能也在同一行，需要调整
  if (content.includes('ObjectId') && content.includes('import type')) {
    // 确保 ObjectId 不在 type 导入里（它是值，不是类型）
    content = content.replace(
      /import\s+type\s+{\s*([^}]*?)ObjectId([^}]*?)\s*}/g,
      "import type { $1$2 }"
    );
    content = content.replace(
      /import\s+{\s*([^}]*?)\s*}\s+from\s+(['"][^'"]+['"])/,
      (match, imports, src) => {
        if (imports.includes('ObjectId')) {
          return match; // 保持原样，ObjectId 是值导入
        }
        return match;
      }
    );
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ 已修复 ${filePath}`);
  }
});

console.log('🎉 完成！');