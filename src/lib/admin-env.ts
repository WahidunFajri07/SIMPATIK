import { cocokSandi } from "./akun";

export async function cocokAdminEnv(
  email: string,
  sandi: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH || email !== env.ADMIN_EMAIL)
    return false;
  return cocokSandi(sandi, env.ADMIN_PASSWORD_HASH);
}
