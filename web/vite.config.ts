import { defineConfig } from "vite";

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "react": "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
    },
  },
  base: "./",
  server: { port: 5173, host: true },
  build: { outDir: "dist" },
  esbuild: { jsx: "automatic", jsxImportSource: "preact" },
});
