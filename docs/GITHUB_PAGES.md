# GitHub Pages publication and NFC

Publication of the current real HGA pilot was explicitly requested on 12 November 2026. Published repository: `Gilles-JHQian/lexical-access`. Deployment and live mobile-viewport/HTTP checks passed on 12 November 2026. The canonical addresses below are live.

- Full story: https://gilles-jhqian.github.io/lexical-access/
- Poster-session/NFC entrance: https://gilles-jhqian.github.io/lexical-access/hga/
- Compatible direct section link: https://gilles-jhqian.github.io/lexical-access/#hga

Keep the repository name and these entrances stable across releases. Updating content at the same URL does not require rewriting NFC tags. Write the HTTPS URL as the tag's web-address record; the `/hga/` entrance redirects to the explorer in the same document. Current-view links can still include selected controls and time, but general NFC cards should use the stable entrances above.

## Publication contract

Source code is pushed to the independent website repository. Generated `real-data.js` is uploaded as the GitHub Release asset named in `deployment.json`, with a pinned SHA-256. It is never committed to source Git. Source audits with local paths, figure caches and screenshots are not included in the published site.

`.github/workflows/pages.yml` uses a manual `workflow_dispatch` to download that immutable data release, verify the checksum and real-data schema, build an allowlisted static site, upload a Pages artifact and deploy it. The user-requested publication runs this workflow once; later code pushes alone do not publish. Enable Pages with `build_type=workflow` (Settings → Pages → Source → GitHub Actions).

The build uses only Python's standard library. No pipeline, subject data, scientific environment or raw recordings are needed on GitHub Actions. It copies twelve public runtime files (including both original brand PNGs), including `/hga/index.html` and a small `version.json`, and rejects local storage paths. All ordinary assets remain relative for project subpaths. The root source `index.html` is a synthetic development fixture; only the generated Pages artifact is the real public website.

## Local build and validation

```bash
python3 scripts/build_public_site.py --bundle /path/to/reviewed/real-data.js --output /path/to/empty/site
```

The data bundle must match `deployment.json`. To run public-build browser checks, set `SITE_PAGES_ROOT` to that result (default `<output>/meta/site`), then run `SITE_PAGES_OUTPUT=<output> npm run test:pages`. To inspect the deployed site use `SITE_PAGES_URL=https://gilles-jhqian.github.io/lexical-access/` as well. Screenshots/reports use sibling `figs`/`meta` directories outside Git.

Full source numerical validation is retained from the real pilot. Publication checks focus on correct artifact contents, stable copied URLs, real-mode loading, NFC redirects, mobile layout and public resource availability. Physical iOS/Android behavior is for the user's phone check.

## Release sequence

1. Create the public website repository under the verified GitHub account; push validated `master` via SSH.
2. Create the data release in `deployment.json` and upload the accepted `real-data.js` attachment. Do not replace it with different bytes under the same tag; a new bundle requires a new release and checksum.
3. Enable GitHub Pages with workflow publishing; run `Publish real HGA pilot` from `master`.
4. Wait for a successful run, confirm the actual Pages URL, and run public browser/HTTP checks before giving the user NFC-ready links.

The current pilot intentionally retains the draft's reserved decoding figure, author and final poster PDF slots. Contours remain dynamic display-level sets, not new time-resolved significance tests.

## Verified first publication

Workflow run: https://github.com/Gilles-JHQian/lexical-access/actions/runs/43248285741 (success). Deployed commit: `57c916be76e9a10b0c4c8caf0a2189bba8892ed8`. Data release: https://github.com/Gilles-JHQian/lexical-access/releases/tag/hga-pilot-2026-11-12. HTTPS is enforced. Thirteen browser checks passed against the actual public site, and all nine public runtime resources matched the reviewed local artifact byte-for-byte. `.nojekyll` is a build marker, excluded from the public HTTP byte comparison. Validation records and screenshots are outside Git in `../lexical_access_site_preview/pages-v1/{figs,meta}`.

Manual publication remains the only trigger. Future pushes do not automatically replace the live website; run the workflow only when that update is authorized.
