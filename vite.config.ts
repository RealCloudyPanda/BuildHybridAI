/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { offlineShell } from "./offline-plugin";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), offlineShell()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
});
