/** Procedural textures with detail at the pixel scale; deterministic, so no assets are needed. */

/** 2×2-texel checker (`cell` texels per square) with nearest filtering: maximal minification aliasing. */
export function checkerTexture(THREE, { size = 64, cell = 2, dark = 8, light = 255, nearest = true } = {}) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const white = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      data.set([white ? light : dark, white ? light : dark, white ? light : dark, 255], (y * size + x) * 4);
    }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (nearest) texture.minFilter = texture.magFilter = THREE.NearestFilter;
  else {
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Orange cutout checker with binary alpha, for alpha-tested foliage-like edges. */
export function cutoutTexture(THREE, { size = 64, cell = 2 } = {}) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const opaque = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      data.set([255, 180, 30, opaque ? 255 : 0], (y * size + x) * 4);
    }
  const texture = new THREE.DataTexture(data, size, size);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Chain-link fence mask: thin diagonal wires with alpha 0 between them. */
export function fenceTexture(THREE, { size = 128, spacing = 16, wire = 2 } = {}) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const a = (x + y) % spacing < wire || (x - y + size * 4) % spacing < wire;
      data.set([200, 205, 210, a ? 255 : 0], (y * size + x) * 4);
    }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Tangent-space wave normals: strong specular aliasing on glossy metals. */
export function waveNormalTexture(THREE, size = 256) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 6;
      const v = (y / size) * Math.PI * 6;
      const phase = u * 12 + 0.4 * Math.sin(v * 3);
      const nx = -0.65 * Math.cos(phase);
      const ny = -0.9 * Math.cos(v * 6) - 0.2 * Math.cos(phase) * Math.cos(v * 3);
      const length = Math.hypot(nx, ny, 1);
      data.set(
        [
          Math.round((nx / length / 2 + 0.5) * 255),
          Math.round((ny / length / 2 + 0.5) * 255),
          Math.round((1 / length / 2 + 0.5) * 255),
          255,
        ],
        (y * size + x) * 4,
      );
    }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Loads the shared HDR environment (Poly Haven, CC0) from the render server. */
export async function loadEnvironment(THREE) {
  const environment = await new THREE.HDRLoader().loadAsync(
    new URL('assets/venice_sunset_1k.hdr', document.baseURI).href,
  );
  environment.mapping = THREE.EquirectangularReflectionMapping;
  return environment;
}

/** Camera paths shared by the scenes; `t` is seconds. */
export function moveCamera(camera, motion, t, { distance, target = [0, 0, 0], height = 0, orbit = 3 }) {
  const [tx, ty, tz] = target;
  camera.position.set(tx, ty + height, tz + distance);
  if (motion === 'pan') camera.position.x = tx + 0.8 * Math.sin(t * 0.6);
  else if (motion === 'orbit')
    camera.position.set(tx + orbit * Math.sin(t * 0.4), ty + height + 0.7 * Math.cos(t * 0.4), tz + distance);
  else if (motion === 'zoom') camera.position.z = tz + distance - 1 + 1.5 * Math.sin(t * 0.5);
  else if (motion === 'dolly') camera.position.set(tx + 0.6 * Math.sin(t * 0.3), ty + height, tz + distance - t * 0.6);
  camera.lookAt(tx, ty, tz);
}
