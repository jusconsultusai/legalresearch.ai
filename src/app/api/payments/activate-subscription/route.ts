import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSubscriptionEndDate, type PlanId } from '@/lib/pricing'

export async function POST(request: NextRequest) {
  try {
    const { adminKey, userId, planId, reference, paymentMethod, notes } =
      await request.json()

    // Admin auth
    if (!adminKey || adminKey !== process.env.ADMIN_ACTIVATION_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!userId || !planId || !reference) {
      return NextResponse.json(
        { error: 'userId, planId, and reference are required' },
        { status: 400 }
      )
    }

    if (!['proMonthly', 'proQuarterly', 'proSemiannual', 'proAnnual', 'teamMonthly', 'teamQuarterly', 'teamSemiannual', 'teamAnnual'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check reference not already used
    const existingPayment = await prisma.payment.findUnique({
      where: { reference },
    })
    if (existingPayment) {
      return NextResponse.json(
        { error: 'Reference already used' },
        { status: 409 }
      )
    }

    const amount =
      planId === 'proMonthly' ? 888 :
      planId === 'proQuarterly' ? 2130 :
      planId === 'proSemiannual' ? 4260 :
      planId === 'proAnnual' ? 7452 :
      planId === 'teamMonthly' ? 2999 :
      planId === 'teamQuarterly' ? 7197 :
      planId === 'teamSemiannual' ? 14394 :
      25188
    const billingCycle = 
      (planId === 'proMonthly' || planId === 'teamMonthly') ? 'monthly' :
      (planId === 'proQuarterly' || planId === 'teamQuarterly') ? 'quarterly' :
      (planId === 'proSemiannual' || planId === 'teamSemiannual') ? 'semiannual' :
      'annual'
    const planType = (planId.startsWith('pro')) ? 'pro' : 'team'
    const now = new Date()
    const subscriptionEndDate = getSubscriptionEndDate(
      planId as PlanId,
      now
    )

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: planType,
        billingCycle,
        subscriptionStartDate: now,
        subscriptionEndDate,
        paymentSetup: true,
        searchesLeft: -1, // unlimited
      },
    })

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        reference,
        amount,
        currency: 'PHP',
        planId,
        status: 'verified',
        subscriptionStartDate: now,
        subscriptionEndDate,
        activatedBy: 'admin',
        activatedAt: now,
        paymentMethod: paymentMethod ?? 'manual',
      },
    })

    return NextResponse.json({
      success: true,
      message: `Subscription activated for ${user.email}`,
      payment: {
        id: payment.id,
        reference: payment.reference,
        planId: payment.planId,
        amount: payment.amount,
        subscriptionEndDate: payment.subscriptionEndDate,
        activatedAt: payment.activatedAt,
      },
      user: {
        id: user.id,
        email: user.email,
        plan: 'pro',
        billingCycle,
        subscriptionEndDate,
      },
    })
  } catch (error) {
    console.error('Activate subscription error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
