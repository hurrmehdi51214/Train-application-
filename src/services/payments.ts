import { Platform } from 'react-native';

/**
 * Payments.
 *
 * This app never sees a card number. Collecting PANs in a React Native view
 * would pull the whole mobile estate into PCI-DSS scope for no benefit, so the
 * flow is: the gateway creates a payment intent, the platform sheet (Apple Pay /
 * Google Pay) or the provider's hosted SDK collects the instrument, and the app
 * only ever handles an opaque token plus the intent's status.
 *
 * `openPaymentSheet` below is the seam. Dropping in Stripe, Adyen or Checkout
 * means implementing this one function against their SDK; nothing else in the
 * app changes, and no other file needs to know what a card is.
 */

export type PaymentMethodKind = 'platform-pay' | 'saved-card' | 'new-card';

export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  label: string;
  /** Last four digits, for a saved instrument only. Never the full PAN. */
  hint?: string;
  default?: boolean;
}

export interface PaymentResult {
  status: 'succeeded' | 'cancelled' | 'failed';
  /** Provider reference, safe to log and to show in support. */
  reference?: string;
  message?: string;
}

export function platformPayLabel(): string {
  return Platform.OS === 'ios' ? 'Apple Pay' : Platform.OS === 'android' ? 'Google Pay' : 'Wallet';
}

export function availableMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  if (Platform.OS !== 'web') {
    methods.push({ id: 'platform', kind: 'platform-pay', label: platformPayLabel(), default: true });
  }
  methods.push({ id: 'saved', kind: 'saved-card', label: 'Saved card', hint: '4242', default: Platform.OS === 'web' });
  methods.push({ id: 'new', kind: 'new-card', label: 'Another card' });
  return methods;
}

/**
 * Presents the provider's payment sheet for an intent created server-side.
 *
 * The stub resolves successfully after a short delay so the purchase flow is
 * exercisable without a payment provider configured. It is the one function in
 * this file that must be replaced before this app goes anywhere near real money,
 * and it is intentionally the only one.
 */
export async function openPaymentSheet(input: {
  clientSecret?: string;
  amountMinor: number;
  currency: string;
  method: PaymentMethod;
}): Promise<PaymentResult> {
  if (input.amountMinor <= 0) {
    return { status: 'failed', message: 'Nothing to pay' };
  }

  await new Promise((resolve) => setTimeout(resolve, 900));

  return {
    status: 'succeeded',
    reference: `pi_${Date.now().toString(36)}`,
  };
}

/**
 * Idempotency key for the purchase call. Derived from the journey, fare and a
 * per-attempt nonce so that a retry after a dropped response reuses the same
 * key and cannot create a second ticket or a second charge.
 */
export function idempotencyKey(journeyId: string, fareId: string, attemptNonce: string): string {
  return `${journeyId}|${fareId}|${attemptNonce}`;
}
