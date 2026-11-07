import { prisma } from "./prisma";
import { HttpError } from "./api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

export const USER_LIST_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  phone: true,
  isVerified: true,
  loginAttempts: true,
  lockedUntil: true,
  googleId: true,
  appleId: true,
  balance: true,
  verificationDocuments: true,
  createdAt: true,
  _count: { select: { tasks: true, responses: true, reviewsReceived: true } },
};

export function normalizeEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw new HttpError(400, "Enter a valid email address");
  return e;
}

export async function assertEmailFree(email, exceptId) {
  const clash = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new HttpError(409, "Another user already uses this email");
}
