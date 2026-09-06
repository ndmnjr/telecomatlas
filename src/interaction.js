// Adapted from the inspected MIT PointerTap; attribution ships with the build.
export class Tap {
  active = new Map();
  blocked = false;
  down(id, x, y) {
    if (!this.active.size) this.blocked = false;
    this.active.set(id, { x, y });
    if (this.active.size > 1) this.blocked = true;
  }
  move(id, x, y) {
    const p = this.active.get(id);
    if (p && Math.hypot(x - p.x, y - p.y) > 6) this.blocked = true;
  }
  up(id, x, y) {
    this.move(id, x, y);
    const valid = this.active.has(id) && this.active.size === 1 && !this.blocked;
    this.active.delete(id);
    return valid;
  }
  cancel(id) {
    this.active.delete(id);
    this.blocked = true;
  }
}
export function calloutLayout(points, width, height) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.number - b.number),
    middle = Math.ceil(sorted.length / 2);
  return [sorted.slice(0, middle), sorted.slice(middle)].flatMap((side, i) =>
    side
      .sort((a, b) => a.y - b.y || a.number - b.number)
      .map((p, j) => ({
        ...p,
        anchorX: p.x,
        anchorY: p.y,
        x: i ? width - 22 : 22,
        y: side.length === 1 ? height / 2 : 46 + (j * (height - 110)) / (side.length - 1),
      })),
  );
}
export function filterParts(parts, query) {
  const q = query.trim().toLowerCase();
  return parts.filter((p) =>
    [
      p.label,
      p.sourceName,
      p.assetId ?? 'site context',
      p.group,
      String(p.number).padStart(2, '0'),
    ].some((s) => s.toLowerCase().includes(q)),
  );
}
