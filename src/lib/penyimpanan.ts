import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { gudangContoh } from "./contoh";
import type { Gudang } from "./tipe";
const globalStore = globalThis as unknown as { storeQueue?: Promise<unknown> };
const lokasi = path.join(process.cwd(), "data", "simpatik.json");
async function baca(): Promise<Gudang> {
  try {
    return JSON.parse(await readFile(lokasi, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return gudangContoh();
  }
}
// Antrian mencakup baca–ubah–rename agar batch paralel tidak saling menimpa.
export async function lokal<T>(
  fn: (store: Gudang) => T | Promise<T>,
  tulis = false,
): Promise<T> {
  const result = (globalStore.storeQueue ?? Promise.resolve()).then(
    async () => {
      const store = await baca();
      const out = await fn(store);
      if (tulis) {
        await mkdir(path.dirname(lokasi), { recursive: true });
        await writeFile(lokasi + ".tmp", JSON.stringify(store));
        await rename(lokasi + ".tmp", lokasi);
      }
      return out;
    },
  );
  globalStore.storeQueue = result.catch(() => {});
  return result;
}
