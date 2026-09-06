// Exact original names, independent of GLTFLoader's sanitized Object3D names.
const rows = [
  ['Ground', 'Site ground', null, 'Site context'],
  ['Concrete Pad', 'Concrete equipment pad', null, 'Site context'],
  ['Shelter', 'Shelter enclosure', 'DEMO-SHELTER-01', 'Shelter'],
  ['Shelter Door', 'Shelter access door', 'DEMO-SHELTER-01', 'Shelter'],
  ['Shelter Roof', 'Shelter roof', 'DEMO-SHELTER-01', 'Shelter'],
  ['Shelter Step', 'Entrance step', 'DEMO-SHELTER-01', 'Shelter'],
  ['Access Gate', 'Access gate', 'DEMO-FENCE-01', 'Boundary'],
  ['Fence', 'Perimeter fence', 'DEMO-FENCE-01', 'Boundary'],
  ['Tower Footings', 'Tower concrete footings', 'DEMO-TOWER-01', 'Tower'],
  ['Tower Mast', 'Lattice tower mast', 'DEMO-TOWER-01', 'Tower'],
  ['Panel Antenna A', 'Sector A antenna', 'DEMO-SECTOR-A', 'Radio'],
  ['Sector A Supports', 'Sector A mounting frame', 'DEMO-SECTOR-A', 'Radio'],
  ['Panel Antenna B', 'Sector B antenna', 'DEMO-SECTOR-B', 'Radio'],
  ['Sector B Supports', 'Sector B mounting frame', 'DEMO-SECTOR-B', 'Radio'],
  ['Panel Antenna C', 'Sector C antenna', 'DEMO-SECTOR-C', 'Radio'],
  ['Sector C Supports', 'Sector C mounting frame', 'DEMO-SECTOR-C', 'Radio'],
  ['Dish Support', 'Dish mounting arm', 'DEMO-DISH-01', 'Backhaul'],
  ['Microwave Dish', 'Microwave backhaul dish', 'DEMO-DISH-01', 'Backhaul'],
  ['Cabinet Door', 'Radio cabinet door', 'DEMO-CABINET-01', 'Cabinet'],
  ['Cabinet Handle', 'Cabinet door handle', 'DEMO-CABINET-01', 'Cabinet'],
  ['Cabinet Plinth', 'Cabinet base plinth', 'DEMO-CABINET-01', 'Cabinet'],
  ['Equipment Rack', 'Radio equipment cabinet', 'DEMO-CABINET-01', 'Cabinet'],
  ['Rack Panel 1', 'Rack panel 1', 'DEMO-CABINET-01', 'Cabinet'],
  ['Rack Panel 2', 'Rack panel 2', 'DEMO-CABINET-01', 'Cabinet'],
  ['Rack Panel 3', 'Rack panel 3', 'DEMO-CABINET-01', 'Cabinet'],
  ['Rack Panel 4', 'Rack panel 4', 'DEMO-CABINET-01', 'Cabinet'],
  ['Cable Tray', 'Cable route tray', 'DEMO-TRAY-01', 'Cable route'],
  ['Power Enclosure', 'Backup power housing', 'DEMO-POWER-01', 'Power'],
  ['Power Plinth', 'Power unit base', 'DEMO-POWER-01', 'Power'],
  ['Power Vents', 'Power ventilation slats', 'DEMO-POWER-01', 'Power'],
  ['Site Camera', 'Observation camera housing', 'DEMO-CAMERA-01', 'Camera'],
  ['Site Camera Lens', 'Camera lens', 'DEMO-CAMERA-01', 'Camera'],
];
export const catalogue = rows.map(([sourceName, label, assetId, group], i) => ({
  number: i + 1,
  sourceName,
  label,
  assetId,
  group,
}));
export function validateModel(gltf, inventory) {
  const fail = (reason) => {
    throw Error('Model contract failed: ' + reason);
  };
  if (inventory.assets?.length !== 11 || new Set(inventory.assets.map((a) => a.id)).size !== 11)
    fail('expected 11 unique inventory assets');
  const assets = new Map(inventory.assets.map((a) => [a.id, a]));
  const meshes = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  if (meshes.length !== 32) fail(`expected 32 meshes, received ${meshes.length}`);
  const names = new Set();
  const parts = meshes.map((mesh) => {
    const nodeIndex = gltf.parser.associations.get(mesh)?.nodes;
    const sourceName = gltf.parser.json.nodes[nodeIndex]?.name;
    if (!sourceName || names.has(sourceName)) fail('missing or duplicate mesh name: ' + sourceName);
    names.add(sourceName);
    const entry = catalogue.find((p) => p.sourceName === sourceName);
    if (!entry) fail('unmapped mesh ' + sourceName);
    let parent = mesh.parent,
      ancestor = null;
    while (parent) {
      if (parent.name.startsWith('DEMO-')) {
        if (ancestor) fail('ambiguous ancestry');
        ancestor = parent.name;
      }
      parent = parent.parent;
    }
    if (ancestor !== entry.assetId || (ancestor && !assets.has(ancestor)))
      fail('asset ancestry mismatch for ' + sourceName);
    if (!mesh.geometry.attributes.position?.count) fail('empty geometry ' + sourceName);
    if (
      !mesh.geometry.attributes.position.array.every(Number.isFinite) ||
      !mesh.matrixWorld.elements.every(Number.isFinite)
    )
      fail('non-finite geometry ' + sourceName);
    const description = entry.assetId
      ? assets.get(entry.assetId).function
      : sourceName === 'Ground'
        ? 'Provides the illustrative site surface. No equipment asset ID is assigned in the source.'
        : 'Represents a shared equipment foundation. No equipment asset ID is assigned in the source.';
    return { ...entry, description, mesh };
  });
  if (new Set(parts.filter((p) => p.assetId).map((p) => p.assetId)).size !== 11)
    fail('not all inventory assets are represented');
  return parts.sort((a, b) => a.number - b.number);
}
