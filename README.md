# three-aa-fidelity

Anti-aliasing and temporal fidelity suite for three.js: no AA, MSAA, FXAA, SMAA, TRAA, TAAU and temporal effects (GTAO, SSGI, DenoiseNode) compared against a **4 × 4 supersampled reference, Lanczos-downsampled in linear light**, over animated sequences. Site: <https://three-aa-fidelity.ben3d.ca>.

It uses the **temporal fidelity** test type of [fidelity-kit](https://github.com/bhouston/fidelity-kit) ([bhouston/fidelity-kit#88](https://github.com/bhouston/fidelity-kit/issues/88)). Every selected renderer renders the same deterministic sequence (fixed 60 Hz time step; the first 30 of 120 frames warm up temporal history), and every measured frame is scored:

- **Sequence PSNR (dB)** measures error against the reference across every measured frame. Blur, ghosting, aliasing and noise lower it.
- **Temporal PSNR (dB)** measures error in frame-to-frame changes, `(O[t] − O[t−1]) − (R[t] − R[t−1])`, exposing flicker, shimmering and lag.
- **Sharpness** measures gradient energy relative to the reference: below 1 is blurrier; above 1 has extra edges from aliasing or noise.

The viewer has three independently optional sections: **Static fidelity** compares individual still captures, **Temporal fidelity** compares deterministic frame sequences, and **Performance** measures rendering throughput. This suite enables only temporal fidelity (`temporalFidelity`), explicitly disables static fidelity (`staticFidelity: false`), and does not configure performance. Still-camera cases remain temporal tests because the geometry and temporal history can change over time. Existing sequence captures and scores remain available without recapturing.

Each scene selects its applicable renderers through `temporalFidelity.renderers`. The AA challenge and thin-line scenes compare the AA methods; the morph field isolates motion-vector changes; GTAO and SSGI scenes compare their relevant effect fixes, with DenoiseNode only on the GTAO room. Empty combinations in the old fidelity grid were unselected tests, rather than failed captures. The temporal section distinguishes these from selected combinations that have no results yet.

## Scenes and renderers

- **Scenes** (`render/src/scenes`) provide content, motion and an optional effect:
  - the 9-panel TRAA challenge (from mrdoob/three.js#34875) with pan, orbit and still cameras;
  - thin lines, a chain-link fence and a receding checker floor under a dolly;
  - a morph-target field;
  - a GTAO room;
  - an SSGI box.
- **Renderers** are an anti-aliasing method × a **three.js build**: `<method>.<variant>`, with `<method>` alone meaning the `fixed` build.
- **Variants** are pinned [bhouston/three.js](https://github.com/bhouston/three.js) commits (`three-variants.json`):
  - `dev` is the baseline;
  - `fixed` merges every change below;
  - every other variant is `dev` plus one pull request, so each change is measured in isolation.
- The **reference** renders without anti-aliasing at 4 × 4 resolution. For effect scenes it uses more effect samples and averages several noise frames per frame.

## Validation of three.js changes

Measured with `node scripts/summarize-pr-validation.mjs` (640 × 360, 90 measured frames, GTX 1050 WebGPU):

- **Morph target motion vectors (#41)** are the largest fix: +6.4 dB PSNR and +10 dB temporal PSNR on morph-heavy content, because morphed meshes otherwise get wrong motion vectors.
- **Catmull-Rom TRAA history** improves every anti-aliasing scene by about +1 dB and makes it sharper (sharpness 0.46 → 0.60). Bilinear history re-blurs the image every frame.
- **Velocity history per render pass (#40)** recovers 1.4 dB when a second velocity pass renders the scene in the same frame.
- **Bounded GTAO/SSGI jitter (#43)** removes the GTAO brightness bias (the fixed build matches the reference's mean exactly). It gains +1.8 dB PSNR at the cost of 1 dB of temporal stability.
- **Animated IGN** for the GTAO/SSGI ray step jitter on top of #43 makes no measurable difference here. A synthetic study suggested it would, but the real effects are dominated by other error.
- **#35, #37, #38 and #39** are correctness fixes with negligible effect on these metrics. Their frames change, but the error does not.
- **SSGI is inconclusive**: every real-time configuration is darker than the higher-quality SSGI reference, and the fixes darken it further. Judging SSGI needs a path-traced reference, as in [three-fidelity](https://github.com/bhouston/three-fidelity).
- **TAAU at 50% input** cannot resolve detail finer than its input (the 2-pixel checkers), which its low sharpness (about 0.168 on the pan case) reflects.
- **All fixes combined** improve TRAA pan from 24.40 to 26.03 dB sequence PSNR and 30.89 to 32.11 dB temporal PSNR; the morph field improves from 19.22 to 26.56 dB and 23.98 to 34.47 dB respectively. GTAO improves from 39.30 to 42.73 dB sequence PSNR, while temporal PSNR falls from 50.18 to 49.27 dB.

## Running it

Requires Node 26, pnpm and a hardware GPU with WebGPU. Never capture with a software adapter; the session rejects SwiftShader and llvmpipe.

```sh
git-dedup clone --recurse-submodules https://github.com/bhouston/three-aa-fidelity
pnpm install
pnpm build:variants        # builds every three.js variant into render/public/variants (needs git-dedup)
pnpm build
pnpm render:dev            # render server on http://127.0.0.1:5173 (open it directly for an interactive view)
pnpm temporal --executable-path "<chrome>"   # capture; add --scenes / --renderers globs to update a subset
pnpm site:dev              # results viewer
```

`pnpm dynamic` remains a backwards-compatible alias for sequence capture. The committed `fidelity-results/dynamic.json` filename is retained for compatibility; it contains temporal results.

Add a three.js change by appending a pinned commit to `three-variants.json`, adding renderers for it in `scripts/generate-registry.mjs`, and running `node scripts/generate-registry.mjs`.
