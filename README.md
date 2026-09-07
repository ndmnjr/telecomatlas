# Telecom Atlas

A standalone Three.js explorer for an original procedural telecom site. Browse,
search, select and isolate its numbered components, move between assembled and
exploded views, or use **Journeys** to follow two synthetic, vendor-neutral
end-to-end service stories across the radio site, transport and core handoffs. Geometry and
inventory are included in `public/assets/`; Blender, Unity and the original
development workspace are not required.

**Demonstration / not live data.** Equipment functions are illustrative, not
engineering verification. Exploded views are conceptual, not disassembly instructions.

## Fresh clone

Install Node.js 24 or newer (with npm), then run:

```sh
git clone https://github.com/ndmnjr/telecomatlas.git
cd telecomatlas
npm ci
npm run lint
npm test
npm run build
npm start
```

Open **http://127.0.0.1:4173/** in a WebGL-capable browser. Keep the terminal open;
Ctrl+C stops the server. The build must run before starting the server. On
Windows, `launch.cmd` can open the built app in the default browser instead.
Do not open `dist/index.html` directly: modules and model fetches require HTTP.
The completed build runs offline, with no CDN, analytics or remote runtime assets.

Dependencies are pinned in `package-lock.json`: Three.js 0.180.0 and development-only
Prettier 3.6.2. No global packages or configuration are required.

## Verification

`npm test` runs the deterministic Node tests: real GLTFLoader parsing and identity
validation, invalid model contracts, pointer gesture discrimination, callout
placement, search, bounds-based explosion packing with exact matrix restoration,
and launcher readiness. Tests use the included original GLB and inventory.

Optional end-to-end verification requires an already installed Chrome or Chromium.
Set `CHROME_PATH` to its executable, then run after building:

```sh
# POSIX shell: replace the example with your installed executable.
export CHROME_PATH=/usr/bin/chromium
npm run verify
node scripts/error-test.mjs
```

In PowerShell, set `$env:CHROME_PATH` to your installed browser executable instead.
The harness uses Node's built-in WebSocket and local CDP, a temporary localhost
port, an isolated profile under ignored `verification/`, and software rendering.
It closes its owned browser/server after testing. It installs no browser.
Viewport emulation is not a physical-device or GPU performance benchmark.

Browser checks cover desktop/mobile layouts, every component selection, triangle
picking, search, isolation, slider/keyboard controls, camera movement, reduced
motion and deliberate asset-loading errors. The journey harness additionally
visits all 15 stages of both scenarios at desktop and 390×844, verifies exact
path mappings, timeline seek, Play/Pause, Previous/Next, keyboard stepping,
pause-to-inspect/resume, reduced-motion stepped paths, clipping and runtime
errors. Fresh screenshots and logs are written locally under `verification/`,
not distributed as repository content. The build also writes a SHA-256 output
manifest there.

## Controls

- Select a numbered callout or index entry to frame a mesh and inspect its identity.
- **Isolate selected** hides surroundings; **Show all** restores the site.
- Drag to orbit; wheel or pinch to zoom. Focus the stage for arrow-key orbit,
  `+`/`-` zoom and `R` camera reset.
- `/` focuses search. Tab/Enter/Space activate controls. Arrow/Home/End keys work
  on the separation slider. Escape clears inspection or the focused search.
- Explore returns to the full site; Inspect opens the selected part or tower mast.
- Journeys opens **Incoming call** and **Browse the Internet**.
  Use Play/Pause, Previous/Next, the stage timeline, or the persistent step list.
  With focus on the journey panel, Left/Right step, Space plays or pauses, and
  Home/End seek to the first/last stage. Selecting a highlighted site asset pauses
  playback for the normal component inspection; **Resume journey** keeps the stage.

Journeys starts in **Simple** mode. **Technical terms** changes the stage titles,
explanations and scene cards without changing the route, progress or playback.
The incoming story starts with a grounded person carrying a phone. Setup follows
the ground boundary, access fiber, patch panel, router and cabinet, then the real
cable tray and tower cable. Four curved wavefronts connect the actual serving
antenna face to the handheld phone. At ringing, the camera moves closer and the
readable phone inset offers **Answer call**. You can also use Next or the timeline.

Connected voice follows every handoff in both directions. Filled pulses travel
toward the phone; open pulses return. Solid and dashed radio fronts distinguish
the two directions. Power, shelter and tower structure remain amber support.
The Internet story follows the full request from phone uplink through radio,
site equipment, fiber, transport and packet user plane to a generic data network,
then animates every reverse handoff until the phone displays **Page loaded**.
Core and transport are explained only through their roles in these two stories;
they are not separate scenarios or claims about physical deployment.

Cyan paths are conceptual control/call-setup signalling, green paths are established
voice media or service traffic, and amber paths or highlights are synchronization and availability
support—not user traffic. Reduced-motion preferences replace moving path progress
with stepped static state.
The same preference also stops walk cycles and handset vibration, and replaces
moving wavefronts with static ones. Changing the preference while paused updates
the scene immediately. Every stage has an equivalent text explanation and remains
available through Previous/Next, seek and keyboard controls.

The viewer preserves the 32 original source meshes and 11 equipment identities;
ground and pad remain selectable context. Some meshes combine multiple physical
pieces. Intermediate explosion positions can intersect; endpoint packing is what
the tests check. Small parts are best viewed using selection or isolation.

## Source and attribution

`src/catalogue.js` defines identities and validation; `src/layout.js` handles
packing; `src/interaction.js` handles search/callouts/gestures; `src/scene.js`
provides rendering, picking and the narrow journey anchor/highlight adapter;
`src/main.js` connects native DOM controls. `src/scenarios/` contains the public
JSON contract, validator, deterministic controller, path/target registry and
accessible SVG/HTML overlay and panel.

`src/story/actors.js` builds the procedural person and handset;
`phone.js` synchronizes the inset; `rf.js` computes the four curved fronts;
`ground-path.js` resolves physical handoffs and the grounded operator-network strip;
and `copy.js`
provides Simple/Technical copy. These shapes live under `storyActors`, outside the
selectable source inventory, and never receive asset IDs. Scenario JSON declares
each stage's actor, phone and radio state. The controller derives deterministic
motion from timeline progress. Projection refreshes during camera movement,
including while playback is paused.

Journey caller, phone, service/core and transport nodes are teaching overlays only:
they are not physical topology, do not imply one logical function per server, and
are never added to the 32-mesh inventory. Paging is conditional; DU/CU placement
and transport routing vary by deployment.
The scenarios contain no operator locations, capacity, configuration, alarms,
coordinates or live data.

See [REFERENCE_NOTES.md](REFERENCE_NOTES.md) for pinned reference URLs and design
notes. Pointer discrimination adapts MIT-licensed human-atlas code. Full
third-party notices are preserved in `public/licenses/` and copied into the build.
No anatomy assets, third-party geometry, textures or downloaded fonts are included.
System fonts are supplied by the operating system.

`dist/`, `node_modules/`, verification output and caches are intentionally ignored.
No project-wide license grant is implied by the dependency notices.

## Realism verification

`npm run verify` runs the original Explore/Inspect suite, all journey stages, and
the realism CDP suite. `npm run verify:realism` runs the realism suite alone;
`npm run verify:errors` runs the standalone asset-error suite. All use the existing
local Chrome harness, with no new dependency, downloaded asset or browser install.

Realism unit tests cover grounding, human scale, phone attachment, exact antenna
anchors, physical route handoffs, four wavefronts, bidirectional voice, directional
Internet request/response paths, declarative state, stage order and reduced motion. CDP checks
cover desktop and 390×844, the explanation toggle, Answer, live motion preference
changes, playback and pause, and restoration of the original 32 meshes/11 assets.
They also hash stage-only screenshot samples to prove ground-path and RF pixels change
in normal motion and remain identical under reduced motion.

The implementation's vertical slices were tested red before implementation and
green afterward. Exact process output, command arguments and exit codes are saved
in `verification/realism-red.log` and `verification/realism-green.log`. The recorder
appends raw stdout/stderr without truncating it. For example:

```sh
node scripts/record-realism.mjs green node --test tests/realism.test.mjs
node scripts/record-realism.mjs green node scripts/realism-browser-test.mjs
```

Screenshots under `verification/` cover the outside-fence approach, ground fiber,
tower cable, ringing, connected voice, Internet request/response, page loaded,
Inspect-to-Journeys reset and reduced motion at desktop and mobile sizes. Logs and
screenshots remain local verification artifacts.

Illustrative, vendor-neutral teaching model. It does not represent an operator's
actual topology, sites, routes, vendors, capacity, configuration, coverage,
synchronization or resilience design.
