# Architecture

Three pieces: the app, our gateway, and the railway's existing system. The line
between the second and third is the most important one in the project.

```
┌────────────────────────┐
│  Meridian Rail app     │   Expo / React Native · iOS, Android, web
│  ├ pinned offline data │
│  └ signed tickets      │
└───────────┬────────────┘
            │ HTTPS (EdDSA bearer tokens) · WSS for positions
            ▼
┌────────────────────────┐        ┌──────────────────────────────┐
│  Meridian gateway      │  RW →  │  Gateway database            │
│  Node · Express · ws   │        │  tickets, fares, devices     │
└───────────┬────────────┘        └──────────────────────────────┘
            │ RO (verify-full TLS, SELECT-only role)
            ▼
┌──────────────────────────────────────────────────────────────┐
│  Operator's train system - READ REPLICA                      │
│  sched.schedule · rt.activation · rt.movement                │
│  rt.formation · rt.coach_loading · rt.train_position         │
│  ref.station · ref.platform · rt.disruption                  │
└──────────────────────────────────────────────────────────────┘
```

## Why the gateway cannot write to the railway

The operator's database is a safety-adjacent system of record. A consumer app is
a large, fast-moving, internet-facing attack surface, and connecting one to that
database with write access would mean a bug in a ticket screen is, in principle,
a bug in an operational railway system.

So the connection is constrained in four independent ways, any one of which
would be sufficient and all four of which are applied:

1. **A read replica**, not the primary.
2. **A role granted `SELECT` only** - `meridian_gateway_ro`.
3. **`SET default_transaction_read_only = on`** on every connection, in
   `server/src/db/pool.ts`, in case the grant is ever mis-applied.
4. **`verify-full` TLS** with a pinned internal CA, refused at boot in
   production if configured any other way (`server/src/config.ts`).

Everything the product creates - orders, tickets, device bindings, the audit
trail - lives in the gateway's own database. The two write paths never meet.

## Why a gateway at all

The app could, in principle, talk to the railway's feeds directly. It should not:

- **Schema coupling.** The railway's vocabulary is TIPLOCs, activations and
  calling points. Encoding that in a mobile app means every schema change is an
  app release, and an app release reaches everyone over weeks. It is contained in
  one adapter, `server/src/db/legacyRail.ts`.
- **Credentials.** Anything shipped in an app bundle is public. Database
  credentials and signing keys cannot live there.
- **Fan-out.** A trainload of phones each polling the position table is a
  self-inflicted denial of service on a shared replica. The gateway polls once
  every two seconds and fans out over WebSockets
  (`server/src/realtime/positions.ts`).
- **Protocol sprawl.** Last-mile data is GTFS-Realtime and GBFS from several
  operators. Normalising server-side means a new city is a deploy, not a release.

## Data flow for one journey

| Step | App | Gateway | Railway |
|---|---|---|---|
| Search | `api.searchJourneys` | join schedule + real-time | `sched.*`, `rt.movement` |
| Choose a coach | render formation | map load factors to crowding | `rt.formation`, `rt.coach_loading` |
| Pay | payment sheet → token | capture, then mint in one transaction | - |
| Ticket issued | pinned to disk | signed in the HSM, written with audit row | - |
| Walk to station | on-device geometry | - | - |
| Live journey | WSS subscribe + dead reckoning | 2s poll, fan-out | `rt.train_position` |
| Alerts | phase machine in `useJourneyStore` | - | - |
| Onward travel | `api.lastMile` | normalise GTFS-RT / GBFS | - |

## Client architecture

- **Routing** is file-based (Expo Router). A route file holds composition and
  wiring; anything reusable is a component, anything stateful is a store, and
  anything that talks to the outside world is a service.
- **State** is four small zustand stores - settings, tickets, journey, search -
  each persisted to AsyncStorage with an explicit `partialize`, so persistence is
  a decision rather than an accident.
- **The network boundary is one file**, `services/apiClient.ts`. Every read is
  cache-first with a network reconcile and reports its own provenance, which is
  what lets a screen honestly say "last known" instead of quietly lying.
- **The live journey is a forward-only state machine**
  (`state/useJourneyStore.ts`). Phases never regress, which is what makes
  "notify exactly once" true even when a trackside sensor reading is missed.

## Failure behaviour

| Failure | What the passenger sees |
|---|---|
| No connectivity | Tickets, maps and station data unchanged; a banner explains |
| Real-time feed down | Timetable times, labelled as such; the map still moves |
| Position feed stale >45s | Falls back to timetable dead reckoning |
| Gateway 5xx | Cached copy with its age shown |
| Railway replica slow | 4s statement timeout, then cached data |
| Payment succeeds, issuance fails | Transaction rolls back; the copy says so |

## A note on the web build

`app.json` sets `web.output` to `single`, not `static`. Static pre-rendering
would bake a build-time "now" into the HTML for every screen, and every screen
here is time-dependent - departure times, countdowns, delay minutes. The result
is a hydration mismatch on first paint of literally every page. A single-page
build renders once, on the client, with the right clock.
