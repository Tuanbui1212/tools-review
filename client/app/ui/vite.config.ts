import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Giai đoạn đầu App chạy dạng web local (D022). Sau M04, /api của engine local sẽ thêm vào đây.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
