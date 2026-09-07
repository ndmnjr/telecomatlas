export const PUBLIC_DISCLAIMER =
  "Illustrative, vendor-neutral teaching model. It does not represent an operator's actual topology, sites, routes, vendors, capacity, configuration, coverage, synchronization or resilience design.";

const copy = {
  'incoming-request': [
    'A person approaches the site',
    'A person walks beside the site with a phone in hand. A call is on its way.',
  ],
  'find-subscriber': [
    'Find your phone',
    'The network identifies where to deliver the call. The small ground-level operator panel represents a network beyond this site.',
  ],
  'page-and-prepare': [
    'Check that the phone is reachable',
    'The network checks whether the phone can receive the call. If it has no active connection, the network asks it to respond.',
  ],
  'carry-to-site': [
    'Carry the call to the site',
    'A call-setup pulse enters at the ground boundary, follows access fiber through the fiber patch panel and site router, then reaches the equipment cabinet.',
  ],
  'process-at-ran': [
    'Prepare the radio signal',
    'The site prepares the signal for the air. Equipment in the cabinet processes the call; the cable tray and tower cable carry it up to the radio.',
  ],
  'convert-to-radio': [
    'Send radio waves',
    'The radio feeds the serving antenna. Curved wavefronts travel from that antenna toward the phone held by the person.',
  ],
  'radio-link': [
    'Your phone rings',
    'The phone displays Incoming call. The enlarged screen shows the same state as the handheld phone. Answer to connect the conversation.',
  ],
  'connected-conversation': [
    'Carry the conversation',
    'After answer, voice travels in both directions: phone ↔ serving antenna ↔ radio ↔ tower cable ↔ site cabinet ↔ router ↔ fiber patch panel ↔ access fiber ↔ operator network. Power, shelter and tower structure support the service and sit outside the traffic path.',
  ],

  'open-website': [
    'Open a website',
    'A person uses the visible phone outside the fence. The browser request starts at the phone.',
  ],
  'send-uplink': [
    'Send the request by radio',
    'Uplink RF travels from the phone to the sector antenna. The radio signal carries the request upward.',
  ],
  'convert-to-data': [
    'Turn radio into data',
    'Radio and baseband processing convert the request into data the network can route.',
  ],
  'carry-fiber': [
    'Carry it through fiber',
    'The request passes through the cabinet, site router, fiber patch panel and access fiber toward the transport network.',
  ],
  'route-internet': [
    'Route it to the Internet',
    'Packet core and user plane forward the request toward a generic Internet service.',
  ],
  'response-return': [
    'Bring the response back',
    'The response returns through transport, fiber, site equipment and radio to the serving sector.',
  ],
  'page-loaded': [
    'Show the page',
    'The synchronized phone inset displays a neutral Page loaded state.',
  ],
};
const technicalTitles = {
  'incoming-request': 'IMS/SIP call setup',
  'find-subscriber': 'Subscriber and session reachability',
  'page-and-prepare': 'Conditional paging',
  'carry-to-site': 'Site router / ODF',
  'process-at-ran': 'Baseband / DU processing',
  'convert-to-radio': 'Radio unit and sector RF',
  'radio-link': 'Sector RF link / incoming call',
  'connected-conversation': 'Established voice media',
  'open-website': 'UE / RF uplink request',
  'send-uplink': 'UE / RF uplink',
  'convert-to-data': 'Radio / baseband-DU processing',
  'carry-fiber': 'Backhaul / ODF / router',
  'route-internet': 'UPF or packet user plane and data network',
  'response-return': 'Downlink RF and data transport',
  'page-loaded': 'UE display / content delivery',
};
export function stageCopy(stage, technical = false) {
  const [title, text] = copy[stage.id];
  return technical
    ? { title: technicalTitles[stage.id] ?? stage.label, text: `${stage.narrative} ${text}` }
    : { title, text };
}
export const scenarioTitles = {
  'incoming-call': 'Incoming call',
  'browse-internet': 'Browse the Internet',
};
