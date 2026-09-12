# Meridian Rail

A cross-platform train transit app - iOS, Android and web from one codebase -
covering the whole journey: finding a train, buying a ticket, getting to the
right platform, watching the train move, being told when to get off, and working
out how to finish the last mile.

Built with Expo (React Native 0.76, Expo Router 4) in TypeScript, with a Node
gateway that reads from the operator's existing train system database.

```
npm install
npm run assets     # regenerates the icon set (already committed)
npm start          # then press i, a, or w
```

The app runs immediately with no backend: `src/data/` holds a live-shaped
fixture layer, and `EXPO_PUBLIC_USE_FIXTURES=false` plus an API base URL switches
it to a real gateway. Nothing else in the app changes.

---

## What it does

| | |
|---|---|
| **Secure ticketing** | Ed25519-signed tickets minted server-side, with a rotating on-device barcode. Card data never touches the app. |
| **Public install QR** | One permanent URL, one code - in-app for staff to show, and a static landing page for posters. |
| **Navigation to the station** | Live bearing and distance to the *nearest entrance*, plus how long the walk inside takes. |
| **Journey tracking** | A vector map with the train drawn nose-first along the alignment, and a rail of calling points it slides down. |
| **Journey notifications** | Departure, an approach warning you choose the length of, and arrival. Each fires once. |
| **Delays and platforms** | Live delay minutes and platform numbers, with unconfirmed platforms labelled as forecasts. |
| **Amenities and crowding** | Per-coach loading from the train's own counters, and what is actually on board each carriage. |
| **Offline** | Tickets, station data and maps are pinned to the device. Writes queue and replay in order. |
| **Last-mile transit** | Buses, trams, metro, ferries, cycle hire and taxis, ranked by what you can physically catch. |
| **Rail system integration** | A read-only gateway over the operator's database, with our own write store kept separate. |

## Layout

```
app/                    Expo Router routes - one file per screen
  (tabs)/               Today · Plan · Tickets · Account
  booking/              results → seats → checkout
  journey/[serviceId]   live map, calling points, formation
  navigate/[stationId]  walk to the station
  lastmile/[stationId]  onward connections
  ticket/[id]           the barrier screen
  install.tsx           the public install QR

src/
  theme/                tokens, typography, ThemeProvider
  components/           primitives/ · rail/ · map/
  screens logic         hooks/ · state/ (zustand)
  services/             apiClient · offline · auth · barcode · notifications ·
                        location · realtime · payments
  data/                 fixture timetable, stations, geometry, connections
  utils/                geo · time · format
  types/                the domain model, and the gateway contract

server/                 the API gateway (Node + Express + pg + ws)
web/install/            the public install landing page
docs/                   architecture, security, offline, design, API
tests/                  unit tests for the pure logic
```

## Commands

| | |
|---|---|
| `npm start` | Expo dev server |
| `npm run ios` / `android` / `web` | start on one platform |
| `npm test` | unit tests (`node --test`, no test framework dependency) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run assets` | redraw the icons from `scripts/generate-assets.mjs` |
| `npm run server` | run the gateway in watch mode |

## Configuration

Copy `.env.example` to `.env`. Only `EXPO_PUBLIC_*` variables reach the client,
and everything in the client bundle is readable by anyone who downloads the app -
so no secret ever goes there. Gateway secrets live in `server/.env`.

## Reading the code

Three files explain most of the design decisions:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - how the app, the gateway and
  the operator's existing database fit together, and why the gateway cannot write
  to the railway.
- [`docs/OFFLINE.md`](docs/OFFLINE.md) - why the map is vector geometry rather
  than tiles, and what "works offline" is guaranteed to mean.
- [`docs/SECURITY.md`](docs/SECURITY.md) - ticket signing, the rotating barcode,
  token handling, and what is deliberately left to a payment provider.

## Status

The app, the design system and the offline layer are complete and typechecked.
The gateway is complete against the documented schema but has never been pointed
at a real railway database - the adapter in `server/src/db/legacyRail.ts` encodes
a plausible operator schema and is the file to change first. Three integration
seams are explicit stubs, each marked in its own file:

- `server/src/security/tickets.ts` - `KmsSigner.sign` (throws until implemented)
- `server/src/routes/connections.ts` - `loadConnections` (GTFS-RT / GBFS)
- `src/services/payments.ts` - `openPaymentSheet` (payment provider SDK)

## Licence

MIT. See [LICENCE](LICENCE).
