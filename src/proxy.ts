import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import { i18n } from "@root/i18n.config";
import Negotiator from "negotiator";
import { NextRequest, NextResponse } from "next/server";
import { features } from "./app/lib/features";

const headerName = "X-Language-Preference";

const isProtectedRoute = createRouteMatcher([
  "/:lang/dashboard",
  "/:lang/dashboard/:path*",
  // Organizer-only; the mutation checks the role too.
  "/:lang/meet/:id/reschedule",
]);

function getLocale(req: NextRequest): string | "" {
  // Explicit choice from the language switch wins over Accept-Language.
  const chosen = req.cookies.get("lang")?.value;
  if (chosen && (i18n.locales as string[]).includes(chosen)) return chosen;

  const negotiatorHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const locales: string[] = i18n.locales;
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();

  const locale = matchLocale(languages, locales, i18n.defaultLocale);
  return locale;
}

function handleLocale(req: NextRequest) {
  const locales: string[] = i18n.locales;
  let siteLocale = i18n.defaultLocale;

  const { pathname } = req.nextUrl;
  const pathnameHasLocale = locales.some((locale) => {
    siteLocale = locale;
    return pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`;
  });

  if (pathnameHasLocale) {
    const response = NextResponse.next();
    response.headers.set(headerName, siteLocale);
    return response;
  }

  // Skip for public assets
  const isPublicAsset =
    pathname.startsWith("/imgs") || pathname === "/imgs/og-image.webp";
  if (isPublicAsset) {
    return NextResponse.next();
  }

  // Redirect if there is no locale
  siteLocale = getLocale(req);
  req.nextUrl.pathname = `/${siteLocale}${pathname}`;
  return new NextResponse(null, {
    status: 302,
    headers: {
      [headerName]: siteLocale,
      Location: req.nextUrl.toString(),
    },
  });
}

// Account-only pages; sent home while sign-in is switched off.
const isAccountRoute = createRouteMatcher([
  "/:lang/dashboard",
  "/:lang/dashboard/:path*",
  "/:lang/join/:path*",
  "/:lang/meet/:id/reschedule",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (!features.auth && isAccountRoute(req)) {
    const lang = req.nextUrl.pathname.split("/")[1];
    return NextResponse.redirect(new URL(`/${lang}/`, req.url));
  }
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  return handleLocale(req);
});

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|imgs).*)",
  ],
};
