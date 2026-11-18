export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !url.includes("/auth"))
      window.location.href = "/masuk";
    throw new Error(data.error ?? "Permintaan gagal.");
  }
  return data as T;
}
export const kirim = <T>(url: string, data: unknown) =>
  api<T>(url, { method: "POST", body: JSON.stringify(data) });
export const jumlah = (n: number) => new Intl.NumberFormat("id-ID").format(n);
export const meter = (n: number | null) =>
  n === null
    ? "—"
    : n.toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
