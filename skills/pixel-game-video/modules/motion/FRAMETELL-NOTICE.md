# Frametell non-3D motion port

`pulse-spec.js` and `pulse.js` adapt camera easing, pulse presets, deterministic shake and the page
fade/translation/blur transition from **Frametell**, Copyright © 2026 Sitor AI.

- Upstream: https://github.com/sitor-ai/frametell
- Inspected revision: `6145f7e3482628543bd6f2d68fe3b618d366213a`
- Source: `packages/engine/runtime/core.js` (easing and camera presets),
  `packages/engine/runtime/engine.js` (camera evaluation and page compositing).
- License: **AGPL-3.0-only**, full text in [licenses/AGPL-3.0.txt](licenses/AGPL-3.0.txt).
- Local modifications, 2026-11-06: normalized scene coordinates; frame-based
  events and windows; optional source-frame bounds; independent additive shake;
  Canvas transforms and layer groups; independent transition clips in the existing
  workbench; parameter validation and source/export dependency tracking.

This is adapted upstream code, not a claim of independent authorship. Keep this
notice and the full license with source and standalone exports. The adapted
module is provided under AGPL-3.0-only without warranty; redistribution or network
use of a combined application must be handled under the applicable license terms.
No repository-wide relicensing of unrelated existing files is asserted here.

The port excludes 3D, the Frametell application, its drawing primitives, media
ingestion, TTS and model orchestration. Drawing and narration still belong to the
existing modules. The motion scope is the five non-3D camera presets, camera
keyframes/easing, grouped 2D transforms and the default page transition.
