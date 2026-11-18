/* Parser berjalan di Web Worker agar file besar tidak membekukan antarmuka. */
importScripts('/vendor/xlsx.full.min.js', '/vendor/papaparse.min.js');
let workbook;
self.onmessage = async ({ data }) => {
  try {
    if (data.file) {
      if (/\.csv$/i.test(data.file.name)) {
        const text = await data.file.text();
        const parsed = Papa.parse(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' });
        if (parsed.errors.length) throw Error('CSV tidak dapat dibaca: ' + parsed.errors[0].message);
        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(parsed.data), 'Data CSV');
      } else workbook = XLSX.read(await data.file.arrayBuffer(), { type: 'array', cellDates: false });
    }
    if (!workbook || !workbook.SheetNames.length) throw Error('File tidak memiliki sheet.');
    const sheet = data.sheet || workbook.SheetNames[0];
    const ws = workbook.Sheets[sheet];
    if (!ws) throw Error('Sheet tidak ditemukan.');
    const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
    if (range && (range.e.r > 100000 || range.e.c > 200)) throw Error('Batas impor adalah 100.000 baris dan 200 kolom per sheet.');
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
    if (matrix.length < 2) throw Error('Sheet harus memiliki header dan setidaknya satu baris data.');
    const headers = matrix[0].map(v => String(v).trim());
    if (headers.some(h => !h) || new Set(headers).size !== headers.length) throw Error('Header kolom harus terisi dan tidak boleh duplikat.');
    const rows = matrix.slice(1).map(row => Object.fromEntries(headers.map((h,i) => [h, row[i] ?? ''])));
    self.postMessage({ sheets: workbook.SheetNames, sheet, headers, rows });
  } catch (e) { self.postMessage({ error: e.message || 'File tidak dapat dibaca.' }); }
};
