import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "admin_token";
const TOKEN_EXPIRY = "7d"; // 7 days
const DEV_SECRET = "dev-only-secret-not-for-production-use-0000";

/**
 * The signing key. Production refuses to run on a missing or short secret:
 * a guessable key lets anyone mint an admin cookie. Local dev gets a fallback
 * so `npm run dev` works without setup.
 */
function getSecret() {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV !== "production") return new TextEncoder().encode(DEV_SECRET);
  throw new Error("JWT_SECRET is missing or shorter than 32 characters");
}

export function isAuthConfigured() {
  try {
    getSecret();
    return true;
  } catch {
    return false;
  }
}

/**
 * Sign a JWT for an admin user. Payload: { sub: userId, role, email, ver: tokenVersion }.
 */
export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret());
}

/**
 * Verify JWT and return payload or null.
 */
export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get token from request: cookie (admin_token) or Authorization Bearer.
 */
export function getTokenFromRequest(request) {
  const cookie = request.cookies?.get(COOKIE_NAME)?.value;
  if (cookie) return cookie;
  const auth = request.headers?.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export { COOKIE_NAME };
