# Presentation media

Authority: the final `sfn-poster-nov-ver5-affiliations.pptx`, SHA-256 `78825191f0deec54f3df8c45f29a412dd3605a9005091db2b21bd2b3a181e84d`, and original stimulus recordings from the BIDS uniqueness-point dataset. Read-only source discovery and publication of these examples were explicitly requested by the user. No participant speech, neural recordings or new analysis output is included.

| Published asset | Source / transformation |
| --- | --- |
| `media/altitude.wav` | Original mono 44.1 kHz / 16-bit PCM, 39,734 samples, 0.901 s; unchanged bytes |
| `media/aelkahhaazh.wav` | Original mono 44.1 kHz / 16-bit PCM, 48,863 samples, 1.108 s; unchanged bytes |
| `media/poster-decoding.svg` | Exact `ppt/media/image13.svg` referenced by slide 1 Graphic 62; unchanged bytes |
| `media/poster-decoding.webp` | 1800 × 1878 browser rasterization of that SVG, WebP quality .92; 246,284 bytes |

Dataset metadata spells the pseudoword `aelkahhaazh`, phonemes `AE L K AH HH AA ZH`. Altitude is `AE L T AH T UW D`. They share the first two phonemes /æl/, the longest initial-phoneme match among the dataset's 40 pseudowords; none shares the first three. They are illustrative examples, not a claimed experimentally matched pair. The source spelling is retained rather than inventing an orthographic form.

The embedded SVG differs in bytes from the formal figure repository's SVG. The supplied final PPTX is the authority; no substitution was made. Full source paths, source hashes, extracted-part identity, audio properties and all output hashes are in the external `story-media-v8/meta/story-media-provenance.json`.

Preparation (development Playwright required, e.g. the temporary installation used for browser QA):

```bash
NODE_PATH=/path/to/node_modules python3 scripts/prepare_story_media.py \
  --poster /path/to/final-poster.pptx \
  --stimuli /path/to/BIDS/stimuli \
  --properties /path/to/BIDS/code/stim_meta/stim_properties.csv \
  --output /path/to/external/delivery
```

This creates `figs/` and `meta/` first, keeps figure exports in `figs/`, and writes the release archive/provenance in `meta/`. It refuses outputs in the source repository and refuses replacement of an existing archive. The source hashes in the script deliberately require a reviewed source update before another source version is accepted. GitHub Actions does not run this preparation or require Playwright; it only downloads the pinned archive and verifies/extracts its four allowlisted files using the standard library.

Release: `poster-story-media-v1-2026-11-12`, asset `story-media.zip`, SHA-256 `b26d4daa788e0e6e9234f3a609352c2a2879caeca4438e0dd9d98292520d4f9d`.

Build with `scripts/build_public_site.py --bundle <real-data.js> --media <story-media.zip> --output <empty-directory>`. Offline packaging likewise requires `--media <story-media.zip>` in addition to `--output <delivery-root>`.

Audio uses native controls and no preload. The image preview is lazy; its original SVG downloads only on enlargement. Browser tests cover actual playback/durations, single-clip playback, section-close pause, no initial media on the NFC entrance, responsive layout, zoom scroll/focus, no-JS links, offline embedding and all four served media hashes. Browser automation uses Chromium with a software GPU; physical iOS/Android behavior remains for device review.

## Four static Contrast sets and fitted zoom

The next media release, `poster-contrast-panels-v2-2026-11-12`, extends the four original files with sixteen components and `contrast-panels.json`. ZIP SHA-256: `58f1be2efd2d3e1e3af9403a0bb9ad92dcd4c3e06fa534e32dc1923fa42b9a0f`. The original four payloads are byte-identical.

Source: accepted formal `figure-3_hga-contrast_group3.svg`, SHA-256 `8be83781059a53f023915fcba63efe3aeebc1276daad6c9d188c9932b8a681e2`. All eight brain raster hashes match `ppt/media/image10.svg` in the final PPTX exactly. Existing SVG axes 1–4 / 5–8 / 9–12 / 13–16 map respectively to Stimulus W > PW / Offset W > PW / Stimulus PW > W / Offset PW > W. Source n values are 116 / 119 / 145 / 165. Stimulus means the late-stimulus selection window 0.5–0.9 s after onset; Offset is 0–0.5 s after offset, not a constant shift of onset.

`scripts/prepare_contrast_panels.py --figure <formal-svg> --poster <final-pptx> --previous-media <v1-story-media.zip> --output <external-delivery>` checks all source hashes and calls the development Playwright helper to split existing SVG axis groups. Each brain preview is 900 px wide (WebP .94); hemisphere labels move to HTML. Time-course and pie axis groups, including every path, text, SEM fill and shaded window, remain canonical-XML identical. Only outer viewport bounds/white margins change. Original intermediate components, source hashes, crop coordinates, output hashes and the passed preservation checks live in `contrast-panels-v9/{figs,meta}`. No production analysis or figure workspace was edited.

The public manifest holds only filenames, dimensions, event/direction, window, metric and n; source members/coordinates/subject IDs are excluded. Curves retain directional d′ (PW − W or W − PW); the animation remains signed PW − W in HGA z. Pie proportions are selected directional HGA effect contributions: average across selected tasks per contact, sum by merged region, normalize without coverage correction. They are not contact-count proportions. Original grouping/Other, colors and proportions are unchanged.

The static section loads the four selected images only when visible and caches completed sets, with a retry state on failure. Its two selectors are independent of the animated player. No original mean-trace or ROI selector remains in either player. All figure links now use a common viewport-fitted dialog: 100% fits the whole figure, 25–400% zoom, Fit reset, scroll at larger scales, Escape/focus return, and responsive refitting. Native links remain available without JS; offline packaging embeds all images.

## Web typography revision

Release `poster-web-typography-v3-2026-11-12` keeps the same 21-file media contract. ZIP SHA-256: `071b53f59a236331ce5e1da7239c3a5391e790d9d77d33ec999bbed6050c6ec7`. The eight brain previews, audio and original decoding assets remain byte-identical to v2. Source figures/PPTX remain unchanged.

The four Contrast curves and four ROI pies use presentation-specific SVG typography: 12-unit ticks, 13-unit axis titles, 11-unit n, and 12.5-unit ROI/percentage labels in a common 300-unit viewport. At the 350 px chart width on a 390 px phone, these are 14 / 15.2 / 12.8 / 14.6 CSS px. Chart width is capped at 360 px to keep desktop labels at the same scale. Axis labels move closer to the plot, and the two-line Other label is tightened. The original plotted paths, clipping, SEM fills, windows, wedges, colors, label values and font family are verified unchanged; only font size and text coordinates/transforms differ. Brain geometry and labels stay at their existing sizes. Decoding keeps its readable original source and fitted adjustable enlargement.

The preparation script now compares canonical XML while excluding only font size and text position attributes. Public SVG URLs include content hashes so returning phone browsers fetch the revised typography. Demand loading and offline embedding are preserved. External output and validation: `figure-type-v10/{figs,meta}`.
