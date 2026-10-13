import { moveCamera } from './textures.js';

/**
 * Screen-space global illumination in a Cornell-style box with coloured walls, a ceiling light and a moving sphere.
 * Rendered with SSGI (AO and one bounce); the reference uses more slices and steps and averaged noise frames.
 */
export async function create(THREE, { params }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
  const wall = (color, width, height, position, rotation) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ color }));
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    scene.add(mesh);
  };
  wall(0xffffff, 10, 10, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  wall(0xffffff, 10, 10, [0, 8, 0], [Math.PI / 2, 0, 0]);
  wall(0xffffff, 10, 8, [0, 4, -5], [0, 0, 0]);
  wall(0xe02020, 10, 8, [-5, 4, 0], [0, Math.PI / 2, 0]);
  wall(0x20c040, 10, 8, [5, 4, 0], [0, -Math.PI / 2, 0]);
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.1, 3),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4 }),
  );
  lamp.position.set(0, 7.95, 0);
  scene.add(lamp);
  const light = new THREE.PointLight(0xfff4e0, 60, 0, 1.5);
  light.position.set(0, 7, 0);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  const box = (w, h, d, x, z, ry) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
    mesh.position.set(x, h / 2, z);
    mesh.rotation.y = ry;
    scene.add(mesh);
  };
  box(2.2, 4.4, 2.2, -1.8, -1.5, 0.35);
  box(2.2, 2.2, 2.2, 1.8, 1, -0.3);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 48, 24),
    new THREE.MeshStandardMaterial({ color: 0x3060ff, roughness: 0.5 }),
  );
  scene.add(sphere);
  const motion = params.camera ?? 'pan';
  return {
    scene,
    camera,
    effect: 'ssgi',
    effectOptions: { sliceCount: 2, stepCount: 8 },
    referenceEffectOptions: { sliceCount: 4, stepCount: 12 },
    referenceAccumulate: 4,
    update(t) {
      sphere.position.set(2.8 * Math.sin(t * 0.7), 0.7, 2.5 + 0.8 * Math.cos(t * 0.7));
      moveCamera(camera, motion, t, { distance: 14, target: [0, 4, 0] });
    },
  };
}
