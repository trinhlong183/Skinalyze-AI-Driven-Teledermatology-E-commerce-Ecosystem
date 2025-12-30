import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface UserData {
  role: "admin" | "staff" | "dermatologist" | "customer";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);

  const token = request.cookies.get("access_token")?.value;
  const userDataCookie = request.cookies.get("user_data")?.value;
  let user: UserData | null = null;

  try {
    if (userDataCookie) {
      user = JSON.parse(userDataCookie) as UserData;
    }
  } catch {
    user = null;
  }

  const isAuthenticated = !!token && !!user;

  const isLoginPage =
    pathname === "/login" ||
    pathname === "/admin/login" ||
    pathname === "/staff/login";

  if (isLoginPage) {
    if (isAuthenticated && user) {
      switch (user.role) {
        case "admin":
          return NextResponse.redirect(
            new URL("/admin/dashboard", request.url)
          );
        case "staff":
          return NextResponse.redirect(
            new URL("/staff/dashboard", request.url)
          );
        case "dermatologist":
          return NextResponse.redirect(
            new URL("/dermatologist/dashboard", request.url)
          );
        case "customer":
          return NextResponse.redirect(new URL("/", request.url));
      }
    }

    if (pathname === "/admin/login" || pathname === "/staff/login") {
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin")) {
    if (user?.role !== "admin") {
      return NextResponse.redirect(loginUrl);
    }
  }

  if (user && pathname.startsWith("/staff")) {
    const allowedRoles = ["staff", "admin", "dermatologist"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.redirect(loginUrl);
    }
  }

  if (user && pathname.startsWith("/dermatologist")) {
    const allowedRoles = ["dermatologist", "admin"];
    if (!allowedRoles.includes(user?.role)) {
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dermatologist/:path*",
    "/staff/:path*",
    "/login",
  ],
};
