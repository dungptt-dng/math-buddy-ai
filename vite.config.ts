import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ứng dụng tĩnh: đường dẫn tương đối để chạy được ở mọi thư mục con (ví dụ GitHub Pages /math-buddy-ai/).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
});
