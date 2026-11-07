import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { listParams, listResponse, searchOr } from "@/lib/listQuery";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { USER_LIST_SELECT, MIN_PASSWORD, normalizeEmail, assertEmailFree } from "@/lib/users";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const list = listParams(searchParams, {
    sortable: {
      fullName: (dir) => ({ fullName: dir }),
      role: (dir) => [{ role: dir }, { createdAt: "desc" }],
      balance: (dir) => [{ balance: dir }, { createdAt: "desc" }],
      isVerified: (dir) => [{ isVerified: dir }, { createdAt: "desc" }],
      createdAt: (dir) => ({ createdAt: dir }),
    },
    defaultSort: { createdAt: "desc" },
  });

  const role = searchParams.get("role");
  const verified = searchParams.get("verified");
  const where = { role: role || { not: "ADMIN" } };
  if (verified === "true") where.isVerified = true;
  if (verified === "false") where.isVerified = false;
  if (searchParams.get("locked") === "true") where.lockedUntil = { gt: new Date() };
  const or = searchOr(searchParams.get("q"), ["fullName", "email", "phone"]);
  if (or) where.OR = or;

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip: list.skip, take: list.limit, orderBy: list.orderBy, select: USER_LIST_SELECT }),
    prisma.user.count({ where }),
  ]);
  return listResponse(users, total, list);
});

export const POST = withAdmin(async (request, { admin }) => {
  const { fullName, email, password, role, isVerified, phone } = await readJson(request);

  if (!String(fullName || "").trim()) throw new HttpError(400, "Full name is required");
  const cleanEmail = normalizeEmail(email);
  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters`);
  }
  // No admin creation through the panel — use scripts/create-admin.js.
  if (role && !["CUSTOMER", "PROVIDER"].includes(role)) throw new HttpError(400, "Invalid role");
  await assertEmailFree(cleanEmail);

  const created = await prisma.user.create({
    data: {
      fullName: String(fullName).trim(),
      email: cleanEmail,
      password: await bcrypt.hash(password, 10),
      role: role || "CUSTOMER",
      isVerified: !!isVerified,
      phone: phone ? String(phone).trim() : null,
    },
    select: USER_LIST_SELECT,
  });

  await logAction(request, admin.id, "admin_create_user", {
    entity: "User",
    entityId: created.id,
    details: { email: created.email, role: created.role },
  });
  return NextResponse.json(created, { status: 201 });
});
