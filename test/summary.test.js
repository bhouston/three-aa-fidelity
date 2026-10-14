import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('summarizes captured comparisons as Markdown bullets with their measurements', () => {
  const summary = execFileSync(process.execPath, ['scripts/summarize-pr-validation.mjs'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });
  const lines = summary.trim().split(/\r?\n/);
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines)
    expect(line).toMatch(/^- \*\*.+\*\* \(.+\): sequence PSNR .+; temporal PSNR .+; sharpness .+\.$/);
  expect(summary).toContain(
    '**All fixes, TRAA** (morph-field): sequence PSNR 19.22 → 26.56 dB (+7.34); temporal PSNR 23.98 → 34.47 dB (+10.49)',
  );
});
