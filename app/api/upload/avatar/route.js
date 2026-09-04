import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { NextResponse } from "next/server";

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Store an avatar in Vercel Blob and point the signed-in admin's User.avatar at it.
 *
 * addRandomSuffix gives every upload its own URL, so a replaced avatar is not
 * hidden behind a cached one.
 */
export async function POST(request) {
  try {
    const payload = await verifyToken(getTokenFromRequest(request));
    if (!payload?.sub || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const file = (await request.formData()).get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 2 MB" }, { status: 413 });
    }

    const ext = (file.name?.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const { url } = await put(`avatars/${payload.sub}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    await prisma.user.update({ where: { id: payload.sub }, data: { avatar: url } });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
