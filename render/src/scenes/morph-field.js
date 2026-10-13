import { checkerTexture, moveCamera } from './textures.js';

/**
 * A field of morph-target animated sheets with fine texture. Only morph targets move, so the scene isolates the
 * motion vectors of morphed geometry under temporal anti-aliasing.
 */
export async function create(THREE, { params }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202530);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 2.5));
  const material = new THREE.MeshStandardMaterial({ map: checkerTexture(THREE), side: THREE.DoubleSide });
  const sheets = [];
  for (let i = 0; i < 9; i++) {
    const geometry = new THREE.PlaneGeometry(1.6, 1.6, 32, 32);
    const target = geometry.attributes.position.clone();
    const frequency = 4 + (i % 3) * 3;
    for (let v = 0; v < target.count; v++)
      target.setZ(v, 0.35 * Math.sin(target.getX(v) * frequency + i) * Math.cos(target.getY(v) * frequency * 0.5));
    geometry.morphAttributes.position = [target];
    const sheet = new THREE.Mesh(geometry, material);
    sheet.position.set(((i % 3) - 1) * 2.1, (1 - Math.floor(i / 3)) * 2.1, 0);
    sheet.rotation.x = -0.3;
    scene.add(sheet);
    sheets.push(sheet);
  }
  const motion = params.camera ?? 'still';
  return {
    scene,
    camera,
    update(t) {
      sheets.forEach((sheet, i) => {
        sheet.morphTargetInfluences[0] = Math.sin(t * (1 + i * 0.15) + i);
      });
      moveCamera(camera, motion, t, { distance: 8 });
    },
  };
}
