import { getAdmin, errorResponse } from "@/lib/api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const admin = await getAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { tokenVersion: _, ...user } = admin;
    return NextResponse.json({ user });
  } catch (e) {
    return errorResponse(e);
  }
}
