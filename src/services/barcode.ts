import * as Crypto from 'expo-crypto';

/**
 * Rotating barcode.
 *
 * A static QR on a ticket is a screenshot away from being shared. Barriers on
 * this network therefore accept a payload that changes on a fixed window, in
 * the style of a TOTP: the gateway issues a per-ticket seed at purchase, the
 * device derives the current code locally, and the barrier derives the same
 * code from its own copy of the seed. No network is involved on either side,
 * which is exactly why it still works in a tunnel.
 *
 * The truncation below follows RFC 4226's dynamic-truncation idea (offset taken
 * from the low nibble of the digest) so that every byte of the digest can
 * influence the output.
 */

export const ROTATION_SECONDS = 45;

function windowFor(epochMs: number, rotationSeconds: number): number {
  return Math.floor(epochMs / 1000 / rotationSeconds);
}

async function digest(input: string): Promise<Uint8Array> {
  const hex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Six-digit rotating code for a ticket seed at a point in time. */
export async function rotatingCode(
  seed: string,
  atMs = Date.now(),
  rotationSeconds = ROTATION_SECONDS,
): Promise<string> {
  const counter = windowFor(atMs, rotationSeconds);
  const bytes = await digest(`${seed}:${counter}`);
  const offset = (bytes[bytes.length - 1] ?? 0) & 0x0f;
  const truncated =
    (((bytes[offset] ?? 0) & 0x7f) << 24) |
    (((bytes[offset + 1] ?? 0) & 0xff) << 16) |
    (((bytes[offset + 2] ?? 0) & 0xff) << 8) |
    ((bytes[offset + 3] ?? 0) & 0xff);
  return String(truncated % 1_000_000).padStart(6, '0');
}

/** Seconds until the current code is replaced, for the countdown ring. */
export function secondsUntilRotation(atMs = Date.now(), rotationSeconds = ROTATION_SECONDS): number {
  return rotationSeconds - Math.floor((atMs / 1000) % rotationSeconds);
}

/**
 * Wire format the barrier scanner parses. Version-prefixed so the format can
 * change without stranding tickets already in wallets.
 */
export async function buildBarcodePayload(input: {
  reference: string;
  keyId: string;
  signature: string;
  seed: string;
  atMs?: number;
}): Promise<string> {
  const code = await rotatingCode(input.seed, input.atMs);
  const window = windowFor(input.atMs ?? Date.now(), ROTATION_SECONDS);
  return ['SFR1', input.reference, input.keyId, window.toString(36), code, input.signature].join('|');
}

export function parseBarcodePayload(payload: string) {
  const [version, reference, keyId, window, code, signature] = payload.split('|');
  if (version !== 'SFR1') return null;
  return { version, reference, keyId, window, code, signature };
}
