Anti-aliasing and temporal fidelity for three.js against a 4 × 4 supersampled reference over animated sequences. See the **Temporal fidelity** page for sequence metrics and per-frame charts, and [the repository](https://github.com/bhouston/three-aa-fidelity) for the method.

The viewer has three independently optional sections: **Static fidelity** compares individual still captures, **Temporal fidelity** compares deterministic frame sequences, and **Performance** measures rendering throughput. This suite measures temporal quality. Static fidelity and performance tests are optional and are not included in this dataset. Still-camera cases remain temporal tests because the geometry and temporal history can change over time. Existing sequence captures and scores remain available without recapturing.

Each scene compares the methods and fixes relevant to its content. The AA challenge and thin-line scenes compare the AA methods; the morph field isolates motion-vector changes; GTAO and SSGI scenes compare their relevant effect fixes, with DenoiseNode only on the GTAO room. Empty combinations in the old fidelity grid were unselected tests, rather than failed captures. The temporal section distinguishes these from selected combinations that have no results yet.

## Validation of three.js changes

Measured at 640 × 360 over 90 measured frames on a GTX 1050 using WebGPU:

- **Morph target motion vectors (#41)** are the largest fix: +6.4 dB PSNR and +10 dB temporal PSNR on morph-heavy content, because morphed meshes otherwise get wrong motion vectors.
- **Catmull-Rom TRAA history** improves every anti-aliasing scene by about +1 dB and makes it sharper (sharpness 0.46 → 0.60). Bilinear history re-blurs the image every frame.
- **Velocity history per render pass (#40)** recovers 1.4 dB when a second velocity pass renders the scene in the same frame.
- **Bounded GTAO/SSGI jitter (#43)** removes the GTAO brightness bias (the fixed build matches the reference's mean exactly). It gains +1.8 dB PSNR at the cost of 1 dB of temporal stability.
- **Animated IGN** for the GTAO/SSGI ray step jitter on top of #43 makes no measurable difference here. A synthetic study suggested it would, but the real effects are dominated by other error.
- **#35, #37, #38 and #39** are correctness fixes with negligible effect on these metrics. Their frames change, but the error does not.
- **SSGI is inconclusive**: every real-time configuration is darker than the higher-quality SSGI reference, and the fixes darken it further. Judging SSGI needs a path-traced reference, as in [three-fidelity](https://github.com/bhouston/three-fidelity).
- **TAAU at 50% input** cannot resolve detail finer than its input (the 2-pixel checkers), which its low sharpness (about 0.168 on the pan case) reflects.
- **All fixes combined** improve TRAA pan from 24.40 to 26.03 dB sequence PSNR and 30.89 to 32.11 dB temporal PSNR; the morph field improves from 19.22 to 26.56 dB and 23.98 to 34.47 dB respectively. GTAO improves from 39.30 to 42.73 dB sequence PSNR, while temporal PSNR falls from 50.18 to 49.27 dB.

