import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { normalizeEmail, assertEmailFree } from "@/lib/users";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROFILE_SELECT = { id: true, fullName: true, email: true, phone: true, bio: true, city: true, avatar: true, role: true, isVerified: true };

/** The signed-in admin's own account (not a shared settings record). */
export const GET = withAdmin(async (request, { admin }) => {
  const user = await prisma.user.findUnique({ where: { id: admin.id }, select: PROFILE_SELECT });
  return NextResponse.json(user);
});

export const PUT = withAdmin(async (request, { admin }) => {
  const body = await readJson(request);
  const data = {};
  if (body.fullName !== undefined) {
    data.fullName = String(body.fullName).trim();
    if (!data.fullName) throw new HttpError(400, "Full name is required");
  }
  if (body.email !== undefined && body.email !== admin.email) {
    data.email = normalizeEmail(body.email);
    await assertEmailFree(data.email, admin.id);
  }
  for (const key of ["phone", "bio", "city"]) {
    if (body[key] !== undefined) data[key] = String(body[key] ?? "").trim() || null;
  }
  if (data.bio && data.bio.length > 2000) throw new HttpError(400, "Bio must be under 2000 characters");

  const user = await prisma.user.update({ where: { id: admin.id }, data, select: PROFILE_SELECT });
  await logAction(request, admin.id, "admin_update_profile", {
    entity: "User",
    entityId: admin.id,
    details: { fields: Object.keys(data) },
  });
  return NextResponse.json(user);
});
