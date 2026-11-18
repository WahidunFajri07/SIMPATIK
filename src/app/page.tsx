import { redirect } from "next/navigation";
import { pengguna } from "@/lib/auth";
export default async function Home() {
  redirect((await pengguna()) ? "/ruang-kerja" : "/masuk");
}
