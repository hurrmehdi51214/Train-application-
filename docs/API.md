# Gateway API

Base URL `/v1`. JSON in, JSON out. The shapes below are exactly the TypeScript
types in `src/types/index.ts` - that file is the contract, and the app's fixture
layer (`src/data/`) returns the same shapes so the two can never drift.

## Authentication

`Authorization: Bearer <access token>` on everything except the endpoints marked
public. Tokens are EdDSA-signed; see [SECURITY.md](SECURITY.md).

Every request should also carry `X-Device-Id`. It is required for ticket issuance
(the ticket is bound to a fingerprint of it) and is used as the rate-limit key
for unauthenticated calls.

`X-Request-Id` is echoed back on every response, including errors. It is the
reference to quote in a support conversation.

## Errors

```json
{ "code": "fare_unavailable", "message": "That fare has sold out", "requestId": "..." }
```

| Status | `code` | Meaning |
|---|---|---|
| 400 | `bad_request` | Malformed input; `issues[]` lists the fields |
| 401 | `unauthenticated` | No token, or it failed verification |
| 403 | `forbidden` | Missing scope |
| 404 | `not_found`, `service_not_found` | No such resource |
| 409 | `journey_unavailable`, `fare_unavailable` | Sold out or no longer bookable |
| 429 | `rate_limited` | `Retry-After` is set |
| 500 | `internal_error` | Detail is in the log against `requestId` |

## Reference

### `GET /stations` (public)

All public stations. `Cache-Control: private, max-age=3600`; the client pins the
response permanently.

```json
[{
  "id": "stn-yrk", "code": "YRK", "name": "York", "city": "York",
  "coordinate": { "lat": 53.9578, "lon": -1.0934 },
  "entrances": [{ "id": "yrk-front", "label": "Station Road (front)", "coordinate": {} }],
  "platforms": ["1", "2"], "facilities": ["step-free", "toilets"],
  "concourseWalkMinutes": 5, "timezone": "Europe/London"
}]
```

## Services

### `GET /services/:id`

One service with its calling pattern, formation and disruptions. `max-age=20`.

```json
{
  "id": "svc-1y24", "headcode": "1Y24", "operator": "Meridian Rail",
  "origin": "stn-kgx", "destination": "stn-yrk",
  "calls": [{
    "stationId": "stn-sve", "sequence": 1,
    "scheduledArrival": "2026-03-14T09:22:00Z", "scheduledDeparture": "2026-03-14T09:23:00Z",
    "expectedArrival": "2026-03-14T09:24:00Z", "expectedDeparture": "2026-03-14T09:25:00Z",
    "platform": "3", "platformConfirmed": true,
    "status": "scheduled", "delayMinutes": 2
  }],
  "carriages": [{
    "letter": "C", "position": 3, "class": "standard",
    "crowding": "busy", "occupancy": 0.78,
    "amenities": ["wifi", "power", "trolley"], "seats": 76
  }],
  "geometry": [{ "lat": 51.53, "lon": -0.12 }],
  "disruptions": [{ "id": "...", "severity": "minor", "title": "...", "detail": "...", "issuedAt": "..." }],
  "cancelled": false
}
```

Notes that matter to a client:

- `expected*` falls back to `scheduled*` when the real-time feed is unavailable.
  It is never null when the scheduled value is present.
- `platformConfirmed: false` means the platform is a forecast. Render it as one.
- `occupancy` is a measurement from the train's counters, not a booking count, so
  it includes people standing. A coach whose counter has failed reports
  `crowding: "moderate"` rather than `"empty"`.
- `geometry` is our own asset. The operator's schema carries calling points, not
  track alignment, so this is empty from the database path and filled from the
  app's bundled geometry.

### `GET /stations/:stationId/departures`

Public departure board for the next 120 minutes, grouped by service. `max-age=15`.

### `GET /positions?services=a,b,c`

Latest position for up to 25 services. `no-store`. Positions older than ten
minutes are not returned at all - a stale position is worse than none, because
the client can dead-reckon from the timetable but cannot know a fix is wrong.

```json
[{
  "serviceId": "svc-1y24",
  "coordinate": { "lat": 52.9, "lon": -0.64 },
  "bearing": 348, "speedKph": 187, "progress": 0.53,
  "nextCallSequence": 4, "recordedAt": "2026-03-14T09:41:07Z",
  "source": "gps"
}]
```

`source` is one of `gps` (from the train), `trackside` (signalling) or
`interpolated`. The app labels the map with it.

## Realtime

### `WSS /v1/stream?access_token=...`

Authenticated **before** the upgrade completes; an unauthenticated socket never
exists. Up to 8 subscriptions per socket.

```
client → { "type": "subscribe",   "serviceId": "svc-1y24" }
client → { "type": "unsubscribe", "serviceId": "svc-1y24" }
server → { "type": "position", "position": { ...TrainPosition } }
```

The server polls the railway once every two seconds for the union of everything
anyone is watching and fans out - not one query per connected phone. Pings every
30s; a socket that misses one is terminated.

## Journeys and fares

### `GET /journeys?origin=&destination=`

```json
[{
  "id": "svc-1y24:stn-kgx:stn-yrk",
  "legs": [{ "serviceId": "svc-1y24", "originStationId": "stn-kgx",
             "destinationStationId": "stn-yrk", "departure": "...", "arrival": "...",
             "platform": "4" }],
  "durationMinutes": 128, "changes": 0,
  "fares": [{
    "id": "fare-advance", "class": "standard", "flexibility": "advance",
    "priceMinor": 2100, "currency": "GBP",
    "refundable": false, "changeable": false, "seatsRemaining": 12,
    "conditions": ["Valid only on the booked train"]
  }],
  "expectedCrowding": "moderate", "carbonGramsPerPassenger": 8704
}]
```

The journey `id` is `serviceId:originStationId:destinationStationId`, which is
what the purchase endpoint re-derives the journey from. Prices are integer minor
units; there are no floats anywhere near money.

## Tickets

### `POST /tickets`

```json
{
  "journeyId": "svc-1y24:stn-kgx:stn-yrk",
  "fareId": "fare-advance",
  "passengerName": "A Passenger",
  "coach": "F", "seat": "12A",
  "idempotencyKey": "svc-1y24:stn-kgx:stn-yrk|fare-advance|k3n9x2"
}
```

**Idempotent on `(subject, idempotencyKey)`.** A repeat returns `200` with the
original ticket; a first call returns `201`. The client generates the key once
per purchase attempt and reuses it across retries, so a dropped response cannot
produce a second ticket or a second charge.

The server re-derives times, price and validity from the railway's own data. The
client's idea of them is a hint and is never trusted for a ticket.

Response is a `Ticket`, plus `barcodeSeed` - 32 random bytes, sent exactly once,
to the owning device only.

### `POST /tickets/:id/activate`

`204`. Idempotent by construction (`activated_at = COALESCE(activated_at, now())`),
which matters because the client queues this call offline and may replay it.

### `GET /.well-known/ticket-keys` (public)

Public keys for the barrier estate and anyone verifying a ticket offline.
`max-age=3600`. Publishing these is the entire point of an asymmetric scheme.

## Connections

### `GET /stations/:stationId/connections`

Last-mile transit, normalised from the region's GTFS-Realtime and GBFS feeds so
the app speaks one protocol. `max-age=30`.

```json
[{
  "id": "yrk-bus-1", "mode": "bus", "line": "1",
  "headsign": "Chapelfields via City Centre",
  "boardingPoint": "Station Front, Stop RA", "walkMinutesToBoarding": 2,
  "departures": ["2026-03-14T11:44:00Z"], "frequencyMinutes": 10,
  "operator": "First York", "accessible": true, "fareNote": "Contactless flat fare"
}]
```

The client ranks these by the first departure it could physically reach
(`now + walkMinutesToBoarding`), not by departure time.

## Health

### `GET /healthz` (public)

`200` when both pools answer, `503` otherwise, with which one failed.
