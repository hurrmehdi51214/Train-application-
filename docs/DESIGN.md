# Design

The brief was "premium, polished, genuine, and not a template". That is not a
visual style, it is a set of decisions. These are the ones that were made, and
why.

## The one-sentence idea

A passenger using this app is usually standing up, moving, holding something, and
slightly late. Every screen is designed for that person first and for the browsing
person second.

## Type: a serif, on purpose

Two families, used with intent (`src/theme/typography.ts`):

- **Display is a serif.** It appears on station names, fares and journey
  headlines only. Rail signage has always been typographic, and a serif is the
  single cheapest thing that stops a transit product reading like a generic SaaS
  dashboard.
- **Text is the platform UI face**, because that is what people read fast.
- **Mono is reserved** for platform numbers, coach letters, seat codes and
  references - places where digit alignment matters more than warmth.

The rule that keeps it from becoming decorative: a serif never carries
instructions, only names and numbers.

## Colour: three hues and a long neutral ramp

`src/theme/tokens.ts` defines one deep petrol green, one warm brass, and a
neutral ramp that does all the structural work.

- **Petrol** is the brand: rails, primary actions, the travelled portion of a
  route, focus.
- **Brass** is attention: delays, live status, anything that must be looked at.
  It is never used decoratively, so when it appears it means something.
- **Everything else is neutral.** Keeping the palette this narrow is what stops
  the product looking assembled out of parts.

Dark mode is not an inversion. Shadows read as mud on a dark ground, so elevation
there is carried by a hairline and a lighter surface instead
(`elevationFor()` in `ThemeProvider.tsx`).

## Icons are drawn, not imported

`src/components/primitives/Icon.tsx` is a hand-drawn set on a 24-unit grid with a
1.7 stroke and consistently squared terminals.

Two reasons. An icon font ships thousands of glyphs to use forty, and this app
has to start fast on a platform. And an off-the-shelf set is the fastest possible
way to look like everyone else.

## Motion

Three rules:

1. **Motion explains, it never decorates.** The train marker eases between
   positions over 1.2s because a marker that teleports every 20s looks broken.
   The route rail slides because that is what communicates progress.
2. **The live pulse is a heartbeat, not a badge.** One pulse every 1.6s, easing
   out - slow enough to read as "this is live" rather than "look at me".
3. **Press feedback is 2.8% of scale and a light haptic.** Enough to feel
   answered, not enough to notice.

## Details that carry the product

- **The train on the map points the way it is going.** A pin tells you where
  something is; a train drawn nose-first, rotated to its bearing, tells you where
  it is going, which is the question a passenger is actually asking.
- **The marker on the route rail sits *between* stops** and slides down as the
  service progresses. That is the single detail that makes a journey feel tracked
  rather than listed.
- **The ticket card has a notch and a perforation.** It is the only skeuomorphic
  thing in the product and it earns its place: a list of them reads instantly as
  "tickets" rather than "cards".
- **The platform number gets its own card**, set large, in mono, with the
  confidence of the forecast next to it in words. "Platform 4 (expected)" is
  honest; a bare "4" that changes under someone's feet is not.
- **The QR is always on white**, in both themes. Contrast is what a scanner
  needs, and a "dark mode QR" is a returned passenger at a barrier.

## Copy

Product copy is part of the design and was written, not generated:

- **Say the useful thing, not the reassuring thing.** "Platform not yet confirmed
  by the station" beats "Platform TBC".
- **Never alarm about something that is fine.** The offline banner says tickets
  and maps still work, because they do, and panic is not a feature.
- **Numbers get judgement attached.** Crowding is five bars *and* a word,
  because nobody needs to know a coach is 68% full - they need to know whether
  they will get a seat.

## Accessibility

- Every interactive element carries a role, a label and a state. A coach tile
  announces "Coach C, Busy, Standard", not "C".
- Colour is never the only signal: crowding has bars and a word, delays have a
  time and a phrase, selection has a tick as well as a fill.
- Text scales with the platform setting; nothing is pinned to a fixed row height
  that would clip at larger sizes.
- Touch targets are at least 44pt, with `hitSlop` where the visual is smaller.
- The one deliberate exception, documented above, is the QR's white ground.

## What was deliberately not done

- No gradients, no glassmorphism, no shadow on a dark surface.
- No stock illustration set. Empty states are a single icon and two sentences.
- No onboarding carousel. The first screen is the product.
- No bottom-sheet-everything. A sheet is used when the context behind it matters,
  and a full screen otherwise.
