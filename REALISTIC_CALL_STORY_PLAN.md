# Telecom Atlas — realistic call-story redesign

## Why the current version is not convincing

The first Journey implementation puts conceptual core and transport nodes over the sky area of the site. That is diagrammatically valid but physically misleading. It also represents the receiving phone as a small abstract node, so a non-technical viewer cannot connect the network flow with a person receiving a real call.

## Experience principle

Teach the physical story first. Reveal network terminology second.

Keep the exact 32-mesh/11-asset inventory unchanged. Add a separate `storyActors` layer for original procedural context objects and effects. Story actors never receive asset IDs, never enter the component catalogue and never alter asset-count validation.

## Incoming-call storyboard

1. **A person approaches the site**
   - A stylized, human-scale procedural character walks on the ground near the tower.
   - A small phone is visibly held in one hand.
   - Camera begins with a readable three-quarter site view.

2. **The network looks for the phone**
   - Show a compact, grounded edge panel labeled `Operator network — conceptual`, not floating nodes in the sky.
   - Plain language: `The network identifies where to deliver the call.`
   - Technical mode: `IMS session control and conditional paging.`

3. **Fiber carries the call to the site**
   - A luminous cyan pulse enters from the ground-level site boundary.
   - It follows an original path through access fiber/ODF, site router and equipment cabinet.
   - Do not animate packets descending from above.

4. **The site prepares the radio signal**
   - Equipment cabinet/baseband-DU highlights.
   - A pulse follows the real cable route and tower upward toward the radio/sector.
   - Plain language: `The site prepares the signal for the air.`

5. **The antenna reaches the phone**
   - RF originates at the real serving-sector antenna anchor.
   - Three to five expanding curved RF wavefronts travel toward the person/phone, similar in teaching intent to the supplied reference but with original styling.
   - Use cyan for call setup; never imply the RF comes from the core overlay.

6. **The phone rings**
   - Camera moves closer to the person.
   - A synchronized phone inset enlarges the display so it is legible on mobile.
   - Screen reads `Incoming call` with a neutral caller symbol; no real number or identity.
   - Phone vibrates subtly; reduced motion uses a static ring indicator.

7. **The conversation connects**
   - On answer, RF becomes bidirectional and green.
   - Ground-level media pulses visibly traverse phone ↔ sector ↔ radio ↔ site equipment ↔ transport/core edge.
   - Supporting power/shelter/tower remain amber and explicitly outside the traffic path.

## Two explanation levels

Default: **Simple**

- Find your phone
- Carry the call to the site
- Prepare the radio signal
- Send radio waves
- Your phone rings
- Carry the conversation

Optional: **Technical terms**

- IMS/SIP call setup
- Conditional paging
- Packet core/user plane
- Site router/ODF
- Baseband/DU and radio unit
- Sector antenna and RF link
- Established voice media

The toggle changes labels and supporting copy, not the underlying sequence.

## Transport scenario

Use a separate grounded cross-section/map composition rather than points in the sky:

`site cabinet → site router → ODF → buried/duct fiber → aggregation hut/node → metro/core → conceptual data centre`

- Animate pulses along the ground/fiber route.
- Protection path is a second dashed ground route.
- Synchronization is amber and labeled as support, never user traffic.
- Optional microwave is shown as a line-of-sight arc between two visible towers, not a cloud node.

## Core scenario

Transition away from the site into a dedicated conceptual data-centre cutaway:

- exterior data-centre silhouette;
- racks and network fabric as original procedural context shapes;
- logical IMS, subscriber/session, policy and user-plane layers mapped over the racks;
- plain-language cards first, technical terms on demand;
- no implication that one function equals one physical server;
- no real operator layout, scale, resilience design or KPI.

## Implementation modules

- `src/story/actors.js` — procedural person, walk pose and phone.
- `src/story/phone.js` — synchronized readable phone inset and ringing state.
- `src/story/rf.js` — world/projected antenna-to-phone RF wavefronts.
- `src/story/ground-path.js` — grounded operator strip plus integrated fiber, cabinet, tower and service-route effects; standalone Core/Transport contexts were removed in Journeys V2.
- `src/story/copy.js` — simple/technical label pairs.
- Extend the Journey controller with deterministic actor/effect state while keeping scenario data declarative.

## Accessibility and motion

- Play/Pause, Previous/Next and seek remain available.
- Every visual stage has equivalent text.
- Do not encode meaning only through color.
- Reduced motion removes walking cycles, vibration and traveling pulses; it uses static poses, complete paths and ring indicators.
- Phone inset remains readable at 390×844.

## Acceptance criteria

- The person is visibly grounded and proportionate to the site.
- The phone is visible in the character's hand and readable in the synchronized inset.
- No incoming-call core/transport node appears to float in the sky.
- The fiber path enters at ground level and reaches site equipment.
- RF wavefronts visibly originate from the real sector antenna and terminate at the phone.
- Connected media is bidirectional and traverses every physical handoff.
- Simple mode contains no unexplained acronym in primary stage titles.
- Technical mode exposes accurate terms without changing topology.
- Transport sequence and protection are physically grounded.
- Core appears in a separate conceptual data-centre scene.
- Original 32/11 asset contract and all Explore/Inspect tests remain exact.
- Desktop and mobile browser screenshots prove physical placement, phone readability and RF animation.

## Public disclaimer

`Illustrative, vendor-neutral teaching model. It does not represent an operator's actual topology, sites, routes, vendors, capacity, configuration, coverage, synchronization or resilience design.`
