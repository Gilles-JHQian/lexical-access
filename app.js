(function () {
  'use strict';
  const data = window.LexicalData;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { metric: 'activation', view: 'tasks', align: 'onset', scope: 'all', roi: 'st', time: 300, speed: 1, playing: false };
  const bounds = data.timeline;
  const shape = 'M42 140 C30 118 39 90 58 77 C60 58 80 45 105 44 C125 21 154 25 175 30 C199 18 228 25 242 36 C267 31 288 45 301 60 C327 64 340 83 340 104 C358 123 349 143 338 153 C338 173 315 188 294 188 C282 207 260 207 241 201 C224 216 203 211 187 201 C168 212 148 199 146 180 C125 179 111 167 101 156 C85 165 58 162 42 140 Z';
  const folds = [
    'M62 132 C51 114 60 96 78 94 C96 91 105 76 99 58',
    'M75 143 C70 125 88 112 102 119 C118 126 129 111 122 99 C112 82 120 65 139 58',
    'M99 48 C100 63 87 72 75 74',
    'M142 39 C152 57 143 75 137 86 C130 104 149 117 144 135',
    'M173 34 C167 50 181 62 173 79 C161 94 172 107 166 124',
    'M203 31 C217 47 198 58 201 75 C202 90 190 103 194 120',
    'M237 42 C227 56 241 67 229 80 C214 95 231 110 219 123',
    'M269 49 C258 63 274 78 261 90 C247 101 268 119 250 129',
    'M301 67 C288 78 302 92 291 103 C280 112 299 125 281 135',
    'M327 94 C315 101 327 118 311 128',
    'M112 143 C151 131 184 143 211 134 C239 127 267 146 293 134 C307 133 323 144 334 139',
    'M147 165 C165 151 180 166 202 157 C223 149 238 162 256 153 C270 149 289 162 310 154',
    'M161 181 C177 168 190 184 209 173 C231 165 244 183 265 171 C282 166 290 180 305 173',
    'M184 198 C193 185 207 199 224 190 C241 181 251 198 270 188'
  ];
  function base(id, title, inner = '') {
    return `<svg viewBox="20 12 345 216" role="img" aria-label="${title}"><defs><clipPath id="${id}-clip"><path d="${shape}"/></clipPath><pattern id="${id}-hatch" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5L5 0" stroke="#142d43" stroke-width="1.3"/></pattern></defs><path class="brain-base" d="${shape}"/><g class="brain-folds">${folds.map(d => `<path d="${d}"/>`).join('')}</g><g clip-path="url(#${id}-clip)">${inner}</g></svg>`;
  }
  function ellipse(field, scale, fill, attrs = '') {
    return `<ellipse cx="${field.x}" cy="${field.y}" rx="${(field.rx * scale).toFixed(2)}" ry="${(field.ry * scale).toFixed(2)}" fill="${fill}" ${attrs}/>`;
  }
  function levelScale(value) {
    return Math.sqrt(Math.max(0, 2 * Math.log(Math.abs(value) / data.displayThreshold)));
  }
  function heat(task) {
    return data.fields(task.id, state.time, state.metric).map(field => {
      const magnitude = Math.abs(field.value);
      if (magnitude < .025) return '';
      const color = field.value < 0 ? '#266fa4' : '#c0582e';
      return [1.8, 1.4, 1, .65].map((scale, i) => ellipse(field, scale, color, `opacity="${(magnitude * [0.045, .08, .17, .35][i]).toFixed(3)}"`)).join('');
    }).join('');
  }
  function contour(task, sign, maskOnly = false) {
    return data.fields(task.id, state.time, state.metric).filter(f => Math.sign(f.value) === sign && Math.abs(f.value) > data.displayThreshold).map(f => {
      const r = levelScale(f.value);
      if (maskOnly) return ellipse(f, r, 'white');
      return ellipse(f, r, sign < 0 ? '#276fa4' : '#c0582e', `fill-opacity="0.035" stroke="${task.color}" stroke-width="2.3" stroke-dasharray="${task.dash}"`);
    }).join('');
  }
  function overlay(id) {
    const tasks = data.tasks;
    let content = '';
    for (const sign of [1, -1]) {
      const key = sign === 1 ? 'positive' : 'negative';
      content += tasks.map(task => contour(task, sign)).join('');
      if (state.scope === 'none') continue;
      const selected = tasks.filter(task => state.scope === 'all' || task.id !== 'passive');
      content += '<defs>' + selected.map(task => `<mask id="${id}-${key}-${task.id}" maskUnits="userSpaceOnUse" x="20" y="12" width="345" height="216"><rect x="20" y="12" width="345" height="216" fill="black"/>${contour(task, sign, true)}</mask>`).join('') + '</defs>';
      content += selected.map(task => `<g mask="url(#${id}-${key}-${task.id})">`).join('');
      content += `<rect x="20" y="12" width="345" height="216" fill="url(#${id}-hatch)" opacity=".65"/>`;
      content += '</g>'.repeat(selected.length);
    }
    return content;
  }
  function renderHero() {
    const before = { ...state };
    state.metric = 'contrast'; state.time = 460; state.scope = 'all';
    $('#hero-brain').innerHTML = base('hero', 'Schematic cortical contours', overlay('hero'));
    Object.assign(state, before);
  }
  function renderMaps() {
    const stage = $('#brain-stage');
    if (state.view === 'tasks') {
      stage.className = 'brain-stage tasks-view';
      stage.innerHTML = data.tasks.map(task => `<figure class="brain-panel"><figcaption><span class="task ${task.id}">${task.label}</span><small>${task.subtitle}</small></figcaption>${base(task.id, `Simulated ${state.metric} in ${task.label}`, heat(task))}</figure>`).join('');
    } else {
      stage.className = 'brain-stage';
      stage.innerHTML = `<div class="contour-stage"><div class="contour-legend">${data.tasks.map(task => `<span class="task ${task.id}">${task.label}</span>`).join('')}</div>${base('overlay', 'Simulated task contours; hatching shows selected geometric overlap', overlay('overlay'))}</div>`;
    }
  }
  const relativeTime = () => state.time - (state.align === 'offset' ? bounds.illustrativeOffset : 0);
  const timeText = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(Math.round(value))} ms`;
  function renderTrace() {
    const width = 900, height = 126, left = 36, right = 875, top = 15, bottom = 98;
    const contrast = state.metric === 'contrast';
    const y = value => contrast ? 55 - value * 39 : bottom - value * 76;
    const x = time => left + (time - bounds.min) / (bounds.max - bounds.min) * (right - left);
    const event = state.align === 'offset' ? bounds.illustrativeOffset : 0;
    const lines = data.tasks.map(task => {
      let d = '';
      for (let t = bounds.min; t <= bounds.max; t += 10) d += `${t === bounds.min ? 'M' : 'L'}${x(t).toFixed(1)} ${y(data.signal(task.id, state.roi, t, state.metric)).toFixed(1)} `;
      return `<path d="${d}" stroke="${task.color}" stroke-width="2.3" fill="none" stroke-dasharray="${task.dash}" vector-effect="non-scaling-stroke"/>`;
    }).join('');
    $('#trace').innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Simulated ${data.regions[state.roi].label} ${state.metric} time courses, green Passive, burgundy Decision, blue Repetition"><line x1="${left}" x2="${right}" y1="${y(0)}" y2="${y(0)}" stroke="#ced5d7"/><line x1="${x(event)}" x2="${x(event)}" y1="${top}" y2="${bottom}" stroke="#b0bbc1" stroke-dasharray="3 4"/>${lines}<line id="trace-cursor" x1="${x(state.time)}" x2="${x(state.time)}" y1="${top}" y2="${bottom}" stroke="#172b3e" stroke-width="1.3"/><circle id="trace-cursor-dot" cx="${x(state.time)}" cy="${y(data.signal('repeat', state.roi, state.time, state.metric))}" r="3" fill="#172b3e"/></svg>`;
  }
  function renderTime() {
    const t = relativeTime();
    $('#frame-label').textContent = timeText(t);
    $('#time-output').textContent = timeText(t);
    $('#time').value = t;
    $('#time').setAttribute('aria-valuetext', `${Math.round(t)} milliseconds from stimulus ${state.align}`);
    const x = 36 + (state.time - bounds.min) / (bounds.max - bounds.min) * 839;
    const line = $('#trace-cursor');
    if (line) { line.setAttribute('x1', x); line.setAttribute('x2', x); }
    const dot = $('#trace-cursor-dot');
    if (dot) {
      dot.setAttribute('cx', x);
      const value = data.signal('repeat', state.roi, state.time, state.metric);
      dot.setAttribute('cy', state.metric === 'contrast' ? 55 - value * 39 : 98 - value * 76);
    }
    renderMaps();
  }
  function setPressed(attr, value) {
    $$(`[data-${attr}]`).forEach(button => button.setAttribute('aria-pressed', button.dataset[attr] === value ? 'true' : 'false'));
  }
  function render() {
    setPressed('metric', state.metric); setPressed('view', state.view); setPressed('roi', state.roi);
    $('#alignment').value = state.align; $('#shared-scope').value = state.scope;
    $('#overlay-options').hidden = state.view !== 'contours';
    const event = state.align === 'offset' ? bounds.illustrativeOffset : 0;
    $('#time').min = bounds.min - event; $('#time').max = bounds.max - event;
    $('.time-label label').textContent = `Time from stimulus ${state.align}`;
    $('#time-ticks').dataset.align = state.align;
    $('#time-ticks').innerHTML = `<span>${timeText(bounds.min - event)}</span><span class="zero-tick" style="left:${100 * (event - bounds.min) / (bounds.max - bounds.min)}%">0</span><span>${timeText(bounds.max - event)}</span>`;
    $('#signal-key').innerHTML = state.metric === 'activation' ? '<span class="key-ramp activation-ramp"></span><span>Lower → higher activation</span>' : '<span class="key-ramp contrast-ramp"></span><span>Word > Nonword ← 0 → Nonword > Word</span>';
    $('#explorer-description').textContent = state.metric === 'activation' ? 'Mock activation above baseline. Maps and traces are synthetic; anatomy, timings and magnitudes are illustrative.' : 'Mock Nonword − Word contrast. Blue: Word > Nonword. Orange: Nonword > Word. No statistical significance is implied.';
    renderTrace(); renderTime();
  }
  let animation = null, previous = null;
  function setPlaying(playing) {
    state.playing = playing;
    $('#play').setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
    $('#play').innerHTML = playing ? '<span aria-hidden="true">Ⅱ</span>' : '<span aria-hidden="true">▶</span>';
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null; previous = null;
    if (playing) animation = requestAnimationFrame(tick);
  }
  function tick(now) {
    if (!state.playing) return;
    if (previous === null) previous = now;
    const elapsed = now - previous;
    // 30 fps cap; one complete mock trial takes about 5.6 seconds at 1×.
    if (elapsed >= 33) {
      state.time += Math.min(elapsed, 100) * .25 * state.speed;
      if (state.time > bounds.max) { state.time = bounds.max; setPlaying(false); }
      previous = now; renderTime();
    }
    if (state.playing) animation = requestAnimationFrame(tick);
  }
  $('#play').addEventListener('click', () => {
    if (!state.playing && state.time >= bounds.max) state.time = bounds.min;
    setPlaying(!state.playing);
  });
  $('#time').addEventListener('input', e => {
    setPlaying(false);
    state.time = Number(e.target.value) + (state.align === 'offset' ? bounds.illustrativeOffset : 0);
    renderTime();
  });
  $('#reset').addEventListener('click', () => {
    setPlaying(false); state.time = state.align === 'offset' ? bounds.illustrativeOffset : 0; renderTime();
  });
  $('#speed').addEventListener('change', e => { state.speed = Number(e.target.value); });
  for (const key of ['metric', 'view', 'roi']) {
    $$(`[data-${key}]`).forEach(button => button.addEventListener('click', () => { state[key] = button.dataset[key]; render(); }));
  }
  $('#alignment').addEventListener('change', e => { state.align = e.target.value; render(); });
  $('#shared-scope').addEventListener('change', e => { state.scope = e.target.value; render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) setPlaying(false); });
  $('#hga').addEventListener('toggle', () => { if (!$('#hga').open) setPlaying(false); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { if (!entries[0].isIntersecting) setPlaying(false); }, { threshold: 0 }).observe($('#explorer'));
  }
  const chapters = $$('.chapter');
  function syncExpandButton() {
    const all = chapters.every(chapter => chapter.open);
    $('#toggle-chapters').innerHTML = `${all ? 'Collapse' : 'Expand'} all chapters <span aria-hidden="true">${all ? '−' : '+'}</span>`;
  }
  chapters.forEach(chapter => chapter.addEventListener('toggle', syncExpandButton));
  $('#toggle-chapters').addEventListener('click', () => {
    const open = !chapters.every(chapter => chapter.open);
    chapters.forEach(chapter => { chapter.open = open; });
    syncExpandButton();
  });
  function applyHash() {
    const [target, query = ''] = location.hash.slice(1).split('?');
    const chapter = document.getElementById(target);
    if (!chapter) return;
    if (chapter.matches('details')) chapter.open = true;
    if (target === 'hga') {
      setPlaying(false);
      // Each share URL is self-contained. Missing options use defaults.
      Object.assign(state, { metric: 'activation', view: 'tasks', align: 'onset', scope: 'all', roi: 'st', time: 300 });
      const params = new URLSearchParams(query);
      const allowed = { metric: ['activation', 'contrast'], view: ['tasks', 'contours'], align: ['onset', 'offset'], scope: ['all', 'active', 'none'], roi: ['st', 'ventral', 'frontal'] };
      for (const [key, values] of Object.entries(allowed)) if (values.includes(params.get(key))) state[key] = params.get(key);
      if (params.has('t') && Number.isFinite(Number(params.get('t')))) state.time = Math.max(bounds.min, Math.min(bounds.max, Number(params.get('t'))));
      render();
    }
    const destination = target === 'hga' ? $('#explorer') : chapter;
    requestAnimationFrame(() => destination.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' }));
  }
  window.addEventListener('hashchange', applyHash);
  // Clicking an already-current anchor must still reopen a collapsed chapter.
  $$('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    if (link.getAttribute('href') === location.hash) applyHash();
  }));
  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
  }
  function linkFor(kind) {
    const url = new URL(location.href); url.hash = ''; url.search = '';
    if (kind === 'session') url.hash = 'hga';
    if (kind === 'current') {
      const params = new URLSearchParams({ metric: state.metric, view: state.view, align: state.align, scope: state.scope, roi: state.roi, t: String(Math.round(state.time)) });
      url.hash = `hga?${params}`;
    }
    return url.href;
  }
  async function share(kind) {
    const url = linkFor(kind);
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url); toast('Link copied.');
    } catch {
      $('#share-url').value = url; $('#share-dialog').showModal(); $('#share-url').focus(); $('#share-url').select();
    }
  }
  $('#copy-hga').addEventListener('click', () => share('current'));
  $('#copy-story').addEventListener('click', () => share('story'));
  $('#copy-session').addEventListener('click', () => share('session'));
  renderHero(); render(); syncExpandButton();
  if (location.hash) requestAnimationFrame(applyHash);
}());
