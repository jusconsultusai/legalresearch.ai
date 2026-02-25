import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "jusconsultus-ai-secret";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  plan: string;
  searchesLeft: number;
  avatar?: string;
  billingCycle?: string;
  subscriptionStartDate?: Date | null;
  subscriptionEndDate?: Date | null;
  paymentSetup?: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        plan: true,
        searchesLeft: true,
        avatar: true,
        billingCycle: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        paymentSetup: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      avatar: user.avatar ?? undefined,
      billingCycle: user.billingCycle ?? undefined,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
      paymentSetup: user.paymentSetup,
    };
  } catch {
    return null;
  }
}

export async function signUp(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  purpose?: string;
  userRole?: string;
  firmName?: string;
  teamSize?: string;
  hoursPerWeek?: number;
  heardFrom?: string;
}) {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) throw new Error("Email already registered");

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      phone: data.phone,
      purpose: data.purpose,
      userRole: data.userRole,
      firmName: data.firmName,
      teamSize: data.teamSize,
      hoursPerWeek: data.hoursPerWeek,
      heardFrom: data.heardFrom,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name || `${user.firstName} ${user.lastName}`,
    role: user.role,
    plan: user.plan,
    searchesLeft: user.searchesLeft,
  };
}

export async function signIn(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid email or password");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new Error("Invalid email or password");

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    role: user.role,
    plan: user.plan,
    searchesLeft: user.searchesLeft,
    avatar: user.avatar || undefined,
    billingCycle: user.billingCycle || undefined,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    paymentSetup: user.paymentSetup,
  };

  const token = generateToken(authUser);
  return { user: authUser, token };
}
