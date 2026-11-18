import { demoDiizinkan, pengguna } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FormMasuk } from "./form-masuk";
export default async function Page() {
  if (await pengguna()) redirect("/ruang-kerja");
  return <FormMasuk demo={demoDiizinkan()} />;
}
