# Architecture

Buildless HTML/CSS/JavaScript, served from repository root. No production dependencies, CDN, analytics, data fetch or backend. Relative asset URLs support GitHub Pages project subpaths and opening index.html from disk.

- index.html owns the entire readable poster story, native details/summary chapters and controls. Narrative exists before JavaScript runs.
- styles.css owns mobile-first interaction behavior and responsive layouts. Three maps stack vertically below 620px so all tasks remain available without a carousel. Controls have native keyboard behavior; animation starts only after a click.
- mock-data.js exposes LexicalData: kind, version, tasks, regions, timeline, displayThreshold, fields(taskId, absoluteTimeMs, metric), signal(taskId, roi, absoluteTimeMs, metric), provenance.
- app.js owns state, the schematic SVG maps, contour intersections, traces, playback, hash navigation and sharing. Curves rebuild on mode/ROI changes; frame rendering updates maps/cursor at at most 30 fps.
- tests/browser.cjs serves only public files through an ephemeral loopback HTTP server and checks layouts, navigation and interactions. Test artifacts go outside this code repository.

## Signal semantics

Activation is a synthetic positive response above a notional baseline. Contrast is signed Nonword minus Word. Warm=positive, cool=negative. Regional traces use task colors. Synthetic signals use Gaussian time pulses. Schematic fields use elliptical Gaussian contours; the fixed 0.27 display threshold has no statistical meaning. Overlay hatching is the exact SVG-mask intersection of the selected tasks' thresholded ellipses, computed separately for each sign; opposite-sign effects are never labelled shared. It is geometric overlap, not a statistical conjunction or proof of shared coding.

The illustration uses a 600ms stimulus duration solely to translate the same mock frame between onset and offset alignment. Absolute time stays unchanged when changing alignment. No UP anchor, ablation, sample count or measured peak time is introduced. The signed contrast curve can cross zero; baseline is explicit.

## URL contract

- / or /index.html: full-story entry.
- #hga: opens chapter 03 and scrolls straight to the explorer controls and visible simulated-data label; starts paused.
- #hga?metric=contrast&view=contours&scope=active&align=offset&roi=frontal&t=850: complete saved view; t is absolute mock time from onset in milliseconds.
- Other chapter hashes open the relevant details before scrolling. Unknown values fall back to defaults. t is clamped to supported time.
- Copy this view serializes the current state. The two card buttons copy the plain root and #hga. Clipboard failure offers a selectable address dialog. No QR code is generated until a final public domain is selected.

## Future real-data boundary

Replace the provider with small, explicitly approved, public aggregate summaries and an approved surface asset. Keep compute-heavy preprocessing, significance, smoothing, anatomy registration and model fitting in their owning BIDS/core workspaces. No raw recordings, electrode identifiers, trial arrays, fitted models, production logs or large derivatives in this repository or Avalon cache.

A real adapter must supply units, actual time support, alignment-specific summaries (do not infer offset by shifting a constant duration), hemisphere/view geometry, sign conventions, task coverage, missingness, true statistical masks, overlap definition, reference/baseline, source version and provenance. Do not merely rename synthetic labels: real-data integration also changes maps, units, annotations, overlap interpretation and validation. Keep the synthetic provider for UI tests.

## Preview artifacts

Sibling ../lexical_access_site_preview/figs/ holds screenshots; ../lexical_access_site_preview/meta/ holds QA reports/manifests. No generated result is committed. This new repository needs no worktree while its checkout is clean and exclusive; future parallel worktrees belong to ../lexical_access_site.worktrees/<topic>.
