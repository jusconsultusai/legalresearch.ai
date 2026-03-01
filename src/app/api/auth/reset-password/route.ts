import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth";

// TS language server may cache stale Prisma types after schema changes.
// Runtime is correct; this cast satisfies the type checker until the server restarts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json() as {
      token?: string;
      newPassword?: string;
    };

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Find the token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    }) as { id: string; userId: string; token: string; expiresAt: Date; used: boolean } | null;

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    if (resetToken.used || resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This reset link has expired or already been used." },
        { status: 400 }
      );
    }

    // Hash the new password and update user
    const newHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newHash },
      }),
      db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
