import { defineConfig } from 'vite';

// base: './' 讓 dist 可被部署到任意子路徑（例如 /fishGame/dist/）
// assetsDir: 'build' 讓 vite 產物進入 dist/build/，避免和遊戲素材 dist/assets/ 衝突
export default defineConfig({
  base: './',
  build: {
    assetsDir: 'build'
  }
});
