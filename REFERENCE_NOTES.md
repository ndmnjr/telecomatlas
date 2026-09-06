# Reference source inspection

Inspected on 2026-09-06 at exact commit `7a383d3ee2759e3ddf157c704fb8814fd0c50bcb`.
The six source files were inspected read-only. Their pinned upstream URLs are
listed below; reference snapshots and local verification history are not distributed.

| Source | Observed implementation | Telecom Atlas decision |
| --- | --- | --- |
| [app/page.tsx](https://raw.githubusercontent.com/ashemag/human-atlas/7a383d3ee2759e3ddf157c704fb8814fd0c50bcb/app/page.tsx) | React state tracks explosion, selected mesh IDs, visible systems and isolation. Search includes names and concept IDs, caps results at 80, and opens with `/`. Details expose source identity. | Plain ES modules and native controls; complete 32-entry searchable index without a result cap. Explicit source mesh and equipment ID in details. |
| [app/scene.tsx](https://raw.githubusercontent.com/ashemag/human-atlas/7a383d3ee2759e3ddf157c704fb8814fd0c50bcb/app/scene.tsx) | Three.js OrbitControls, RoomEnvironment, merged system geometries, per-part GPU state textures and separate pick meshes. Explosion first moves systems, then packs meshes; fitting reserves screen space for UI. Dirty rendering avoids needless draws. | Keep 32 independent source meshes, preserve their full world matrices and translate each individually. Orthographic studio camera with fitted transitions. UI occupies its own columns. Original telecom material palette and local procedural geometry. |
| [app/explosion-layout.ts](https://raw.githubusercontent.com/ashemag/human-atlas/7a383d3ee2759e3ddf157c704fb8814fd0c50bcb/app/explosion-layout.ts) | Width and height derive from each part's bounds. Adds padding, estimates row width from total area and aspect, sorts by height with ID tie-breaking, then centers shelf-packed rows. | Bounds-based deterministic shelf packing, measured for the tilted camera. Includes all 32 meshes, including both large context surfaces. Tests all 496 world AABB pairs at each aspect ratio. |
| [app/pointer-tap.ts](https://raw.githubusercontent.com/ashemag/human-atlas/7a383d3ee2759e3ddf157c704fb8814fd0c50bcb/app/pointer-tap.ts) | Tracks active pointer IDs. Multiple touches, threshold movement or cancellation block the entire gesture. Tests displacement throughout a drag, not just at release. | Adapted with MIT credit. A single click selects actual raycast geometry. Orbit, out-and-back drag, pinch and cancellation do not select. |
| [LICENSE](https://raw.githubusercontent.com/ashemag/human-atlas/7a383d3ee2759e3ddf157c704fb8814fd0c50bcb/LICENSE) | MIT, copyright 2026 ashemag. | Complete license included in `public/licenses/HUMAN-ATLAS.txt` and static build. |
| [public/ATTRIBUTION.md](https://raw.githubusercontent.com/ashemag/human-atlas/7a383d3ee2759e3ddf157c704fb8814fd0c50bcb/public/ATTRIBUTION.md) | Current BodyParts3D anatomy: 2,234 source meshes and 3,432 concepts, CC BY 4.0. Historical HuBMAP data is separately described as excluded from that release. | No anatomy data, geometry, textures, branding or fonts are copied. Those dataset licenses do not describe this locally generated telecom model. |

## Actual telecom source

Read `public/assets/telecom_site.glb` as binary glTF and independently parsed it
with Three.js GLTFLoader. The raw document has 43 nodes, 32 mesh definitions and
32 loaded mesh instances. There are 11 named equipment parents, each matched to
the inventory. `Ground` and `Concrete Pad` are root meshes with no equipment ID.
They remain numbered, rendered, selectable and included in endpoint packing.

GLTFLoader sanitizes names containing spaces. The mapping therefore reads the
original node name through the loader's parser association, and independently
checks the loaded object's actual ancestor against the explicit catalogue.
The stable mapping is in `src/catalogue.js`; deterministic tests parse the raw
node document directly from the included GLB. Invented equipment functions come verbatim from
the demonstration inventory; context explanations are explicitly viewer-authored.

## Design decisions and visual review

Tokens: warm white `#f7f6f2`, light studio `#f1f2ed`, forest `#193b34`, selection
teal `#176e65`, muted green `#69776f`, fine rule `#d9dfd7`.
Georgia carries the editorial title; Segoe UI carries controls; Consolas carries
equipment IDs. System fonts only. The signature is the complete numbered
component index connected to the real site by two rails of callouts.

Desktop places the model beside a scrollable index and fixed inspector. Mobile
keeps a large stage and moves the complete index and inspector into normal page
scroll. Initial screenshot review identified low camera centering, a stretched
desktop sidebar, bottom callout/control collisions and misleading cast shadows
in the exploded view. Source fixes address all four; browser checks guard the
layout; running the browser harness generates fresh local screenshots.
