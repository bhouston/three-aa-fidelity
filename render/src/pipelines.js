/**
 * Builds the post-processing pipeline of one renderer configuration.
 *
 * - `aa`: `none`, `msaa` (4×), `fxaa`, `smaa`, `traa`, `taau` (50% input by default) or `denoise` (DenoiseNode on
 *   the scene's ambient occlusion, without temporal accumulation).
 * - `traa` / `taau`: options copied onto the node, e.g. `{ "historySampling": "linear" }`.
 * - `quality: "reference"` raises the effect quality and averages the scene's `referenceAccumulate` sub-frames
 *   (noise frames) at the same scene time. It is used by the supersampled reference.
 * - `extraVelocityPass`: renders the scene with velocity once more per frame before the main pass, like a
 *   secondary view would. It checks that motion vectors survive several velocity passes per frame.
 *
 * The scene's `effect` (`gtao` or `ssgi`) is composited before anti-aliasing, as in the three.js examples.
 */
export function createPipeline(THREE, renderer, content, params) {
  const { TSL } = THREE;
  const { scene, camera, effect } = content;
  const aa = params.aa ?? 'none';
  const temporal = aa === 'traa' || aa === 'taau';
  const reference = params.quality === 'reference';
  // Only the reference averages noise frames; the scene decides how many its effect needs.
  const accumulate = reference ? Math.max(1, content.referenceAccumulate ?? 1) : 1;
  const disposables = [];

  const renderPipeline = new THREE.RenderPipeline(renderer);
  disposables.push(renderPipeline);
  const scenePass = TSL.pass(scene, camera, { samples: aa === 'msaa' ? 4 : 0 });
  if (aa === 'taau') scenePass.setResolutionScale(Number(params.resolutionScale ?? 0.5));

  const outputs = { output: TSL.output };
  if (effect) outputs.normal = TSL.packNormalToRGB(TSL.normalView);
  if (effect === 'ssgi') outputs.diffuseColor = TSL.diffuseColor;
  if (temporal) outputs.velocity = TSL.velocity;
  if (Object.keys(outputs).length > 1) scenePass.setMRT(TSL.mrt(outputs));
  if (effect) scenePass.getTexture('normal').type = THREE.UnsignedByteType;

  const color = scenePass.getTextureNode('output');
  const depth = scenePass.getTextureNode('depth');
  let composite = color;

  if (effect) {
    const normalTexture = scenePass.getTextureNode('normal');
    const normal = TSL.sample((uv) => TSL.unpackRGBToNormal(normalTexture.sample(uv)));
    // The noise of the effect animates when it is accumulated over time (TRAA, TAAU or the reference sub-frames).
    const animated = temporal || accumulate > 1;
    const options = { ...content.effectOptions, ...(reference ? content.referenceEffectOptions : {}) };
    if (effect === 'gtao') {
      const aoPass = THREE.ao(depth, normal, camera);
      for (const [key, value] of Object.entries(options)) aoPass[key].value = value;
      aoPass.useTemporalFiltering = animated;
      const occlusionTexture = aoPass.getTextureNode();
      // DenoiseNode is evaluated inline at the fragment's uv, like a texture sample.
      const occlusion =
        aa === 'denoise'
          ? THREE.denoise(occlusionTexture, depth, normal, camera).r
          : occlusionTexture.sample(TSL.screenUV).r;
      composite = TSL.vec4(color.rgb.mul(occlusion), color.a);
    } else if (effect === 'ssgi') {
      const giPass = THREE.ssgi(color, depth, normal, camera);
      for (const [key, value] of Object.entries(options)) giPass[key].value = value;
      giPass.useTemporalFiltering = animated;
      const diffuse = scenePass.getTextureNode('diffuseColor');
      composite = TSL.vec4(
        TSL.add(color.rgb.mul(giPass.getAONode()), diffuse.rgb.mul(giPass.getGINode().rgb)),
        color.a,
      );
    } else throw new Error(`Unknown effect ${effect}`);
  }

  if (aa === 'traa' || aa === 'taau') {
    const node = (aa === 'traa' ? THREE.traa : THREE.taau)(
      composite,
      depth,
      scenePass.getTextureNode('velocity'),
      camera,
    );
    Object.assign(node, params[aa] ?? {});
    renderPipeline.outputNode = node;
  } else if (aa === 'fxaa' || aa === 'smaa') {
    renderPipeline.outputColorTransform = false;
    renderPipeline.outputNode = THREE[aa](TSL.renderOutput(composite));
  } else if (aa === 'none' || aa === 'msaa' || aa === 'denoise') {
    renderPipeline.outputNode = composite;
  } else throw new Error(`Unknown anti-aliasing method ${aa}`);

  let extraVelocity;
  if (params.extraVelocityPass) {
    const probeCamera = camera.clone();
    const probePass = TSL.pass(scene, probeCamera);
    probePass.setMRT(TSL.mrt({ output: TSL.output, velocity: TSL.velocity }));
    const probePipeline = new THREE.RenderPipeline(renderer);
    probePipeline.outputColorTransform = false;
    probePipeline.outputNode = probePass.getTextureNode('velocity');
    const target = new THREE.RenderTarget(64, 64, { depthBuffer: false });
    disposables.push(probePipeline, target);
    extraVelocity = () => {
      probeCamera.copy(camera);
      renderer.setRenderTarget(target);
      probePipeline.render();
      renderer.setRenderTarget(null);
    };
  }

  let render = () => renderPipeline.render();

  if (accumulate > 1) {
    // Average the linear HDR output of several noise frames, then tone map once.
    renderPipeline.outputColorTransform = false;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const frameTarget = new THREE.RenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthBuffer: false });
    const sumTarget = new THREE.RenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthBuffer: false });
    const weight = TSL.uniform(1 / accumulate);
    const sumMaterial = new THREE.NodeMaterial();
    sumMaterial.fragmentNode = TSL.vec4(TSL.texture(frameTarget.texture).rgb.mul(weight), weight);
    Object.assign(sumMaterial, {
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
    });
    const sumQuad = new THREE.QuadMesh(sumMaterial);
    const display = new THREE.RenderPipeline(renderer);
    display.outputNode = TSL.texture(sumTarget.texture);
    disposables.push(frameTarget, sumTarget, sumMaterial, display);
    render = (nodeFrame) => {
      const autoClear = renderer.autoClear;
      renderer.setRenderTarget(sumTarget);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      for (let i = 0; i < accumulate; i++) {
        if (i > 0) nodeFrame.frameId++;
        renderer.setRenderTarget(frameTarget);
        renderPipeline.render();
        renderer.setRenderTarget(sumTarget);
        renderer.autoClear = false;
        sumQuad.render(renderer);
        renderer.autoClear = autoClear;
      }
      renderer.setRenderTarget(null);
      display.render();
    };
  }

  return {
    render(nodeFrame) {
      extraVelocity?.();
      render(nodeFrame);
    },
    dispose() {
      for (const item of disposables) item.dispose();
    },
  };
}
