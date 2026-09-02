import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: params.id },
            select: {
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
                bio: true,
                skills: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json(user);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const body = await request.json();
        const { fullName, email, role, phone, isVerified, password, unlock, balance } = body;

        const existing = await prisma.user.findUnique({
            where: { id: params.id },
            select: { role: true },
        });
        if (!existing) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        // The panel does not mint admins; scripts/create-admin.js does.
        if (role === "ADMIN" && existing.role !== "ADMIN") {
            return NextResponse.json({ error: "Cannot grant admin role" }, { status: 403 });
        }
        if (existing.role === "ADMIN" && role !== "ADMIN") {
            const admins = await prisma.user.count({ where: { role: "ADMIN" } });
            if (admins <= 1) {
                return NextResponse.json(
                    { error: "Cannot demote the last admin" },
                    { status: 409 }
                );
            }
        }

        const data = {
            fullName,
            email,
            role,
            phone: phone || null,
            isVerified: !!isVerified,
        };

        if (unlock) {
            data.loginAttempts = 0;
            data.lockedUntil = null;
        }

        if (balance !== undefined && balance !== null) {
            data.balance = parseFloat(balance) || 0;
        }

        if (password) {
            const bcrypt = require("bcryptjs");
            data.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id: params.id },
            data,
        });

        const action = unlock ? "admin_unlock_user" : "admin_update_user";
        prisma.actionLog.create({
            data: { action, entity: "User", entityId: params.id, details: JSON.stringify({ fields: Object.keys(data) }) },
        }).catch(() => {});

        const { password: _, ...userWithoutPassword } = updatedUser;
        return NextResponse.json(userWithoutPassword);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const target = await prisma.user.findUnique({
            where: { id: params.id },
            select: { role: true },
        });
        if (target?.role === "ADMIN") {
            const admins = await prisma.user.count({ where: { role: "ADMIN" } });
            if (admins <= 1) {
                return NextResponse.json(
                    { error: "Cannot delete the last admin" },
                    { status: 409 }
                );
            }
        }
        await prisma.user.delete({ where: { id: params.id } });
        prisma.actionLog.create({
            data: { action: "admin_delete_user", entity: "User", entityId: params.id },
        }).catch(() => {});
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
