import { moveCamera } from './textures.js';

/**
 * Ambient occlusion: pillars, steps and crates in a room under a slow orbit, with a rolling ball that creates
 * disocclusions. Rendered with GTAO; the reference uses more samples and averaged noise frames.
 */
export async function create(THREE, { params }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8dde4);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 3));
  const material = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.9 });
  const add = (geometry, x, y, z, ry = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    scene.add(mesh);
    return mesh;
  };
  const floor = add(new THREE.PlaneGeometry(20, 20), 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;
  add(new THREE.BoxGeometry(20, 6, 0.2), 0, 3, -5);
  add(new THREE.BoxGeometry(0.2, 6, 20), -6, 3, 0);
  for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.3, 0.35, 5, 24), -3 + i * 2, 2.5, -3.5);
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(3 - i * 0.6, 0.25, 1.2), 2.5, 0.125 + i * 0.25, -1 - i * 0.3);
  for (let i = 0; i < 5; i++)
    add(new THREE.BoxGeometry(0.8, 0.8, 0.8), -4 + i * 0.95, 0.4, 0.5 + (i % 2) * 0.3, i * 0.4);
  add(new THREE.TorusKnotGeometry(0.5, 0.15, 128, 16), -1, 1.2, 1.5);
  const ball = add(new THREE.SphereGeometry(0.45, 48, 24), 0, 0.45, 2);
  const motion = params.camera ?? 'orbit';
  return {
    scene,
    camera,
    effect: 'gtao',
    effectOptions: { radius: 1.2, samples: 16 },
    referenceEffectOptions: { samples: 32 },
    referenceAccumulate: 8,
    update(t) {
      ball.position.x = 2.5 * Math.sin(t * 0.8);
      ball.rotation.z = -ball.position.x / 0.45;
      moveCamera(camera, motion, t, { distance: 8, target: [0, 1, 0], height: 2.5, orbit: 1.5 });
    },
  };
}
