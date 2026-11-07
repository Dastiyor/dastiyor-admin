import { prisma } from "@/lib/prisma";
import { isAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Public, so it reports only yes/no states: no error text, no config values.
export async function GET() {
  const auth = isAuthConfigured() ? "configured" : "missing JWT_SECRET";
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: auth === "configured", database: "connected", auth });
  } catch (e) {
    console.error("health check: database unreachable", e);
    return Response.json({ ok: false, database: "disconnected", auth }, { status: 500 });
  }
}
