import { checkerTexture, fenceTexture, moveCamera } from './textures.js';

/**
 * Classic aliasing content under a slow camera dolly: a receding nearest-filtered checker floor (minification
 * shimmer), an alpha-tested chain-link fence, sub-pixel power lines and a spinning lattice of thin bars.
 */
export async function create(THREE, { params }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9cc3e8);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x556644, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(5, 10, 4);
  scene.add(sun);

  const floorTexture = checkerTexture(THREE, { size: 64, cell: 4, dark: 40, light: 230 });
  floorTexture.repeat.set(60, 60);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ map: floorTexture }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const fenceMap = fenceTexture(THREE);
  fenceMap.repeat.set(8, 2);
  const fence = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 4),
    new THREE.MeshStandardMaterial({ map: fenceMap, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.6 }),
  );
  fence.position.set(-2, 2, -6);
  fence.rotation.y = 0.5;
  scene.add(fence);

  const wireMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  for (let i = 0; i < 6; i++) {
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 60, 6), wireMaterial);
    wire.rotation.z = Math.PI / 2;
    wire.rotation.y = 0.15;
    wire.position.set(0, 4 + i * 0.35, -12 - i * 0.5);
    scene.add(wire);
  }

  const lattice = new THREE.Group();
  const barMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.2, roughness: 0.4 });
  for (let i = 0; i < 24; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 3, 0.03), barMaterial);
    bar.rotation.z = (i / 24) * Math.PI;
    lattice.add(bar);
  }
  lattice.position.set(3, 2, -3);
  scene.add(lattice);

  const motion = params.camera ?? 'dolly';
  return {
    scene,
    camera,
    update(t) {
      lattice.rotation.z = t * 0.35;
      lattice.rotation.y = t * 0.2;
      moveCamera(camera, motion, t, { distance: 6, target: [0, 1.5, -4], height: 0.6 });
    },
  };
}
