import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

function getCallbackPath(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);
  const isAdmin = req.auth?.user?.role === "ADMIN";
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
        new URL(
          `/admin/login?callbackUrl=${encodeURIComponent(getCallbackPath(nextUrl))}`,
          nextUrl,
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
        new URL(
          `/login?callbackUrl=${encodeURIComponent(getCallbackPath(nextUrl))}`,
          nextUrl,
        )
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
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
