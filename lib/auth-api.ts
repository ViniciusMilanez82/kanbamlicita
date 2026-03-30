import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { auth } from "@/auth";

export type AuthFromRequest = { userId: string; role: string };

function authSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

/** Nomes de cookie de sessão JWT do Auth.js / NextAuth v5 (inclui versão fatiada .0, .1…). */
function isSessionCookieName(name: string): boolean {
  return (
    name === "authjs.session-token" ||
    name.startsWith("authjs.session-token.") ||
    name === "__Secure-authjs.session-token" ||
    name.startsWith("__Secure-authjs.session-token.")
  );
}

/** Ordem em que tentamos o prefixo __Secure- no nome do cookie. */
function preferSecureCookie(req: Request): boolean {
  const fwd = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (fwd === "https") return true;
  const base = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  if (base.startsWith("https:")) return true;
  if (process.env.VERCEL === "1") return true;
  return false;
}

async function tokenFromGetToken(req: Request, secret: string, secureFirst: boolean) {
  const order = secureFirst ? [true, false] : [false, true];
  for (const secureCookie of order) {
    const token = await getToken({ req, secret, secureCookie });
    if (token) {
      const userId = (token as { id?: string }).id ?? token.sub;
      if (userId) {
        return { userId, role: (token as { role?: string }).role ?? "user" } satisfies AuthFromRequest;
      }
    }
  }
  return null;
}

/**
 * Em Route Handlers o `Request` às vezes chega sem header `Cookie` preenchido como o Auth.js espera.
 * `cookies()` do Next lê os cookies da requisição atual de forma confiável.
 */
async function sessionCookieHeaderFromNext(): Promise<string | null> {
  try {
    const store = await cookies();
    const relevant = store.getAll().filter((c) => isSessionCookieName(c.name));
    if (relevant.length === 0) return null;
    return relevant.map((c) => `${c.name}=${c.value}`).join("; ");
  } catch {
    return null;
  }
}

/**
 * Autenticação em Route Handlers (`app/api/...`).
 *
 * 1) `getToken` com o `Request` da rota.
 * 2) `getToken` com header `Cookie` montado a partir de `cookies()` do Next (quando o passo 1 falha).
 * 3) `auth()` por último.
 */
export async function getAuthFromRequest(req: Request): Promise<AuthFromRequest | null> {
  const ext = req as Request & { auth?: { user?: { id?: string; role?: string } } };
  if (ext.auth?.user?.id) {
    return { userId: ext.auth.user.id, role: ext.auth.user.role ?? "user" };
  }

  const secret = authSecret();
  const secureFirst = preferSecureCookie(req);

  if (secret) {
    const fromReq = await tokenFromGetToken(req, secret, secureFirst);
    if (fromReq) return fromReq;

    const built = await sessionCookieHeaderFromNext();
    if (built) {
      const synthetic = new Request(req.url, { headers: { cookie: built } });
      const fromCookies = await tokenFromGetToken(synthetic, secret, secureFirst);
      if (fromCookies) return fromCookies;
    }
  }

  try {
    const session = await auth();
    const user = session?.user;
    if (user?.id) return { userId: user.id, role: user.role ?? "user" };
  } catch {
    /* ignora */
  }

  return null;
}

export function naoAutenticado() {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}
