import { NextResponse } from "next/server";

export function middleware(request) {
  const isAuthed = request.cookies.get("admin_auth")?.value === "1";

  if (!isAuthed) {
    const loginUrl = new URL("/admin-login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/report/:path*",
    "/results/:path*",
    "/dashboard/:path*",
    "/admin-questions/:path*",
    "/admin-users/:path*",
  ],
};
