import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const pakaiPostgis = !!process.env.DATABASE_URL;
export function db() {
  if (!globalDb.prisma) globalDb.prisma = new PrismaClient();
  return globalDb.prisma;
}
export function serial<T>(value: unknown): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? String(v) : v)),
  );
}
