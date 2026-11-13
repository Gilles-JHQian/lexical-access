# GitHub Pages publication and NFC

Publication of the current real HGA pilot was explicitly requested on 12 November 2026. Published repository: `Gilles-JHQian/lexical-access`. Deployment and live mobile-viewport/HTTP checks passed on 12 November 2026. The canonical addresses below are live.

- Full story: https://gilles-jhqian.github.io/lexical-access/
- Poster-session/NFC entrance: https://gilles-jhqian.github.io/lexical-access/hga/
- Activation: https://gilles-jhqian.github.io/lexical-access/#hga
- Contrast: https://gilles-jhqian.github.io/lexical-access/#contrast

Keep the repository name and these entrances stable across releases. Updating content at the same URL does not require rewriting NFC tags. Write the HTTPS URL as the tag's web-address record; the `/hga/` entrance redirects to the explorer in the same document. Current-view links can still include selected controls and time, but general NFC cards should use the stable entrances above.

## Publication contract

Source code is pushed to the independent website repository. Generated `real-data.js` is uploaded as the GitHub Release asset named in `deployment.json`, with a pinned SHA-256. It is never committed to source Git. The separately pinned `story-media.zip` release adds the two requested stimulus WAVs, a decoding preview/original SVG, and the four poster Contrast component sets with their small presentation manifest. Source audits with local paths, other figure caches and screenshots are not included in the published site.

`.github/workflows/pages.yml` uses a manual `workflow_dispatch` to download the immutable data and media releases, verify the checksum and real-data schema, build an allowlisted static site, upload a Pages artifact and deploy it. The user-requested publication runs this workflow once; later code pushes alone do not publish. Enable Pages with `build_type=workflow` (Settings → Pages → Source → GitHub Actions).

The build uses only Python's standard library. No pipeline, subject data, scientific environment or access to source recordings are needed on GitHub Actions. It emits 120 allowlisted files (86 compressed data blocks, 13 runtime/metadata files including both original brand PNGs, and 21 presentation media/manifest files), including `/hga/index.html` and a small `version.json`, and rejects local storage paths. All ordinary assets remain relative for project subpaths. The root source `index.html` is a synthetic development fixture; only the generated Pages artifact is the real public website.

## Local build and validation

```bash
python3 scripts/build_public_site.py --bundle /path/to/reviewed/real-data.js --media /path/to/reviewed/story-media.zip --output /path/to/empty/site
```

The data and media bundles must match `deployment.json`. To run public-build browser checks, set `SITE_POSTER_ROOT` to that result (default `<output>/meta/public-site`), then run `SITE_POSTER_OUTPUT=<output> npm run test:pages`. To inspect the deployed site use `SITE_POSTER_URL=https://gilles-jhqian.github.io/lexical-access/` as well. Screenshots/reports use sibling `figs`/`meta` directories outside Git.

Full source numerical validation is retained from the real pilot. Publication checks focus on correct artifact contents, stable entrance URLs, real-mode loading, NFC redirects, mobile layout and public resource availability. Physical iOS/Android behavior is for the user's phone check.

## Release sequence

1. Create the public website repository under the verified GitHub account; push validated `master` via SSH.
2. Create the data release in `deployment.json` and upload the accepted `real-data.js` attachment. Also create the media release and upload the accepted `story-media.zip`. Do not replace either with different bytes under the same tag; a new bundle requires a new release and checksum.
3. Enable GitHub Pages with workflow publishing; run `Publish real HGA pilot` from `master`.
4. Wait for a successful run, confirm the actual Pages URL, and run public browser/HTTP checks before giving the user NFC-ready links.

The public narrative follows the final November PPTX, with authors and references included and placeholder figures removed. Activation and contrast are independent chapters. Old `#hga?metric=contrast` links remain compatible. Contours remain dynamic display-level sets, not new time-resolved significance tests.

## Verified first publication

Workflow run: https://github.com/Gilles-JHQian/lexical-access/actions/runs/43248285741 (success). Deployed commit: `57c916be76e9a10b0c4c8caf0a2189bba8892ed8`. Data release: https://github.com/Gilles-JHQian/lexical-access/releases/tag/hga-pilot-2026-11-12. HTTPS is enforced. Thirteen browser checks passed against the actual public site, and all nine public runtime resources matched the reviewed local artifact byte-for-byte. `.nojekyll` is a build marker, excluded from the public HTTP byte comparison. Validation records and screenshots are outside Git in `../lexical_access_site_preview/pages-v1/{figs,meta}`.

Manual publication remains the only trigger. Future pushes do not automatically replace the live website; run the workflow only when that update is authorized.


Current streaming revision: data tag `hga-native-32hz-v4-2026-11-12`, 120-file public artifact with 32 Hz native frames and the separate story-media release. The Release asset remains the full aggregate build input; Pages serves only the small manifest and demand-loaded binary blocks. `developer_tools` in `deployment.json` controls the temporary floating launcher; set false for final presentation and republish. `?dev=1` can explicitly reopen it. Runtime script/CSS/data URLs use content-hash queries while root/NFC entrances remain unchanged. See HD_SURFACES.md for appearance controls, field preservation and first-load size.

`npm run test:loading` verifies demand boundaries, sub-1 MB initial map payload, cache reuse, stale seeks, retry, corruption rejection and buffering/1× playback. Set SITE_POSTER_ROOT and SITE_POSTER_OUTPUT as for the poster suite. `npm run test:story` verifies audio playback, deferred media downloads, original media hashes and figure enlargement. Offline standalone previews intentionally embed every array and all presentation media; use the deployed URL for mobile loading checks.

Current media release: `poster-contrast-panels-v2-2026-11-12`. It extends the existing media bundle with sixteen responsive figure components and a path-free layout manifest. `npm run test:static` verifies static result selection, original component hashes, lazy loading/retry, mobile stacking and zoom controls. The HGA build input and all 86 blocks remain unchanged.
