import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
    resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react-pdf") || id.includes("pdfjs-dist")) {
              return "vendor-pdf";
            }
            if (id.includes("react-quill") || id.includes("quill")) {
              return "vendor-quill";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "vendor-charts";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("react-router-dom")
            ) {
              return "vendor-core";
            }
            if (id.includes("@reduxjs") || id.includes("react-redux")) {
              return "vendor-redux";
            }
          }
        },
      }
    }
  }
})
