import { NextRequest, NextResponse } from 'next/server'
import { verifyCheckoutWebhookSignature } from '@/lib/checkout'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('cko-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Verify webhook signature
    const webhookSecret = process.env.CHECKOUT_WEBHOOK_SECRET || ''
    if (!webhookSecret) {
      console.error('CHECKOUT_WEBHOOK_SECRET not configured')
      // In development/testing, we might skip signature verification
      // In production, this should return 401
    }
    
    const isValid = webhookSecret ? verifyCheckoutWebhookSignature(body, signature, webhookSecret) : true
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)
    console.log('Checkout.com webhook event:', event.type)

    // Handle payment_approved event
    if (event.type === 'payment_approved') {
      const { id: paymentId, reference, amount, currency, metadata } = event.data

      if (!reference || !metadata) {
        return NextResponse.json(
          { error: 'Missing required payment data' },
          { status: 400 }
        )
      }

      const { userId, planId, userEmail } = metadata

      if (!userId || !planId) {
        return NextResponse.json(
          { error: 'Missing user or plan metadata' },
          { status: 400 }
        )
      }

      // Calculate subscription dates based on plan
      const now = new Date()
      const subscriptionStartDate = now
      let subscriptionEndDate: Date

      if (planId.includes('Monthly')) {
        subscriptionEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      } else if (planId.includes('Quarterly')) {
        subscriptionEndDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
      } else if (planId.includes('Semiannual')) {
        subscriptionEndDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000) // 180 days
      } else {
        subscriptionEndDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 365 days
      }

      // Determine plan tier (pro or team)
      const planTier = planId.toLowerCase().includes('team') ? 'team' : 'pro'

      // Determine billing cycle
      let billingCycle: string
      if (planId.includes('Monthly')) {
        billingCycle = 'monthly'
      } else if (planId.includes('Quarterly')) {
        billingCycle = 'quarterly'
      } else if (planId.includes('Semiannual')) {
        billingCycle = 'semiannual'
      } else {
        billingCycle = 'annual'
      }

      try {
        // Update user's subscription
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: planTier,
            billingCycle,
            subscriptionStartDate,
            subscriptionEndDate,
            paymentSetup: true,
            searchesLeft: planTier === 'pro' || planTier === 'team' ? 999999 : 15,
          },
        })

        // Create payment record
        await prisma.payment.create({
          data: {
            userId,
            reference,
            amount: amount / 100, // Convert from centavos to pesos
            currency: currency || 'PHP',
            planId,
            status: 'verified',
            subscriptionStartDate,
            subscriptionEndDate,
            providerPaymentId: paymentId,
            paymentMethod: 'checkout_com',
            activatedAt: now,
          },
        })

        console.log(`✅ Subscription activated for user ${userId} (${userEmail}) - Plan: ${planId}`)

        return NextResponse.json({
          success: true,
          message: 'Payment processed and subscription activated',
        })
      } catch (dbError) {
        console.error('Database error:', dbError)
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        )
      }
    }

    // Handle payment_declined event
    if (event.type === 'payment_declined') {
      const { reference, response_summary } = event.data
      console.log(`❌ Payment declined: ${reference} - ${response_summary}`)
      
      return NextResponse.json({
        success: true,
        message: 'Payment declined event received',
      })
    }

    // Acknowledge other events
    return NextResponse.json({
      success: true,
      message: 'Event received',
    })

  } catch (error) {
    console.error('Checkout.com webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
