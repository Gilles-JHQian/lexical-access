"""Responsive presentation of the four accepted poster contrast result sets."""
from html import escape
import json
from choice_controls import choice_group

CELLS = ('stimulus-nwwd', 'stimulus-wdnw', 'offset-nwwd', 'offset-wdnw')
PARTS = ('lh', 'rh', 'trace', 'roi')
CONTRAST_FILES = {'media/contrast-panels.json'} | {
    f'media/contrast-{cell}-{part}.' + ('webp' if part in ('lh','rh') else 'svg')
    for cell in CELLS for part in PARTS
}


def contrast_results_html(media_root):
    data = json.loads((media_root/'media/contrast-panels.json').read_text())
    assert {p['id'] for p in data['panels']} == set(CELLS)
    sections = []
    for panel in data['panels']:
        key = panel['id']; onset = panel['align'] == 'stimulus'
        window = '0.5–0.9 s after stimulus onset' if onset else '0–0.5 s after stimulus offset'
        direction = 'PW > W' if panel['direction'] == 'nwwd' else 'W > PW'
        def image(part, label):
            spec = panel['images'][part]; src = escape(spec['src'], quote=True)
            assert spec['src'].removeprefix('./') in CONTRAST_FILES
            alt = escape(f'{label}, {window}, {direction}')
            return f'<a class="figure-open" href="{src}" target="_blank" rel="noopener" data-figure-title="{escape(label)}" aria-label="Enlarge {alt}"><img data-src="{src}" width="{spec["width"]}" height="{spec["height"]}" alt="{alt}" decoding="async"></a>'
        hidden = '' if key == CELLS[0] else ' hidden'
        sections.append(f'''<article class="contrast-result" data-static-panel="{key}"{hidden}>
          <p class="poster-window">Selection window: {window}.</p>
          <div class="poster-brains"><figure>{image('lh','Left hemisphere')}<figcaption>Left hemisphere</figcaption></figure><figure>{image('rh','Right hemisphere')}<figcaption>Right hemisphere</figcaption></figure></div>
          <div class="poster-charts"><figure><figcaption>Lexicality time course{'' if onset else ' · '+escape(panel['metric'])}</figcaption>{image('trace','Lexicality time course')}</figure><figure><figcaption>Regional contribution</figcaption>{image('roi','Regional contribution')}<p class="component-note">Share of the selected HGA effect.</p></figure></div>
          <p class="static-load-status" role="status" hidden><span></span><button type="button" data-static-retry hidden>Retry</button></p>
          <noscript><p>Open the original components: {' · '.join(f'<a href="{escape(panel["images"][part]["src"])}">{label}</a>' for part,label in [('lh','Left brain'),('rh','Right brain'),('trace','Time course'),('roi','Regional contribution')])}.</p></noscript>
        </article>''')
    choices = choice_group('Alignment', [('stimulus', 'Stimulus'), ('offset', 'Offset')], attrs='id="static-alignment"') + choice_group('Effect', [('nwwd', 'PW > W'), ('wdnw', 'W > PW')], attrs='id="static-direction"')
    return f'''<section class="contrast-static" id="contrast-results" aria-labelledby="contrast-results-title">
      <h3 id="contrast-results-title">Poster results</h3>
      <p>Compare lexicality effects during the stimulus and after it ends.</p>
      <div class="static-options">{choices}</div>
      <div class="poster-task-key" aria-label="Task colors"><span class="task repeat">Repetition</span><span class="task decision">Decision</span><span class="task passive">Passive</span></div>
      <p id="static-selection" class="sr-only" role="status"></p>
      ''' + '\n'.join(sections) + '''
      <details class="reading-guide static-notes"><summary>How to read the poster results</summary><p>The brain contours summarize each task’s spatial envelope over the selected window. They are the poster’s processed envelopes, not individual animation frames. The time courses retain the poster’s mean and SEM, with the selection window shaded; n is the selected contact pool.</p><p>Time courses use the selected direction: PW − W or W − PW in d′. The interactive maps above always show signed PW − W in HGA z units. These are different summaries and scales.</p><p>The pie charts show directional HGA effect contributions, not percentages of electrodes. Effects are averaged across selected tasks per contact, summed within the poster’s merged regions, and normalized without a coverage correction. The original region grouping, colors, proportions and Other category are retained.</p></details>
      <noscript><style>.static-options{display:none}.contrast-result[hidden]{display:block!important}</style><p>Enable JavaScript to switch result sets and view the components together. The original figure components are linked above.</p></noscript>
    </section>'''
