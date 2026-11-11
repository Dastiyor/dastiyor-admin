import { NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest, COOKIE_NAME } from "./lib/auth";

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/health",
];

function isPublicApi(pathname) {
  return PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(p + "?"));
}

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// Blocks requests that change data when a browser says they came from another
// site, including other *.dastiyor.com sites (SameSite cookies don't cover those).
// Requests with no Origin and no Sec-Fetch-Site come from scripts, not browsers.
function isCrossOrigin(request) {
  if (SAFE_METHODS.includes(request.method)) return false;
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    try {
      return new URL(origin).host !== host;
    } catch {
      return true; // "null" or malformed
    }
  }
  const site = request.headers.get("sec-fetch-site");
  return site === "cross-site" || site === "same-site";
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && isCrossOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Protect all /api/* except auth and health
  if (pathname.startsWith("/api/") && !isPublicApi(pathname)) {
    const token = getTokenFromRequest(request);
    const payload = await verifyToken(token);
    if (!payload?.sub || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
