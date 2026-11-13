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
