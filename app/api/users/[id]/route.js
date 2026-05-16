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

        const { password: _, ...userWithoutPassword } = updatedUser;
        return NextResponse.json(userWithoutPassword);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await prisma.user.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
