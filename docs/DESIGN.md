# Design

The brief was "premium, polished, genuine, and not a template", and then, after
a first attempt that missed: make it feel like Airbnb, and make it Pakistani.
Those are not decorative instructions. They are a set of decisions, and these
are the ones that were made, and why.

## The one-sentence idea

A passenger using this app is usually standing up, moving, holding something,
and slightly late. Every screen is designed for that person first and for the
browsing person second. The browsing person still gets photographs.

## Why Airbnb's structure, deliberately

Airbnb's system is a solved problem for photo-led marketplace UI: a large image,
a name, a rating, a price, and almost no chrome. A train service maps onto it
almost exactly. The service is a listing, Pakistan Railways is the host, the
classes are room types, the amenities are amenities, and a journey is a stay
with a check-in and a check-out.

Re-deriving that from scratch would only have produced a worse version of it, so
it is borrowed in detail: the search pill, the category rail, the three-card
Where/When/Who accordion, the listing carousel with its shrinking dots, the
floating Map toggle, the price-pill map markers, the sticky reserve bar.

Everywhere the two models disagree, the railway wins. A passenger who misses the
difference between AC Business and AC Sleeper has lost a night's sleep, not a
nice view, so class is never reduced to a price tier.

## Type: one family, no serif

`src/theme/typography.ts`. Airbnb sets everything in Cereal, which is licensed
to Airbnb alone. This uses **Manrope**, the closest freely licensed face in the
same genus: geometric skeleton, humanist detailing, tall x-height, round
single-storey shapes.

One family, six weights, and that is the whole system. Hierarchy comes from
weight and size, never from a second face, because a photo-led interface goes
noisy the moment two families argue with each other.

The scale is Airbnb's: 14/400 body, 16/500 and 16/600 for labels and prices,
headings stepping 17, 20, 22, 26, 32, with negative tracking that grows with
size. Nothing is set in a monospace face. Digit alignment matters less than a
platform number that reads as part of the same product.

The first version of this app used a serif for display text. It was the single
biggest reason it read as generated rather than designed, and it is gone.

## Colour: the flag, and then neutrals

`src/theme/tokens.ts`.

- **Green is the brand**, and it is the flag's: `#01411C`. That exact value
  fails contrast on white at body size, so interactive green is `#0E7A3A`, one
  step up the same ramp, which clears 4.5:1. The deep flag green stays for
  gradients, headers and the logo, where it sits under white.
- **Saffron `#E0A02C`** is attention: delays, live status, ratings. It is never
  used decoratively, so when it appears it means something.
- **Everything else is neutral**, and the neutrals are Airbnb's own:
  `#222222` text, `#717171` secondary, `#DDDDDD` hairlines, `#F7F7F7` fills.
  Keeping the palette this narrow is what stops the product looking assembled
  out of parts.

Dark mode is not an inversion. Shadows read as mud on a dark ground, so
elevation there is carried by a hairline and a lighter surface instead.

## Photography does the talking

34 real photographs of Pakistani stations, trains and cities, harvested from
Wikimedia Commons by `scripts/harvest-photos.mjs`, each one licence-checked and
credited in `src/data/photos.ts`.

Nothing is stock and nothing is generated. The harvester rejects candidates that
do not mention Pakistan, that fail a per-subject keyword test, that are diagrams
rather than photographs, or that are portrait. Earlier runs confidently returned
a London bus, a Boeing 737 and a Mayan pyramid, which is exactly why those
filters exist.

Every image is loaded through `expo-image` with a blurhash placeholder, so a
list scrolls over coloured shapes rather than grey boxes.

## Icons are drawn, not imported

`src/components/primitives/Icon.tsx` is a hand-drawn set of 60 glyphs on a
24-unit grid with a 1.8 stroke, round caps and joins.

Two reasons. An icon font ships thousands of glyphs to use sixty, and this app
has to start fast on a platform with one bar of signal. And an off-the-shelf set
is the fastest possible way to look like everyone else.

Filled variants exist only where a control has a genuine on/off state: the
wishlist heart, the active tab, a star in a rating.

## The logo

A train seen head-on, with the crescent and star of the flag in its windscreen
and two rails receding beneath it. Minimal enough to survive at 24px in a header
and still be a train at 1024px on a store listing.

It is drawn twice from the same 48-unit grid: once in React Native SVG
(`src/components/brand/Logo.tsx`) and once in `scripts/generate-assets.mjs`,
which renders the icon, adaptive icon, favicon, splash and notification icon
from signed distance fields with a hand-rolled PNG encoder. Same coordinates,
same shapes, so the component and the app icon cannot drift apart.

## Motion

One set of spring configs in the theme drives everything, because a card that
bounces differently from a sheet feels like two apps.

1. **Motion explains, it never decorates.** The train marker eases between
   position updates because a marker that teleports every 20 seconds looks
   broken. The route rail slides because that is what communicates progress.
2. **Press feedback is `spring.press`**: fast, barely any overshoot, with a
   light haptic. Enough to feel answered, not enough to notice.
3. **One thing is allowed to be playful.** The wishlist heart uses `spring.pop`,
   overshooting and settling with a ring expanding out of it. Airbnb spends its
   animation budget in exactly one place too.
4. **The sheet tracks your finger.** It follows a drag down, resists upward,
   and dismisses on velocity as well as distance, with the backdrop opacity tied
   to position rather than to a timer.

## Details that carry the product

- **The train on the map points the way it is going.** A pin tells you where
  something is; a train drawn nose-first, rotated to its bearing, tells you
  where it is going, which is the question a passenger is actually asking.
- **The marker on the route rail sits between stops** and slides down as the
  service progresses. That is the single detail that makes a journey feel
  tracked rather than listed.
- **The ticket has a notch and a perforation.** It is the only skeuomorphic
  thing in the product and it earns its place: a list of them reads instantly as
  tickets rather than cards.
- **The platform number gets its own panel**, set large, with the confidence of
  the forecast next to it in words. "Platform 4, expected" is honest; a bare "4"
  that changes under someone's feet is not.
- **Urdu sits alongside the English**, in the same weight, on stations and
  tickets. It is not a translation toggle and not a smaller grey subtitle.
- **The QR is always on white**, in both themes. Contrast is what a scanner
  needs, and a dark-mode QR is a returned passenger at a barrier.

## Copy

Product copy is part of the design and was written, not generated:

- **Say the useful thing, not the reassuring thing.** "Platform not yet
  confirmed by the station" beats "Platform TBC".
- **Never alarm about something that is fine.** The offline banner says tickets
  and maps still work, because they do, and panic is not a feature.
- **Numbers get judgement attached.** Crowding is a bar and a word, because
  nobody needs to know a coach is 68 percent full. They need to know whether
  they will get a berth.
- **Fares are in rupees, written as people write them.** PKR 4,950, not 495000
  paisa, which is only how they are stored.

## Accessibility

- Every interactive element carries a role, a label and a state. A class tile
  announces "AC Business, 14 berths left, PKR 5,450", not "AC Business".
- Colour is never the only signal: crowding has a bar and a word, delays have a
  time and a phrase, selection has a tick as well as a fill.
- Interactive green is one step off the flag green precisely so text on it
  passes contrast. The brand value is never used for small text on white.
- Text scales with the platform setting; nothing is pinned to a fixed row height
  that would clip at larger sizes.
- Touch targets are at least 44pt, with `hitSlop` where the visual is smaller.
- The one deliberate exception, documented above, is the QR's white ground.

## What was deliberately not done

- No glassmorphism, no shadow on a dark surface, no gradient except the brand
  one behind a primary button and the splash.
- No stock illustration set. Empty states are a single drawn icon and two
  sentences.
- No onboarding carousel. The first screen is the product.
- No boxed, bordered card anywhere a photograph would do the job. The first
  version of this app was, in the user's words, "too many squares", and that
  was a fair description of what a border on every surface looks like.
