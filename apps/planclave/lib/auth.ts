import { cookies, headers } from "next/headers";

export interface Identity {
  email: string;
  name: string;
}

const COOKIE_NAME = "planclave_identity";

export async function getIdentity(): Promise<Identity | null> {
  // 1) Check X-Planclave-Email / X-Planclave-Name headers (CLI)
  const h = await headers();
  const headerEmail = h.get("x-planclave-email");
  const headerName = h.get("x-planclave-name");
  if (headerEmail && headerName) {
    return { email: headerEmail, name: headerName };
  }

  // 2) Fall back to cookie (browser)
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const decoded = decodeURIComponent(raw);
  const [email, ...nameParts] = decoded.split(":");
  const name = nameParts.join(":");

  if (!email || !name) return null;
  return { email, name };
}

export function encodeIdentity(email: string, name: string): string {
  return encodeURIComponent(`${email}:${name}`);
}
