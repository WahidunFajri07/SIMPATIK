import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      args: [
        "--enable-webgl",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  reporter: "list",
});
