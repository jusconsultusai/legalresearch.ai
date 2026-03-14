import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminKey = searchParams.get('adminKey')

    if (!adminKey || adminKey !== process.env.ADMIN_ACTIVATION_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        plan: true,
        billingCycle: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        paymentSetup: true,
        searchesLeft: true,
        createdAt: true,
        role: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            reference: true,
            planId: true,
            amount: true,
            status: true,
            activatedAt: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()

    const stats = {
      totalUsers: users.length,
      freeUsers: users.filter((u) => u.plan === 'free').length,
      proUsers: users.filter((u) => u.plan === 'pro').length,
      teamUsers: users.filter((u) => u.plan === 'team').length,
      enterpriseUsers: users.filter((u) => u.plan === 'enterprise').length,
      activeSubscriptions: users.filter(
        (u) => u.plan !== 'free' && u.subscriptionEndDate && new Date(u.subscriptionEndDate) >= now
      ).length,
      expiredSubscriptions: users.filter(
        (u) => u.plan !== 'free' && u.subscriptionEndDate && new Date(u.subscriptionEndDate) < now
      ).length,
    }

    return NextResponse.json({ users, stats })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
