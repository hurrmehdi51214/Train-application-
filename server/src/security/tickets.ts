import { createPrivateKey, createPublicKey, sign, randomBytes, createHash } from 'node:crypto';

import { config } from '../config.js';

/**
 * Ticket signing.
 *
 * A ticket is a bearer credential that has to be verifiable by a barrier with
 * no network. That rules out anything involving a lookup at scan time, and it
 * rules out symmetric keys - a HMAC secret distributed to every gate in the
 * country is a secret that leaks, and a leaked secret mints free travel.
 *
 * So: Ed25519 detached signatures over a canonical payload. The private key
 * exists only inside the HSM/KMS; barriers hold the public key and a key-id map,
 * and rotation is a matter of publishing a new key-id ahead of its first use.
 *
 * The payload is canonicalised before signing - fixed field order, no
 * whitespace - because "the JSON I happened to serialise" is not a stable thing
 * to sign, and a verifier that re-serialises differently will reject valid
 * tickets in the rain at 7am.
 */

export interface TicketClaims {
  ticketId: string;
  reference: string;
  serviceId: string;
  originStationId: string;
  destinationStationId: string;
  departure: string;
  arrival: string;
  passengerName: string;
  travelClass: 'standard' | 'first';
  coach: string | null;
  seat: string | null;
  /** Device the ticket was issued to, so a shared screenshot is detectable. */
  deviceId: string;
  issuedAt: string;
}

export function canonicalise(claims: TicketClaims): string {
  // Explicit ordering, not Object.keys - the field order is part of the format.
  return [
    claims.ticketId,
    claims.reference,
    claims.serviceId,
    claims.originStationId,
    claims.destinationStationId,
    claims.departure,
    claims.arrival,
    claims.passengerName,
    claims.travelClass,
    claims.coach ?? '',
    claims.seat ?? '',
    claims.deviceId,
    claims.issuedAt,
  ].join('\u001f'); // unit separator: cannot appear in any of these fields
}

interface Signer {
  keyId: string;
  sign(payload: string): Promise<string>;
}

/**
 * KMS-backed signer. The implementation is a seam rather than a stub: whichever
 * KMS the operator uses, it exposes "sign these bytes with this key" and
 * nothing here needs the key material itself.
 */
class KmsSigner implements Signer {
  constructor(
    readonly keyId: string,
    private readonly uri: string,
  ) {}

  async sign(_payload: string): Promise<string> {
    throw new Error(
      `KMS signing is not wired up for ${this.uri}. Implement KmsSigner.sign against your ` +
        `provider's asymmetric-sign API before deploying to production.`,
    );
  }
}

/** Local signer for development and CI. Rejected at boot in production. */
class LocalSigner implements Signer {
  private readonly key;

  constructor(
    readonly keyId: string,
    pem: string,
  ) {
    this.key = createPrivateKey(pem);
    if (this.key.asymmetricKeyType !== 'ed25519') {
      throw new Error('Ticket signing key must be Ed25519');
    }
  }

  async sign(payload: string): Promise<string> {
    // Ed25519 signs the message directly; passing a digest algorithm is an error.
    return sign(null, Buffer.from(payload, 'utf8'), this.key).toString('base64url');
  }
}

let signer: Signer | null = null;

export function getSigner(): Signer {
  if (signer) return signer;
  if (config.TICKET_SIGNING_KMS_URI) {
    signer = new KmsSigner(config.TICKET_SIGNING_KEY_ID, config.TICKET_SIGNING_KMS_URI);
  } else if (config.ED25519_PRIVATE_KEY_PEM) {
    signer = new LocalSigner(config.TICKET_SIGNING_KEY_ID, config.ED25519_PRIVATE_KEY_PEM);
  } else {
    throw new Error('No ticket signing key configured (set TICKET_SIGNING_KMS_URI or ED25519_PRIVATE_KEY_PEM)');
  }
  return signer;
}

export async function signTicket(claims: TicketClaims): Promise<{ signature: string; keyId: string }> {
  const active = getSigner();
  return { signature: await active.sign(canonicalise(claims)), keyId: active.keyId };
}

/**
 * Seed for the ticket's rotating barcode code. Random, per ticket, and shared
 * only with the issuing device and the barrier estate - never derived from the
 * reference, or a leaked reference would be a forgeable code.
 */
export function barcodeSeed(): string {
  return randomBytes(32).toString('base64url');
}

/** Human-readable reference. Excludes characters that get misread aloud. */
export function ticketReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

/** Stable fingerprint of a device id, for binding without storing the raw id. */
export function deviceFingerprint(deviceId: string): string {
  return createHash('sha256').update(deviceId).digest('base64url').slice(0, 32);
}

export function publicKeyPem(): string {
  if (!config.ED25519_PRIVATE_KEY_PEM) {
    throw new Error('Public key is published from the KMS in this environment');
  }
  return createPublicKey(config.ED25519_PRIVATE_KEY_PEM)
    .export({ type: 'spki', format: 'pem' })
    .toString();
}
