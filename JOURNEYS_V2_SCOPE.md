# Journey revision — integrated service stories

## User feedback accepted

1. The person must remain outside the fenced compound.
2. Core and Transport must not be standalone scenarios. Their roles belong inside complete service journeys.
3. Entering Journeys after inspecting an asset must clear selection/isolation, restore the site camera and restart the journey with the person visible.

## Final scenario set

Only two tabs:

1. **Incoming call**
2. **Browse the Internet**

## Incoming call

Keep the physically grounded sequence: operator network edge → ground fiber → router/ODF/cabinet → tower cable/radio → serving sector → phone. Core and transport roles are explained at the relevant stages inside the same story.

## Browse the Internet

Plain-language full cycle:

1. **Open a website** — the person uses the visible phone outside the fence.
2. **Send the request by radio** — uplink RF travels phone → sector antenna.
3. **Turn radio into data** — radio/baseband-DU processes the request.
4. **Carry it through fiber** — cabinet → router → ODF → access fiber → transport network.
5. **Route it to the Internet** — packet core/user plane forwards toward a generic Internet service.
6. **Bring the response back** — response returns through core/transport/fiber/site/radio.
7. **Show the page** — synchronized phone inset displays a neutral `Page loaded` state.

Technical terms are optional and must include UE/RF, sector/RU/DU, backhaul/ODF/router, UPF or packet user plane and data network. Default titles remain acronym-free.

## Grounded operator strip

For both scenarios, represent off-site roles in a compact ground-edge strip connected to the physical fiber entrance:

- Transport
- Packet core / user plane
- IMS for incoming calls, or Internet/data network for browsing

No points or packet paths may appear to descend from the sky.

## Bug acceptance

Automated browser reproduction:

1. Open Inspect.
2. Select a small component.
3. Isolate or retain the focused camera.
4. Enter Journeys.
5. Assert selection is null, isolation is false, 32 parts are visible, Incoming Call is at step 1, camera is site-wide, person is visible outside the fence, and Play advances normally.

## Physical acceptance

- Person bounding box must not intersect Fence or Access Gate world bounds during any walk pose.
- Person stays on the ground and inside the ground surface.
- RF wavefronts remain visibly connected to the actual sector and phone.
- Browsing request is uplink; response is downlink; final state shows a loaded generic page.
- Core and transport roles appear only within the two integrated journeys.
- No standalone Core or Transport tabs, scenes or dead production code.
- Exact 32 meshes / 11 asset IDs remain unchanged.
