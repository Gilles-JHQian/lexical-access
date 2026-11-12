# Development record

User-facing date: 2026-11-11, America/New_York.

## Authorized scope

Independent Avalon project-introduction website draft; GitHub Pages compatible; mobile-first; collapsible full poster narrative; direct HGA entrance; synthetic activation/contrast animation; compare three tasks and overlaid contours. No actual data or deployment requested in this draft phase.

Read source workspace AGENTS.md and CLAUDE.md, Sites design/local-preview instructions, Cogan Lab public site, JIA-273 and its Notion poster draft. Latest narrative uses onset/offset, three univariate components and within-ROI 1D cross-task decoding. No new research claims, sample counts, UP anchors or ablations.

## Isolation

Created /hpc/home/jq81/cogan_lab/jq81/avalon/lexical_access_site as a new sibling Git repository. Initial master commit 350681c; implementation topic feat/mobile-poster-framework. No analysis repository, original poster, Notion source, raw data or running analysis job edited. Generated QA products go into a separate sibling preview folder with figs/meta.

## Tracking and environment limitations

Searched Linear for poster/website/网页 issues. Dedicated issue creation failed: workspace free issue limit exceeded. Added a related-work note to completed JIA-273 without changing its original scope/status. This file records the standalone website work.

Default shell sandbox failed before execution: bwrap temporary-directory Permission denied. Authorized escalated commands allowed reads and the explicitly requested new sibling workspace. Initial broad source-file scan was slow; switched to scoped directories and the current Linear/Notion narrative. Chromium installed via task-local Playwright in /tmp/lexical-site-browser; browser binary cache is in the user's Playwright cache. No browser/data package is in the website repository.

## Design decisions

Buildless HTML/CSS/classic JavaScript allows direct file opening and GitHub Pages without a build pipeline. Narrative is static HTML, accessible without JavaScript. Native details/summary with real chapter URLs; pause-on-collapse/background/offscreen; explicit playback only, including reduced-motion users. Preserved three task colors and used gray schematic anatomy. Browser font sizes are independent of printed poster typography.

The full-story and HGA-entry links share one document. A precise saved-view hash also captures controls/time. Synthetic signed fields produce real geometric contour intersections, independently for positive and negative effects. They do not stand in for a significance mask.

Validation and final commit details will be appended after browser QA.


## Validation completed

- `node --check app.js`; `node --check mock-data.js`; `git diff --check`: passed.
- `NODE_PATH=/tmp/lexical-site-browser/node_modules node tests/browser.cjs`: 53 browser assertions passed. Viewports 320, 375, 390, 430, 768 and 1440px; no horizontal overflow with chapters expanded. Checked fresh/direct and repeated navigation, playback/pause/reset/scrub/keyboard, onset/offset translation, signed legend, ROI state, contour mask scopes, saved-view parameters, clipboard fallback, both card URLs, invalid URL handling, no-JS narrative and no runtime/asset errors or external runtime requests.
- Visually reviewed mobile story, mobile three-task/contour and desktop story/explorer screenshots. Refined direct HGA navigation to land at the maps/controls with a visible mock label and full-story link, keeping all three mobile maps visible at 390×844. Moved the onset zero tick out of crowded narrow layouts.
- Test-debugging failures were test assumptions: serialized parameter ordering was compared as a raw URL string (fixed to compare parsed keys); navigation check ignored the intentional 90px desktop scroll padding and reused an identical hash after resizing (fixed with a fresh navigation and the expected padding). Historical failure report retained outside Git; final report records pass.
- `npm install --package-lock-only --ignore-scripts`: lockfile created; zero reported vulnerabilities. Production page remains dependency-free.
- Chromium viewport emulation only; physical iOS Safari/Android browsers and public GitHub Pages deployment are not verified. No real-data validation is claimed.

## Outputs

Source: independent repository root and docs/OUTLINE.zh-CN.md. Generated screenshots and browser report: sibling lexical_access_site_preview/{figs,meta}. A standalone downloadable interactive HTML preview is in lexical_access_site_preview/meta/interactive-preview.html; it is generated from the checked source and not committed.

No persistent server or analysis job is created by browser QA; its loopback server closes after the run. No remote or push. Implementation and QA/docs are committed separately on the feature branch, then merged into master with --no-ff; the merge hash is recorded in Linear and the preview manifest to avoid a self-referential committed log.
