import { redirect } from "next/navigation";
import { pengguna } from "@/lib/auth";
import { Cangkang } from "@/components/cangkang";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await pengguna())) redirect("/masuk");
  return <Cangkang>{children}</Cangkang>;
}
