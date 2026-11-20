import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as XLSX from "xlsx";
import Papa from "papaparse";

async function baca(file: {
  name: string;
  arrayBuffer?: () => Promise<Buffer>;
  text?: () => Promise<string>;
}) {
  let hasil: {
    rows: Record<string, unknown>[];
    nomorBaris: number[];
    error?: string;
  };
  const self = {
    onmessage: undefined as unknown as (event: {
      data: { file: typeof file };
    }) => Promise<void>,
    postMessage: (data: typeof hasil) => {
      hasil = data;
    },
  };
  runInNewContext(readFileSync("public/pekerja-excel.js", "utf8"), {
    self,
    XLSX,
    Papa,
    importScripts() {},
  });
  await self.onmessage({ data: { file } });
  return JSON.parse(JSON.stringify(hasil!)) as typeof hasil;
}

test("worker Excel mempertahankan nomor baris sumber dan nilai invalid untuk koreksi", async () => {
  const ws = XLSX.utils.aoa_to_sheet([
    [],
    [],
    ["description", "longitudex", "latitudey"],
    ["A", 108.545097, -6.697219],
    [],
    ["B", 108.545097, -6697219],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const data = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const hasil = await baca({ name: "uji.xlsx", arrayBuffer: async () => data });
  assert.equal(hasil.error, undefined);
  assert.deepEqual(hasil.nomorBaris, [4, 6]);
  assert.equal(hasil.rows[1].latitudey, -6697219);
});

test("worker CSV mempertahankan baris kosong dalam penomoran kesalahan", async () => {
  const hasil = await baca({
    name: "uji.csv",
    text: async () =>
      "description,longitudex,latitudey\nA,108,-6.7\n\nB,108,-6697219\n",
  });
  assert.equal(hasil.error, undefined);
  assert.deepEqual(hasil.nomorBaris, [2, 4]);
  assert.equal(hasil.rows.length, 2);
});
