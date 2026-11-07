import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { verifyToken, getTokenFromRequest } from "./auth";

/** Throw from a handler to send `{ error: message }` with this status. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * The signed-in admin, checked against the database, or null.
 *
 * The middleware only checks the JWT signature. This also rejects tokens for
 * accounts that were deleted, demoted, or had their password reset (tokenVersion
 * bumped) since the token was issued.
 */
export async function getAdmin(request) {
  const payload = await verifyToken(getTokenFromRequest(request));
  if (!payload?.sub) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, fullName: true, email: true, role: true, isVerified: true, avatar: true, tokenVersion: true },
  });
  if (!user || user.role !== "ADMIN") return null;
  if ((payload.ver ?? 0) !== user.tokenVersion) return null;
  return user;
}

/**
 * Wrap a route handler: rejects non-admins, passes `admin` in the context, and
 * turns thrown errors into JSON responses without leaking internals.
 */
export function withAdmin(handler) {
  return async (request, ctx = {}) => {
    try {
      const admin = await getAdmin(request);
      if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return await handler(request, { ...ctx, params: ctx.params || {}, admin });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e) {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (e instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  // Prisma known errors: record missing, unique clash, foreign key missing.
  if (e?.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (e?.code === "P2002") {
    const field = [].concat(e.meta?.target || []).join(", ");
    return NextResponse.json(
      { error: field ? `A record with this ${field} already exists` : "Already exists" },
      { status: 409 }
    );
  }
  if (e?.code === "P2003") {
    return NextResponse.json({ error: "A linked record does not exist" }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export async function readJson(request) {
  const body = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Invalid request body");
  }
  return body;
}

export function clientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : request.headers.get("x-real-ip"))?.trim() || null;
}

/**
 * Record an admin action in ActionLog. Awaited so it is not dropped when the
 * serverless function freezes after responding; a logging failure never fails
 * the action itself.
 */
export async function logAction(request, adminId, action, { entity, entityId, details } = {}) {
  try {
    await prisma.actionLog.create({
      data: {
        userId: adminId || null,
        action,
        entity: entity || null,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: clientIp(request),
      },
    });
  } catch (e) {
    console.error("audit log write failed", e);
  }
}
