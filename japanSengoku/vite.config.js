import { defineConfig } from 'vite'
import { cp } from 'fs/promises'
import { existsSync } from 'fs'

export default defineConfig({
  plugins: [
    {
      name: 'copy-assets-to-dist',
      // build 結束後自動把 assets/ 複製到 dist/assets/
      closeBundle: async () => {
        const dirs = ['images', 'sound', 'BGM']
        for (const dir of dirs) {
          const src = `assets/${dir}`
          if (existsSync(src)) {
            await cp(src, `dist/assets/${dir}`, { recursive: true })
            console.log(`✓ copied ${src} → dist/assets/${dir}`)
          }
        }
      }
    }
  ]
})
