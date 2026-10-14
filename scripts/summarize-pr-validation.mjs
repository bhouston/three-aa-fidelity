// Prints Markdown bullets validating each three.js change: the renderer with the change against its baseline,
// per scene, from fidelity-results/dynamic.json. Usage: node scripts/summarize-pr-validation.mjs
import { readFileSync } from 'node:fs';

const { results } = JSON.parse(readFileSync(new URL('../fidelity-results/dynamic.json', import.meta.url), 'utf8'));
const CHECKS = [
  ['TRAA Catmull-Rom history', 'traa.dev', 'traa.traa-catmull-rom'],
  ['TRAA Catmull-Rom history (on top of all other fixes)', 'traa-linear.fixed', 'traa.fixed'],
  ['#41 morph target motion vectors', 'traa.dev', 'traa.morph-velocity'],
  ['#40 velocity history per render pass', 'traa-probe.dev', 'traa-probe.velocity-history'],
  ['#43 GTAO/SSGI bounded ray jitter', 'traa.dev', 'traa.bounded-jitter'],
  ['GTAO/SSGI animated IGN (on top of #43)', 'traa.bounded-jitter', 'traa.ao-gi-ign'],
  ['#37 GTAO rotation units', 'traa.dev', 'traa.gtao-rotation'],
  ['#35 DenoiseNode rotation', 'denoise.dev', 'denoise.denoise-rotation'],
  ['#38 TAAU lock history', 'taau.dev', 'taau.taau-lock'],
  ['#39 TAAU black neighborhoods', 'taau.dev', 'taau.taau-black-luma'],
  ['All fixes, TRAA', 'traa.dev', 'traa.fixed'],
];
const f = (v, d = 2) => (v === null ? '∞' : v.toFixed(d));
const signed = (v, d = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}`;
for (const [name, base, test] of CHECKS)
  for (const [scene, row] of Object.entries(results)) {
    const a = row[base];
    const b = row[test];
    if (!a || !b) continue;
    console.log(
      `- **${name}** (${scene}): sequence PSNR ${f(a.psnr)} → ${f(b.psnr)} dB (${signed(b.psnr - a.psnr)}); temporal PSNR ${f(a.temporalPsnr)} → ${f(b.temporalPsnr)} dB (${signed(b.temporalPsnr - a.temporalPsnr)}); sharpness ${f(a.sharpness, 3)} → ${f(b.sharpness, 3)}.`,
    );
  }
