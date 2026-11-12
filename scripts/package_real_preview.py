"""Package an existing verified visualization bundle; no scientific computation."""
import argparse,json,hashlib,shutil,urllib.parse,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args()
r=Path(__file__).resolve().parents[1];m=a.output/'meta';site=m/'site';site.mkdir(exist_ok=True)
report=json.loads((m/'export-validation.json').read_text());assert hashlib.sha256((m/'real-data.js').read_bytes()).hexdigest()==report['bundle_sha256']
s=(r/'index.html').read_text().replace('<script defer src="./mock-data.js"></script>','<script defer src="./real-data.js"></script>').replace('<script defer src="./app.js"></script>','<script defer src="./surface-view.js"></script>\n  <script defer src="./real-app.js"></script>')
# Label the generated HTML correctly even before JavaScript runs.
s=s.replace('Prototype with simulated visuals.', 'Local pilot using real bipolar HGA summaries.')
s=s.replace('DESIGN PROTOTYPE · SIMULATED VISUALS', 'REAL HGA · LOCAL DATA PILOT')
s=s.replace('SIMULATED DATA', 'REAL DATA · BIPOLAR')
s=s.replace('Simulated brain activity maps', 'Real bipolar HGA maps')
s=s.replace('Simulated regional time courses', 'Real selected-contact mean time courses')
s=s.replace('A schematic view of a question unfolding in time.', 'Real bipolar HGA on the avg35 inflated template.')
s=s.replace('Schematic left hemisphere · illustrative units', 'avg35 inflated · lateral view · fixed source selection')
s=s.replace('Mock activation above baseline. Maps and traces are synthetic; anatomy, timings and magnitudes are illustrative.', 'Real bipolar HGA summaries. Enable JavaScript to explore the maps and data-source details.')
s=re.sub(r'<details class="reading-guide">.*?</details>', '<details class="reading-guide"><summary>Data source &amp; how to read this pilot</summary><p>Real bipolar HGA summaries from the current poster caches. Task selections are fixed; contours show instantaneous spatial level sets, not time-resolved significance. JavaScript enables the maps and complete source notes.</p></details>', s, flags=re.S)
(site/'index.html').write_text(s)
for name in ['styles.css','surface-view.js','real-app.js','.nojekyll']:shutil.copyfile(r/name,site/name)
shutil.copyfile(m/'real-data.js',site/'real-data.js');(site/'assets').mkdir(exist_ok=True);shutil.copyfile(r/'assets/favicon.svg',site/'assets/favicon.svg')
standalone=s.replace('<link rel="stylesheet" href="./styles.css">','<style>'+ (r/'styles.css').read_text()+'</style>')
for name in ['real-data.js','surface-view.js','real-app.js']:standalone=standalone.replace(f'<script defer src="./{name}"></script>','')
standalone=standalone.replace('<link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">','<link rel="icon" href="data:image/svg+xml,'+urllib.parse.quote((r/'assets/favicon.svg').read_text())+'" type="image/svg+xml">')
standalone=standalone.replace('</body>',''.join('<script>'+ (site/name).read_text()+'</script>' for name in ['real-data.js','surface-view.js','real-app.js'])+'</body>')
(m/'interactive-preview-real.html').write_text(standalone)
(a.output/'README.md').write_text('# Real HGA website pilot\n\nOpen meta/interactive-preview-real.html in a browser, or serve meta/site/. This is a local real-data pilot; no public deployment.\n\nReal bipolar HGA activation and signed HGA-z contrasts from the 11 November 2026 poster caches. Sources, fixed task membership and validation: meta/export-validation.json. No identifiers, raw/epoch/trial arrays or individual-electrode traces in the browser bundle.\n\nContours are dynamic level sets, not the static poster envelopes or new significance tests. Independent onset/offset summaries; bilateral descriptive curve means, left/right lateral maps.\n')
print('PACKAGED',m/'interactive-preview-real.html',len(standalone))
