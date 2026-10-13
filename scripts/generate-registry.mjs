// Generates registry.json: renderers are anti-aliasing methods × three.js variants, scenes opt into dynamic
// fidelity with the renderers that apply to them. Edit this file, then run `node scripts/generate-registry.mjs`.
import { readFileSync, writeFileSync } from 'node:fs';

const variants = JSON.parse(readFileSync(new URL('../three-variants.json', import.meta.url), 'utf8')).variants;
const variantLabel = (id) => variants.find((variant) => variant.id === id).label;

const method = (aa, label, category, extra = {}) => ({ aa, label, category, extra });
const METHODS = {
  'no-aa': method('none', 'No AA', 'Baselines'),
  'msaa-4x': method('msaa', 'MSAA 4×', 'Baselines'),
  fxaa: method('fxaa', 'FXAA', 'Baselines'),
  smaa: method('smaa', 'SMAA', 'Baselines'),
  traa: method('traa', 'TRAA', 'TRAA'),
  'traa-linear': method('traa', 'TRAA bilinear history', 'TRAA', { traa: { historySampling: 'linear' } }),
  'traa-probe': method('traa', 'TRAA + 2nd velocity pass', 'TRAA + 2nd velocity pass', { extraVelocityPass: true }),
  taau: method('taau', 'TAAU 50%', 'TAAU'),
  denoise: method('denoise', 'DenoiseNode', 'DenoiseNode'),
};

/** `<method>` uses the `fixed` build; `<method>.<variant>` a specific three.js build. */
function renderer(id) {
  const [methodId, variant] = id.split('.');
  const { aa, label, category, extra } = METHODS[methodId];
  return {
    id,
    name: variant ? `${label} · ${variantLabel(variant)}` : label,
    category,
    params: { aa, variant: variant ?? 'fixed', ...extra },
  };
}

const BASELINES = ['no-aa', 'msaa-4x', 'fxaa', 'smaa'];
const AA_CORE = [...BASELINES, 'traa.dev', 'traa.fixed', 'traa-linear.fixed', 'taau.dev', 'taau.fixed'];
const sequence = { width: 640, height: 360, frames: 120, warmup: 30, fps: 60 };

const scenes = [
  {
    id: 'traa-challenge-pan',
    name: 'TRAA challenge · pan',
    category: 'Anti-aliasing',
    tags: ['traa', 'motion'],
    params: { content: 'traa-challenge', camera: 'pan' },
    renderers: [
      ...AA_CORE,
      'traa.traa-catmull-rom',
      'traa.morph-velocity',
      'taau.taau-lock',
      'taau.taau-black-luma',
      'traa-probe.dev',
      'traa-probe.fixed',
      'traa-probe.velocity-history',
    ],
  },
  {
    id: 'traa-challenge-orbit',
    name: 'TRAA challenge · orbit',
    category: 'Anti-aliasing',
    tags: ['traa', 'motion'],
    params: { content: 'traa-challenge', camera: 'orbit' },
    renderers: [...AA_CORE, 'traa.traa-catmull-rom'],
  },
  {
    id: 'traa-challenge-still',
    name: 'TRAA challenge · still camera',
    category: 'Anti-aliasing',
    tags: ['traa'],
    params: { content: 'traa-challenge', camera: 'still' },
    renderers: [...AA_CORE, 'traa.traa-catmull-rom'],
  },
  {
    id: 'thin-lines',
    name: 'Thin lines, fence and floor · dolly',
    category: 'Anti-aliasing',
    tags: ['traa', 'thin geometry', 'alpha test'],
    params: { content: 'thin-lines', camera: 'dolly' },
    renderers: [...AA_CORE, 'traa.traa-catmull-rom'],
  },
  {
    id: 'morph-field',
    name: 'Morph target field',
    category: 'Motion vectors',
    tags: ['traa', 'morph targets'],
    params: { content: 'morph-field', camera: 'still' },
    renderers: ['no-aa', 'traa.dev', 'traa.fixed', 'traa-linear.fixed', 'traa.morph-velocity'],
  },
  {
    id: 'ao-room',
    name: 'GTAO room · orbit',
    category: 'Temporal effects',
    tags: ['gtao', 'traa', 'noise'],
    params: { content: 'ao-room', camera: 'orbit' },
    renderers: [
      'no-aa',
      'traa.dev',
      'traa.fixed',
      'traa-linear.fixed',
      'traa.ao-gi-ign',
      'traa.bounded-jitter',
      'traa.gtao-rotation',
      'denoise.dev',
      'denoise.fixed',
      'denoise.denoise-rotation',
    ],
  },
  {
    id: 'ssgi-box',
    name: 'SSGI box · pan',
    category: 'Temporal effects',
    tags: ['ssgi', 'traa', 'noise'],
    params: { content: 'ssgi-box', camera: 'pan' },
    renderers: ['no-aa', 'traa.dev', 'traa.fixed', 'traa-linear.fixed', 'traa.ao-gi-ign', 'traa.bounded-jitter'],
  },
];

const rendererIds = [...new Set(scenes.flatMap((scene) => scene.renderers))];
const registry = {
  $schema: './submodules/fidelity-kit/packages/cli/schemas/registry.schema.json',
  schemaVersion: 1,
  title: 'three-aa-fidelity',
  renderServer: {
    developmentUrl: 'http://127.0.0.1:5173/',
    deployedUrl: 'https://three-aa-fidelity.ben3d.ca/render/',
    entry: 'index.html',
  },
  renderers: [
    {
      id: 'reference',
      name: 'Reference · 4×4 supersampled, Lanczos',
      category: 'References',
      reference: true,
      params: { aa: 'none', variant: 'fixed', quality: 'reference' },
      supersample: { factor: 4, filter: 'lanczos3' },
    },
    ...rendererIds.map(renderer),
  ],
  scenes: scenes.map(({ renderers, ...scene }) => ({ ...scene, dynamic: { ...sequence, renderers } })),
  dynamic: { reference: 'reference', output: 'motion' },
};
delete registry.$schema;
writeFileSync(new URL('../registry.json', import.meta.url), JSON.stringify(registry, null, 2) + '\n');
console.log(`registry.json: ${registry.renderers.length} renderers, ${registry.scenes.length} scenes`);
