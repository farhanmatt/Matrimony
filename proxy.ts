import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isSecureRequest(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto");

  return forwardedProto === "https" || req.nextUrl.protocol === "https:";
}

export async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: isSecureRequest(req),
  });
  const isLoggedIn = Boolean(token);
  const isAdmin = token?.role === "ADMIN";
  const path = nextUrl.pathname;

  if (path.startsWith("/admin")) {
    if (path === "/admin/login") {
      if (isLoggedIn && isAdmin) {
        return NextResponse.redirect(new URL("/admin", nextUrl));
      }

      return NextResponse.next();
    }

    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(`/admin/login?callbackUrl=${path}`, nextUrl)
      );
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    return NextResponse.next();
  }

  if (path.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${path}`, nextUrl));
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
