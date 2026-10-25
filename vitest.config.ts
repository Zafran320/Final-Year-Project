import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./client/src/setupTests.ts"],
    environmentMatchGlobs: [
      ["client/**", "jsdom"],
      ["server/**", "node"],
    ],
    testTimeout: 15000,
    maxConcurrency: 4,
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "client/src/**/*.test.{ts,tsx}", "client/src/**/*.spec.{ts,tsx}"],
  },
});
