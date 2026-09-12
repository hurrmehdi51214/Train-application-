# Meridian gateway

The service between the app and the operator's existing train system. It reads
from the railway, writes only to its own database, and is the only thing in the
system that holds a credential.

```
cp .env.example .env
npm install
npm run keygen          # development ticket signing key; paste into .env
psql "$GATEWAY_DB_URL" -f src/db/schema.sql
npm run dev
```

`GET http://localhost:8080/healthz` should answer once both databases are
reachable.

## What it is responsible for

- Translating the railway's schema (TIPLOCs, activations, calling points) into
  the app's domain model. All of that lives in `src/db/legacyRail.ts` and
  `src/db/mappers.ts`.
- Minting and signing tickets, idempotently and atomically with the charge.
- Fanning out live positions over WebSockets - one poll of the railway, many
  subscribers.
- Normalising last-mile feeds so the phone speaks one protocol.

## What it must never do

Write to the operator's database. That is enforced four independent ways; see
[../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Layout

```
src/
  index.ts               app wiring, graceful shutdown
  config.ts              validated at boot; refuses unsafe production settings
  db/
    pool.ts              two pools: railRead (SELECT only) and gatewayWrite
    legacyRail.ts        every query against the railway, all parameterised
    mappers.ts           row shapes to wire shapes
    schema.sql           our own tables
  routes/
    reference.ts         stations
    services.ts          services, departure boards, positions
    tickets.ts           purchase, activation, public key set
    connections.ts       last-mile (integration seam)
  security/
    tickets.ts           Ed25519 signing, KMS seam, references, fingerprints
    keygen.ts            development keys only
  middleware/
    auth.ts              EdDSA token verification, written by hand and why
    rateLimit.ts         in-process fixed window; needs Redis behind replicas
    security.ts          headers, cache policy, request ids, error handling
  realtime/
    positions.ts         authenticated WebSocket fan-out
```

## Before production

Three things are deliberately unimplemented, each throwing or returning empty
rather than pretending:

1. `security/tickets.ts` - `KmsSigner.sign`, against your KMS's asymmetric-sign
   API. The gateway refuses to boot in production with a PEM key in the
   environment, so this is not optional.
2. `routes/connections.ts` - `loadConnections`, against the region's GTFS-RT and
   GBFS feeds.
3. `middleware/rateLimit.ts` - move the bucket store to Redis if you run more
   than one replica.

You will also need to point `db/legacyRail.ts` at the real schema. The queries
there encode a plausible operator model; the column names will not match yours,
but the shape of what is needed will.

## Operational notes

- **Statement timeout is 4 seconds.** A query against the railway's replica that
  has not answered by then will not answer usefully, and failing fast protects
  the replica from us more than it protects us.
- **Shutdown is graceful.** `SIGTERM` stops accepting connections, lets in-flight
  requests finish, then closes the pools, with a 15s hard limit. A hard exit here
  drops someone's purchase mid-transaction.
- **Errors are logged with a request id and never returned in detail.** Quote the
  `X-Request-Id` from a passenger's screenshot to find the line.
