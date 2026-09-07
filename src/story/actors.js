import * as T from 'three';

export function createStoryActors(parts) {
  const group = new T.Group();
  group.name = 'storyActors';
  const person = new T.Group();
  person.name = 'person';
  group.add(person);
  const groundY = parts.find((p) => p.sourceName === 'Ground').bounds.max.y;
  const materials = {
    skin: new T.MeshStandardMaterial({ color: '#b77f5b', roughness: 0.9 }),
    shirt: new T.MeshStandardMaterial({ color: '#d76b38', roughness: 0.85 }),
    pants: new T.MeshStandardMaterial({ color: '#243e49' }),
    phone: new T.MeshStandardMaterial({ color: '#132c32' }),
    screen: new T.MeshBasicMaterial({ color: '#d4f5ec' }),
  };
  function box(parent, name, size, position, material) {
    const mesh = new T.Mesh(new T.BoxGeometry(...size), materials[material]);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  box(person, 'torso', [0.42, 0.57, 0.25], [0, 1.18, 0], 'shirt');
  const head = new T.Mesh(new T.SphereGeometry(0.17, 16, 12), materials.skin);
  head.position.set(0, 1.6, 0);
  person.add(head);
  const legs = [-1, 1].map((side) => {
    const leg = new T.Group();
    leg.position.set(side * 0.12, 0.91, 0);
    person.add(leg);
    box(leg, 'leg', [0.16, 0.76, 0.18], [0, -0.38, 0], 'pants');
    box(leg, 'shoe', [0.18, 0.15, 0.3], [0, -0.835, 0.05], 'phone');
    return leg;
  });
  box(person, 'left-arm', [0.13, 0.55, 0.15], [-0.28, 1.1, 0], 'shirt');
  box(person, 'upper-arm', [0.14, 0.35, 0.15], [0.28, 1.2, 0], 'shirt');
  box(person, 'forearm', [0.14, 0.13, 0.36], [0.28, 1.06, 0.2], 'skin');
  const hand = box(person, 'hand', [0.14, 0.14, 0.12], [0.28, 1.11, 0.38], 'skin');
  const phone = box(hand, 'handheld-phone', [0.09, 0.18, 0.025], [0, 0.06, 0.025], 'phone');
  box(phone, 'phone-screen', [0.075, 0.15, 0.005], [0, 0, 0.016], 'screen');
  let current;
  return {
    group,
    person,
    phone,
    groundY,
    update(story) {
      current = story;
      group.visible = story.context === 'site';
      const walking = story.phase === 'approach' && !story.reduced;
      person.position.set(6.1 - (walking ? story.progress : 1), groundY, 2.6);
      legs.forEach((leg, i) => {
        leg.rotation.x = walking ? Math.sin(story.progress * Math.PI * 4 + i * Math.PI) * 0.16 : 0;
      });
      // Keep the lowest sole on the ground throughout the walk cycle.
      person.position.y = groundY;
      person.updateMatrixWorld(true);
      const soleY = Math.min(...legs.map((leg) => new T.Box3().setFromObject(leg).min.y));
      person.position.y += groundY - soleY;
      phone.rotation.z =
        story.phone === 'ringing' && !story.reduced
          ? Math.sin(story.progress * Math.PI * 40) * 0.07
          : 0;
      materials.screen.color.set(story.phone === 'connected' ? '#5deb9f' : '#d4f5ec');
      group.updateMatrixWorld(true);
    },
    audit() {
      group.updateMatrixWorld(true);
      return {
        person: person.position.toArray(),
        footY: Math.min(...legs.map((leg) => new T.Box3().setFromObject(leg).min.y)),
        height: new T.Box3().setFromObject(person).getSize(new T.Vector3()).y,
        phone: phone.getWorldPosition(new T.Vector3()).toArray(),
        phoneHandDistance: phone
          .getWorldPosition(new T.Vector3())
          .distanceTo(hand.getWorldPosition(new T.Vector3())),
        pose: current?.reduced ? 'static' : current?.phase,
      };
    },
    dispose() {
      group.traverse((object) => object.geometry?.dispose());
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}
