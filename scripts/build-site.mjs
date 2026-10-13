// Builds the static website into site/: the fidelity-kit viewer with the committed results, plus the render server
// (render/dist, including the three.js variant bundles) at site/render/ for live mode.
// Usage: node scripts/build-site.mjs [--root-url <deployed render server URL>]
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({ options: { 'root-url': { type: 'string' } } });
const site = join(root, 'site');
rmSync(site, { recursive: true, force: true });
const cli = join(root, 'submodules/fidelity-kit/packages/cli/bin.js');
execFileSync(
  process.execPath,
  [
    cli,
    'build',
    'fidelity-results',
    '--registry',
    'registry.json',
    '--out',
    site,
    ...(values['root-url'] ? ['--root-url', values['root-url']] : []),
  ],
  { cwd: root, stdio: 'inherit' },
);
const render = join(root, 'render/dist');
if (existsSync(render)) cpSync(render, join(site, 'render'), { recursive: true });
else console.warn('render/dist is missing: live mode will be unavailable. Run `pnpm build` first.');
writeFileSync(join(site, 'CNAME'), 'three-aa-fidelity.ben3d.ca\n');
