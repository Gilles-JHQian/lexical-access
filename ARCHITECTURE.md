# Architecture

Buildless HTML/CSS/JavaScript, served from repository root. No production dependencies, CDN, analytics, data fetch or backend. Relative asset URLs support GitHub Pages project subpaths and opening index.html from disk.

- poster.html owns the public, final-PPTX narrative. scripts/site_template.py inserts activation and contrast controls. index.html remains the original synthetic fixture. Both stories exist before JavaScript runs.
- styles.css owns mobile-first interaction behavior and responsive layouts. Three maps stack vertically below 620px so all tasks remain available without a carousel. Controls have native keyboard behavior; animation starts only after a click.
- mock-data.js exposes LexicalData: kind, version, tasks, regions, timeline, displayThreshold, fields(taskId, absoluteTimeMs, metric), signal(taskId, roi, absoluteTimeMs, metric), provenance.
- app.js owns state, the schematic SVG maps, contour intersections, traces, playback, hash navigation and sharing. Curves rebuild on mode/ROI changes; frame rendering updates maps/cursor at at most 30 fps.
- tests/browser.cjs serves only public files through an ephemeral loopback HTTP server and checks layouts, navigation and interactions. Test artifacts go outside this code repository.

## Signal semantics

Activation is a synthetic positive response above a notional baseline. Contrast is signed Nonword minus Word. Warm=positive, cool=negative. Regional traces use task colors. Synthetic signals use Gaussian time pulses. Schematic fields use elliptical Gaussian contours; the fixed 0.27 display threshold has no statistical meaning. Overlay hatching is the exact SVG-mask intersection of the selected tasks' thresholded ellipses, computed separately for each sign; opposite-sign effects are never labelled shared. It is geometric overlap, not a statistical conjunction or proof of shared coding.

The illustration uses a 600ms stimulus duration solely to translate the same mock frame between onset and offset alignment. Absolute time stays unchanged when changing alignment. No UP anchor, ablation, sample count or measured peak time is introduced. The signed contrast curve can cross zero; baseline is explicit.

## Original synthetic fixture URL contract

- / or /index.html: full-story entry.
- #hga: opens chapter 03 and scrolls straight to the explorer controls and visible simulated-data label; starts paused.
- #hga?metric=contrast&view=contours&scope=active&align=offset&roi=frontal&t=850: complete saved view; t is absolute mock time from onset in milliseconds.
- Other chapter hashes open the relevant details before scrolling. Unknown values fall back to defaults. t is clamped to supported time.
- Copy this view serializes the current state. The two card buttons copy the plain root and #hga. Clipboard failure offers a selectable address dialog. No QR code is generated until a final public domain is selected.

## Real-data boundary

The user authorized the local real-data pilot on 12 November 2026. Publication remains a separate action. Real deliverables contain compact aggregate summaries and template anatomy. Keep compute-heavy preprocessing, significance, smoothing, anatomy registration and model fitting in their owning BIDS/core workspaces. No raw recordings, electrode identifiers, trial arrays, fitted models, production logs or large derivatives in this repository or Avalon cache.

A real adapter must supply units, actual time support, alignment-specific summaries (do not infer offset by shifting a constant duration), hemisphere/view geometry, sign conventions, task coverage, missingness, true statistical masks, overlap definition, reference/baseline, source version and provenance. Do not merely rename synthetic labels: real-data integration also changes maps, units, annotations, overlap interpretation and validation. Keep the synthetic provider for UI tests.

## Preview artifacts

Sibling ../lexical_access_site_preview/figs/ holds screenshots; ../lexical_access_site_preview/meta/ holds QA reports/manifests. No generated result is committed. This new repository needs no worktree while its checkout is clean and exclusive; future parallel worktrees belong to ../lexical_access_site.worktrees/<topic>.


## Real pilot implementation (schema 2)

`index.html`, `mock-data.js` and `app.js` remain the synthetic fixture. `scripts/package_real_preview.py` generates a separate real HTML document using `real-data.js`, `surface-view.js` and `real-app.js`. It validates the bundle hash, composes poster.html with two explorers, and also creates a self-contained HTML file. There is no runtime external request or silent mock fallback.

`export_real_pilot.py` composes existing poster cache summaries through the shared `plotters.surface_field.compute_surface_field` API. Six cells cover activation onset/offset and contrast onset/offset × Nw>W/W>Nw selection. The bundle provides real frame times, fixed selections, counts, units, color/contour scales, compact fields, supports, ROI curves and decimated template geometry. Private source paths and hashes are in a separate audit. No contact identifiers, individual time courses, trial arrays or subject geometry reach the browser.

Both surfaces retain exact white-to-inflated vertex correspondence after display-mesh decimation. Full-resolution scientific fields are sampled at retained vertices, quantized to signed int16, and interpolated by WebGL for display. WebGL uses depth occlusion and smooth curvature/normal shading; Canvas2D is a coarse fallback when WebGL is absent. Mode/hemisphere changes release old contexts. Maps use one selected hemisphere; descriptive curves always pool both hemispheres.

Activation retains the source legacy kernel (7 mm bandwidth, 20 mm reach), ±5.1 scale and ±2.04 contour level. Contrast uses the tissue kernel (7 mm, 15 mm), ±1 scale and ±0.15 level. These are unnormalized weighted surface sums, not ROI means or significance scores. Contrast is always Nonword − Word in ΔHGA z, including the W>Nw selected set. Static poster d′ curves are not relabeled as HGA z. The static poster's envelope closing/island operations are not applied to moving contours.

Shared hatching requires same-sign suprathreshold fields and support for all requested tasks (all three or two active tasks). It is spatial overlap, not an electrode-set intersection or statistical conjunction. Task selections are fixed in the displayed source window; moving fields introduce no new framewise significance test. ROI definitions come from `coarse_roi_mapping_v2.json` and are display groups, not the decoding ROI definition. Empty groups remain missing.

Real onset and offset use separate source arrays. Frame times are native samples every 62.5 ms, with onset −250…1250 ms and offset −250…750 ms. Playback at 1× advances 62.5 ms per 62.5 ms of elapsed time; reduced motion never autoplays. Switching alignment resets to that event's zero. For real saved hashes, `t` is milliseconds relative to the selected event; `direction=nwwd|wdnw` and `hemi=lh|rh` are additional parameters. This intentionally differs from the synthetic fixture's absolute mock-time contract.

Generated pilot artifacts live at `../lexical_access_site_preview/real-hga-v1/{figs,meta}`. The first real bundle was approximately 3.5 MB; the denser surface revision below supersedes it. `tests/validate_real_bundle.py` independently recomputes curves/membership/counts and representative surface values; `tests/poster-browser.cjs` now covers responsive layouts and real interactions. See the pilot guide for source paths and reproducible commands.


## GitHub Pages and fixed NFC entrances

`deployment.json` pins the public base URL and a checksum-verified data Release asset. Generated data stay outside Git. The manual Pages workflow downloads this asset, runs `scripts/build_public_site.py`, and deploys only its allowlisted output. `scripts/site_template.py` is shared with local preview packaging so real-mode HTML does not drift. A public `site-config.js` sets the canonical base for copy buttons; local previews without it keep their existing URL behavior. `/hga/` is a stable, JavaScript-independent redirect to `/#hga`. Keep both entry URLs unchanged across content updates. A public `version.json` exposes only data-version provenance; source audits and local paths stay out of the artifact.


## Surface revision 2: shared interactive camera

The original display mesh retained 1.2% of native faces (~3,200 per hemisphere). Revision 2 retains 8%: LH 10,996 vertices / 21,988 triangles; RH 10,694 / 21,384. Coordinates remain exact native inflated vertices and retain white-surface correspondence. Shared `_get_surface_normals` supplies full-resolution area-weighted normals sampled at those vertices. Positions and normals now use the same right-handed camera transform; this corrects the original superior-axis lighting mismatch. Two neighborhood half-steps antialias only the binary curvature RGB backdrop. Scientific fields, support, contour levels and geometry never enter this color operation. The template remains avg35 inflated.

One yaw/pitch camera belongs to the explorer, shared by all three tasks and the contour view. Pointer capture supports mouse and single-finger drag. Maps use `touch-action: pinch-zoom`; the surrounding page still scrolls. Reset view, double-click, or Home restores the lateral view; focused maps support arrow keys (Shift for larger increments). Time/alignment/metric/hemisphere changes retain the angle. Saved hashes add bounded `yaw` and `pitch` parameters; plain NFC entrances start at the default lateral view.

WebGL receives camera-only uniform updates during rotation, keeps neural buffers until the frame/cell changes, caches geometry across tasks, and caps resolution to the visible canvas and device pixel ratio (at most 2). Canvas2D also rotates, with approximate per-triangle coloring. The new aggregate bundle is 23,537,686 bytes (7,393,036 bytes with gzip), trading initial download size for a less faceted mobile surface. Physical iOS/Android performance remains unmeasured.

The original surface-browser suite (now consolidated in `tests/poster-browser.cjs`) checks pointer/touch/keyboard synchronization, view persistence, native page scrolling, saved angles, reset and Canvas2D fallback. `tests/validate_surface_upgrade.py` compares every old retained vertex across all 36 task/cell/hemisphere combinations, unchanged curves/counts/thresholds/times/selection, and full-resolution normal provenance. Generated data and reports: `../lexical_access_site_preview/surface-v2/{figs,meta}`. The new immutable data Release is `hga-surface-v2-2026-11-12`; canonical URLs and manual-only deployment remain unchanged.


## Mobile readability and original branding

The header uses the same Cogan Lab and Duke Biomedical Engineering original PNGs as the NFC-card workspace. `docs/brand-assets.json` records source URLs, original dimensions and SHA-256 hashes. The PNG bytes are preserved; CSS omits Cogan Lab's transparent outer padding and preserves its visible aspect ratio. Logos stack on phones and sit alongside navigation on desktop. Existing Arial/Georgia font families are retained.

Mobile body copy is 16px; primary controls are 14–16px, selects 16px, and key map labels/notes 12–14px. Relevant touch controls retain at least 44px height. On phones, native `#map-settings` details holds alignment, hemisphere, direction and fixed-selection metadata; its summary displays the current state and starts collapsed. Desktop exposes the same controls. Responsive resizing switches the disclosure default; within a viewport users control it themselves. The main signal, comparison view, camera and playback controls remain visible. Time is shown in the sticky transport, without a duplicate mobile label above the maps.

Real trace axis values are HTML labels next to the plot, sized in CSS pixels instead of distorted by the SVG viewBox. Curves and cursor retain the same coordinate mapping. `PUBLIC_ASSETS` in `scripts/site_template.py` defines the explicit image allowlist shared by Pages and local packaging. Standalone previews embed the PNGs. Pages now has twelve public build files; PNGs are copied as binary and textual assets still pass the private-path scan. There is no new data Release or numerical export in this presentation revision.


## Final poster narrative and independent explorers · 2026-11-12

The public source is now `poster.html`, based on the final November PPTX identified in `docs/POSTER_SOURCE.md`. Six chapters follow question → experiment → activation → contrast → cross-task decoding → discussion. The earlier November 5 three-component story and placeholder figures are retired from the public site. Authors, affiliations, methods and references follow the PPTX. Prominent pilot/real/bipolar badges are removed at the user's request; necessary signal definitions, fixed-selection limitations, denominators and overlap interpretation remain in collapsed notes. The synthetic fixture stays visibly synthetic.

`real-app.js` creates one scoped controller for each `[data-explorer]`. Activation and contrast each own their timeline, alignment, ROI, hemisphere, camera, playback and saved state. All three task maps within one explorer share its camera. Moving between chapters preserves their settings; starting either player pauses the other. Leaving the viewport, hiding the document or collapsing its chapter pauses a player. Offscreen WebGL contexts are released and reconstructed on return; the hero snapshots one frame and releases its context. The existing dense surface renderer and all scientific bundle bytes are unchanged.

The public URL contract is `/` for the full story, `/hga/` and `#hga` for activation, and `#contrast` for contrast. Saved links use the corresponding anchor plus view/align/direction/hemi/scope/roi/t/yaw/pitch. `t` remains relative to the selected event. Old `#hga?metric=contrast` links restore into the contrast chapter; `#components` redirects to that chapter and `#activation` aliases `#hga`. Native disclosure navigation reopens a chapter even when the hash is unchanged. No autoplay.

The consolidated `tests/poster-browser.cjs` replaces the three old singleton-explorer suites. It checks both controllers, native samples, sign preservation, camera synchronization/isolation, mouse/touch/keyboard, framebuffer changes, fallback, responsive layout, static narrative, old/new links, NFC and standalone packaging. `npm test` still tests the untouched mock fixture. Artifacts live in `../lexical_access_site_preview/poster-story-v4/{figs,meta}`.


## HD surface and developer panel · 2026-11-12

Latest data pin: `hga-surface-hd-v3-2026-11-12`. Display decimation retains 24% of native faces: LH 32,984 vertices / 65,964 triangles; RH 32,078 / 64,152. Every previous display vertex is retained exactly. All 36 old task/cell/hemisphere field arrays match at those vertices within combined quantization bounds; all curves/counts/times/selections/scales/kernels are unchanged. Full-resolution shared normals and native white/inflated correspondence remain authoritative. No epochs/statistics/production pipelines are rerun. Bundle size is 70,552,915 bytes, 21,516,290 with gzip; this increases first-load transfer and phone hardware performance has not been measured.

`surface-view.js` now extracts strict supported-triangle isolines using the same edge interpolation and 0.6 mm normal lift as `brain_viewer/viewer_react/src/preview/math.js`. Dedicated screen-width antialiased triangle strips with rounded caps replace derivative-width shader bands. Mesh-edge joining supplies continuous world-space negative dash phase. Default 1 mm display smoothing resamples connected lines at at most 0.4 mm and bounds displacement at resampled vertices; zero gives the exact raw isoline. This is cosmetic line regularization: fields, support, levels, fill boundaries and overlap masks are unchanged. Pale interiors blend task hues at fixed adjustable opacity. Default cortex lightness/curvature are .97/.12 with gentle normal lighting. Backdrop-only curvature antialiasing remains. Canvas2D retains coarse per-face coloring/raw line segments as a fallback; its strokes do not implement the WebGL display smoothing. Offscreen contexts are still released.

One nonmodal floating panel contains the two explorer-specific comparison/overlap groups and shared appearance controls. Main alignment/hemisphere/direction, playback and rotation remain accessible. The panel follows the active chapter and can explicitly select either chapter. Header pointer dragging is bounded to the viewport; its body scrolls. Minimize and Escape leave a launcher, Hide developer tools hides both via `?dev=0`, and `?dev=1` overrides the final build flag. Set `deployment.json` `developer_tools:false` and republish to hide by default. This is presentation configuration, not access control. Appearance is shared across sections; `fill`, `line`, `brain`, `fold`, `smooth`, `overlap` are bounded saved-link parameters. Copy tuned view uses the existing canonical share flow. Runtime asset content-hash queries prevent stale code/data mixtures without changing card URLs.

Validation: numerical source/mesh checks, viewer isoline parity, bounded smoothing, browser developer-panel/HD regression, mock regression, and a contour playback/WebGL-error check. Outputs and limitations are recorded in `../lexical_access_site_preview/hd-contours-v5/{figs,meta}`. See `docs/HD_SURFACES.md`.


## Mobile mesh rollback · 2026-11-12

The user reported slow loading after the HD upgrade. Current publication restores the immutable 8% mesh bundle `hga-surface-v2-2026-11-12`: LH 21,988 / RH 21,384 triangles, 23,537,686 raw bytes / 7,393,036 gzip. This supersedes the HD data pin above and reduces compressed data transfer by about 66%. Export defaults return to `.08`; no export or scientific computation was rerun. The viewer-derived contour renderer, bounded smoothing, pale fills, light cortex, synchronized camera and floating developer panel are unchanged. Existing source validation for the identical v2 bytes remains applicable. Compatibility checks use the current renderer with that restored bundle. Stable root/NFC links, asset hash cache keys and manual-only publishing remain unchanged. Generated artifacts: `../lexical_access_site_preview/mobile-mesh-v6/{figs,meta}`.
