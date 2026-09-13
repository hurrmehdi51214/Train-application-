import { Platform } from 'react-native';

/**
 * Payments.
 *
 * This app never sees a card number or a wallet PIN. Collecting either in a
 * React Native view would pull the whole mobile estate into PCI-DSS scope and,
 * for the wallets, would be a straightforward account-takeover surface. The
 * flow is: the gateway creates an intent, the provider's own sheet or a
 * redirect collects the instrument, and the app handles only an opaque token
 * plus the intent's status.
 *
 * The method list is Pakistan's, not a copy of a Western checkout. Mobile
 * wallets clear the large majority of online payments here, so JazzCash and
 * Easypaisa come first and card comes third.
 *
 * `openPaymentSheet` is the seam. Dropping in a real PSP means implementing
 * that one function; nothing else in the app needs to know what a card is.
 */

export type PaymentMethodKind =
  | 'jazzcash'
  | 'easypaisa'
  | 'card'
  | 'bank-transfer'
  | 'platform-pay';

export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  label: string;
  caption: string;
  /** Last four digits or a masked mobile number. Never a full instrument. */
  hint?: string;
  recommended?: boolean;
}

export interface PaymentResult {
  status: 'succeeded' | 'cancelled' | 'failed';
  /** Provider reference, safe to log and to quote to support. */
  reference?: string;
  message?: string;
}

export function availableMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = [
    {
      id: 'jazzcash',
      kind: 'jazzcash',
      label: 'JazzCash',
      caption: 'Pay from your mobile account',
      recommended: true,
    },
    {
      id: 'easypaisa',
      kind: 'easypaisa',
      label: 'Easypaisa',
      caption: 'Pay from your mobile account',
    },
    {
      id: 'card',
      kind: 'card',
      label: 'Debit or credit card',
      caption: 'Visa, Mastercard, PayPak',
    },
    {
      id: 'bank',
      kind: 'bank-transfer',
      label: 'Bank transfer (1Link)',
      caption: 'Pay from any Pakistani bank account',
    },
  ];

  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    methods.push({
      id: 'platform',
      kind: 'platform-pay',
      label: Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay',
      caption: 'Where your bank supports it',
    });
  }

  return methods;
}

/**
 * Presents the provider's payment sheet for an intent created server-side.
 *
 * The stub resolves successfully after a short delay so the purchase flow is
 * exercisable without a PSP configured. It is the one function in this file
 * that must be replaced before this app goes anywhere near real money, and it
 * is intentionally the only one.
 */
export async function openPaymentSheet(input: {
  clientSecret?: string;
  amountMinor: number;
  method: PaymentMethod;
}): Promise<PaymentResult> {
  if (input.amountMinor <= 0) return { status: 'failed', message: 'Nothing to pay' };

  await new Promise((resolve) => setTimeout(resolve, 1100));

  return { status: 'succeeded', reference: `pi_${Date.now().toString(36)}` };
}

/**
 * Idempotency key for the purchase call. Derived from the journey, class and a
 * per-attempt nonce so a retry after a dropped response reuses the same key and
 * cannot create a second ticket or a second charge.
 */
export function idempotencyKey(journeyId: string, travelClass: string, attemptNonce: string): string {
  return `${journeyId}|${travelClass}|${attemptNonce}`;
}
