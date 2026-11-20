import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { masuk } from "./masuk";

test("bulk master delete removes selected masters in one request", async ({
  request,
}) => {
  await masuk(request);
  const make = async (nama: string) =>
    (await request.post("/api/master", {
      data: {
        batchId: randomUUID(),
        nama,
        kategori: "TRAFO",
        file: "bulk.csv",
        titik: [{ deskripsi: nama, x: 107.7, y: -6.8 }],
      },
    })).json();
  const a = await make(`Bulk master A ${Date.now()}`);
  const b = await make(`Bulk master B ${Date.now()}`);
  const deleted = await request.delete("/api/master", {
    data: { ids: [a.id, b.id] },
  });
  expect(deleted.ok()).toBeTruthy();
  const masters = await (await request.get("/api/master")).json();
  expect(masters.masters.some((m: { id: string }) => m.id === a.id)).toBeFalsy();
  expect(masters.masters.some((m: { id: string }) => m.id === b.id)).toBeFalsy();
});

test("bulk session delete is atomic and rejects empty or duplicate ids", async ({
  request,
}) => {
  await masuk(request);
  const master = await (
    await request.post("/api/master", {
      data: {
        batchId: randomUUID(),
        nama: `Bulk source ${Date.now()}`,
        kategori: "TRAFO",
        file: "bulk.csv",
        titik: [{ deskripsi: "BULK-001", x: 107.7, y: -6.8 }],
      },
    })
  ).json();
  const makeSession = async (nama: string) =>
    (
      await request.post("/api/cocokkan", {
        data: {
          batchId: randomUUID(),
          nama,
          masterIds: [master.id],
          toleransi: 15,
          titik: [{ deskripsi: "BULK-001", x: 107.7, y: -6.8 }],
        },
      })
    ).json();
  const a = await makeSession(`Bulk session A ${Date.now()}`);
  const b = await makeSession(`Bulk session B ${Date.now()}`);
  expect(
    (await request.delete("/api/sesi", { data: { ids: [] } })).status(),
  ).toBe(400);
  expect(
    (await request.delete("/api/sesi", { data: { ids: [a.id, a.id] } })).status(),
  ).toBe(400);
  const atomic = await request.delete("/api/sesi", {
    data: { ids: [a.id, randomUUID()] },
  });
  expect(atomic.status()).toBe(404);
  expect((await request.get(`/api/sesi?id=${a.id}`)).status()).toBe(200);
  const deleted = await request.delete("/api/sesi", {
    data: { ids: [a.id, b.id] },
  });
  expect(deleted.ok()).toBeTruthy();
  expect((await request.get(`/api/sesi?id=${a.id}`)).status()).toBe(404);
  expect((await request.get(`/api/sesi?id=${b.id}`)).status()).toBe(404);
  expect((await request.get(`/api/master`)).json()).resolves.toMatchObject({
    masters: expect.arrayContaining([expect.objectContaining({ id: master.id })]),
  });
  await request.delete(`/api/master?id=${master.id}`);
});
