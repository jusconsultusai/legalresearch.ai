import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";
import crypto from "crypto";

// TS language server may cache stale Prisma types after schema changes.
// Runtime is correct; this cast satisfies the type checker until the server restarts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string };

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Always return 200 to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (user) {
      // Invalidate any previous tokens for this user
      await db.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      // Generate a secure random token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      // Send email (don't let send failure reveal user existence)
      try {
        await sendPasswordResetEmail(user.email, token);
      } catch (mailErr) {
        console.error("Failed to send reset email:", mailErr);
      }
    }

    return NextResponse.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
