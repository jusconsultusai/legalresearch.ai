import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSubscriptionEndDate } from '@/lib/pricing'

// PayMongo webhook signature verification
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const digest = hmac.digest('hex')
    return digest === signature
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('paymongo-signature') ?? ''
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET ?? ''

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    const event = JSON.parse(rawBody)
    const eventType: string = event?.data?.attributes?.type ?? ''
    const attributes = event?.data?.attributes?.data?.attributes ?? {}

    console.log('PayMongo webhook event:', eventType)

    // Handle payment success events
    if (
      eventType === 'payment.paid' ||
      eventType === 'checkout_session.payment.paid'
    ) {
      const metadata = attributes?.metadata ?? {}
      const userId: string | undefined = metadata?.userId
      const planId: string | undefined = metadata?.planId
      const reference: string | undefined =
        metadata?.reference ?? event?.data?.attributes?.data?.id

      if (!userId || !planId) {
        console.warn('Webhook missing userId or planId in metadata')
        return NextResponse.json({ received: true })
      }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        console.warn('Webhook: user not found', userId)
        return NextResponse.json({ received: true })
      }

      const billingCycle = planId === 'proMonthly' ? 'monthly' : 'annual'
      const now = new Date()
      const subscriptionEndDate = getSubscriptionEndDate(
        planId as 'proMonthly' | 'proAnnual',
        now
      )
      const amount = planId === 'proMonthly' ? 888 : 7056

      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: 'pro',
          billingCycle,
          subscriptionStartDate: now,
          subscriptionEndDate,
          paymentSetup: true,
          searchesLeft: -1,
        },
      })

      // Create payment record if we have a reference
      if (reference) {
        const existing = await prisma.payment.findUnique({ where: { reference } })
        if (!existing) {
          await prisma.payment.create({
            data: {
              userId,
              reference,
              amount,
              currency: 'PHP',
              planId,
              status: 'verified',
              subscriptionStartDate: now,
              subscriptionEndDate,
              activatedBy: 'webhook',
              activatedAt: now,
              providerPaymentId: event?.data?.id,
              paymentMethod: attributes?.source?.type ?? 'paymongo',
            },
          })
        }
      }

      console.log(`Subscription activated via webhook for user ${userId}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
