/**
 * Checkout.com Payment Session API Route
 * Creates a payment session and returns the redirect URL for the hosted payment page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutPaymentSession } from '@/lib/checkout';
import { PRICING } from '@/lib/pricing';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function generateReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `JC-${timestamp}-${random}`;
}

type PlanKey =
  | 'proMonthly' | 'proQuarterly' | 'proSemiannual' | 'proAnnual'
  | 'teamMonthly' | 'teamQuarterly' | 'teamSemiannual' | 'teamAnnual';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      );
    }

    const validPlans: PlanKey[] = [
      'proMonthly', 'proQuarterly', 'proSemiannual', 'proAnnual',
      'teamMonthly', 'teamQuarterly', 'teamSemiannual', 'teamAnnual'
    ];

    if (!validPlans.includes(planId as PlanKey)) {
      return NextResponse.json({ error: 'Invalid planId' }, { status: 400 });
    }

    const plan = planId as PlanKey;

    // Get amount in centavos (Checkout.com uses smallest currency unit)
    const amountInCentavos = 
      plan === 'proMonthly' ? PRICING.proMonthly.amountCentavos :
      plan === 'proQuarterly' ? PRICING.proQuarterly.totalAmountCentavos :
      plan === 'proSemiannual' ? PRICING.proSemiannual.totalAmountCentavos :
      plan === 'proAnnual' ? PRICING.proAnnual.totalAmountCentavos :
      plan === 'teamMonthly' ? PRICING.teamMonthly.amountCentavos :
      plan === 'teamQuarterly' ? PRICING.teamQuarterly.totalAmountCentavos :
      plan === 'teamSemiannual' ? PRICING.teamSemiannual.totalAmountCentavos :
      PRICING.teamAnnual.totalAmountCentavos;

    const planName = 
      plan.startsWith('pro') ? 'Professional' :
      plan.startsWith('team') ? 'Team' : 'Plan';

    const billingPeriod =
      plan.includes('Monthly') ? 'Monthly' :
      plan.includes('Quarterly') ? 'Quarterly' :
      plan.includes('Semiannual') ? 'Semiannual' :
      'Annual';

    const reference = generateReference();
    const baseUrl = process.env.NEXTAUTH_URL || 'https://jusconsultus.online';

    // Create Checkout.com payment session
    const paymentSession = await createCheckoutPaymentSession({
      amount: amountInCentavos,
      currency: 'PHP',
      reference,
      billing: {
        address: {
          country: 'PH',
        },
      },
      customer: {
        email: session.user.email || undefined,
        name: session.user.name || undefined,
      },
      metadata: {
        userId: session.user.id,
        planId: plan,
        userEmail: session.user.email || '',
        planName: `${planName} (${billingPeriod})`,
      },
      success_url: `${baseUrl}/upgrade/success?reference=${reference}&session_id={payment_session_id}`,
      failure_url: `${baseUrl}/upgrade/failed?reference=${reference}`,
      enabled_payment_methods: ['card'],
      '3ds': {
        enabled: true,
        attempt_n3d: true,
      },
    });

    console.log('[Checkout.com] Payment session created:', paymentSession.id);

    // Construct hosted payment page URL for sandbox
    const hostedPaymentUrl = `https://pay.sandbox.checkout.com/${paymentSession.id}`;

    return NextResponse.json({
      success: true,
      sessionId: paymentSession.id,
      reference,
      redirectUrl: hostedPaymentUrl,
      amount: amountInCentavos / 100,
      amountCentavos: amountInCentavos,
      planId: plan,
    });
  } catch (error) {
    console.error('[Checkout.com] Payment creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
