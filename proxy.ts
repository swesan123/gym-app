import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { hasAuthEnv } from "@/lib/env";

const PRODUCTION_MISSING_ENV_BODY =
  "This app requires APP_PASSCODE (8+ characters) and AUTH_SECRET (32+ characters) to be set in production.";

export async function proxy(request: NextRequest) {
  if (!hasAuthEnv()) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(PRODUCTION_MISSING_ENV_BODY, {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET!;
  const valid =
    token !== undefined && (await verifySessionToken(token, secret));

  if (valid) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!login(?:/|$)|_next/static|_next/image|favicon\\.ico|icon(?:/|$)|manifest|.*\\.(?:png|jpe?g|gif|webp|svg|ico|css|js|mjs|woff2?|ttf|eot|map)$).*)",
  ],
};
