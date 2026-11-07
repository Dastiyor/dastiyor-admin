import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { NextResponse } from "next/server";

// Profile is per admin now (/api/profile), not a shared settings record.
const ALLOWED_KEYS = ["company", "payment"];

function checkKey(key) {
  if (!ALLOWED_KEYS.includes(key)) throw new HttpError(400, "Invalid settings key");
  return key;
}

export const GET = withAdmin(async (request, { params }) => {
  const key = checkKey(params.key);
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  let value = {};
  try {
    value = row ? JSON.parse(row.value || "{}") : {};
  } catch {
    console.error(`settings: stored value for "${key}" is not valid JSON`);
  }
  return NextResponse.json(value);
});

export const PUT = withAdmin(async (request, { params, admin }) => {
  const key = checkKey(params.key);
  const body = await readJson(request);
  const value = JSON.stringify(body);
  await prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  // Field names only: payment settings hold credentials.
  await logAction(request, admin.id, "admin_update_settings", {
    entity: "SystemSetting",
    entityId: key,
    details: { fields: Object.keys(body) },
  });
  return NextResponse.json({ success: true });
});
