import { PassengerDetail, Ticket, TravelClass } from '@/types';
import { getJourneyOption } from '@/data/trains';
import { partyFareMinor } from '@/data/network';
import { ROTATION_SECONDS, buildBarcodePayload } from './barcode';

/**
 * Fixture ticket minting, used only when `config.useFixtures` is on.
 *
 * IMPORTANT: the `signature` produced here is a placeholder, not a
 * cryptographic signature. Real tickets are signed with an Ed25519 key that
 * lives in the gateway's HSM and never leaves it (server/src/security/tickets.ts).
 * A client that could sign its own tickets would be a client that could print
 * money, so this path exists purely so the app is runnable without a backend.
 */

/**
 * PNR. Pakistan Railways quotes these at counters and over the phone, so the
 * alphabet excludes every character that gets misheard or misread: no I, O, 0,
 * 1, S or 5.
 */
function pnr(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRTUVWXYZ23467899';
  let out = '';
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Berths are allotted by the reservation system; this mirrors its shape. */
function allotBerths(
  passengers: PassengerDetail[],
  coaches: string[],
  travelClass: TravelClass,
  preferLower: boolean,
): PassengerDetail[] {
  const coach = coaches[0] ?? 'A';
  const seated = travelClass === 'economy' || travelClass === 'ac-business' || travelClass === 'parlour';
  const berthOrder = preferLower ? (['lower', 'upper', 'middle'] as const) : (['lower', 'middle', 'upper'] as const);

  return passengers.map((passenger, index) => ({
    ...passenger,
    coach,
    berth: String(12 + index * 2),
    berthType: seated ? 'seat' : (berthOrder[index % berthOrder.length] ?? 'lower'),
  }));
}

export async function issueFixtureTicket(input: {
  journeyId: string;
  travelClass: TravelClass;
  passengers: PassengerDetail[];
  preferLowerBerth: boolean;
  idempotencyKey: string;
}): Promise<Ticket> {
  const journey = getJourneyOption(input.journeyId);
  if (!journey) throw new Error('That journey is no longer bookable');

  const offer = journey.offers.find((o) => o.travelClass === input.travelClass) ?? journey.offers[0]!;
  const adults = input.passengers.filter((p) => (p.age ?? 30) >= 12).length || 1;
  const children = input.passengers.length - adults;

  const reference = pnr();
  const id = `tkt_${reference.toLowerCase()}`;
  const seed = `${reference}:${input.idempotencyKey}`;

  return {
    id,
    pnr: reference,
    serviceId: journey.serviceId,
    originStationId: journey.originStationId,
    destinationStationId: journey.destinationStationId,
    departure: journey.departure,
    arrival: journey.arrival,
    travelClass: offer.travelClass,
    passengers: allotBerths(input.passengers, offer.coaches, offer.travelClass, input.preferLowerBerth),
    totalMinor: partyFareMinor(offer.fareMinor, { adults, children, infants: 0 }),
    currency: 'PKR',
    status: 'confirmed',
    signature: `fixture.${seed.length.toString(16)}.unsigned`,
    keyId: 'fixture-key',
    barcodePayload: await buildBarcodePayload({
      reference,
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
  return `${ticket.pnr}:${ticket.id}`;
}
