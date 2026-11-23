import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "@playwright/test";
const e2e = existsSync(".env.e2e")
  ? parseEnv(readFileSync(".env.e2e", "utf8"))
  : {};
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  // Server tes memakai akun E2E sebagai admin utama, bukan akun produksi di .env.
  // Dijalankan dari build produksi: dev server melakukan reload kompilasi
  // on-demand yang mengulang animasi intro di tengah tes.
  webServer: {
    command: "npm run build && npm start",
    url: "http://127.0.0.1:3000/api/status",
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
    env: {
      ...(e2e.E2E_ADMIN_EMAIL ? { ADMIN_EMAIL: e2e.E2E_ADMIN_EMAIL } : {}),
    },
  },
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
