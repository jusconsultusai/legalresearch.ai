import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, verifyPassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json() as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Fetch the stored hash
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const hasExistingPassword = dbUser.passwordHash.startsWith("$2");

    if (hasExistingPassword) {
      // Regular user — must supply current password
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required." },
          { status: 400 }
        );
      }
      const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 400 }
        );
      }
    }
    // Google-only user (no bcrypt hash) — skip current-password check

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("change-password error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
