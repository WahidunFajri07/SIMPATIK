import { PrismaClient, Prisma } from "@prisma/client";
import { dataContoh } from "../src/lib/contoh";
const db = new PrismaClient();
try {
  const { masters, titik } = dataContoh();
  for (const m of masters)
    await db.$transaction(async (tx) => {
      if (await tx.gudangMaster.findUnique({ where: { id: m.id } })) return;
      await tx.gudangMaster.create({
        data: { ...m, dibuat: new Date(m.dibuat) },
      });
      await tx.titikMaster.createMany({
        data: titik
          .filter((t) => t.masterId === m.id)
          .map(({ id, ...t }) => ({
            ...t,
            info: (t.info ?? {}) as Prisma.InputJsonValue,
          })),
      });
    });
  console.log(
    "Tiga master simulasi disiapkan tanpa menimpa sumber yang sudah ada.",
  );
} finally {
  await db.$disconnect();
}
