import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
    try {
        const task = await prisma.task.findUnique({
            where: { id: params.id },
            include: {
                user: { select: { id: true, fullName: true, email: true } },
            },
        });

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        return NextResponse.json(task);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const body = await request.json();
        // Allow updating all fields
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
            status,
            userId,
        } = body;

        const data = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (category !== undefined) data.category = category;
        if (subcategory !== undefined) data.subcategory = subcategory || null;
        if (budgetType !== undefined) data.budgetType = budgetType;
        if (budgetAmount !== undefined) data.budgetAmount = budgetAmount || null;
        if (city !== undefined) data.city = city;
        if (address !== undefined) data.address = address || null;
        if (urgency !== undefined) data.urgency = urgency;
        if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
        if (status !== undefined) data.status = status;
        if (userId !== undefined && userId) data.userId = userId;

        const updatedTask = await prisma.task.update({
            where: { id: params.id },
            data,
        });

        return NextResponse.json(updatedTask);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await prisma.task.delete({ where: { id: params.id } });
        prisma.actionLog.create({
            data: { action: "admin_delete_task", entity: "Task", entityId: params.id },
        }).catch(() => {});
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
