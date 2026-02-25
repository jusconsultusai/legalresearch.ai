import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminKey = searchParams.get('adminKey')

    if (!adminKey || adminKey !== process.env.ADMIN_ACTIVATION_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Free users or expired subscriptions
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { plan: 'free' },
          {
            plan: 'pro',
            subscriptionEndDate: { lt: now },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        plan: true,
        billingCycle: true,
        subscriptionEndDate: true,
        paymentSetup: true,
        searchesLeft: true,
        createdAt: true,
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Summary stats
    const stats = {
      totalUsers: await prisma.user.count(),
      freeUsers: await prisma.user.count({ where: { plan: 'free' } }),
      proUsers: await prisma.user.count({ where: { plan: 'pro' } }),
      expiredUsers: await prisma.user.count({
        where: { plan: 'pro', subscriptionEndDate: { lt: now } },
      }),
    }

    return NextResponse.json({
      users,
      stats,
      count: users.length,
    })
  } catch (error) {
    console.error('Pending payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
