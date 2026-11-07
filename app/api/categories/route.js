import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { normalizeSlug, normalizeSubcategories } from "@/lib/categories";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async () => {
  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ data: categories });
});

export const POST = withAdmin(async (request, { admin }) => {
  const { name, slug, order, subcategories } = await readJson(request);
  if (!String(name || "").trim()) throw new HttpError(400, "Name is required");
  const slugNorm = normalizeSlug(slug);
  if (await prisma.category.findUnique({ where: { slug: slugNorm } })) {
    throw new HttpError(409, "Category with this slug already exists");
  }
  const category = await prisma.category.create({
    data: {
      name: String(name).trim(),
      slug: slugNorm,
      order: parseInt(order, 10) || 0,
      subcategories: normalizeSubcategories(subcategories),
    },
  });
  await logAction(request, admin.id, "admin_create_category", {
    entity: "Category",
    entityId: category.id,
    details: { name: category.name, slug: category.slug },
  });
  return NextResponse.json(category, { status: 201 });
});
