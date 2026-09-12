import { Ticket } from '@/types';
import { getJourneyOption } from '@/data/services';
import { ROTATION_SECONDS, buildBarcodePayload } from './barcode';

/**
 * Fixture ticket minting, used only when `config.useFixtures` is on.
 *
 * IMPORTANT: the `signature` produced here is a placeholder, not a cryptographic
 * signature. Real tickets are signed with an Ed25519 key that lives in the
 * gateway's HSM and never leaves it (see server/src/security/tickets.ts). A
 * client that could sign its own tickets would be a client that could print
 * money, so this path exists purely so the app is runnable without a backend.
 */

function reference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 - read aloud at a barrier
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function issueFixtureTicket(input: {
  journeyId: string;
  fareId: string;
  passengerName: string;
  coach?: string | null;
  seat?: string | null;
  idempotencyKey: string;
}): Promise<Ticket> {
  const journey = getJourneyOption(input.journeyId);
  if (!journey) throw new Error('Journey no longer available');
  const fare = journey.fares.find((f) => f.id === input.fareId) ?? journey.fares[0]!;
  const leg = journey.legs[0]!;

  const ref = reference();
  const seed = `${ref}:${input.idempotencyKey}`;
  const id = `tkt_${ref.toLowerCase()}`;

  return {
    id,
    reference: ref,
    journeyId: journey.id,
    serviceId: leg.serviceId,
    originStationId: leg.originStationId,
    destinationStationId: leg.destinationStationId,
    departure: leg.departure,
    arrival: leg.arrival,
    passengerName: input.passengerName,
    class: fare.class,
    flexibility: fare.flexibility,
    coach: input.coach ?? null,
    seat: input.seat ?? null,
    priceMinor: fare.priceMinor,
    currency: fare.currency,
    status: 'valid',
    signature: `fixture.${seed.length.toString(16)}.unsigned`,
    keyId: 'fixture-key',
    barcodePayload: await buildBarcodePayload({
      reference: ref,
      keyId: 'fixture-key',
      signature: 'unsigned',
      seed,
    }),
    barcodeRotationSeconds: ROTATION_SECONDS,
    issuedAt: new Date().toISOString(),
  };
}

/** Seed a ticket's rotating code without persisting the seed in plain state. */
export function seedFor(ticket: Ticket): string {
  return `${ticket.reference}:${ticket.id}`;
}
