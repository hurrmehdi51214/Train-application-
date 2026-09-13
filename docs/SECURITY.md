# Security

The threat that matters most here is not data theft. It is free travel: a ticket
is a bearer credential worth real money, and it has to be checkable by a barrier
in a cutting with no signal. Everything below follows from that.

## Tickets

**Ed25519 detached signatures, minted server-side.**
`server/src/security/tickets.ts` signs a canonical payload; barriers verify it
against a published public key with no network round-trip.

Why not a HMAC: a symmetric secret would have to be distributed to every gate in
the estate. One leak mints unlimited free travel, and rotation means touching
every gate. With an asymmetric scheme the barriers hold only public keys, and a
compromised gate yields nothing.

Why the payload is canonicalised by hand (fixed field order, unit-separator
delimiters, no whitespace): "the JSON I happened to serialise" is not a stable
thing to sign. A verifier written in another language, re-serialising with
different key ordering, would reject valid tickets - in the rain, at 07:00.

**The private key never leaves the HSM/KMS.** `ED25519_PRIVATE_KEY_PEM` exists
for local development and CI. The gateway refuses to start in production if it is
set (`server/src/config.ts`).

**The client cannot sign.** `src/services/ticketIssuer.ts` produces an explicitly
unsigned placeholder and says so in its own header. A client that could sign its
own tickets is a client that can print money.

## Rotating barcode

A static QR is a screenshot away from being shared. The barcode carries a code
derived from a per-ticket random seed and the current 45-second window, in the
style of a TOTP (`src/services/barcode.ts`). Truncation follows RFC 4226's
dynamic-truncation idea so every byte of the digest can influence the output.

The seed is 32 random bytes issued once over TLS to the owning device. It is
never derived from the reference - a leaked reference would otherwise be a
forgeable code.

Both the phone and the barrier compute the code locally, which is exactly why it
still works in a tunnel.

## Device binding

A ticket is issued against a SHA-256 fingerprint of the device id, not the id
itself (`deviceFingerprint`). The gateway can detect one credential presented
from many devices without ever storing an identifier that can be correlated back
to a handset.

## Tokens

- **EdDSA, asymmetric.** The gateway holds only a public key, so compromising it
  cannot mint tokens.
- **The algorithm comes from configuration, never from the token header.** Every
  historic "alg confusion" JWT vulnerability starts with trusting that header;
  `server/src/middleware/auth.ts` rejects anything that is not `EdDSA` before
  reading further.
- **30 seconds of clock skew, and no more.** A longer grace window on a bearer
  token is a longer window for a stolen one.
- **Errors are never echoed.** A 401 says "your session has expired" whichever
  check failed; telling an attacker *which* check failed is free reconnaissance.

## Token storage on the device

| | |
|---|---|
| Access token | memory only, never written to disk |
| Refresh token | platform keystore - Keychain / Android Keystore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY` |
| Web | **not persisted at all**; the session ends with the tab |

The web degradation is deliberate and stated rather than papered over: browsers
have no keystore, and putting a refresh token in `localStorage` would be
pretending otherwise. See `src/services/auth.ts`.

Concurrent refreshes share a single in-flight promise, so a burst of requests on
cold start cannot stampede the token endpoint.

## Payments

**The app never sees a card number, a wallet PIN or an OTP.** Collecting any of
those in a React Native view would pull the whole mobile estate into PCI-DSS
scope, and in the wallet case would be indistinguishable from a phishing screen.
The flow is: the gateway creates an intent, the provider's own sheet or SDK
collects the instrument, and the app handles only an opaque token.

The method list is Pakistan's rather than a copy of a Western checkout
(`src/services/payments.ts`). JazzCash and Easypaisa come first because mobile
wallets clear the large majority of online payments here, then 1Link bank
transfer, then card, then the platform sheet where the device offers one.

`openPaymentSheet` is the single seam. It is the one function that must be
replaced before this goes near real money, and it is intentionally the only one.

**Purchase is idempotent.** The unique index on `(subject, idempotency_key)` in
`server/src/db/schema.sql` is what enforces it, not an application-level check,
which would race. A retry after a dropped response returns the same ticket
rather than minting a second one and charging twice.

**Issuance and capture are one transaction.** If signing fails after capture, the
whole thing rolls back and the authorisation is released.

## The Google Maps keys

Two keys, because the halves have different security properties.

The **client key** renders maps through the Maps SDK. It ships in the bundle by
nature, so it is restricted by iOS bundle id, Android signing certificate and
web referrer, with only the Maps SDKs enabled on it. A restricted rendering key
that leaks costs nothing because it will not authenticate from anywhere else.

The **server key** authenticates Directions, Geocoding, Places and Distance
Matrix. Those are billable and cannot be restricted by bundle id or referrer, so
a server key in an app binary is money that anyone with `unzip` can spend. It
lives in `server/.env` and is used only by `server/src/routes/maps.ts`.

That proxy is written to be useless to anyone else:

- every parameter is schema-validated, and coordinates are rejected outside
  Pakistan's bounding box, so it cannot be turned into a free geocoding relay
  for someone else's project;
- Places is field-masked to `geometry/location`, because Places bills per field
  group;
- responses are cut down to the handful of fields the app uses, which takes a
  40 kB Directions reply to about 400 bytes;
- Google's `error_message` is never passed through, because it can name the key;
- an eight-second abort stops a slow upstream holding a connection open.

## Gateway hardening

| Control | Where |
|---|---|
| Read-only replica, `SELECT`-only role, read-only transactions | `db/pool.ts` |
| `verify-full` TLS to the railway, enforced at boot | `config.ts` |
| Every query parameterised - no interpolation anywhere | `db/legacyRail.ts` |
| 4s statement timeout | `db/pool.ts` |
| Request body capped at 32 kB | `index.ts` |
| Rate limiting keyed on subject or device, not IP | `middleware/rateLimit.ts` |
| `no-store` on anything holding a ticket or a name | `middleware/security.ts` |
| Internal errors logged, correlation id returned | `middleware/security.ts` |
| WebSocket authenticated **before** the upgrade completes | `realtime/positions.ts` |
| `trust proxy` set to exactly one hop | `index.ts` |

Rate limiting is in-process and says so in its own header comment: behind more
than one replica it must be backed by Redis, or the effective limit multiplies by
the replica count. It is keyed on subject or device rather than IP because a
train full of passengers shares one NAT address on the onboard Wi-Fi and would
otherwise rate-limit each other.

## Privacy

- Location is read only while a navigation or live-journey screen is open, and
  is never sent to the gateway. Position on the map comes from the train's own
  feed, not from the passenger's phone.
- Permission is requested at the moment it buys the user something - the first
  time they open navigation - not on first launch.
- Tickets and settings stay on the device. `evictUnpinned()` clears caches and
  never touches tickets.
- **Only the last six digits of a CNIC are held.** Pakistan Railways requires a
  CNIC for reserved accommodation, and a full national identity number is the
  single most sensitive field this product could store. Six digits are enough
  for a conductor to match a passenger against a manifest and not enough to
  reconstruct the number.
- Google Maps calls carry coordinates, never a passenger identifier, and the
  gateway logs neither.

## Known gaps

Stated rather than hidden:

- `KmsSigner.sign` throws until implemented against a real KMS.
- There is no certificate pinning on the app's own HTTPS calls yet.
- Jailbreak/root attestation is not implemented; device binding is the only
  control against a copied ticket today.
- The rotating-code window tolerance a barrier should accept (one window either
  side, for clock drift) is a barrier-side decision and is not in this repository.
