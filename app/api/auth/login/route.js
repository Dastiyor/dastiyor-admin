import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { errorResponse, logAction } from "@/lib/api";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const INVALID = "Invalid email or password";
// Compared against when there is no admin to check, so a wrong email takes as
// long as a wrong password and response timing does not reveal which accounts exist.
const DUMMY_HASH = "$2a$10$QaK1I0cXS6R..05laQFPl.yLbB..HvA28xKr78sTYeSagvrU/koQa";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    // Non-admins and unknown emails get the same answer as a wrong password.
    if (!user || user.role !== "ADMIN" || !user.password) {
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const minutes = Math.ceil((user.lockedUntil - now) / 60000);
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${minutes} min.` },
        { status: 429 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // An expired lock starts a fresh count.
      const attempts = (user.lockedUntil ? 0 : user.loginAttempts) + 1;
      const lock = attempts >= MAX_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: attempts,
          lockedUntil: lock ? new Date(now.getTime() + LOCK_MINUTES * 60000) : null,
        },
      });
      await logAction(request, user.id, "admin_login_failed", {
        entity: "User",
        entityId: user.id,
        details: { attempts, locked: lock },
      });
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    if (user.loginAttempts || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockedUntil: null },
      });
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ver: user.tokenVersion,
    });
    await logAction(request, user.id, "admin_login", { entity: "User", entityId: user.id });

    const response = NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
      },
    });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return response;
  } catch (e) {
    return errorResponse(e);
  }
}
