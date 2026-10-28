import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
// API phía máy chủ (giữ API key ở server) được gắn thẳng vào dev server,
// nên chỉ cần `npm run dev` là chạy cả giao diện lẫn API.
import { createApiHandler } from './server/api.mjs'

function mathBuddyApi(): Plugin {
  return {
    name: 'math-buddy-api',
    configureServer(server) {
      server.middlewares.use(createApiHandler())
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApiHandler())
    },
  }
}

export default defineConfig({
  // GitHub Pages phục vụ app ở /<tên-repo>/, nên base được truyền qua BASE_PATH khi build.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), mathBuddyApi()],
  server: { port: 5173, open: false },
})
