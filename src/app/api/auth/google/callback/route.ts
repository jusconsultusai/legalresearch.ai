import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateToken, AuthUser } from "@/lib/auth";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/signin?error=google_auth_failed`
    );
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    // Get user info from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      throw new Error("Failed to get user info from Google");
    }

    const googleUser = await userInfoRes.json() as {
      id: string;
      email: string;
      name: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    // Find or create user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user = await prisma.user.findUnique({ where: { email: googleUser.email } }) as any;

    if (!user) {
      // Create new user — passwordHash set to a random unusable value
      const randomHash = crypto.randomBytes(32).toString("hex");
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          firstName: googleUser.given_name ?? null,
          lastName: googleUser.family_name ?? null,
          avatar: googleUser.picture ?? null,
          passwordHash: randomHash, // not usable for password login
          googleId: googleUser.id,
        },
      });
    } else {
      // Update googleId/avatar on existing user if not already set
      const updates: Record<string, string> = {};
      if (!user.googleId) updates.googleId = googleUser.id;
      if (!user.avatar && googleUser.picture) updates.avatar = googleUser.picture;
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({ where: { id: user.id }, data: updates });
      }
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      role: user.role,
      plan: user.plan,
      searchesLeft: user.searchesLeft,
      avatar: user.avatar ?? undefined,
      googleId: user.googleId ?? undefined,
      hasPassword: user.passwordHash.startsWith("$2"),
    };

    const token = generateToken(authUser);

    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/signin?error=google_auth_failed`
    );
  }
}
