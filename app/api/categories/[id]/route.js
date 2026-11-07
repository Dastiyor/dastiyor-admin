import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { normalizeSlug, normalizeSubcategories } from "@/lib/categories";
import { NextResponse } from "next/server";

export const GET = withAdmin(async (request, { params }) => {
  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) throw new HttpError(404, "Category not found");
  return NextResponse.json(category);
});

export const PUT = withAdmin(async (request, { params, admin }) => {
  const { name, slug, order, subcategories } = await readJson(request);
  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing) throw new HttpError(404, "Category not found");

  const data = {};
  if (name !== undefined) {
    data.name = String(name).trim();
    if (!data.name) throw new HttpError(400, "Name is required");
  }
  if (slug !== undefined) {
    data.slug = normalizeSlug(slug);
    const duplicate = await prisma.category.findFirst({ where: { slug: data.slug, id: { not: params.id } } });
    if (duplicate) throw new HttpError(409, "Another category with this slug exists");
  }
  if (order !== undefined) data.order = parseInt(order, 10) || 0;
  if (subcategories !== undefined) data.subcategories = normalizeSubcategories(subcategories);

  const category = await prisma.category.update({ where: { id: params.id }, data });
  await logAction(request, admin.id, "admin_update_category", {
    entity: "Category",
    entityId: params.id,
    details: { before: { name: existing.name, slug: existing.slug }, fields: Object.keys(data) },
  });
  return NextResponse.json(category);
});

export const DELETE = withAdmin(async (request, { params, admin }) => {
  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) throw new HttpError(404, "Category not found");
  await prisma.category.delete({ where: { id: params.id } });
  await logAction(request, admin.id, "admin_delete_category", {
    entity: "Category",
    entityId: params.id,
    details: { name: category.name, slug: category.slug },
  });
  return NextResponse.json({ success: true });
});
