import { json } from "@/lib/api";
export async function GET() {
  return json({ aplikasi: "SIMPATIK", status: "siap", versi: "1.0.0" });
}
