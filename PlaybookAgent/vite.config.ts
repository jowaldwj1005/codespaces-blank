/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), powerApps()],
  build: {
    // Disable minification to stay within Codespace memory limits during build.
    // Re-enable (remove this line) for production deploys on a machine with >4GB free.
    minify: false,
    rollupOptions: {
      maxParallelFileOps: 3,
      output: {
        manualChunks: {
          'vendor-monaco': ['monaco-editor', '@monaco-editor/react'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
