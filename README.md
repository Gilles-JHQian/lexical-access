# Lexical access · interactive poster companion

Standalone Avalon website draft for GitHub Pages. Open `index.html` directly or run `npm run serve` and browse `http://127.0.0.1:4173` on the same machine. There is no build step and no production dependency.

- Full story: `/`
- Poster-session entrance: `/#hga`
- Saved illustration: `/#hga?metric=contrast&view=contours&scope=active&align=offset&roi=frontal&t=850`

The English narrative follows the 5 November 2026 poster draft. Every map and curve in the interactive explorer is synthetic; the brain is an authored schematic. No actual neural data or subject identifiers are included. The actual decoding figure, author details and final poster PDF are reserved for a later pass.

Read [the Chinese outline](docs/OUTLINE.zh-CN.md), [architecture and data boundary](ARCHITECTURE.md), [development record](docs/DEVELOPMENT.md) and [GitHub Pages handoff](docs/GITHUB_PAGES.md).

## Validation

Install development-only Playwright with `npm install`, then `npx playwright install chromium` and `npm test`. By default, screenshots and JSON reports go into `../lexical_access_site_preview/{figs,meta}`. Set `SITE_QA_OUTPUT` to change that destination. The test starts an ephemeral loopback server and stops it afterward. Never commit generated previews or scientific results.

## Workspace and Git

This repository is `/hpc/home/jq81/cogan_lab/jq81/avalon/lexical_access_site`, a sibling of the analysis workspace. Integration branch is `master`; task branch is `feat/mobile-poster-framework`. No remote is configured and nothing is published. Deploy only after a GitHub repository and public data/content are approved for this purpose.
