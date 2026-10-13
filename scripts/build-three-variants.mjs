// Builds every three.js variant of three-variants.json into render/public/variants/<id>/three.js.
//
// One bhouston/three.js checkout (git-dedup, shared object store) is reused: for each pinned commit it runs the
// three.js rollup build (src changes such as motion vectors need it) and bundles render/variant-entry.js with esbuild.
// Usage: node scripts/build-three-variants.mjs [--only id,id] [--checkout .cache/three.js]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({ options: { only: { type: 'string' }, checkout: { type: 'string' } } });
const config = JSON.parse(readFileSync(join(root, 'three-variants.json'), 'utf8'));
const only = values.only?.split(',');
const variants = config.variants.filter((variant) => !only || only.includes(variant.id));
const checkout = resolve(root, values.checkout ?? '.cache/three.js');
const windows = process.platform === 'win32';
const run = (command, args, cwd = checkout) =>
  execFileSync(windows && command !== 'node' ? `${command}.cmd` : command, args, {
    cwd,
    stdio: 'inherit',
    shell: windows && command !== 'node',
  });

if (!existsSync(join(checkout, '.git'))) {
  mkdirSync(dirname(checkout), { recursive: true });
  run('git-dedup', ['clone', config.repository, checkout], root);
}
run('git-dedup', ['fetch', '--quiet', 'origin', ...variants.map((variant) => variant.ref)]);
let installed = false;
const manifest = [];
for (const variant of variants) {
  console.log(`\n== ${variant.id} (${variant.ref} @ ${variant.sha.slice(0, 10)})`);
  run('git-dedup', ['checkout', '--quiet', '--force', variant.sha]);
  if (!installed) {
    run('npm', ['ci', '--no-audit', '--no-fund', '--ignore-scripts']);
    installed = true;
  }
  run('node', ['node_modules/rollup/dist/bin/rollup', '-c', 'utils/build/rollup.config.js', '--silent']);
  const out = join(root, 'render/public/variants', variant.id, 'three.js');
  await build({
    entryPoints: [join(root, 'render/variant-entry.js')],
    bundle: true,
    format: 'esm',
    minify: true,
    target: 'es2022',
    outfile: out,
    legalComments: 'none',
    alias: {
      'three/webgpu': join(checkout, 'build/three.webgpu.js'),
      'three/tsl': join(checkout, 'build/three.tsl.js'),
      'three/addons': join(checkout, 'examples/jsm'),
      three: join(checkout, 'build/three.webgpu.js'),
    },
  });
  manifest.push({ id: variant.id, sha: variant.sha });
}
// Restore a clean tree: the three.js build writes tracked files under build/.
run('git-dedup', ['checkout', '--quiet', '--force', config.variants[0].sha]);
const manifestFile = join(root, 'render/public/variants/manifest.json');
const previous = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : [];
const merged = [...previous.filter((entry) => !manifest.some((built) => built.id === entry.id)), ...manifest];
writeFileSync(manifestFile, JSON.stringify(merged, null, 2) + '\n');
