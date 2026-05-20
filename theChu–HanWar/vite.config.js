import { defineConfig } from 'vite';

// 楚漢相爭 Slot — Vite 設定
// base 設為相對路徑，方便部署到 GitHub Pages 子路徑
export default defineConfig({
  base: './',
  server: {
    port: 5180,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
