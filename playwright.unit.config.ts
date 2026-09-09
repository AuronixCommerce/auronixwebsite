import { defineConfig } from "@playwright/test";
// These tests exercise pure application functions without launching a browser or server.
export default defineConfig({
  testDir: "./tests/unit",
  workers: 1,
  reporter: "list",
});
