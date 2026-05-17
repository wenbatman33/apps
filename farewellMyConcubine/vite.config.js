import { defineConfig } from 'vite'

// public/ 內的 img/ 由 Vite 自動以根路徑提供，build 時自動複製到 dist/
export default defineConfig({
  base: './'
})
