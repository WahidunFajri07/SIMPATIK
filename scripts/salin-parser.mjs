import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/vendor", { recursive: true });
for (const [src, dest] of [
  ["node_modules/xlsx/dist/xlsx.full.min.js", "xlsx.full.min.js"],
  ["node_modules/xlsx/LICENSE", "LICENSE-sheetjs.txt"],
  ["node_modules/papaparse/papaparse.min.js", "papaparse.min.js"],
  ["node_modules/papaparse/LICENSE", "LICENSE-papaparse.txt"],
])
  await copyFile(src, "public/vendor/" + dest);
