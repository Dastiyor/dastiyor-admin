import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { withAdmin, logAction, HttpError } from "@/lib/api";
import { NextResponse } from "next/server";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

/**
 * Store an avatar in Vercel Blob and point the signed-in admin's User.avatar at it.
 *
 * addRandomSuffix gives every upload its own URL, so a replaced avatar is not
 * hidden behind a cached one. SVG is refused: it can carry script.
 */
export const POST = withAdmin(async (request, { admin }) => {
  const file = (await request.formData()).get("file");
  if (!file || typeof file === "string") throw new HttpError(400, "No file uploaded");
  const ext = TYPES[file.type];
  if (!ext) throw new HttpError(400, "Image must be PNG, JPEG, WebP or GIF");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Image must be under 2 MB");

  const { url } = await put(`avatars/${admin.id}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });
  await prisma.user.update({ where: { id: admin.id }, data: { avatar: url } });
  await logAction(request, admin.id, "admin_update_avatar", { entity: "User", entityId: admin.id });
  return NextResponse.json({ url });
});
