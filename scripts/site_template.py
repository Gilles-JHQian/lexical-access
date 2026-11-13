"""Final-poster narrative and two independent HGA explorer instances."""
PUBLIC_ASSETS = ('assets/favicon.svg', 'assets/cogan-lab.png', 'assets/duke-bme.png')


def explorer_html(metric):
    title = 'HGA activation' if metric == 'activation' else 'HGA contrast'
    other = '#contrast' if metric == 'activation' else '#hga'
    other_text = 'HGA contrast ↓' if metric == 'activation' else 'HGA activation ↑'
    direction = '' if metric == 'activation' else '<label>Effect selection <select data-control="direction"><option value="nwwd">PW &gt; W</option><option value="wdnw">W &gt; PW</option></select></label>'
    signal_note = ('Activation retains each task’s source set of electrodes with significant HGA increases relative to baseline. The display scale is ±5.1 and contours use level ±2.04.' if metric == 'activation' else 'PW means pseudoword; W means word. Every value is signed pseudoword minus word, including the W &gt; PW selected set. Effect selection changes the fixed source electrode set. The display scale is ±1 and contours use level ±0.15. These dynamic HGA-z differences are distinct from the poster’s static d′ curves.')
    return f'''<div class="explorer" id="{metric}-explorer" data-explorer="{metric}">
      <div class="explorer-context"><strong>{title}</strong><a href="{other}">{other_text}</a></div>
      <details class="map-settings" data-control="settings" open>
        <summary><span>Map settings</span><span data-control="settings-summary"></span></summary>
        <div class="map-settings-body"><label class="select-label">Align to <select data-control="alignment"><option value="onset">Stimulus onset</option><option value="offset">Stimulus offset</option></select></label><div class="real-options"><fieldset class="view-controls"><legend class="sr-only">Hemisphere</legend><button type="button" data-hemi="lh" aria-pressed="true">LH</button><button type="button" data-hemi="rh" aria-pressed="false">RH</button></fieldset>{direction}</div></div>
      </details>
      <div class="developer-controls" hidden>
      <div class="view-bar"><fieldset class="view-controls"><legend class="sr-only">Comparison view</legend><button type="button" data-view="tasks" aria-pressed="true">Three tasks</button><button type="button" data-view="contours" aria-pressed="false">Contour overlay</button></fieldset></div>

      <div class="overlay-options" data-control="overlay-options" hidden><label>Shared area <select data-control="scope"><option value="all">All three tasks</option><option value="active">Decision + Repetition</option><option value="none">Contours only</option></select></label><span>Solid: positive · dashed: negative · hatching: same-direction overlap</span></div>
      </div>
      <div class="rotation-controls"><span id="{metric}-rotation-help">Drag a brain to rotate all three</span><button type="button" data-control="reset-view" aria-label="Reset brain view to lateral">Reset view ↺</button></div>
      <div class="data-status" data-control="load-status" role="status" hidden><span data-control="load-message"></span><button type="button" data-control="retry" hidden>Retry</button></div>
      <div class="brain-stage tasks-view" data-control="brain-stage" aria-label="{title} maps"></div>
      <div class="map-key"><div data-control="signal-key"></div></div>
      <div class="trace-header"><span>Mean time course</span><fieldset class="roi-controls" data-control="roi-controls"><legend class="sr-only">Region for the time course</legend></fieldset></div>
      <div class="trace" data-control="trace"></div>
      <div class="transport"><button type="button" class="play-button" data-control="play" aria-label="Play animation"><span aria-hidden="true">▶</span></button><div class="time-control"><div class="time-label"><label for="{metric}-time" data-control="time-label">Time from stimulus onset</label><output data-control="time-output" for="{metric}-time"></output></div><input id="{metric}-time" data-control="time" type="range" min="0" max="48" step="1" value="18"><div class="time-ticks" data-control="time-ticks"></div></div><label class="speed-label"><span class="sr-only">Playback speed</span><select data-control="speed" aria-label="Playback speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><button type="button" class="reset-button" data-control="reset" aria-label="Reset time to alignment event">↺</button></div>
      <details class="reading-guide display-notes"><summary>How to read this view</summary><p>{signal_note}</p><p>The maps show weighted surface sums of bipolar HGA from the accepted poster summaries. Warm colors are positive; cool colors are negative. The curves show unweighted means across selected contacts in both hemispheres. Changing LH/RH changes the map, not the curve population.</p><p>Onset and offset use separate event-locked summaries, sampled every 31.25 ms (32 frames per second). Electrode selection is fixed within the source window; the animation does not introduce a framewise significance test. Contours are mesh isolines with a 0.6 mm display lift, following the brain viewer. Contour strokes use a bounded display smoothing (default at most 1 mm; set to zero in Developer options for exact isolines). This does not change HGA values, thresholded fills or overlap masks. Pale task colors shade the suprathreshold interiors; line width and fill opacity are display controls. Contours are instantaneous display-level sets. Their shared area is spatial overlap, not a statistical conjunction or the static poster’s processed envelopes.</p><p data-control="selection-note"></p><p data-control="counts-note"></p><p data-control="kernel-note"></p><p>ROI groups are descriptive display subsets, not the decoding ROI definition. Missing groups remain missing. Arrow keys rotate a focused map; Home restores its lateral view.</p></details>
      <noscript><p class="notice">Enable JavaScript to play the activity and rotate the brain. The poster story remains readable above and below.</p></noscript>
    </div>'''


def real_html(root):
    text = (root / 'poster.html').read_text()
    for metric in ('activation', 'contrast'):
        marker = f'<!-- EXPLORER:{metric} -->'
        assert text.count(marker) == 1
        text = text.replace(marker, explorer_html(metric))
    return text
