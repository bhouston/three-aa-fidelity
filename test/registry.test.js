import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRegistry } from 'fidelity-kit/registry';
import { SCENES } from '../render/src/scenes/index.js';

const read = (file) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));

describe('registry', () => {
  const registry = read('registry.json');
  const variants = read('three-variants.json').variants.map((variant) => variant.id);

  it('is valid for fidelity-kit', () => {
    expect(() => parseRegistry(registry)).not.toThrow();
  });

  it('is up to date with scripts/generate-registry.mjs', () => {
    execFileSync(process.execPath, ['scripts/generate-registry.mjs'], { cwd: new URL('..', import.meta.url) });
    expect(read('registry.json')).toEqual(registry);
  });

  it('only uses known scene modules and three.js variants', () => {
    for (const scene of registry.scenes) expect(Object.keys(SCENES)).toContain(scene.params.content);
    for (const renderer of registry.renderers) expect(variants).toContain(renderer.params.variant);
  });

  it('pins every variant to a commit', () => {
    for (const variant of read('three-variants.json').variants) expect(variant.sha).toMatch(/^[0-9a-f]{40}$/);
  });
});
