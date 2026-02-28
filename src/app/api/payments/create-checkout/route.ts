import { NextRequest, NextResponse } from 'next/server'
import { PRICING } from '@/lib/pricing'

function generateReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `JC-${timestamp}-${random}`
}

export async function POST(request: NextRequest) {
  try {
    const { planId, paymentMethod } = await request.json()

    if (!planId || !paymentMethod) {
      return NextResponse.json(
        { error: 'planId and paymentMethod are required' },
        { status: 400 }
      )
    }

    if (!['proMonthly', 'proQuarterly', 'proSemiannual', 'proAnnual', 'teamMonthly', 'teamQuarterly', 'teamSemiannual', 'teamAnnual'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
    }

    if (!['gcash', 'bank_transfer', 'checkout_com'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid paymentMethod' }, { status: 400 })
    }

    const amount = 
      planId === 'proMonthly' ? PRICING.proMonthly.amount :
      planId === 'proQuarterly' ? PRICING.proQuarterly.totalAmount :
      planId === 'proSemiannual' ? PRICING.proSemiannual.totalAmount :
      planId === 'proAnnual' ? PRICING.proAnnual.totalAmount :
      planId === 'teamMonthly' ? PRICING.teamMonthly.amount :
      planId === 'teamQuarterly' ? PRICING.teamQuarterly.totalAmount :
      planId === 'teamSemiannual' ? PRICING.teamSemiannual.totalAmount :
      PRICING.teamAnnual.totalAmount
    
    const amountDisplay = 
      planId === 'proMonthly' ? PRICING.proMonthly.display :
      planId === 'proQuarterly' ? PRICING.proQuarterly.displayTotal :
      planId === 'proSemiannual' ? PRICING.proSemiannual.displayTotal :
      planId === 'proAnnual' ? PRICING.proAnnual.displayTotal :
      planId === 'teamMonthly' ? PRICING.teamMonthly.display :
      planId === 'teamQuarterly' ? PRICING.teamQuarterly.displayTotal :
      planId === 'teamSemiannual' ? PRICING.teamSemiannual.displayTotal :
      PRICING.teamAnnual.displayTotal
    
    const reference = generateReference()

    if (paymentMethod === 'checkout_com') {
      // Redirect to Checkout.com payment flow
      return NextResponse.json({
        success: true,
        paymentMethod: 'checkout_com',
        reference,
        amount,
        amountDisplay,
        planId,
        redirectToCheckoutCom: true,
        message: 'Redirecting to secure payment...',
      })
    }

    if (paymentMethod === 'gcash') {
      return NextResponse.json({
        success: true,
        paymentMethod: 'gcash',
        reference,
        amount,
        amountDisplay,
        planId,
        gcash: {
          number: '09694270644',
          name: 'KE---H DA-E T',
        },
        instructions: [
          `Open your GCash app and tap "Send Money"`,
          `Enter the number: 09694270644`,
          `Enter the amount: ₱${amount.toLocaleString('en-PH')}`,
          `In the message/note field, enter your reference: ${reference}`,
          'Take a screenshot of the confirmation',
          'Wait for your subscription to be activated (usually within 24 hours)',
        ],
      })
    }

    // bank_transfer
    return NextResponse.json({
      success: true,
      paymentMethod: 'bank_transfer',
      reference,
      amount,
      amountDisplay,
      planId,
      bank: {
        accountName: 'Keneth Dale Tuazon',
        accountNumber: '0000070082058',
        bank: 'Security Bank',
      },
      instructions: [
        `Go to your bank app or any partner bank/remittance`,
        `Transfer to Security Bank account: 0000070082058`,
        `Account name: Keneth Dale Tuazon`,
        `Amount: ₱${amount.toLocaleString('en-PH')}`,
        `In the remarks/description, write your reference: ${reference}`,
        'Take a screenshot of the transfer confirmation',
        'Wait for your subscription to be activated (usually within 24 hours)',
      ],
    })
  } catch (error) {
    console.error('Create checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
