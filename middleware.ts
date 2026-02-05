import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (first === "zh") {
    return NextResponse.next();
  }

  if (first === "en") {
    const url = request.nextUrl.clone();
    url.pathname = `/${segments.slice(1).join("/")}`;
    return NextResponse.redirect(url);
  }

  const cookieLang = request.cookies.get("ui_lang")?.value;
  const acceptLang = request.headers.get("accept-language") ?? "";
  const prefersZh = cookieLang
    ? cookieLang === "zh"
    : acceptLang.toLowerCase().includes("zh");

  if (prefersZh) {
    const url = request.nextUrl.clone();
    url.pathname = `/zh${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
