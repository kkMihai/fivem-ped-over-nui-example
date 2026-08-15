import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // nui:// loads the built page off disk, so asset paths must be relative
  base: "./",

  build: {
    outDir: "build",
    emptyOutDir: true,

    // flat output, no assets/ subfolder, so `files { 'web/build/*' }` catches
    // everything in fxmanifest
    rollupOptions: {
      output: {
        entryFileNames: "[name]-[hash].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: "[name]-[hash][extname]",
      },
    },
  },

  server: {
    port: 5173,
  },
});
