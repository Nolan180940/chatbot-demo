import fs from "fs";
import path from "path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

if (!fs.existsSync(standaloneDir)) {
  console.error(".next/standalone 不存在，请先运行 next build");
  process.exit(1);
}

const entries = [
  { src: path.join(root, ".next", "static"), dest: path.join(standaloneDir, ".next", "static") },
  { src: path.join(root, "public"), dest: path.join(standaloneDir, "public") },
];

for (const { src, dest } of entries) {
  if (!fs.existsSync(src)) {
    console.log(`skip (不存在): ${path.relative(root, src)}`);
    continue;
  }
  fs.cpSync(src, dest, { recursive: true });
  console.log(`copied: ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
}

console.log("standalone 资源拷贝完成");