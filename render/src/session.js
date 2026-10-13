import { createPipeline } from './pipelines.js';
import { SCENES } from './scenes/index.js';

/** Imports a prebuilt three.js variant bundle (see three-variants.json). */
export function loadVariant(id) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Invalid three.js variant ${id}`);
  return import(/* @vite-ignore */ new URL(`variants/${id}/three.js`, document.baseURI).href);
}

/** Adapter details of a renderer's WebGPU device; software adapters must never produce results. */
function adapterInfo(renderer) {
  const info = renderer.backend?.adapter?.info ?? renderer.backend?.device?.adapterInfo;
  return info ? { vendor: info.vendor, architecture: info.architecture, description: info.description } : undefined;
}

/**
 * fidelity-kit session factory. `params` come from the registry: `content` (scene module), `variant` (three.js build), `aa` (method),
 * optional method options and the capture size. Animation advances by the `draw()` time step only, so captures are
 * deterministic and every renderer sees the same scene state on every frame.
 */
export async function createSession(params, reporter, host) {
  const width = Number(params.width ?? 960);
  const height = Number(params.height ?? 540);
  // `params.scene` is the registry scene ID; `content` names the scene module it renders.
  const definition = SCENES[params.content];
  if (!definition) throw new Error(`Unknown scene content ${params.content}`);

  reporter.phaseStart('load');
  const THREE = await loadVariant(String(params.variant ?? 'fixed'));
  reporter.phaseEnd('load');
  reporter.phaseStart('setup');

  const canvas = document.createElement('canvas');
  host.replaceChildren(canvas);
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, forceWebGL: params.backend === 'webgl' });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  renderer.toneMapping = THREE.NeutralToneMapping;
  await renderer.init();

  const adapter = adapterInfo(renderer);
  if (adapter && /swiftshader|llvmpipe|lavapipe|softpipe|basic render/i.test(JSON.stringify(adapter)))
    throw new Error(`Software adapter ${JSON.stringify(adapter)} cannot produce fidelity results`);
  reporter.environment({
    api: renderer.backend?.device ? 'webgpu' : 'webgl2',
    canvasSize: { width, height },
    gpuAdapter: adapter,
    gpuTimestampsAvailable: false,
  });

  const content = await definition.create(THREE, { width, height, params });
  content.camera.aspect = width / height;
  content.camera.updateProjectionMatrix();
  const pipeline = createPipeline(THREE, renderer, content, params);

  // Frames are driven explicitly: three.js only advances per-frame node state (TRAA history, noise, motion vectors)
  // in its animation loop, which is not used here.
  renderer._animation?.stop();
  const nodeFrame = renderer._nodes.nodeFrame;
  let time = 0;

  const draw = (delta = 1 / 60) => {
    time += delta;
    if (renderer.info.autoReset) renderer.info.reset();
    nodeFrame.frameId++;
    nodeFrame.time = time;
    nodeFrame.deltaTime = delta;
    renderer.info.frame = nodeFrame.frameId;
    const token = reporter.frameBegin({ animationTime: time });
    content.update(time);
    content.camera.updateMatrixWorld();
    pipeline.render(nodeFrame);
    reporter.frameEnd(token);
  };
  const complete = () => {
    const device = renderer.backend?.device;
    if (device) return device.queue.onSubmittedWorkDone();
    renderer.backend?.gl?.finish();
    return Promise.resolve();
  };

  reporter.phaseEnd('setup');
  reporter.ready();
  return {
    canvas,
    draw,
    complete,
    dispose() {
      pipeline.dispose();
      content.dispose?.();
      renderer.dispose();
      canvas.remove();
    },
  };
}
