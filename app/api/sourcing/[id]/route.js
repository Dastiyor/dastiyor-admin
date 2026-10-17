import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendEmail, escapeHtml } from "@/lib/brevo";

const STATUSES = ["NEW", "IN_PROGRESS", "PROPOSED", "CLOSED"];
const SITE = process.env.NEXT_PUBLIC_WEB_URL || "https://www.dastiyor.com";

/**
 * PATCH: { status?, adminNotes?, proposedIds? }. proposedIds must be PROVIDER users.
 * Moving to PROPOSED emails the company the proposed professionals' profile links.
 */
export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const existing = await prisma.sourcingRequest.findUnique({
      where: { id: params.id },
      include: { user: { select: { email: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const data = {};
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      data.status = body.status;
    }
    if (body.adminNotes !== undefined) {
      if (body.adminNotes !== null && (typeof body.adminNotes !== "string" || body.adminNotes.length > 5000)) {
        return NextResponse.json({ error: "Notes must be text up to 5000 characters" }, { status: 400 });
      }
      data.adminNotes = body.adminNotes?.trim() || null;
    }
    let providers = null;
    if (body.proposedIds !== undefined) {
      if (!Array.isArray(body.proposedIds) || body.proposedIds.length > 50 || !body.proposedIds.every((id) => typeof id === "string")) {
        return NextResponse.json({ error: "proposedIds must be a list of user ids" }, { status: 400 });
      }
      const ids = [...new Set(body.proposedIds)];
      providers = await prisma.user.findMany({ where: { id: { in: ids }, role: "PROVIDER" }, select: { id: true, fullName: true } });
      if (providers.length !== ids.length) {
        return NextResponse.json({ error: "Every proposed user must be a provider" }, { status: 400 });
      }
      data.proposedIds = ids;
    }

    const updated = await prisma.sourcingRequest.update({ where: { id: params.id }, data });

    const nowProposed = updated.status === "PROPOSED" && existing.status !== "PROPOSED";
    const to = updated.contactEmail || existing.user?.email;
    let emailed = false;
    if (nowProposed && to && !to.endsWith("@phone.dastiyor.local")) {
      const list = providers
        ?? (await prisma.user.findMany({ where: { id: { in: updated.proposedIds } }, select: { id: true, fullName: true } }));
      if (list.length) {
        const lines = list.map((p) => `${p.fullName}: ${SITE}/provider/${p.id}`);
        emailed = await sendEmail({
          to,
          subject: `Dastiyor: подобраны специалисты (${updated.category}, ${updated.city})`,
          html:
            `<p>Здравствуйте, ${escapeHtml(updated.contactName)}!</p>` +
            `<p>По вашему запросу (${escapeHtml(updated.category)}, ${escapeHtml(updated.city)}) мы подобрали специалистов:</p><ul>` +
            list.map((p) => `<li><a href="${SITE}/provider/${encodeURIComponent(p.id)}">${escapeHtml(p.fullName)}</a></li>`).join("") +
            `</ul><p>Все ваши запросы: <a href="${SITE}/sourcing">${SITE}/sourcing</a></p>`,
          text: [`Здравствуйте, ${updated.contactName}!`, "", "Подобранные специалисты:", ...lines, "", `${SITE}/sourcing`].join("\n"),
        });
      }
    }

    return NextResponse.json({ ...updated, emailed });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
