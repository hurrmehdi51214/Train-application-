# Gateway API

Base URL `/v1`. JSON in, JSON out. The shapes below are exactly the TypeScript
types in `src/types/index.ts`. That file is the contract, and the app's bundled
data layer (`src/data/`) returns the same shapes, so the two can never drift.

Money is always an integer in **paisa** (1/100 PKR) in a `*Minor` field. There
are no floats anywhere near a fare.

## Authentication

`Authorization: Bearer <access token>` on everything except the endpoints marked
public. Tokens are EdDSA-signed; see [SECURITY.md](SECURITY.md).

Every request should also carry `X-Device-Id`. It is required for ticket
issuance (the ticket is bound to a fingerprint of it) and is used as the
rate-limit key for unauthenticated calls.

`X-Request-Id` is echoed back on every response, including errors. It is the
reference to quote in a support conversation.

## Errors

```json
{ "code": "fare_unavailable", "message": "That class has sold out", "requestId": "..." }
```

| Status | `code` | Meaning |
|---|---|---|
| 400 | `bad_request` | Malformed input; `issues[]` lists the fields |
| 400 | `device_required` | No `X-Device-Id` on a ticket purchase |
| 400 | `out_of_area` | A Maps request with coordinates outside Pakistan |
| 401 | `unauthenticated` | No token, or it failed verification |
| 403 | `forbidden` | Missing scope |
| 404 | `not_found`, `service_not_found`, `no_route` | No such resource |
| 409 | `journey_unavailable`, `fare_unavailable` | Sold out or no longer bookable |
| 429 | `rate_limited` | `Retry-After` is set |
| 500 | `internal_error` | Detail is in the log against `requestId` |
| 502 | `internal_error` | An upstream (Google Maps) failed |
| 503 | `internal_error` | Maps are not configured on this gateway |

## Reference

### `GET /stations` (public)

Every station on the network. `max-age=3600`; the client pins the response
permanently, so this is the one call that must work before anything else does.

```json
[{
  "id": "khi-cantt", "code": "KCS", "name": "Karachi Cantonment",
  "nameUrdu": "کراچی چھاؤنی", "city": "Karachi", "province": "Sindh",
  "coordinate": { "lat": 24.8543, "lon": 67.0163 },
  "line": "ML-1", "platforms": 8,
  "facilities": ["waiting-room", "ladies-waiting-room", "prayer-area", "porters"],
  "concourseWalkMinutes": 6,
  "photoKey": "station.kcs"
}]
```

`photoKey` is ours, not the railway's. The gateway derives it from the station
code and the app resolves it against its own bundled photo table.

## Services

### `GET /services/:id?date=yyyy-mm-dd`

One train run with its calling pattern, accommodation and notices. `max-age=20`.

```json
{
  "id": "run-5up-20260913", "number": "5UP", "name": "Green Line Express",
  "nameUrdu": "گرین لائن ایکسپریس", "operator": "Pakistan Railways", "line": "ML-1",
  "originStationId": "khi-cantt", "destinationStationId": "isb-margalla",
  "calls": [{
    "stationId": "hyd-junction", "sequence": 2, "distanceKm": 166,
    "scheduledArrival": "2026-09-13T18:05:00Z", "scheduledDeparture": "2026-09-13T18:10:00Z",
    "expectedArrival": "2026-09-13T18:19:00Z", "expectedDeparture": "2026-09-13T18:24:00Z",
    "platform": "2", "platformConfirmed": true,
    "status": "scheduled", "delayMinutes": 14, "haltMinutes": 5
  }],
  "offers": [{
    "travelClass": "ac-business", "coaches": ["A", "B"],
    "berths": ["lower", "upper"],
    "amenities": ["air-conditioning", "bedding", "meals-included", "power-socket"],
    "available": 14, "capacity": 48, "crowding": "busy", "fareMinor": 545000
  }],
  "disruptions": [{ "id": "...", "severity": "minor", "title": "...", "detail": "...", "issuedAt": "..." }],
  "photoKeys": [], "rating": 0, "reviewCount": 0, "reviews": [],
  "tagline": "", "about": "", "runsOn": [],
  "cancelled": false, "featured": false
}
```

Notes that matter to a client:

- `expected*` falls back to `scheduled*` when the control office feed is
  unavailable. It is never null when the scheduled value is present.
- `platformConfirmed: false` means the platform is a forecast. Render it as one.
- `distanceKm` is chainage from the train's origin. The app's fare and geometry
  model is anchored on the operator's two published figures, 1,518 km on the
  Green Line and 1,687 km Karachi to Peshawar, and `tests/fares.test.ts` holds
  it there.
- `crowding` is derived from sold berths against capacity, not from a counter,
  because the coaches have no counters.
- The empty fields (`photoKeys`, `rating`, `reviews`, `tagline`, `about`) are
  editorial and ours, not the railway's. The app joins them on the service id
  from its own bundled tables. They are present rather than omitted so the shape
  is the same whichever source a screen got its data from.

### `GET /stations/:stationId/departures`

Public departure board, grouped by run. `max-age=15`. Same `TrainService` shape,
with `offers` empty: a board is not a place to sell from.

### `GET /positions?services=a,b,c`

Latest position for up to 25 runs. `no-store`. Positions older than ten minutes
are not returned at all: a stale position is worse than none, because the client
can dead-reckon from the timetable but cannot know a fix is wrong.

```json
[{
  "serviceId": "run-5up-20260913",
  "coordinate": { "lat": 27.71, "lon": 68.86 },
  "bearing": 21, "speedKph": 96, "progress": 0.42,
  "nextCallSequence": 7, "recordedAt": "2026-09-13T22:41:07Z",
  "source": "gps"
}]
```

`source` is `gps` (from the locomotive), `trackside` (block instrument or axle
counter) or `timetable` (interpolated). The app labels the map with it.

## Realtime

### `WSS /v1/stream?access_token=...`

Authenticated **before** the upgrade completes; an unauthenticated socket never
exists. Up to 8 subscriptions per socket.

```
client → { "type": "subscribe",   "serviceId": "run-5up-20260913" }
client → { "type": "unsubscribe", "serviceId": "run-5up-20260913" }
server → { "type": "position", "position": { ...TrainPosition } }
```

The server polls the railway once every two seconds for the union of everything
anyone is watching and fans out, rather than one query per connected phone.
Pings every 30s; a socket that misses one is terminated.

## Journeys and fares

### `GET /journeys?origin=&destination=&date=`

```json
[{
  "id": "run-5up-20260913:khi-cantt:lhr-junction",
  "serviceId": "run-5up-20260913",
  "originStationId": "khi-cantt", "destinationStationId": "lhr-junction",
  "departure": "2026-09-13T16:00:00Z", "arrival": "2026-09-14T09:30:00Z",
  "durationMinutes": 1050, "distanceKm": 1214, "platform": "4",
  "offers": [{ "travelClass": "economy", "fareMinor": 195000, "available": 212, "crowding": "moderate" }],
  "rating": 4.83, "reviewCount": 411,
  "nightsOnBoard": 1
}]
```

The journey id is `serviceId:originStationId:destinationStationId`, which is what
the purchase endpoint re-derives the journey from. `nightsOnBoard` drives the
moon on the card, and on this network most of them have one.

## Tickets

### `POST /tickets`

```json
{
  "journeyId": "run-5up-20260913:khi-cantt:lhr-junction",
  "fareId": "ac-business",
  "passengerName": "A Passenger",
  "coach": "A", "seat": "12",
  "idempotencyKey": "run-5up-20260913:khi-cantt:lhr-junction|ac-business|k3n9x2"
}
```

**Idempotent on `(subject, idempotencyKey)`.** A repeat returns `200` with the
original ticket; a first call returns `201`. The client generates the key once
per purchase attempt and reuses it across retries, so a dropped response cannot
produce a second ticket or a second charge.

The server re-derives times, fare and validity from the railway's own data. The
client's idea of them is a hint and is never trusted for a ticket.

The response is a `Ticket`, including the PNR, plus `barcodeSeed`: 32 random
bytes, sent exactly once, to the owning device only.

CNIC digits are stored as the last six only. See
[SECURITY.md](SECURITY.md#privacy).

### `POST /tickets/:id/activate`

`204`. Idempotent by construction (`activated_at = COALESCE(activated_at, now())`),
which matters because the client queues this call offline and may replay it.

### `GET /.well-known/ticket-keys` (public)

Public keys for the gate estate and anyone verifying a ticket offline.
`max-age=3600`. Publishing these is the entire point of an asymmetric scheme.

## Connections

### `GET /stations/:stationId/connections`

Last-mile transit, normalised so the app speaks one protocol whatever a city
runs. `max-age=30`.

```json
[{
  "id": "lhr-metro-1", "mode": "metrobus", "name": "Lahore Metrobus",
  "headsign": "Gajjumata via Kalma Chowk",
  "boardingPoint": "Railway Station station, northbound",
  "walkMinutesToBoarding": 4,
  "departures": ["2026-09-14T09:44:00Z"], "frequencyMinutes": 3,
  "operator": "Punjab Masstransit Authority",
  "fareMinor": 3000, "note": "Flat fare, card or cash at the gate"
}]
```

`fareMinor` is null for anything metered, which is most rickshaws. The client
ranks these by the first departure it could physically reach
(`now + walkMinutesToBoarding`), not by departure time.

## Google Maps proxy

`/v1/maps/*`. The gateway holds the server key; the app never does. Every
endpoint validates its parameters, rejects coordinates outside Pakistan, caches
what Google's terms allow, and returns only the fields the app uses. `503` if no
server key is configured.

| Endpoint | Cache | Returns |
|---|---|---|
| `GET /maps/directions?origin=&destination=&mode=` | 1 hour | `{ polyline, distanceMeters, durationSeconds }` |
| `GET /maps/places/autocomplete?input=&location=&radius=` | 10 min | `{ suggestions: [{ placeId, primary, secondary }] }` |
| `GET /maps/places/detail?place_id=` | 24 hours | `{ lat, lon }` |
| `GET /maps/distance-matrix?origin=&destination=&mode=` | 2 min | `{ distanceMeters, durationSeconds }` |
| `GET /maps/geocode?address=` | 24 hours | `{ lat, lon, placeId, address }` |

`origin`, `destination` and `location` are `lat,lng` strings. Autocomplete and
geocoding are pinned to `country:pk`. A Directions reply that would be about
40 kB from Google leaves here at about 400 bytes.

Google answers HTTP 200 with a `status` field, so the code alone is not enough:
anything that is not `OK` or `ZERO_RESULTS` becomes a 502, and Google's
`error_message` is never passed through, because it can name the key.

## Health

### `GET /healthz` (public)

`200` when both pools answer, `503` otherwise, with which one failed.
