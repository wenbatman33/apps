// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },

  app: {
    baseURL: '/apps/duty_Schedule/', // 針對 GitHub Pages 設定 baseURL (配合 showcase)
    buildAssetsDir: 'assets', // 或其他子目錄，避免底線開頭（gh-pages 預設不發佈 underscore 檔案，但有 .nojekyll 就還好）
    head: {
      title: '欣聯大心 社區委員輪值抽籤系統',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700;900&family=Noto+Sans+TC:wght@300;400;500;700&display=swap' },
      ]
    }
  },

  css: ['~/assets/css/style.css'],
})
