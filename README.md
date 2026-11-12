# Lexical access · interactive poster companion

Mobile poster companion, published at [full story](https://gilles-jhqian.github.io/lexical-access/) · [activation / NFC](https://gilles-jhqian.github.io/lexical-access/hga/) · [contrast](https://gilles-jhqian.github.io/lexical-access/#contrast). The root and NFC addresses stay stable. Publication uses the existing manual Pages workflow.

The public narrative in `poster.html` follows the final November PPTX: question → experiment → HGA activation → HGA contrast → cross-task decoding → discussion. Activation and contrast have separate interactive chapters and saved state. Each supports three task maps with synchronized rotation, contour overlays, onset/offset alignment, hemispheres and descriptive ROI curves. Method/interpretation notes are expandable. See [source authority](docs/POSTER_SOURCE.md).

This standalone Avalon repository owns presentation code. Root `index.html`, `app.js` and `mock-data.js` remain the original synthetic development fixture (`npm run serve`). Generated real data, browser previews and reports are outside Git in sibling `lexical_access_site_preview/lazy-hga-v7/{figs,meta}`. Open `meta/interactive-preview-real.html` for the standalone preview, or serve `meta/final-site/` for the Pages artifact. Playback uses 32 real time samples per second at 1×. The public page loads only the selected hemisphere/condition/time block and prefetches during playback. The aggregate build input is a checksum-pinned GitHub Release; there are no raw recordings, subject identifiers or individual-electrode browser arrays.

The floating **Developer options** panel owns comparison mode, overlap, contour fill/width/smoothing and cortex lightness. It can be dragged, minimized, and hidden. `?dev=1` reopens it; set `developer_tools` to `false` in `deployment.json` for the final public presentation. Copy tuned view preserves appearance settings. See [Surfaces and developer tools](docs/HD_SURFACES.md).

## Validation

Install development-only Playwright with `npm install`, then `npx playwright install chromium`. `npm test` checks the synthetic fixture. `npm run test:poster` (also `test:real`, `test:pages`, `test:surface`) checks the public two-explorer experience. Set `SITE_POSTER_OUTPUT` to a delivery folder, `SITE_POSTER_ROOT` to a build directory, or `SITE_POSTER_URL` to an existing deployment. `npm run test:contours` verifies exact isoline extraction against the viewer and the display smoothing bound. Tests use ephemeral servers and save screenshots/reports outside Git. See [architecture](ARCHITECTURE.md), [development record](docs/DEVELOPMENT.md), [Pages build](docs/GITHUB_PAGES.md), [scientific export](docs/REAL_DATA_PILOT.md) and [Chinese outline](docs/OUTLINE.zh-CN.md).

## Workspace

Source: `/hpc/group/coganlab/jq81/avalon/lexical_access_site`, separate from the analysis pipeline. Integration branch: `master`. Generated summaries are delivery artifacts; reusable scientific kernels and bulk production outputs stay in their owning workspaces.
