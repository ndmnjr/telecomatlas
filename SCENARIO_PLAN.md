# Telecom Atlas — network journey scenarios

## Task

Add an original, public educational mode that begins with the current 3D telecom site and explains how site, core and transport teams contribute to a mobile voice service.

## Why

The existing atlas explains **what is installed**. The new mode will explain **how the installed assets work together as a service**, while keeping the model explorable and every component independently inspectable.

## Branch and boundaries

- Branch: `feature/network-journey-scenarios`
- Repository: `ndmnjr/telecomatlas` (public demonstration)
- `main` and the production Vercel deployment remain unchanged until explicit approval.
- Use synthetic, vendor-neutral architecture only. Do not include Mobily topology, locations, capacity, configurations, names, alarms, security controls or operational data.
- Do not copy the reference video's branding, presenter or artwork. Reuse only its general teaching principles: one dominant equipment composition, numbered callouts and animated paths.
- No third-party models, textures or fonts. Any new context geometry must be original and procedural.

## Surface

Primary surface: **Learn**. Secondary surface: **Inspect**.

Keep the existing Explore and Inspect modes. Add an obvious **Journeys** mode with three scenario tabs, a Play/Pause control, Previous/Next steps, a timeline, keyboard control and a persistent textual step list. Users must be able to pause the story and inspect any highlighted component.

## Visual language

- **Cyan:** control and call-setup signalling.
- **Green:** established voice/media packets.
- **Amber:** synchronization and availability support.
- **Muted grey:** context that is not active in the selected step.
- Animated pulses travel along explicit paths; reduced-motion mode replaces travel with stepped static highlights.
- The current warm studio palette and numbered callout system remain the identity.

## Scenario 1 — What happens when you receive a call?

This is a vendor-neutral IMS voice journey. 3GPP describes VoLTE and VoNR as IMS communication services over 4G and 5G packet-switched access; IMS uses SIP for session signalling and SDP to describe media.[1] GSMA's VoLTE profile likewise defines interoperable IMS-based voice over LTE access.[3]

The public story deliberately avoids pretending that all deployments use the same physical split.

1. **Incoming request** — a remote caller or interconnect delivers a call request to the operator's IMS service layer.
2. **Find the subscriber** — the service/core layer checks subscriber and session information and determines how to reach the receiving device.
3. **Page and prepare** — the packet core and radio access coordinate reachability and radio resources. Present this as conceptual control signalling, not a literal serial trace.
4. **Carry to the site** — the transport network carries signalling toward the serving radio site over fiber or an approved alternative backhaul.
5. **Process at the RAN** — the baseband/DU processes radio protocols and scheduling; the exact placement of DU/CU functions varies by architecture.
6. **Convert to radio** — the radio unit performs the relevant low-layer/RF processing. O-RAN WG4 defines separate control, user and synchronization planes between O-DU and O-RU for its open-fronthaul split.[4]
7. **Transmit from the sector** — the selected sector antenna provides the radio link to the receiving phone.
8. **Connect the conversation** — after answer and resource setup, animate the media path in green while cyan signalling becomes secondary.

Supporting assets such as rectifiers, batteries, cooling, grounding, fence and camera should illuminate as **availability/support systems**. They must not be drawn as if voice packets pass through them.

### Technology label

Version 1 should say **IMS voice over 4G/5G — conceptual**. A later selector can expose separate VoLTE and VoNR details. 3GPP TS 23.228 remains the detailed IMS architecture reference.[2]

## Scenario 2 — What does the Core team do?

Extend the story from the site into an original conceptual data-centre **diagram overlay**. Do not add off-site logical functions to the 32-mesh inventory and do not model or imply a real operator data centre.

Logical groups:

- **IMS service control:** P-CSCF, I-/S-CSCF, telephony application services and interconnect edge.
- **Subscriber and mobility:** generic subscriber identity, registration and mobility/session functions.
- **User plane/media routing:** the path that carries established media packets.
- **Policy and quality:** service policy/QoS coordination.
- **Operations:** observability and resilience as a separate support layer, without displaying real KPIs.

The storyboard should distinguish logical network functions from physical servers. Use clearly labeled SVG/HTML logical overlays anchored beside the real site; do not imply one function equals one physical box.

## Scenario 3 — What does the Transport team do?

Animate a vendor-neutral path:

`site equipment → site router/switch → ODF/patching → access fiber → aggregation → metro/core transport → data centre`

Add a dashed protection route and an optional microwave branch. Explain that actual routing, protection and topology vary by operator. ITU-T's 5G transport overview distinguishes fronthaul (RRU/O-RU to DU), midhaul (DU to CU) and backhaul (CU/RAN toward the core), and treats synchronization and transport isolation as explicit requirements.[5]

Topics:

- packet and optical handoff;
- aggregation rather than a direct site-to-core cable;
- primary/protection paths;
- synchronization as a service requirement, not user traffic;
- microwave as an alternative or complementary backhaul representation;
- fault-domain and ownership handoffs without exposing real topology.

## Data contract

Create `src/scenarios/scenarios.json` with schema validation. Each scenario contains:

```json
{
  "id": "incoming-call",
  "title": "What happens when you receive a call?",
  "scope": "synthetic-vendor-neutral",
  "stages": [
    {
      "id": "radio-link",
      "order": 7,
      "label": "Transmit from the sector",
      "narrative": "The serving sector provides the radio link to the phone.",
      "focus": ["DEMO-SECTOR-A"],
      "paths": ["ran-to-phone"],
      "activePlane": "control",
      "camera": "sector-a"
    }
  ]
}
```

Required validation:

- unique scenario and stage IDs;
- contiguous stage order;
- every referenced asset/mesh exists;
- every path endpoint exists;
- every narrative and label is non-empty;
- plane and camera values use controlled enums;
- no real operator identifiers or coordinates in public scenario data.

## Implementation architecture

- `src/scenarios/schema.js` — contract and validation.
- `src/scenarios/data.js` — versioned synthetic journey definitions.
- `src/scenarios/controller.js` — deterministic play/pause/seek state machine.
- `src/scenarios/paths.js` — path anchors, pulse timing and reduced-motion states.
- `src/scenarios/panel.js` — semantic controls and narrative rendering.
- `src/scenarios/overlay.js` — accessible SVG/HTML caller, phone, core and transport nodes. These are conceptual teaching nodes, never inventory meshes.
- Extend `scene.js` only through a narrow adapter that exposes projected anchors and component highlighting; do not mix narrative state into model-loading/validation logic.

Keep `telecom_site.glb`, the catalogue and the inventory unchanged. Add new selectable geometry only in a future dedicated atlas when an off-site object becomes a real governed asset with its own stable identity and bounds.

## Test-first delivery

1. **RED:** schema rejects missing targets, duplicate stages and unsafe public fields. **GREEN:** minimal schema/validator.
2. **RED:** controller playback/seek/pause is deterministic. **GREEN:** state machine.
3. **RED:** every stage maps to real scene anchors. **GREEN:** path registry and adapters.
4. **RED:** reduced motion has no continuous animation. **GREEN:** stepped highlights.
5. **RED:** real browser cannot complete all three journeys. **GREEN:** UI and rendering.

## Browser and visual verification

- Desktop and 390×844 mobile.
- Every scenario, every step, Previous/Next, play/pause, timeline seek and keyboard navigation.
- Pause and inspect a highlighted asset; resume without losing stage.
- Signalling and media paths visibly differ.
- Full assembled/exploded controls still work outside Journeys.
- Search, 32-part coverage, selection, isolate/show-all and current tests remain green.
- No clipped controls, callout collisions, JavaScript exceptions or missing geometry.
- Screenshot evidence: incoming-call site step, core data-centre step and transport/fiber step, plus reduced motion.

## Definition of done

The branch is ready for review only when all scenario references validate, existing 32/11 coverage remains exact, all three end-to-end browser journeys pass, the explanatory language is technically reviewed, and screenshots show actual geometry plus readable paths—not merely hidden internal states.

## Sources

[1] https://www.3gpp.org/technologies/volte-vonr

[2] https://www.3gpp.org/Dynareport/23228.htm

[3] https://www.gsma.com/solutions-and-impact/technologies/networks/documents-volte

[4] https://www.o-ran.org/technical-groups/wg4

[5] https://www.itu.int/dms_pub/itu-t/opb/tut/T-TUT-HOME-2018-PDF-E.pdf
