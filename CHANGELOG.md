# Changelog

## Native 32 Hz and demand loading · 2026-11-12

Double temporal sampling from 16 to 32 real frames per second, preserving 1× playback and the lighter surface mesh. Load geometry and eight-frame blocks for the visible condition/hemisphere, cache revisited blocks, and prefetch during playback. Add buffering/retry states, checksum verification and stale-response protection. Stable full-story and NFC addresses are unchanged.

## Mobile surface budget restored · 2026-11-12

Restore the previous 8% native display mesh and immutable v2 data asset after slow-loading feedback: about 22,000 triangles per hemisphere, 7.4 MB gzip instead of 21.5 MB. Retain the current contour rendering, pale fills/cortex, synchronized rotation and developer panel. Restore exporter default to `.08`; stable Pages and NFC URLs are unchanged.

## HD contours and developer options · 2026-11-12

Tripled the inflated display mesh; replaced shader contour bands with normal-lifted mesh isolines based on the viewer. Added bounded display smoothing, consistent antialiased line widths, a lighter cortex with retained curvature and pale task-color interiors. Moved view/overlap tweaks into a draggable, hideable developer panel with appearance controls and copied tuned views. Public asset URLs now carry content hashes while card entrances stay fixed.

## Final poster narrative and separate HGA chapters · 2026-11-12

Aligned the public story, authors, methods and references with the final November PPTX. Split activation and contrast into independent interactive chapters, retaining synchronized task rotation within each. Removed prominent data/pilot badges and redundant technical fragments; interpretation details remain expandable. Existing NFC and saved-view links remain compatible. No scientific data or surface changes.

## Mobile readability and lab branding · 2026-11-12

Replaced the placeholder header with original Cogan Lab and Duke Biomedical Engineering logos from the NFC-card project. Enlarged mobile copy, map labels and controls; refined spacing and cards; made secondary map settings collapsible on phones. Trace-axis labels now retain their readable screen size. Font families and fixed public entrances are retained.

## Interactive brain surfaces · 2026-11-12

Increased display mesh density about 6.7×, corrected normal orientation, and softened only the anatomical curvature backdrop. Added synchronized mouse/touch rotation for all three tasks and the contour view, lateral reset, keyboard controls and shareable camera angles. Preserved source selections, HGA curves and field values at common vertices within their quantization precision. Fixed phone/NFC URLs remain unchanged.

## GitHub Pages first publication · 2026-11-12

Added artifact-based deployment, a checksum-pinned HGA Release asset, stable full-story/NFC entrances, public URL copy behavior and publication browser checks. Generated data remain outside source Git. Published fixed full-story and NFC/HGA URLs; verified the live site.

## 0.2.0 · 2026-11-12

Local real HGA pilot from accepted bipolar poster summaries: compact verified exports, both event alignments and hemispheres, signed activation/contrast fields, three-task and contour views, descriptive ROI traces, saved view state and mobile WebGL surfaces. Added independent numerical validation, real browser checks, source audit and standalone packaging. Generated artifacts remain outside Git; no deployment.

## 0.1.0 · 2026-11-11

Independent mobile poster website scaffold with collapsible full story, synthetic HGA explorer, two card entrances and responsive browser validation.
