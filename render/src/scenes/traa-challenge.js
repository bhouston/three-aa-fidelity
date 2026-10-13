import { checkerTexture, cutoutTexture, loadEnvironment, moveCamera, waveNormalTexture } from './textures.js';

/**
 * Nine TRAA challenges in a 3×3 grid (from mrdoob/three.js#34875): thin edges and fine texture, linear translation,
 * rotation, specular aliasing, opposing motion, zoom, disocclusion, alpha cutout with a blended surface, and morph
 * targets with instanced motion. `params.camera` adds camera motion: still, pan, orbit or zoom.
 */
export async function create(THREE, { params }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 2));
  const light = new THREE.PointLight(0xffffff, 100);
  light.position.set(2, 4, 6);
  scene.add(light);
  const environment = await loadEnvironment(THREE);
  scene.environment = environment;
  scene.background = environment;
  scene.backgroundBlurriness = 0.15;

  const checker = checkerTexture(THREE);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const patterned = new THREE.MeshBasicMaterial({ map: checker, side: THREE.DoubleSide });
  const groups = Array.from({ length: 9 }, (_, i) => {
    const group = new THREE.Group();
    group.position.set(((i % 3) - 1) * 3.7, (1 - Math.floor(i / 3)) * 2.8, 0);
    scene.add(group);
    return group;
  });
  const mesh = (geometry, material, parent) => {
    const object = new THREE.Mesh(geometry, material);
    parent.add(object);
    return object;
  };

  mesh(new THREE.PlaneGeometry(1.5, 1.5), patterned, groups[0]).rotation.z = 0.2;
  for (let i = 0; i < 12; i++) {
    const bar = mesh(new THREE.BoxGeometry(0.015, 1.8, 0.02), white, groups[0]);
    bar.position.set((i - 5.5) * 0.17, 0, 0.1);
    bar.rotation.z = 0.4;
  }

  const linear = mesh(new THREE.PlaneGeometry(1.25, 1.25), patterned, groups[1]);

  const spinner = new THREE.Group();
  groups[2].add(spinner);
  mesh(new THREE.CircleGeometry(0.9, 64), patterned, spinner);
  for (let i = 0; i < 16; i++) {
    const spoke = mesh(new THREE.BoxGeometry(0.022, 1.85, 0.03), white, spinner);
    spoke.rotation.z = (i * Math.PI) / 16;
    spoke.position.z = 0.1;
  }

  const shiny = mesh(
    new THREE.TorusKnotGeometry(0.55, 0.18, 160, 24),
    new THREE.MeshStandardMaterial({
      color: 0xddddff,
      metalness: 1,
      roughness: 0.04,
      normalMap: waveNormalTexture(THREE),
    }),
    groups[3],
  );

  const rear = mesh(new THREE.PlaneGeometry(1.7, 1.6), patterned, groups[4]);
  const front = new THREE.Group();
  groups[4].add(front);
  for (let i = 0; i < 6; i++) {
    const bar = mesh(
      new THREE.BoxGeometry(0.13, 1.8, 0.15),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff4422 : 0x22aaff }),
      front,
    );
    bar.position.set((i - 2.5) * 0.27, 0, 0.3);
  }

  const zoom = mesh(new THREE.PlaneGeometry(1.5, 1.5), patterned, groups[5]);

  const concave = new THREE.Group();
  groups[6].add(concave);
  for (let i = 0; i < 5; i++) {
    const wall = mesh(
      new THREE.BoxGeometry(0.12, 1.7, 1.5),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i / 5, 0.8, 0.5), roughness: 0.8 }),
      concave,
    );
    wall.position.x = (i - 2) * 0.4;
  }
  mesh(new THREE.BoxGeometry(1.9, 1.7, 0.12), new THREE.MeshStandardMaterial({ color: 0xeeeeee }), concave).position.z =
    -0.75;

  const alphaTest = mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({ map: cutoutTexture(THREE), alphaTest: 0.5, side: THREE.DoubleSide }),
    groups[7],
  );
  const blended = mesh(
    new THREE.PlaneGeometry(1, 1.3),
    new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    groups[7],
  );
  blended.position.z = 0.3;

  const morphGeometry = new THREE.PlaneGeometry(1.4, 1.4, 20, 20);
  const morphPosition = morphGeometry.attributes.position.clone();
  for (let i = 0; i < morphPosition.count; i++) morphPosition.setZ(i, 0.4 * Math.sin(morphPosition.getX(i) * 9));
  morphGeometry.morphAttributes.position = [morphPosition];
  const morph = mesh(morphGeometry, patterned, groups[8]);
  const instances = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), white, 12);
  groups[8].add(instances);
  const matrix = new THREE.Matrix4();
  const motion = params.camera ?? 'still';

  return {
    scene,
    camera,
    update(t) {
      linear.position.set(0.65 * Math.sin(t), 0.18 * Math.cos(t * 0.7), 0);
      spinner.rotation.z = t * 0.6;
      shiny.rotation.set(t * 0.3, t * 0.5, 0);
      light.position.x = 5 * Math.sin(t * 0.5);
      rear.position.x = 0.45 * Math.sin(t * 1.3);
      front.position.x = -0.55 * Math.sin(t * 1.3);
      zoom.scale.setScalar(0.85 + 0.35 * Math.sin(t * 0.7));
      zoom.position.z = 1.2 * Math.sin(t * 0.7);
      concave.rotation.y = t * 0.45;
      alphaTest.rotation.z = t * 0.25;
      blended.position.x = 0.6 * Math.sin(t * 1.2);
      morph.morphTargetInfluences[0] = 0.5 + 0.5 * Math.sin(t);
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6 + t * 0.5;
        matrix.makeTranslation(Math.cos(angle), Math.sin(angle), 0.5);
        instances.setMatrixAt(i, matrix);
      }
      instances.instanceMatrix.needsUpdate = true;
      moveCamera(camera, motion, t, { distance: Math.max(14, 10 / camera.aspect) });
    },
    dispose() {
      environment.dispose();
    },
  };
}
