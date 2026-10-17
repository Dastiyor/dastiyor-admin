import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const STATUSES = ["NEW", "IN_PROGRESS", "PROPOSED", "CLOSED"];

/** GET: sourcing requests, newest first. ?status=NEW|IN_PROGRESS|PROPOSED|CLOSED */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const where = STATUSES.includes(status) ? { status } : {};

    const requests = await prisma.sourcingRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    });

    const ids = [...new Set(requests.flatMap((r) => r.proposedIds))];
    const providers = ids.length
      ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } })
      : [];
    const byId = new Map(providers.map((p) => [p.id, p]));

    return NextResponse.json({
      data: requests.map((r) => ({ ...r, proposed: r.proposedIds.map((id) => byId.get(id)).filter(Boolean) })),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
