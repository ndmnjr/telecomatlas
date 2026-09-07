import { DIRECTION } from '../scenarios/paths.js';

export function rfWavefronts(
  from,
  to,
  progress = 0,
  reduced = false,
  direction = DIRECTION.DOWNLINK,
) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length,
    ny = dx / length;
  const bidirectional = direction === DIRECTION.BIDIRECTIONAL;
  const waves = Array.from({ length: 4 }, (_, index) => {
    const inbound = bidirectional && index % 2 === 1;
    const phase = reduced ? (index + 1) / 5 : ((progress + index / 4) % 1) * 0.84 + 0.08;
    const fraction = inbound ? 1 - phase : phase;
    const x = from.x + dx * fraction,
      y = from.y + dy * fraction;
    const radius = Math.min(32, length * 0.16) * (0.3 + phase * 0.7);
    const bend = radius * 0.7 * (inbound ? -1 : 1);
    return {
      fraction,
      direction: bidirectional ? (inbound ? 'inbound' : 'outbound') : direction,
      d: `M ${x + nx * radius} ${y + ny * radius} Q ${x + (dx / length) * bend} ${y + (dy / length) * bend} ${x - nx * radius} ${y - ny * radius}`,
    };
  });
  return { from, to, waves, direction, bidirectional, reduced };
}
