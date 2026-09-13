# Offline

"Works offline" is a promise that gets tested at a barrier, at 07:40, with a
queue behind you. So it is worth being exact about what is guaranteed.

## The guarantee

| Works with no connection | Needs a connection |
|---|---|
| Every ticket, including a valid rotating barcode | Buying a new ticket |
| Station reference data and search | Live delay minutes |
| Route and station maps, from bundled geometry | Platform confirmations |
| The PNR, class, coach and berth on every ticket | Walking directions from Google |
| The last known times for a journey you have opened | Last-mile departure times |
| Activating a ticket (queues and replays) | - |

Anything served from the cache is labelled in the UI with where it came from.
The app never shows a stale platform number as if it were live.

## The map has two modes, and the fallback is not a failure

With a Maps key and a connection, the app renders Google Maps: `react-native-maps`
on iOS and Android, the Maps JavaScript API on web, behind one `<Map/>`
component.

With neither, it draws the network itself from vector geometry
(`src/components/map/VectorMap.tsx`, `src/data/geometry.ts`). Google's own
offline areas are a per-user, per-device download that cannot be relied on, and
a raster tile cache of our own would need a tile server, an eviction policy and
a several-hundred-megabyte download to be useful.

The trade, stated plainly: **the fallback gives up streets and building
footprints.** In exchange:

- The whole network is a few kilobytes and ships inside the app bundle.
- It draws in one frame and animates at 60fps on a mid-range Android.
- It is legible at a glance on a moving train, because we control every stroke.
- It works identically with the radio off. There is no tile cache to miss, and
  no bill.

This is what runs between Sibi and Quetta, where the line spends a long time
inside the Bolan tunnels. For street-level detail at either end, "Open in Maps"
hands off to the platform app, which is better at that job and which many people
already have offline areas for.

## Cache design

`src/services/offline.ts` has two parts, kept deliberately separate.

**A read-through cache with an explicit freshness contract.** Entries carry a
TTL and report back as `fresh`, `stale`, `pinned` or `missing`. Screens render
from disk immediately and reconcile afterwards.

**Pinning.** Tickets and station/map reference data are written with
`ttlMs: null`: never stale, never evicted. A ticket that expires out of the cache
at a barrier with no signal is the single worst failure this app can have, so it
is made structurally impossible rather than merely unlikely.

Tickets are also pinned *individually*, separately from the zustand blob, so a
corrupt settings migration cannot take them with it.

A corrupt cache entry is dropped rather than thrown: a malformed JSON blob should
not take a screen down with it.

## The outbox

Writes made offline go into a durable queue (`enqueue` / `flush`).

- **Replayed oldest-first, stopping at the first failure.** Ordering is
  preserved, because a ticket activation must never overtake the purchase that
  created it.
- **Drained on the offline-to-online transition only**, not on a timer
  (`state/useNetworkStore.ts`).
- **Dropped after five attempts, and reported.** An outbox that can never drain
  is a silent bug; better to surface it.

## Live data when the feed is not live

`src/hooks/useLiveService.ts` and `src/services/realtime.ts` between them mean the
map keeps moving whatever happens:

1. A live packet is trusted for 45 seconds.
2. After that, or with no feed at all, the position is dead-reckoned along the
   known alignment from the timetable - interpolated call-to-call, not
   start-to-end, so the marker sits on the right station at the right minute.
3. A train running to time *is* where the timetable says it is, so this
   degradation is honest rather than a guess.

Polling stops when the app is backgrounded. A live map refreshing in someone's
pocket for a two-hour journey is a battery complaint, and iOS stops honouring
those timers eventually anyway.

## Reconnect behaviour

The position socket backs off 1s, 2s, 5s, 10s, 30s with **full jitter**
(`Math.random() * base`, not `base`). A train leaving a tunnel reconnects a few
hundred phones at once; without jitter they would all retry on the same
millisecond, repeatedly.

## Storage footprint

Profile then Storage shows the cache size and offers to clear it. Clearing
removes only unpinned entries, and the copy says so explicitly: tickets are never
touched.
