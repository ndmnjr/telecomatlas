import * as T from 'three';
export const explodedDirection = new T.Vector3(0, 0.7, 1).normalize();
const up = new T.Vector3(0, explodedDirection.z, -explodedDirection.y);
export function prepareParts(parts) {
  for (const p of parts) {
    p.base = p.mesh.matrixWorld.clone();
    p.bounds = new T.Box3().setFromObject(p.mesh);
    p.center = p.bounds.getCenter(new T.Vector3());
    p.size = p.bounds.getSize(new T.Vector3());
    // Detach each original mesh with its complete world matrix intact.
    p.mesh.removeFromParent();
    p.mesh.matrixAutoUpdate = false;
    p.mesh.matrix.copy(p.base);
    p.mesh.updateMatrixWorld(true);
    p.offset = new T.Vector3();
  }
}
export function packParts(parts, aspect = 1) {
  const gap = 0.65;
  const cards = parts.map((p) => ({
    p,
    w: p.size.x + gap,
    h: Math.max(p.size.y, p.size.y * up.y + p.size.z * Math.abs(up.z)) + gap,
  }));
  const area = cards.reduce((sum, c) => sum + c.w * c.h, 0);
  const width = Math.max(
    ...cards.map((c) => c.w),
    Math.sqrt(area * Math.max(0.55, Math.min(2, aspect))) * 1.15,
  );
  cards.sort((a, b) => b.h - a.h || a.p.number - b.p.number);
  let x = 0,
    y = 0,
    row = 0,
    used = 0;
  for (const c of cards) {
    if (x && x + c.w > width) {
      x = 0;
      y += row;
      row = 0;
    }
    c.x = x + c.w / 2;
    c.y = y + c.h / 2;
    x += c.w;
    row = Math.max(row, c.h);
    used = Math.max(used, x);
  }
  const height = y + row;
  for (const c of cards)
    c.p.offset.set(c.x - used / 2, (height / 2 - c.y) / up.y, 0).sub(c.p.center);
  return { width: used, height };
}
export function applyExplosion(parts, amount) {
  const t = T.MathUtils.clamp(amount, 0, 1);
  for (const p of parts) {
    p.mesh.matrix.copy(p.base);
    p.mesh.matrix.elements[12] += p.offset.x * t;
    p.mesh.matrix.elements[13] += p.offset.y * t;
    p.mesh.matrix.elements[14] += p.offset.z * t;
    p.mesh.updateMatrixWorld(true);
  }
}
