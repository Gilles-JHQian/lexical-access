# Contrast temporal comparisons

Three choices in Developer options → Contrast signal: Original (default), Smoothed · σ 50 ms, SDR1 cluster mask. Each retains source pools, signed pseudoword minus word HGA, spatial weights, ±0.15 contour level and ±1 display range. Switches preserve time/camera, pause playback, and load only the selected condition/hemisphere/block. Saved links use `processing=original|smooth|cluster`; legacy links remain Original. These choices affect both task maps and contours, while the existing millimetre-scale contour-line smoothing remains a separate appearance control.

## Temporal smoothing

Apply the existing shared `plotters.trace_render._smooth` primitive to each accepted source contact's complete 128 Hz HGA difference trace, before surface projection and 64 Hz frame selection. Centered Gaussian, σ=50 ms (6.4 native samples), truncate at 4σ, SciPy reflect edge handling. Visible samples have the full kernel within the original cached epoch. This is a descriptive display operation; it can spread activity around an event and is not a latency estimate or a new statistical test. No mask is applied to this comparison.

## SDR1 mask

Use the accepted UP bipolar `sdr1p05` generation `jia213-up-sdr1p05-20261015-v1`, `temporal_cluster_v1`: trial-level, two-sided inference with fixed formal-window support and 5,000 permutations. Cluster-forming and cluster p thresholds are .05. The viewer's `validate_sdr1p05`, `directional_masks` and exact-sample `align_mask` validate/reuse the published statistics. Verify the publication receipt, plan, full acceptance, per-direction H5 and linked audit hashes. No raw epoch read, trial-mean reconstruction or permutation rerun.

Within the existing poster source pools, zero each contact's contribution outside its formal significant cluster for the selected effect direction, retaining the producer's significant-channel gate. Source HGA values remain the accepted poster summaries; the SDR1 result is a display gate, not a replacement effect estimator or a claim of spatially corrected significance. Formal windows are 0–1 s after stimulus onset and −0.5–0.5 s from stimulus offset. Descriptive extent outside those windows is excluded. The website explicitly labels untested times and leaves them blank. Brain support geometry remains fixed; values, fills and overlap are derived coherently from the gated signal.

## Preparation and delivery

`scripts/export_contrast_variants.py` extends the existing verified bundle with eight aggregate cells (four conditions × two alternatives). It reuses `compute_surface_field`, the existing native white/inflated vertex mapping, tissue kernel 7 mm/15 mm, and int16 quantization. It neither edits upstream files nor writes individual-contact data to the web bundle. Unused ROI trace summaries are omitted from the new cells. Source identities, masks, counts and numerical bounds are audited outside Git. Original six cells and geometry remain exact; original 86 streaming resources remain byte-identical.

Run with `--workspace`, `--viz`, `--recon`, `--bids`, `--base-bundle`, `--base-audit` and `--output`, pointing at the accepted visualization workspace, shared plotters, template anatomy, canonical UP BIDS, prior reviewed bundle/audit and a fresh external delivery directory. Development uses the existing Lexical_NoDelay environment with `PYTHONDONTWRITEBYTECODE=1 OPENBLAS_NUM_THREADS=1`. Only aggregate presentation caches and deliverables are written in Avalon.

Release `hga-contrast-temporal-v5-2026-11-12`; `real-data.js` SHA-256 `02c114e8ccd01f4366599e4f85e85a9b7f4e43d7be2475c7e9f476548bf6a05f`. The 102 MB release is a build input, not a browser download. The public 84,735-byte manifest references 198 compressed resources; the added alternatives total 4,596,886 compressed bytes, loaded on demand. Initial NFC map payload stays 727,839 bytes in three requests. Media release v3 and stable NFC/Pages entrances are unchanged.

## Validation

`tests/validate_contrast_variants.py` independently constructs native Gaussian weights, reads formal audit masks directly, and checks 48 projected variant fields within int16 quantization bounds. Export also checks 72 original fields against the accepted bundle. All 198 resources reconstruct losslessly; masked per-frame contact counts match exactly and untested frames are zero. Across the 24 task/condition/hemisphere fields, the median mean absolute frame-change ratio is 0.325 for smoothed versus original; this is a display-stability metric, not inferential evidence.

Browser QA: 43 temporal-option checks, 83 poster/explorer checks and 17 loading checks. Covers all event/direction/hemisphere combinations, native playback, independent activation, 320–1440 px controls, camera/time continuity, saved links, late responses, download retry, no eager alternative data and offline use. Generated evidence lives in sibling `lexical_access_site_preview/contrast-time-v11/{figs,meta}`. Physical phone appearance remains for user review; the final preferred comparison has not been selected.

The subsequent playback revision doubles native frame selection to 64 Hz (15.625 ms) for all comparisons and defaults playback to 0.25×. Gaussian parameters remain defined on the full 128 Hz source trace; significance masks are aligned at the inserted native samples. The historical 32 Hz release figures above remain provenance for that delivery. Current pins are in deployment.json.
