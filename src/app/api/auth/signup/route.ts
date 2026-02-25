import { NextRequest, NextResponse } from "next/server";
import { signUp, generateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, password, firstName, lastName, phone, purpose, userRole, firmName, teamSize, hoursPerWeek, heardFrom } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const user = await signUp({
      email,
      password,
      firstName,
      lastName,
      phone,
      purpose,
      userRole,
      firmName,
      teamSize,
      hoursPerWeek,
      heardFrom,
    });

    const token = generateToken({
      ...user,
      searchesLeft: user.searchesLeft,
    });

    const response = NextResponse.json({ user });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
