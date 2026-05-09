import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

async function getAuthToken(req: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return null;
  }

  const isSecureRequest =
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https";

  return (
    (await getToken({
      req,
      secret,
      secureCookie: isSecureRequest,
    })) ??
    (await getToken({
      req,
      secret,
      secureCookie: !isSecureRequest,
    }))
  );
}

export async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const token = await getAuthToken(req);
  const isLoggedIn = Boolean(token);
  const isAdmin = token?.role === "ADMIN";
  const path = nextUrl.pathname;
  const callbackPath = `${nextUrl.pathname}${nextUrl.search}`;

  if (path.startsWith("/admin")) {
    if (path === "/admin/login") {
      if (isLoggedIn && isAdmin) {
        return NextResponse.redirect(new URL("/admin", nextUrl));
      }

      return NextResponse.next();
    }

    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(
          `/admin/login?callbackUrl=${encodeURIComponent(callbackPath)}`,
          nextUrl
        )
      );
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    return NextResponse.next();
  }

  if (path.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`, nextUrl)
      );
    }

    return NextResponse.next();
  }

  if (path === "/login" || path === "/register") {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(isAdmin ? "/admin" : "/dashboard", nextUrl)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
