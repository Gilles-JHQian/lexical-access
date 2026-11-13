# Architecture

Buildless HTML/CSS/JavaScript, served from repository root. No production dependencies, CDN, analytics or backend. The real explorer fetches same-origin aggregate blocks as needed. Relative asset URLs support GitHub Pages project subpaths and opening index.html from disk.

- poster.html owns the public, final-PPTX narrative. scripts/site_template.py inserts activation and contrast controls. index.html remains the original synthetic fixture. Both stories exist before JavaScript runs.
- styles.css owns mobile-first interaction behavior and responsive layouts. The public explorers keep three task maps in one horizontal row at all viewport widths; the original synthetic fixture retains its stacked phone layout. Controls have native keyboard behavior; animation starts only after a click.
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


## Native 32 Hz and demand loading · 2026-11-12

Current release `hga-native-32hz-v4-2026-11-12` retains the exact 8% geometry. Accepted source caches are 128 Hz; export now keeps every fourth native sample instead of every eighth. Intervals are 31.25 ms, with 49 onset frames and 33 offset frames. Old times/ROI curves match exactly, and old surface values match within the combined int16 quantization bounds. No temporal interpolation, playback speedup, selection changes or new statistics. Playback derives the interval from actual cell times and stays at 1× by default; hardware can drop frames when rendering exceeds the frame budget.

The immutable schema-2 `real-data.js` Release asset is only a build input and offline-preview payload. `scripts/stream_assets.py` losslessly repacks it into a roughly 51 KB schema-3 manifest, two geometry assets, support/scale assets by cell/hemisphere, and eight-frame time blocks holding all three tasks. Each compressed binary asset has a padded JSON descriptor followed by aligned typed-array bytes, gzip compression, a content-hash filename, compressed SHA-256 and decoded-length check. Public output contains 99 allowlisted files; generated arrays never enter Git.

`data-loader.js` fetches only the visible view’s geometry/support/time block, deduplicates in-flight resources, verifies bytes before decoding with native DecompressionStream, caches geometry/support and up to 12 decoded time windows, and prefetches at most two forward blocks during playback. A paused view does not fetch its entire timeline. Current Chrome/Firefox/Safari with DecompressionStream and secure-context Web Crypto are required for the online compressed view; offline standalone previews retain the embedded adapter. File opening is supported by the standalone artifact, not the HTTP streaming build.

`real-app.js` gates rendering on verified data availability, ignores stale seek/view completions, pauses on failures and exposes Retry. Buffering holds the timeline at the last rendered frame, then resumes without skipping buffered time. Offscreen/collapsed explorers pause and release their GPU contexts. The hero requests one block only when visible; direct HGA/contrast entrances do not fetch an offscreen hero’s activation data. Typed arrays feed the existing renderer without changing contour semantics. Manifest/runtime hashes and block filenames prevent cached-version mixtures; manual Pages workflow and root/NFC entrances remain fixed.

Validation covers all 86 chunk payloads, all 36 task/cell/hemisphere old/new field comparisons, independently recomputed sources, contour parity, asynchronous browser interactions and network boundaries. External artifact root: `../lexical_access_site_preview/lazy-hga-v7/{figs,meta}`. First paused HGA view requests three assets totaling 727,839 bytes, plus the small manifest/UI assets. The full set is 12,305,674 compressed bytes, but is never requested at startup.


## Story media and revised narrative · 2026-11-12

`poster.html` follows the user’s six-section outline. Native audio controls with `preload="none"` play two original stimulus WAVs; JS prevents overlapping examples and pauses them when the section closes or the document is hidden. No participant recordings are included. The task schematic is responsive HTML/CSS, not a generated scientific result. Public copy/share UI is removed; the developer tuned-view command and legacy hash restoration remain.

The exact final-PPTX decoding SVG is the enlargement source. Its WebP raster preview is 246,284 bytes, rendered directly from that SVG at 1800 × 1878; no data, paths or labels are redrawn. Native lazy loading avoids decoding downloads while the chapter is closed. The modal assigns its SVG `src` only on opening, supports scroll/pinch zoom, Escape, focus return and a no-JS full-size link. Audio also works without JS. All media are embedded in the offline standalone preview.

`scripts/prepare_story_media.py` reads only the two requested stimulus WAVs, their metadata and the final PPTX. It checks source hashes, extracts Graphic 62’s SVG, calls the development-only Playwright raster helper, writes figures and provenance to the external delivery tree, and packages four files into `story-media.zip`. No new analysis is run. `scripts/story_media.py` verifies the archive hash and exact filename allowlist before copying individual byte payloads; no archive path extraction. Pages uses the separately pinned media release plus the unchanged HGA release. Public output is now 103 files. Native frame timing, 86 HGA blocks, manifest, data loader and surface renderer remain byte-identical to the preceding release.


## Separate static Contrast and fitted figures · 2026-11-12

Both dynamic players now end at their transport/method notes; their descriptive ROI mean plots and ROI selectors are removed. Legacy saved `roi` values remain accepted/serialized for URL compatibility but no longer control a visible plot. HGA bundle, manifest, 86 chunks, data loader and surface renderer are unchanged.

`scripts/contrast_panels.py` composes an independent static section from the reviewed path-free media manifest. Two native selectors choose Stimulus/Offset and PW > W/W > PW. Each of four panels contains LH/RH brain previews, the original directional d′/SEM time-course axis and original effect-contribution pie axis. The original effect weighting is not replaced by counts. Both hemispheres share a row; charts stack on phones. An IntersectionObserver requests only the visited set's four images, cached sets are reused, and failures expose Retry. Static changes never modify the dynamic controller's event, effect, time or camera.

The separately pinned media archive now contains 21 files; source split/validation helpers are development-only, and the standard-library build emits 120 allowlisted files. Private source manifests/identifiers remain outside public output. The new shared figure dialog defaults to full-image fit in both dimensions, exposes 25–400% relative-to-fit zoom and Fit reset, and adapts to viewport changes. It loads original figures only when opened, retains native no-JS links and supports offline embedded assets.


## Contrast temporal comparisons · 2026-11-12

The schema-2 build input now has eight optional Contrast cells ending in `-smooth` or `-cluster`; original cells and geometry are unchanged. The generic schema-3 chunk writer/loader requires no changes. New cells carry `processing` / `processingLabel`; Gaussian settings or `inferenceWindow` / aggregate `activeCounts` describe the transformation. They omit unused ROI traces. Public output is 232 files with 198 data resources; original resources and all media are unchanged.

The scoped Contrast controller selects the appropriate cell with `processing=original|smooth|cluster`. The option lives in its developer group, pauses playback, retains time/camera and is included in saved URLs. Request identity includes processing so late responses cannot repaint a different comparison. Activation ignores this parameter. A small caption identifies transformed views and untested SDR1 time. Spatial line smoothing remains an independent appearance setting. Scientific provenance, window semantics and validation are in CONTRAST_TEMPORAL.md.


## Visible choice buttons · 2026-11-12

All finite choices on the public poster now use named fieldsets with native buttons and exactly one `aria-pressed=true` option. `scripts/choice_controls.py` shares template markup between dynamic and static controls; the controller synchronizes selected state after clicks and saved-link restoration. Enter/Space activate the focused button. Repeated activation of the selected option is a no-op, preserving time and avoiding unnecessary requests. Developer target/overlap use the same button contract; ranges retain their native input behavior.

On phones, alignment/effect options stay side by side within their existing settings disclosure; static Alignment and Effect groups stack. Playback speed has a separate row, preserving slider width. Every choice has at least a 44px target. The developer launcher/panel sit above the taller transport. The main title retains its blue serif phrase, now upright and without a terminal period. Synthetic-fixture controls are unchanged. Data/media pins, renderers, loading code, scientific values and public/NFC URLs are unchanged.


## Native 64 Hz and quarter-speed default · 2026-11-12

Playback speed is again a labelled native select, with 0.25× selected by default and 0.5× / 1× alternatives; 2× is removed. Other finite choices remain visible buttons. The mobile speed row preserves slider width. Each explorer owns its speed, and changing speed resets its timing accumulator without moving the frame or camera; hash restoration uses the new quarter-speed default.

The aggregate exporter now keeps every second accepted 128 Hz source sample: 15.625 ms intervals, 97 onset samples (−250…1250 ms) and 65 offset samples (−250…750 ms). All fourteen activation/Contrast cells, including Gaussian smoothing and formal SDR1 masking, use these native frames. The 8% mesh and scientific kernels, pools, thresholds, smoothing, mask windows and time extents are unchanged. At 0.25× the nominal display cadence is 16 distinct frames per wall-clock second; 64 Hz describes the source time axis, not a guaranteed phone refresh rate. Rendering remains gated by requestAnimationFrame and data availability.

Demand loading keeps eight frames per block, two forward blocks during playback, the existing integrity/retry logic and bounded decoded-window cache. The denser full aggregate remains a separate Release build input, never an eager browser download. Prior 32 Hz frames are retained within quantization precision; independently checked inserted frames use accepted source samples, not interpolated frames. Static media and root/NFC URLs are unchanged. Evidence: sibling playback-64hz-v13/{figs,meta}, with the six-cell source export in playback-64hz-base-v13/{figs,meta}.

## Half-speed and Gaussian defaults · 2026-11-13

Both explorers initialize and restore at 0.5×. Contrast has its own initial processing state, Smoothed (Gaussian σ 50 ms); Activation stays Original. Explicit processing parameters continue to override the Contrast default. The template selection and runtime defaults agree. Existing 64 Hz aggregate resources, rendering, demand loading and release pins are unchanged.

## Horizontal tasks and expanded map settings · 2026-11-13

The public task view uses three equal columns at phone and desktop widths, with captions above aspect-preserving canvases. The template’s open map-settings disclosure is no longer overridden on mobile or resize. Its summary stays accessible at all widths so manual collapse/reopen works across breakpoints. Alignment, direction and hemisphere buttons are compact 36 px controls by user request; playback controls retain their existing touch dimensions. Styles are scoped to the public poster; scientific rendering and the synthetic fixture remain unchanged.

The developer launcher rests near the viewport bottom and moves above an overlapping playback transport as the page scrolls or disclosures resize. The floating panel remains draggable. This prevents the shorter task layout from placing the launcher over the speed dropdown.
