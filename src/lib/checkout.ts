/**
 * Checkout.com API Client
 * https://www.checkout.com/docs/payments/payment-sessions
 */

const CHECKOUT_SECRET_KEY = process.env.CHECKOUT_SECRET_KEY || '';
const CHECKOUT_PUBLIC_KEY = process.env.CHECKOUT_PUBLIC_KEY || '';
const CHECKOUT_API_URL = process.env.CHECKOUT_API_URL || 'https://api.sandbox.checkout.com';

export interface CheckoutPaymentSessionRequest {
  amount: number; // in centavos (smallest currency unit)
  currency: string;
  reference: string;
  billing?: {
    address?: {
      country?: string;
    };
  };
  customer?: {
    email?: string;
    name?: string;
  };
  metadata?: Record<string, any>;
  success_url?: string;
  failure_url?: string;
  enabled_payment_methods?: string[];
  '3ds'?: {
    enabled?: boolean;
    attempt_n3d?: boolean;
  };
}

export interface CheckoutPaymentSessionResponse {
  id: string;
  payment_session_token: string;
  _links: {
    self: { href: string };
    redirect: { href: string };
  };
}

/**
 * Create a payment session with Checkout.com
 * Uses Payment Sessions API for hosted payment page
 */
export async function createCheckoutPaymentSession(
  request: CheckoutPaymentSessionRequest
): Promise<CheckoutPaymentSessionResponse> {
  if (!CHECKOUT_SECRET_KEY) {
    throw new Error('CHECKOUT_SECRET_KEY is not configured');
  }

  try {
    const response = await fetch(`${CHECKOUT_API_URL}/payment-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHECKOUT_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        reference: request.reference,
        billing: request.billing || {
          address: {
            country: 'PH',
          },
        },
        customer: request.customer,
        metadata: request.metadata,
        success_url: request.success_url,
        failure_url: request.failure_url,
        enabled_payment_methods: request.enabled_payment_methods || ['card'],
        '3ds': request['3ds'] || {
          enabled: true,
          attempt_n3d: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Checkout.com] API Error:', response.status, errorText);
      throw new Error(`Payment session creation failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Checkout.com] Payment session creation error:', error);
    throw error;
  }
}

/**
 * Verify Checkout.com webhook signature
 */
export function verifyCheckoutWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  try {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(payload);
    const computedSignature = hmac.digest('hex');
    return computedSignature === signature;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Get payment details from Checkout.com
 */
export async function getCheckoutPayment(paymentId: string) {
  if (!CHECKOUT_SECRET_KEY) {
    throw new Error('CHECKOUT_SECRET_KEY is not configured');
  }

  try {
    const response = await fetch(`${CHECKOUT_API_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CHECKOUT_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_type || 'Failed to fetch payment');
    }

    return await response.json();
  } catch (error) {
    console.error('Checkout.com payment fetch error:', error);
    throw error;
  }
}

export { CHECKOUT_PUBLIC_KEY };
