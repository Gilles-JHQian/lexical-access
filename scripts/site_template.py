"""Shared real-pilot HTML template for local previews and GitHub Pages."""
import re

PUBLIC_ASSETS = ('assets/favicon.svg', 'assets/cogan-lab.png', 'assets/duke-bme.png')


def real_html(r):
    s=(r/'index.html').read_text().replace('<script defer src="./mock-data.js"></script>','<script defer src="./real-data.js"></script>').replace('<script defer src="./app.js"></script>','<script defer src="./surface-view.js"></script>\n  <script defer src="./real-app.js"></script>')
    # Label the generated HTML correctly even before JavaScript runs.
    s=s.replace('Prototype with simulated visuals.', 'Interactive pilot using real bipolar HGA summaries.')
    s=s.replace('DESIGN PROTOTYPE · SIMULATED VISUALS', 'REAL HGA · DATA PILOT')
    s=s.replace('SIMULATED DATA', 'REAL DATA · BIPOLAR')
    s=s.replace('Simulated brain activity maps', 'Real bipolar HGA maps')
    s=s.replace('Simulated regional time courses', 'Real selected-contact mean time courses')
    s=s.replace('A schematic view of a question unfolding in time.', 'Real bipolar HGA on the avg35 inflated template.')
    s=s.replace('Schematic left hemisphere · illustrative units', 'avg35 inflated · lateral view · fixed source selection')
    s=s.replace('Mock activation above baseline. Maps and traces are synthetic; anatomy, timings and magnitudes are illustrative.', 'Real bipolar HGA summaries. Enable JavaScript to explore the maps and data-source details.')
    s=re.sub(r'<details class="reading-guide">.*?</details>', '<details class="reading-guide"><summary>Data source &amp; how to read this pilot</summary><p>Real bipolar HGA summaries from the current poster caches. Task selections are fixed; contours show instantaneous spatial level sets, not time-resolved significance. JavaScript enables the maps and complete source notes.</p></details>', s, flags=re.S)
    return s
