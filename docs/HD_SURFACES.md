# HD surface and developer options

The user requested a cleaner inflated cortex and contours matching the existing viewer, faint contour interiors, and a temporary floating tweaking interface. Implementation references are read-only `brain_viewer/viewer_react/src/preview/math.js` (`contourSegments`, `shadeColors`), `BrainPreview.jsx` (`Isoline`, `Cortex`), and the shared `plotters.surface_geom`/`brain_config` modules. Reference hashes are in the external delivery audit.

## Appearance

The display retains 24% of native triangles instead of 8%: LH 65,964 and RH 64,152 faces. Source positions and normals are native; no synthetic subdivision or new anatomy is introduced. The cortex is lightened with adjustable sulcal/gyral contrast and modest directional lighting. Rendering resolution is supersampled within a 1,920-pixel cap.

Contour strokes use viewer-equivalent supported-edge interpolation and a 0.6 mm normal lift, then screen-width antialiased geometry. Positive lines are solid, negative dashed, with joined-path dash phase. Default cosmetic smoothing has a 1 mm bound at resampled line vertices; set it to zero for exact isolines. It does not smooth neural fields or recompute support, threshold, or overlap. Pale interiors follow the original suprathreshold field and task color; overlap remains same-sign spatial overlap, not statistical conjunction. Static poster morphology (closing, island removal, envelope generation) is not applied. The line may differ slightly from the original fill boundary within the display regularization scale.

The Canvas2D fallback is deliberately simpler: native rotated anatomy with coarse per-face color and raw contour segments. It does not provide the GPU stroke antialiasing or smoothing.

## Developer workflow

Click **Developer options**. Choose Activation or Contrast, Three tasks or Contour overlay, and the overlap scope. Appearance controls affect both sections: brain lightness, sulcal contrast, contour fill, line width, bounded line smoothing, and overlap hatching/tint/hidden. A mobile scrollable panel keeps playback accessible. Drag by its title; minimize with × or Escape. Copy tuned view captures current appearance, selected section, camera and timeline.

**Hide developer tools** removes the panel and launcher on the current URL (`?dev=0`). Open `?dev=1#contrast` to restore. For the final version, change `deployment.json` to `"developer_tools": false` and run the existing manual publication workflow. Do not remove the panel/controller implementation. These are display options, not authentication.

## Reproduction and validation

Export using the existing script with `--mesh-fraction .24` and `--roi-mapping <verified coarse_roi_mapping_v2.json>`. The old default mapping location was absent; the read-only copy in `code.worktrees/jia272-poster-training-legend/final_figures/lexical_access/scripts/` matched the published mapping SHA exactly and was passed explicitly. This preserves the source ROI definitions without editing any analysis checkout.

Run `tests/validate_surface_upgrade.py` with `--baseline ../lexical_access_site_preview/surface-v2 --output ../lexical_access_site_preview/hd-contours-v5` and the shared `--viz`/`--recon` paths. Run `tests/validate_real_bundle.py` against the new bundle. `npm run test:contours` independently compares extracted endpoints with the viewer's routine for both signs, both hemispheres and three cells; it also checks missing support and the smoothing bound. `npm run test:poster` covers the new controls and existing scientific interactions. `npm test` remains the synthetic-fixture regression.

Source audit, exact commands, validation reports, CPU submission timing and screenshots are outside Git in `../lexical_access_site_preview/hd-contours-v5/{figs,meta}`. The 70.6 MB JS data asset compresses to about 21.5 MB with gzip, versus 7.4 MB previously; first-load transfer is the main cost of the 3× mesh. Physical phone GPU/Safari behavior remains to be assessed on-device. A lossless temporal-delta packing experiment saved only about 5% and was not adopted; the existing public data format remains unchanged.

Publish the new immutable Release `hga-surface-hd-v3-2026-11-12` using the checksum in `deployment.json`; never overwrite the old release. Generated data stay outside Git. Build and validate the allowlisted artifact, merge the topic with `--no-ff`, push, then manually dispatch Pages. The root, `/hga/` and `#contrast` entrances remain stable. The builder adds content-hash query strings to changed runtime assets to prevent browser-cache mixtures.
