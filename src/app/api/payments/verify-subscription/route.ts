import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Require authentication — users can only verify their own subscription
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (reference) {
      const payment = await prisma.payment.findUnique({
        where: { reference },
        include: {
          user: {
            select: { id: true, email: true, plan: true, subscriptionEndDate: true },
          },
        },
      })

      if (!payment) {
        return NextResponse.json({ found: false, message: 'Payment not found' })
      }

      // Only allow users to see their own payment data (or admin)
      if (payment.userId !== currentUser.id && currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({
        found: true,
        payment: {
          id: payment.id,
          reference: payment.reference,
          status: payment.status,
          planId: payment.planId,
          amount: payment.amount,
          activatedAt: payment.activatedAt,
          subscriptionEndDate: payment.subscriptionEndDate,
        },
        user: payment.user,
      })
    }

    // Check current user's own subscription status
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        email: true,
        plan: true,
        billingCycle: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        paymentSetup: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const now = new Date()
    const isActive =
      user.plan === 'pro' &&
      user.subscriptionEndDate != null &&
      new Date(user.subscriptionEndDate) > now

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      billingCycle: user.billingCycle,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
      paymentSetup: user.paymentSetup,
      isActive,
    })
  } catch (error) {
    console.error('Verify subscription error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
