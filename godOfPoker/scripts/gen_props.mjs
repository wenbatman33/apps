#!/usr/bin/env node
// 道具生圖：籌碼堆（供彩池圖示與贏池動畫使用）
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const items = [
  {
    id: "chips_pile",
    prompt: "一疊撲克籌碼的遊戲圖示：三小疊高低錯落的圓形籌碼堆（金色為主、搭配暗紅色與墨綠色，籌碼側面有白色刻紋），乾淨俐落的高質感遊戲 UI 圖示風格，微俯視角 45 度，柔和高光，透明背景（transparent background PNG，去背輸出 RGBA）",
  },
];

for (const item of items) {
  const dir = path.join(ROOT, "assets/props");
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${item.id}.png`);
  if (existsSync(out)) { console.log(`⏭ ${item.id} exists`); continue; }
  const prompt = `請用內建 image_gen 工具產一張 1024x1024 PNG。\n\n主題：${item.prompt}。\n\n完成後把產出複製到絕對路徑 ${out} 並用 sips 縮放到 1024x1024。回報 OK 即可。`;
  console.log(`🎨 ${item.id} ...`);
  try {
    execSync(`codex exec --skip-git-repo-check ${JSON.stringify(prompt)}`, { stdio: "pipe", timeout: 900000 });
    console.log(existsSync(out) ? `✅ ${item.id}` : `❌ ${item.id} 檔案不存在`);
  } catch (e) {
    console.log(`❌ ${item.id} — ${e.message.slice(0, 150)}`);
  }
}
