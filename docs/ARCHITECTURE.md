# Architecture

Three pieces: the app, our gateway, and Pakistan Railways' existing systems. The
line between the second and third is the most important one in the project.

```
┌────────────────────────┐
│  Safar app             │   Expo / React Native · iOS, Android, web
│  ├ pinned offline data │   client Maps key only (SDK rendering)
│  └ signed tickets      │
└───────────┬────────────┘
            │ HTTPS (EdDSA bearer tokens) · WSS for positions
            ▼
┌────────────────────────┐        ┌──────────────────────────────┐
│  Safar gateway         │  RW →  │  Gateway database            │
│  Node · Express · ws   │        │  orders, tickets, devices    │
└─────┬──────────────┬───┘        └──────────────────────────────┘
      │              │ server Maps key → Google web services
      │ RO (verify-full TLS, SELECT-only role)
      ▼
┌──────────────────────────────────────────────────────────────┐
│  Pakistan Railways systems  ·  READ REPLICA                  │
│  sched.train · sched.schedule_stop · ctrl.train_run          │
│  ctrl.movement · ctrl.train_position · ctrl.service_notice   │
│  rake.formation · rake.coach · rake.berth · res.allocation   │
│  fare.slab · ref.station · ref.platform · ref.operator       │
└──────────────────────────────────────────────────────────────┘
```

## Why the gateway cannot write to the railway

The reservation and control-office databases are safety-adjacent systems of
record. A consumer app is a large, fast-moving, internet-facing attack surface,
and connecting one to those databases with write access would mean a bug in a
ticket screen is, in principle, a bug in an operational railway system.

So the connection is constrained in four independent ways, any one of which
would be sufficient and all four of which are applied:

1. **A read replica**, not the primary.
2. **A role granted `SELECT` only**, `safar_gateway_ro`.
3. **`SET default_transaction_read_only = on`** on every connection, in
   `server/src/db/pool.ts`, in case the grant is ever mis-applied.
4. **`verify-full` TLS** with a pinned internal CA, refused at boot in
   production if configured any other way (`server/src/config.ts`).

Everything the product creates (orders, tickets, device bindings, the audit
trail) lives in the gateway's own database. The two write paths never meet.

## Why a gateway at all

The app could, in principle, talk to the railway's systems directly. It should
not:

- **Schema coupling.** The railway's vocabulary is run UIDs, stop sequences,
  slab fares and berth types, and a train is numbered differently in each
  direction. Encoding that in a mobile app means every schema change is an app
  release, and an app release reaches everyone over weeks. It is contained in
  one adapter, `server/src/db/legacyRail.ts`, and one translation layer,
  `server/src/db/mappers.ts`.
- **Credentials.** Anything shipped in an app bundle is public. Database
  credentials, ticket signing keys and the billable Google Maps key cannot live
  there.
- **Fan-out.** A trainload of phones each polling the position table is a
  self-inflicted denial of service on a shared replica. The gateway polls once
  every two seconds and fans out over WebSockets
  (`server/src/realtime/positions.ts`).
- **Billing.** Directions, Geocoding, Places and Distance Matrix are metered.
  They go through `/v1/maps/*`, which holds the server key, narrows every
  parameter and caches the answers.

## The two Google Maps keys

They are split because the halves have different security properties, and this
is the single most commonly botched part of a Maps integration.

| | Client key | Server key |
|---|---|---|
| Lives in | the app bundle | `server/.env` only |
| Used for | Maps SDK rendering | Directions, Geocoding, Places, Distance Matrix |
| Restricted by | bundle id, signing certificate, HTTP referrer | nothing (it cannot be) |
| Billable per call | no | yes |

A server key in an app binary is money anyone with `unzip` can spend. The app
therefore never holds one, and `src/services/googleMaps.ts` routes every data
call through `config.mapsProxyUrl`.

With no key at all the app draws its own bundled vector geometry
(`src/components/map/VectorMap.tsx`). That is a supported mode, not a degraded
one: it is what runs in the Bolan tunnels.

## Data flow for one journey

| Step | App | Gateway | Railway |
|---|---|---|---|
| Search | `searchJourneys` | join schedule + control office | `sched.*`, `ctrl.movement` |
| Choose a class | render offers | slab fares, berths, load factors | `fare.slab`, `rake.*`, `res.allocation` |
| Pay | payment sheet → token | capture, then mint in one transaction | none |
| Ticket issued | pinned to disk | signed in the KMS, written with audit row | none |
| Walk to station | Directions via the proxy | holds the server key | none |
| Live journey | WSS subscribe + dead reckoning | 2s poll, fan-out | `ctrl.train_position` |
| Alerts | phase machine in `useJourneyStore` | none | none |
| Onward travel | `api.lastMile` | normalise operator feeds | none |

## Client architecture

- **Routing** is file-based (Expo Router). A route file holds composition and
  wiring; anything reusable is a component, anything stateful is a store, and
  anything that talks to the outside world is a service.
- **The map is one component with three implementations.** `Map.native.tsx`
  wraps `react-native-maps`, `Map.web.tsx` wraps the Maps JavaScript API, and
  `VectorMap.tsx` draws the network in SVG when there is no key or no signal.
  `Map.d.ts` gives the platform split a single type, so no screen branches on
  platform.
- **State** is six small zustand stores (settings, search, tickets, journey,
  wishlist, network), each persisted to AsyncStorage with an explicit
  `partialize`, so persistence is a decision rather than an accident.
- **The network boundary is one file**, `services/apiClient.ts`. Every read is
  cache-first with a network reconcile and reports its own provenance, which is
  what lets a screen honestly say "last known position" instead of quietly
  lying.
- **The live journey is a forward-only state machine**
  (`state/useJourneyStore.ts`). Phases never regress, which is what makes
  "notify exactly once" true even when a position update is missed.
- **The distance and fare model is pure and dependency-free.**
  `src/data/chainage.ts`, `fares.ts` and `geometry.ts` import nothing relative,
  which is what lets `tests/fares.test.ts` run them under plain Node and hold
  them to Pakistan Railways' published figures.

## Failure behaviour

| Failure | What the passenger sees |
|---|---|
| No connectivity | Tickets, maps and station data unchanged; a banner explains |
| No Maps key | Vector network map; "Open in Maps" still hands off |
| Real-time feed down | Timetable times, labelled as such; the map still moves |
| Position feed stale >45s | Falls back to timetable dead reckoning |
| Gateway 5xx | Cached copy with its age shown |
| Railway replica slow | 4s statement timeout, then cached data |
| Payment succeeds, issuance fails | Transaction rolls back; the copy says so |

## A note on the web build

`app.json` sets `web.output` to `single`, not `static`. Static pre-rendering
would bake a build-time "now" into the HTML for every screen, and every screen
here is time-dependent: departure times, countdowns, delay minutes. The result
is a hydration mismatch on first paint of literally every page. A single-page
build renders once, on the client, with the right clock.
