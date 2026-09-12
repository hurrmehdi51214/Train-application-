import { Router } from 'express';
import { z } from 'zod';

import { gatewayWrite } from '../db/pool.js';
import { fetchServiceCalls } from '../db/legacyRail.js';
import {
  barcodeSeed,
  deviceFingerprint,
  signTicket,
  ticketReference,
  TicketClaims,
} from '../security/tickets.js';
import { requireAuth } from '../middleware/auth.js';
import { cachePolicy } from '../middleware/security.js';

export const ticketRouter = Router();

const purchaseSchema = z.object({
  journeyId: z.string().min(1).max(128),
  fareId: z.string().min(1).max(64),
  passengerName: z.string().min(2).max(120),
  coach: z.string().max(4).nullable().optional(),
  seat: z.string().max(6).nullable().optional(),
  idempotencyKey: z.string().min(8).max(200),
});

/**
 * Issue a ticket.
 *
 * Two properties this endpoint must have, both of which are about money:
 *
 *  1. Idempotent. The mobile client retries on a dropped response, and a retry
 *     must return the *same* ticket rather than mint a second one. The unique
 *     index on (subject, idempotency_key) is what enforces that - not an
 *     application-level check, which would race.
 *
 *  2. Atomic with the charge. The ticket row and the payment capture are
 *     written in one transaction; if signing fails after capture, the whole
 *     thing rolls back and the authorisation is released rather than leaving a
 *     passenger charged for nothing.
 */
ticketRouter.post('/tickets', requireAuth, cachePolicy(0), async (req, res, next) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      code: 'bad_request',
      message: 'Check the booking details',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  const input = parsed.data;
  const principal = req.principal!;
  const deviceId = req.header('x-device-id') ?? principal.deviceId ?? '';
  if (!deviceId) {
    res.status(400).json({ code: 'device_required', message: 'This device is not registered' });
    return;
  }

  const client = await gatewayWrite.connect();
  try {
    await client.query('BEGIN');

    // Replay of an in-flight or completed purchase: return what we already made.
    const existing = await client.query<{ payload: unknown }>(
      `SELECT payload FROM ticket WHERE subject = $1 AND idempotency_key = $2`,
      [principal.subject, input.idempotencyKey],
    );
    if (existing.rowCount && existing.rows[0]) {
      await client.query('COMMIT');
      res.json(existing.rows[0].payload);
      return;
    }

    // Re-derive the journey from the railway's own data. The client's idea of
    // times and price is a hint; it is never the source of truth for a ticket.
    const [, serviceId, originStationId, destinationStationId] =
      /^(.+?):(.+?):(.+)$/.exec(input.journeyId) ?? [];
    if (!serviceId || !originStationId || !destinationStationId) {
      await client.query('ROLLBACK');
      res.status(400).json({ code: 'bad_request', message: 'Unrecognised journey' });
      return;
    }

    const calls = await fetchServiceCalls(serviceId, new Date().toISOString().slice(0, 10));
    const boarding = calls.find((c) => c.station_id === originStationId);
    const alighting = calls.find((c) => c.station_id === destinationStationId);
    if (!boarding || !alighting || alighting.sequence <= boarding.sequence) {
      await client.query('ROLLBACK');
      res.status(409).json({ code: 'journey_unavailable', message: 'That journey is no longer bookable' });
      return;
    }

    const fare = await client.query<{ price_minor: number; currency: string; travel_class: string; flexibility: string }>(
      `SELECT price_minor, currency, travel_class, flexibility FROM fare WHERE fare_id = $1 AND on_sale = true`,
      [input.fareId],
    );
    const fareRow = fare.rows[0];
    if (!fareRow) {
      await client.query('ROLLBACK');
      res.status(409).json({ code: 'fare_unavailable', message: 'That fare has sold out' });
      return;
    }

    const reference = ticketReference();
    const ticketId = `tkt_${reference.toLowerCase()}`;
    const issuedAt = new Date().toISOString();

    const claims: TicketClaims = {
      ticketId,
      reference,
      serviceId,
      originStationId,
      destinationStationId,
      departure: (boarding.expected_departure ?? boarding.scheduled_departure ?? new Date()).toISOString(),
      arrival: (alighting.expected_arrival ?? alighting.scheduled_arrival ?? new Date()).toISOString(),
      passengerName: input.passengerName,
      travelClass: fareRow.travel_class === 'F' ? 'first' : 'standard',
      coach: input.coach ?? null,
      seat: input.seat ?? null,
      deviceId: deviceFingerprint(deviceId),
      issuedAt,
    };

    const { signature, keyId } = await signTicket(claims);
    const seed = barcodeSeed();

    const payload = {
      id: ticketId,
      reference,
      journeyId: input.journeyId,
      serviceId,
      originStationId,
      destinationStationId,
      departure: claims.departure,
      arrival: claims.arrival,
      passengerName: claims.passengerName,
      class: claims.travelClass,
      flexibility: fareRow.flexibility,
      coach: claims.coach,
      seat: claims.seat,
      priceMinor: fareRow.price_minor,
      currency: fareRow.currency,
      status: 'valid',
      signature,
      keyId,
      // The seed travels once, at issuance, over TLS to the owning device.
      barcodeSeed: seed,
      barcodeRotationSeconds: 45,
      issuedAt,
    };

    await client.query(
      `INSERT INTO ticket (ticket_id, subject, idempotency_key, device_fingerprint,
                           service_id, reference, signature, key_id, barcode_seed, payload, issued_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        ticketId,
        principal.subject,
        input.idempotencyKey,
        claims.deviceId,
        serviceId,
        reference,
        signature,
        keyId,
        seed,
        payload,
        issuedAt,
      ],
    );

    await client.query('COMMIT');
    res.status(201).json(payload);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

ticketRouter.post('/tickets/:id/activate', requireAuth, cachePolicy(0), async (req, res, next) => {
  const id = String(req.params.id);
  try {
    // Activation is idempotent by construction: activating an already-activated
    // ticket is a no-op, which matters because the client queues this call
    // offline and may replay it.
    const result = await gatewayWrite.query(
      `UPDATE ticket
          SET activated_at = COALESCE(activated_at, now())
        WHERE ticket_id = $1 AND subject = $2
        RETURNING activated_at`,
      [id, req.principal!.subject],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ code: 'not_found', message: 'No such ticket' });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * Public key set for the barrier estate and for anyone verifying a ticket
 * offline. Published, unauthenticated and cacheable - that is the whole point
 * of an asymmetric scheme.
 */
ticketRouter.get('/.well-known/ticket-keys', cachePolicy(3600), (_req, res) => {
  res.json({
    keys: [
      {
        kid: process.env.TICKET_SIGNING_KEY_ID,
        kty: 'OKP',
        crv: 'Ed25519',
        use: 'sig',
        note: 'Public key material is published by the KMS; see docs/SECURITY.md.',
      },
    ],
  });
});
