import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')
    const userId = searchParams.get('userId')

    if (!reference && !userId) {
      return NextResponse.json(
        { error: 'reference or userId is required' },
        { status: 400 }
      )
    }

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

    // By userId — check current subscription status
    const user = await prisma.user.findUnique({
      where: { id: userId! },
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
