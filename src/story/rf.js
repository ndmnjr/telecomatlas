export function rfWavefronts(from, to, progress = 0, reduced = false, bidirectional = false) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length,
    ny = dx / length;
  const waves = Array.from({ length: 4 }, (_, i) => {
    const inbound = bidirectional && i % 2 === 1;
    const phase = reduced ? (i + 1) / 5 : ((progress + i / 4) % 1) * 0.84 + 0.08;
    const t = inbound ? 1 - phase : phase;
    const x = from.x + dx * t,
      y = from.y + dy * t;
    const radius = Math.min(32, length * 0.16) * (0.3 + phase * 0.7);
    const bend = radius * 0.7 * (inbound ? -1 : 1);
    return {
      fraction: t,
      direction: inbound ? 'inbound' : 'outbound',
      d: `M ${x + nx * radius} ${y + ny * radius} Q ${x + (dx / length) * bend} ${y + (dy / length) * bend} ${x - nx * radius} ${y - ny * radius}`,
    };
  });
  return { from, to, waves, bidirectional, reduced };
}
