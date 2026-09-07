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
  'interconnect-edge': [
    'Receive the call request',
    'Inside a separate conceptual data centre, the network accepts a request from another network.',
  ],
  'ims-control': [
    'Coordinate the call',
    'Service control coordinates call setup. The labeled layers represent logical roles shared across computing infrastructure.',
  ],
  'subscriber-mobility': [
    'Find the right connection',
    'Subscriber and session information helps the network reach the phone. No personal records are shown.',
  ],
  'policy-quality': [
    'Arrange service treatment',
    'Policy functions coordinate how the network treats the call. These are teaching layers, not individual physical servers.',
  ],
  'route-media': [
    'Carry the voice',
    'The user-traffic layer carries the conversation toward the access network and site. The rack fabric represents shared infrastructure.',
  ],
  'observe-resilience': [
    'Keep the service available',
    'Operations and resilience support service availability. The amber support path carries no user conversation.',
  ],
  'site-handoff': [
    'Leave the equipment cabinet',
    'The cabinet hands conversation and other service traffic to the site router at ground level.',
  ],
  'patch-to-fiber': [
    'Connect to the fiber',
    'The router connects through a fiber patch panel at the site boundary.',
  ],
  'access-fiber': [
    'Travel through buried fiber',
    'Traffic follows the duct below ground toward a nearby aggregation building. The section reveals a route normally hidden underground.',
  ],
  'aggregate-sites': [
    'Join traffic from other sites',
    'The aggregation building combines traffic from several access connections before passing it onward.',
  ],
  'metro-core': [
    'Cross the wider network',
    'Traffic continues through the city and regional network toward a conceptual data centre. This is a sequence of handoffs, not one direct cable.',
  ],
  'protect-and-synchronize': [
    'Provide another route and timing',
    'The second dashed ground route represents protection. The amber timing service supports equipment synchronization and carries no user traffic. Actual protection varies.',
  ],
  'optional-microwave': [
    'Cross between two towers',
    'An optional line-of-sight microwave link joins two visible towers. It can complement or replace a fiber segment; its use varies by deployment.',
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
};
export function stageCopy(stage, technical = false) {
  const [title, text] = copy[stage.id];
  return technical
    ? { title: technicalTitles[stage.id] ?? stage.label, text: `${stage.narrative} ${text}` }
    : { title, text };
}
export const scenarioTitles = {
  'incoming-call': 'Incoming call',
  'core-team': 'Inside the network',
  'transport-fiber': 'Transport & fiber',
};
