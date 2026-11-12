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


## 2026-11-12 · real HGA pilot

User accepted the framework and authorized trying real data. Kept source in the independent site repository, on `feat/real-hga-pilot`; all generated data/anatomy/screenshots/reports live in sibling `lexical_access_site_preview/real-hga-v1/{figs,meta}`. The source/data-processing repository and analysis jobs were left intact. Appended this related scope to JIA-273; the previously observed free issue limit prevents a dedicated issue. JIA-273's completed poster scope/status stays unchanged.

Read the accepted bipolar activation and Group 3 contrast caches. Caught the important source distinction: formal Group 3 curves are d′, while the existing task-average contour cache has actual Word/Nonword HGA means. The exporter uses the latter, verifies Difference_values, and applies formal Group 3 task membership with hemisphere checks. Reused shared surface-field kernels, template geometry/curvature and existing tissue-weight cache; no epochs, production outputs, normalization or statistical recomputation.

The first ROI pass used provisional labels; replaced them with canonical coarse_roi_mapping_v2.json and used a lightweight validated refresh of curves, preserving field bytes. Canvas2D initially produced coarse display facets; added depth-tested WebGL with interpolated curvature/normals/fields. The anatomy is deliberately decimated for mobile delivery. Main task maps, contour hatch semantics, native event times and fixed selection windows are explicit. 1× playback uses elapsed real time. No static-envelope or time-resolved-inference equivalence is claimed.

Validation: all 18 source task/cells and four ROI groups each, source hashes, native time indices, selected membership, LH/RH counts, support/missingness passed independent recomputation. Six representative full-field spot checks passed within half an int16 quantization step. Bundle has no subject/electrode identifiers or per-contact arrays. 36 real browser assertions passed across 320/375/390/430/768/1440px, direct and saved routes, GPU surfaces, playback/collapse, keyboard scrub, alignment reset, direction/hemisphere/ROI/overlap controls, copied state, relative deployment paths and self-contained file opening. Screenshots manually reviewed. CPU submission timing is not a mobile-device performance claim; real Safari/Android hardware remains untested.

Reproduction commands and source details are in REAL_DATA_PILOT.md. Final source/merge hashes and artifact checksums are recorded outside Git in the delivery manifest and Linear. Nothing pushed or published; full-story placeholder decoding figure and poster PDF remain outside this HGA pilot's scope.

Final regression: the 53 synthetic browser assertions also pass. JavaScript/Python syntax, generated static real-data labels and git diff whitespace checks pass. Final real browser run passes all 36 checks after correcting nominal 1× playback to real elapsed time.


## 2026-11-12 · GitHub Pages / NFC publication

User explicitly requested pushing this version to GitHub and obtaining a stable phone/NFC URL. Topic: feat/github-pages-publication, independent site checkout; no pipeline changes. GitHub connector confirms account Gilles-JHQian and no existing website repository. SSH authentication is available. Connector lacks repo-creation, Release upload and Pages configuration; host initially had no gh CLI/login. Installed checksum-verified official gh v2.103.3 in /tmp/lexical-site-gh and initiated browser device login in an isolated temporary config directory. Authentication is the pending user action, not a new publication approval request.

Prepared repository target Gilles-JHQian/lexical-access, canonical root and /hga/ redirect. A separately uploaded Release holds the previously validated 3.5 MB aggregate data; deployment.json pins its hash. Manual GitHub Actions downloads the asset and builds ten allowlisted runtime files. It excludes local audits/paths and keeps generated data out of code Git. Existing synthetic source template remains a development fixture. Shared real HTML packaging and site-config ensure preview/public consistency and canonical copy links. GitHub official custom-workflow documentation was checked for configure-pages v5, upload-pages-artifact v4, deploy-pages v4 and checkout v6.

Publication validation and final deployment state are recorded below when completed; planned URLs must not be described as live before the deployment is verified.

GitHub browser login completed and verified Gilles-JHQian. Created public repository https://github.com/Gilles-JHQian/lexical-access and attached origin via SSH. Initial browser run found the temporary Playwright package missing on this host; reinstalled the pinned test-only package under /tmp. The next run timed out because the test attempted sharing while its chapter was collapsed; corrected the test to open References/sharing through the actual summary control. Public copy now describes the available stable NFC/QR entrances.

Publication build validation passed: 10 allowlisted files, pinned data SHA, no local-storage paths; deliberately corrupt bundle rejected. Thirteen Pages browser checks pass (320/390/430px, real mode, canonical URL, /hga/ redirect, contour/playback, both copied public addresses, data version, no runtime/asset errors). Fixed the final screenshot test to use the actual repeated-navigation button instead of expecting a hashchange from navigating to an already-current hash. Prior scientific and full real-explorer checks remain applicable because neural values and surface calculations did not change.

Published source merge 0304cfb, data Release hga-pilot-2026-11-12, and Pages workflow settings; HTTPS is enforced. Initial manual dispatch returned 404 while the workflow file existed on default master, Actions was enabled, and the workflow registry was empty. Automatic approval rejected adding a persistent push-to-deploy trigger because only this version's publication was authorized. That rejected command did not execute. Preserved workflow_dispatch only, made its empty mapping explicit, and pushed again after master was established as the default branch to refresh registration. No future automatic publication is enabled.

Publication completed: after the second push with manual-only mapping, direct workflow_dispatch succeeded. Run 43248285741 deployed revision 57c916be76e9a10b0c4c8caf0a2189bba8892ed8 with all build/download/checksum/upload/deploy steps successful. Canonical HTTPS URL and /hga/ entrance work. The actual public site passed 13 browser checks; nine served runtime resources (including real-data.js) match the reviewed local artifact byte-for-byte. No automatic push trigger exists. Final documentation-only commits do not require redeployment. Generated screenshots, HTTP/browser checks and publication manifest live in lexical_access_site_preview/pages-v1/{figs,meta}. No pipeline, data selection or numerical output changed in publication.


## 2026-11-12 · denser surface and synchronized rotation

User reported an unnatural-looking surface and requested drag rotation shared across all three tasks. Topic `feat/surface-rotation`, independent site checkout. Diagnosed excessive mesh reduction (98.8%) and inconsistent superior-axis transformation between vertices and normals. Kept the accepted avg35 inflated anatomy and source kernels. New export retains 8% of native faces, exact vertex correspondence and full native normals. Shader isolation screenshots identified the remaining triangular gray patches as the binary curvature texture; two local half-steps smooth only that backdrop. Fields/support/thresholds remain untouched. Native normals now reuse the shared visualization cache helper.

Pointer capture, mouse/touch/keyboard controls, one shared camera, reset, persistent angles across controls, and saved-view yaw/pitch are implemented. Camera updates reuse GPU data. Tests explicitly verify that dragging maps does not scroll, page margins still scroll, and Canvas2D fallback rotates all tasks. Initial screenshot QA raced anchor scrolling and produced a blank image despite passing camera-state checks; fixed it to wait for the explorer to enter the viewport. Fresh screenshots were visually reviewed at phone and desktop sizes. Shader diagnostic variants and intermediate products remain outside Git.

Validation: existing independent real-data checks passed all 18 source task/cells and six full-field spot checks for the denser bundle. Upgrade validation passes all 36 task/cell/hemisphere field comparisons at every original retained vertex (LH 1,651; RH 1,605), within combined quantization bounds. All curves/counts/times/thresholds/selection metadata are identical, native coordinates unchanged, exported normals match full-resolution shared normals. Real-browser regression: 36 checks passed (320–1440px); rotation browser: 22 checks passed including actual Chromium CDP touch events, keyboard, fallback and no asset/runtime errors. JS syntax and diff whitespace pass. Physical phone GPU/Safari performance remains untested; CPU submission timing is not end-to-end FPS.

New bundle: 23,537,686 bytes, gzip 7,393,036; SHA-256 `371d3f980811ddc81d25be7280f299f0703786cf11b219afd018834f0cae7ee8`. Generated export, preview, screenshot and validation outputs are in `../lexical_access_site_preview/surface-v2/{figs,meta}`. Release pin changes to `hga-surface-v2-2026-11-12`, preserving the existing v1 Release and stable root and /hga/ URLs. Publication of this requested website correction uses the existing manual workflow; no automatic deployment trigger is added. Source merge/deployment IDs and live verification are recorded in the delivery manifest and related Linear scope after publication.


## 2026-11-12 · mobile readability / original brand assets

User requested larger phone text, adjusted sizing/spacing, the original Cogan Lab logo downloaded in the NFC-card conversation, an Engineering mark in the header, and visual refinement while retaining the existing fonts. Topic `feat/mobile-brand-polish`, independent site checkout. App thread list/read tools returned empty results; scoped artifact discovery found the card project `01a1cdf6-6283-7f53-b5ce-b477dce810c6/nfc-card-r011-print`. Its source metadata identifies the second mark as Duke Biomedical Engineering. Reused those exact two PNGs with SHA checks; did not message the other task or modify its files. Original source URLs and checksums are in `brand-assets.json`.

Removed the placeholder wordmark; retained original pixels and colors, cropping transparent outer padding through layout only. Header is stacked on phones and horizontal on desktop. Existing Arial/Georgia families retained. Mobile body 16px, primary controls 14–16px, selects 16px, map labels/notes 12–14px and touch controls at least 44px. Native map-settings disclosure keeps secondary controls available without pushing the enlarged brain maps offscreen. Summary shows current hemisphere/alignment/direction. Moved real curve-axis labels out of the shrinking SVG coordinate system into screen-sized HTML labels. Adjusted spacing, panel borders, hero wrapping and ROI controls.

The first enlarged-control preview buried the maps under settings; corrected with the disclosure and removed the duplicate upper mobile timestamp. Visually reviewed story, activation, contrast and desktop states after refinement. Shared image allowlist packages both PNGs into public and local previews, including base64 embedding in standalone HTML. Generated artifacts are in sibling `lexical_access_site_preview/mobile-brand-v3/{figs,meta}`. The existing `hga-surface-v2-2026-11-12` data Release/hash is reused unchanged; no scientific pipeline work or new numerical computation.

Validation: 36 real-browser checks pass across 320–1440px, with independent-file opening; 22 surface interaction checks pass, including actual Chromium CDP touch, synchronization and fallback. Enhanced Pages checks pass 27 assertions for original logo loading, collapsed/expanded settings, readable type, minimum touch heights, stable entrances, layout and asset/runtime errors. Mock regression passes 53 checks. Build allowlist expands from ten to twelve files for the two PNGs. Scientific verification is retained from the unchanged checksum-pinned data asset. Physical iOS/Android behavior remains unmeasured. Final deployment identifiers and live HTTP/browser verification are recorded in the delivery manifest and related JIA-273 scope.
