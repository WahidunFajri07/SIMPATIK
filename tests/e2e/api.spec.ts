import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("validasi API, BBOX, idempotensi dan konfirmasi persisten", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/auth", {
        headers: { origin: "https://contoh.invalid" },
        data: { demo: true },
      })
    ).status(),
  ).toBe(403);
  await request.post("/api/auth", { data: { demo: true } });
  expect((await request.get("/api/titik-peta?minX=NaN")).status()).toBe(400);
  expect(
    (
      await request.get("/api/titik-peta?minX=108&maxX=107&minY=-7&maxY=-6")
    ).status(),
  ).toBe(400);
  const payload = {
    batchId: randomUUID(),
    nama: "Master API",
    kategori: "TRAFO",
    file: "uji.csv",
    titik: [{ deskripsi: "=1+1", x: 107.7, y: -6.8 }],
  };
  const first = await request.post("/api/master", { data: payload });
  expect(first.ok()).toBeTruthy();
  const m = await first.json();
  const retry = await request.post("/api/master", { data: payload });
  expect((await retry.json()).id).toBe(m.id);
  expect((await retry.json()).total).toBe(1);
  expect(
    (
      await request.post("/api/master", {
        data: {
          ...payload,
          batchId: randomUUID(),
          titik: [{ deskripsi: "", x: 107, y: -6 }],
        },
      })
    ).status(),
  ).toBe(400);
  const input = {
    batchId: randomUUID(),
    nama: "Sesi API",
    masterIds: [m.id],
    toleransi: 15,
    titik: [{ deskripsi: "", x: 107.7, y: -6.8 }],
  };
  const s = await (await request.post("/api/cocokkan", { data: input })).json();
  expect(
    (await (await request.post("/api/cocokkan", { data: input })).json()).total,
  ).toBe(1);
  const h = (await (await request.get(`/api/sesi?id=${s.id}`)).json()).hasil[0];
  expect(h.status).toBe("KANDIDAT_LOKASI_TERDEKAT");
  expect(
    (
      await request.post("/api/konfirmasi", {
        data: { sesiId: s.id, id: h.id, keputusan: "PAKAI_KOORDINAT_BARU" },
      })
    ).status(),
  ).toBe(400);
  const decision = {
    sesiId: s.id,
    id: h.id,
    keputusan: "PAKAI_KOORDINAT_BARU",
    x: 107.71,
    y: -6.81,
  };
  expect(
    (await request.post("/api/konfirmasi", { data: decision })).ok(),
  ).toBeTruthy();
  await request.post("/api/konfirmasi", { data: decision });
  const saved = await (await request.get(`/api/sesi?id=${s.id}`)).json();
  expect(saved.sesi.dikonfirmasi).toBe(1);
  expect(saved.hasil[0].hasilX).toBe(107.71);
  expect(saved.hasil[0].bx).toBe(107.7);
  const csv = await (
    await request.get(`/api/konfirmasi?sesiId=${s.id}&format=csv`)
  ).text();
  expect(csv).toContain("'=1+1");
  const bbox = await (
    await request.get(
      `/api/titik-peta?minX=107.69&maxX=107.705&minY=-6.805&maxY=-6.795&sesiId=${s.id}`,
    )
  ).json();
  expect(bbox.points.length).toBe(2);
  await request.delete("/api/auth");
  expect((await request.get("/api/sesi")).status()).toBe(401);
});
