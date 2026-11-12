# Lexical access · interactive poster companion

Standalone Avalon website for GitHub Pages. The current **real HGA pilot** is generated at:

`/hpc/home/jq81/cogan_lab/jq81/avalon/lexical_access_site_preview/real-hga-v1/meta/interactive-preview-real.html`

Open that self-contained file in a browser. The equivalent static site is in `real-hga-v1/meta/site/`. Its full-story entry is `/`; the poster-session entry is `/#hga`. A precise saved view also captures hemisphere, contrast selection, alignment and event-relative time. Public website target: `https://gilles-jhqian.github.io/lexical-access/`; NFC explorer entrance: `https://gilles-jhqian.github.io/lexical-access/hga/`. Deployment uses the manual Pages workflow; see the Pages handoff.

This pilot uses existing bipolar HGA activation and signed Nonword − Word HGA-z summaries. It includes three-task maps, dynamic contour overlays, onset/offset alignment, both lateral hemispheres and descriptive ROI curves. The English narrative follows the 5 November poster draft. Decoding figures, author details and the final poster PDF remain reserved.

The repository contains presentation code and export/validation scripts. Its root `index.html` deliberately remains the original **synthetic** development fixture, available with `npm run serve`. Real data and anatomy are generated outside Git. See [real-pilot scope and reproduction](docs/REAL_DATA_PILOT.md), [Chinese outline](docs/OUTLINE.zh-CN.md), [architecture](ARCHITECTURE.md), [development record](docs/DEVELOPMENT.md) and [Pages handoff](docs/GITHUB_PAGES.md).

## Validation

Install development-only Playwright with `npm install`, then `npx playwright install chromium`. `npm test` checks the synthetic fixture; `npm run test:real` checks the generated real site; `npm run test:pages` verifies the public build and stable NFC links. The latter defaults to `../lexical_access_site_preview/real-hga-v1`; set `SITE_REAL_OUTPUT` for another delivery folder. Both run ephemeral loopback servers and write artifacts outside this repository. Numerical validation uses the existing scientific Python environment; commands are in the pilot guide.

## Workspace and Git

Source: `/hpc/home/jq81/cogan_lab/jq81/avalon/lexical_access_site`, separate from the analysis workspace. Integration branch: `master`; real-pilot topic: `feat/real-hga-pilot`. Reusable scientific kernels remain in the owning visualization workspace. No raw recordings, per-contact browser arrays, subject identifiers or generated neural results are committed.
