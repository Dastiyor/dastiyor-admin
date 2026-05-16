import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const urgency = searchParams.get("urgency") || undefined;

    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (urgency) where.urgency = urgency;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          _count: { select: { responses: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      data: tasks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      subcategory,
      budgetType,
      budgetAmount,
      city,
      address,
      urgency,
      dueDate,
      userId,
      status,
    } = body;

    // Basic validation
    if (!title || !description || !category || !city || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newTask = await prisma.task.create({
      data: {
        title,
        description,
        category,
        subcategory: subcategory || null,
        budgetType: budgetType || "negotiable",
        budgetAmount: budgetAmount || null,
        city,
        address: address || null,
        urgency: urgency || "normal",
        dueDate: dueDate ? new Date(dueDate) : null,
        userId,
        status: status || "OPEN",
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
