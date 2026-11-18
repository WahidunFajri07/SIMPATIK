import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@prisma/client", "xlsx"],
  devIndicators: false,
};
export default config;
