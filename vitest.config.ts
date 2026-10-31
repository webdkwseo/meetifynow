/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/tests/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      // Same as tsconfig "paths".
      "@": path.resolve(__dirname, "./src/app"),
      "@src": path.resolve(__dirname, "./src"),
      "@root": path.resolve(__dirname, "./"),
    },
  },
});
