import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "ar", "es", "fr", "de", "zh", "it"];
const defaultLocale = "en";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets, public files, and api/internal routes
  if (
    pathname.includes(".") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/avatars/")
  ) {
    return;
  }

  // Check if pathname already has a valid locale segment
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Determine the target locale from cookie or Accept-Language header
  let locale = defaultLocale;
  const cookieLocale = request.cookies.get("fahem_language")?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const acceptLanguage = request.headers.get("accept-language");
    if (acceptLanguage) {
      const match = acceptLanguage.match(/([a-z]{2})/gi);
      if (match) {
        const preferred = match[0].toLowerCase();
        if (locales.includes(preferred)) {
          locale = preferred;
        }
      }
    }
  }

  // Rewrite or redirect to the locale-prefixed URL
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, public assets like favicon, images, etc.) and api routes
    "/((?!api|_next/static|_next/image|favicon.ico|avatars|screenshots|doc|ignore|log|memory|scratches).*)",
  ],
};
