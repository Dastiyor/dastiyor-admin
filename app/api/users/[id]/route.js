import { prisma } from "@/lib/prisma";
import { deleteUserCascade } from "@/lib/cascade";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { USER_LIST_SELECT, MIN_PASSWORD, normalizeEmail, assertEmailFree } from "@/lib/users";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const ROLES = ["CUSTOMER", "PROVIDER", "ADMIN"];
// Fields whose before/after values go into the audit log.
const AUDITED = ["fullName", "email", "role", "phone", "isVerified", "balance"];

export const GET = withAdmin(async (request, { params }) => {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { ...USER_LIST_SELECT, bio: true, skills: true },
  });
  if (!user) throw new HttpError(404, "User not found");
  return NextResponse.json(user);
});

/**
 * Partial update: only the fields present in the body change. (Sending just
 * `{ unlock: true }` used to blank the phone and un-verify the user.)
 */
export const PUT = withAdmin(async (request, { params, admin }) => {
  const body = await readJson(request);
  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, fullName: true, email: true, role: true, phone: true, isVerified: true, balance: true },
  });
  if (!existing) throw new HttpError(404, "User not found");

  const data = {};
  if (body.fullName !== undefined) {
    const name = String(body.fullName).trim();
    if (!name) throw new HttpError(400, "Full name is required");
    data.fullName = name;
  }
  if (body.email !== undefined && body.email !== existing.email) {
    data.email = normalizeEmail(body.email);
    await assertEmailFree(data.email, existing.id);
  }
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
  if (body.isVerified !== undefined) data.isVerified = !!body.isVerified;
  if (body.balance !== undefined && body.balance !== null && body.balance !== "") {
    const n = Number(body.balance);
    if (!Number.isFinite(n)) throw new HttpError(400, "Balance must be a number");
    data.balance = Math.round(n); // Int column — a float fails the bind (Postgres 22P03)
  }
  if (body.role !== undefined && body.role !== existing.role) {
    if (!ROLES.includes(body.role)) throw new HttpError(400, "Invalid role");
    // The panel does not mint admins; scripts/create-admin.js does.
    if (body.role === "ADMIN") throw new HttpError(403, "Cannot grant admin role");
    if (existing.role === "ADMIN") {
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (admins <= 1) throw new HttpError(409, "Cannot demote the last admin");
    }
    data.role = body.role;
  }
  if (body.unlock) {
    data.loginAttempts = 0;
    data.lockedUntil = null;
  }
  if (body.password) {
    if (typeof body.password !== "string" || body.password.length < MIN_PASSWORD) {
      throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters`);
    }
    data.password = await bcrypt.hash(body.password, 10);
    // Ends every session signed in with the old password.
    data.tokenVersion = { increment: 1 };
  }

  const updated = await prisma.user.update({ where: { id: params.id }, data, select: USER_LIST_SELECT });

  const changes = {};
  for (const f of AUDITED) {
    if (f in data && data[f] !== existing[f]) changes[f] = { from: existing[f], to: data[f] };
  }
  if (data.password) changes.password = "changed";
  const action = body.unlock ? "admin_unlock_user" : "admin_update_user";
  if (body.unlock || Object.keys(changes).length) {
    await logAction(request, admin.id, action, { entity: "User", entityId: params.id, details: changes });
  }
  return NextResponse.json(updated);
});

export const DELETE = withAdmin(async (request, { params, admin }) => {
  if (params.id === admin.id) throw new HttpError(409, "You cannot delete your own account");
  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { role: true, email: true, fullName: true },
  });
  if (!target) throw new HttpError(404, "User not found");
  if (target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) throw new HttpError(409, "Cannot delete the last admin");
  }
  await prisma.$transaction((tx) => deleteUserCascade(tx, params.id), { timeout: 20000 });
  await logAction(request, admin.id, "admin_delete_user", {
    entity: "User",
    entityId: params.id,
    details: { email: target.email, fullName: target.fullName, role: target.role },
  });
  return NextResponse.json({ success: true });
});
