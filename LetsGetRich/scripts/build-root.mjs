import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootIndex = path.join(projectRoot, 'index.html');
const sourceIndex = path.join(projectRoot, 'index.source.html');
const temporaryOutput = path.join(projectRoot, '.root-build');
const rootAssets = path.join(projectRoot, 'assets');

const currentIndex = await readFile(rootIndex, 'utf8');
if (currentIndex.includes('/src/main.js')) {
  await writeFile(sourceIndex, currentIndex, 'utf8');
}

const editableIndex = await readFile(sourceIndex, 'utf8');
await writeFile(rootIndex, editableIndex, 'utf8');
await rm(temporaryOutput, { recursive: true, force: true });

execFileSync(
  process.execPath,
  [path.join(projectRoot, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', '.root-build', '--emptyOutDir'],
  { cwd: projectRoot, stdio: 'inherit' },
);

await rm(rootAssets, { recursive: true, force: true });
await mkdir(rootAssets, { recursive: true });
await cp(path.join(temporaryOutput, 'assets'), rootAssets, { recursive: true, force: true });
await cp(path.join(temporaryOutput, 'index.html'), rootIndex, { force: true });
await rm(temporaryOutput, { recursive: true, force: true });
await rm(path.join(projectRoot, 'dist'), { recursive: true, force: true });

console.log('已生成根目录 index.html 与 assets/，未保留 dist/。');
