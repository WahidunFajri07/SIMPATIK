/* Parser berjalan di Web Worker agar file besar tidak membekukan antarmuka. */
importScripts("/vendor/xlsx.full.min.js", "/vendor/papaparse.min.js");
let workbook;
self.onmessage = async ({ data }) => {
  try {
    if (data.file) {
      if (/\.csv$/i.test(data.file.name)) {
        const text = await data.file.text();
        const parsed = Papa.parse(text.replace(/^\uFEFF/, ""), {
          skipEmptyLines: false,
        });
        if (parsed.errors.length)
          throw Error("CSV tidak dapat dibaca: " + parsed.errors[0].message);
        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet(parsed.data),
          "Data CSV",
        );
      } else
        workbook = XLSX.read(await data.file.arrayBuffer(), {
          type: "array",
          cellDates: false,
        });
    }
    if (!workbook || !workbook.SheetNames.length)
      throw Error("File tidak memiliki sheet.");
    const sheet = data.sheet || workbook.SheetNames[0];
    const ws = workbook.Sheets[sheet];
    if (!ws) throw Error("Sheet tidak ditemukan.");
    const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : null;
    if (range && (range.e.r > 100000 || range.e.c > 200))
      throw Error("Batas impor adalah 100.000 baris dan 200 kolom per sheet.");
    const matrix = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: true,
    });
    const headerIndex = matrix.findIndex((row) =>
      row.some((value) => String(value ?? "").trim() !== ""),
    );
    if (headerIndex < 0 || matrix.length < headerIndex + 2)
      throw Error(
        "Sheet harus memiliki header dan setidaknya satu baris data.",
      );
    const headers = matrix[headerIndex].map((v) => String(v).trim());
    if (headers.some((h) => !h) || new Set(headers).size !== headers.length)
      throw Error("Header kolom harus terisi dan tidak boleh duplikat.");
    const rows = [],
      nomorBaris = [];
    matrix.slice(headerIndex + 1).forEach((row, index) => {
      if (!row.some((value) => String(value ?? "").trim() !== "")) return;
      rows.push(Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])));
      nomorBaris.push((range?.s.r ?? 0) + headerIndex + index + 2);
    });
    if (!rows.length)
      throw Error("Sheet harus memiliki setidaknya satu baris data.");
    self.postMessage({
      sheets: workbook.SheetNames,
      sheet,
      headers,
      rows,
      nomorBaris,
    });
  } catch (e) {
    self.postMessage({ error: e.message || "File tidak dapat dibaca." });
  }
};
