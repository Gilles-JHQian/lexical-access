(function () {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const bundle = window.LexicalRealBundle;
  if (!bundle || bundle.kind !== 'real') throw new Error('The real HGA bundle is missing.');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width:620px)');
  const controllers = [];
  const defaults = {view:'tasks', align:'onset', direction:'nwwd', hemi:'lh', scope:'all', roi:'all', index:9, speed:1};
  const ms = t => `${t > 0 ? '+' : t < 0 ? '−' : ''}${Math.abs(Math.round(t))} ms`;

  async function share(kind, controller) {
    const url = new URL(window.LexicalSiteConfig?.baseUrl || location.href);
    url.hash = ''; url.search = '';
    if (kind === 'session') {
      if (window.LexicalSiteConfig?.baseUrl) url.pathname += 'hga/'; else url.hash = 'hga';
    }
    if (kind === 'current') url.hash = controller.hash();
    try {
      if (!navigator.clipboard || !isSecureContext) throw new Error();
      await navigator.clipboard.writeText(url.href);
      $('#toast').textContent = 'Link copied.'; $('#toast').hidden = false;
      setTimeout(() => $('#toast').hidden = true, 2500);
    } catch {
      $('#share-url').value = url.href; $('#share-dialog').showModal();
      $('#share-url').focus(); $('#share-url').select();
    }
  }

  function createExplorer(root) {
    const metric = root.dataset.explorer, chapter = root.closest('.chapter');
    const control = name => root.querySelector(`[data-control="${name}"]`);
    const all = selector => [...root.querySelectorAll(selector)];
    const state = {...defaults, playing:false}, camera = {yaw:0, pitch:0};
    const cell = () => bundle.cells[metric === 'activation' ? `activation-${state.align}` : `contrast-${state.align}-${state.direction}`];
    let surfaces = [], geometryKey = '', visible = false, raf = null, last = null, cameraRaf = null;
    const pressed = (key, value) => all(`[data-${key}]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[key] === value)));

    function releaseMaps() {
      for (const item of surfaces) item.view.destroy();
      surfaces = []; geometryKey = '';
    }
    function queueCameraDraw() {
      if (cameraRaf !== null) return;
      cameraRaf = requestAnimationFrame(() => { cameraRaf = null; renderMaps(); });
    }
    function setCamera(yaw, pitch) {
      camera.yaw = ((yaw + 180) % 360 + 360) % 360 - 180;
      camera.pitch = Math.max(-85, Math.min(85, pitch)); queueCameraDraw();
    }
    function connectRotation(canvas) {
      canvas.tabIndex = 0; canvas.setAttribute('aria-describedby', `${metric}-rotation-help`);
      canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home');
      let drag = null;
      canvas.addEventListener('pointerdown', e => {
        if (e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const box = canvas.getBoundingClientRect();
        drag = {id:e.pointerId, x:e.clientX, y:e.clientY, yaw:camera.yaw, pitch:camera.pitch, scale:180 / Math.max(120, Math.min(box.width, box.height))};
        canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging');
        if (e.pointerType === 'mouse') canvas.focus({preventScroll:true});
      });
      canvas.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        setCamera(drag.yaw + (e.clientX - drag.x) * drag.scale, drag.pitch + (e.clientY - drag.y) * drag.scale);
      });
      const end = e => {
        if (drag?.id !== e.pointerId) return;
        drag = null; canvas.classList.remove('is-dragging');
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      };
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, end);
      canvas.addEventListener('dblclick', () => setCamera(0, 0));
      canvas.addEventListener('keydown', e => {
        const step = e.shiftKey ? 15 : 5, delta = {ArrowLeft:[-step,0], ArrowRight:[step,0], ArrowUp:[0,-step], ArrowDown:[0,step]};
        if (e.key === 'Home') { e.preventDefault(); setCamera(0,0); }
        else if (delta[e.key]) { e.preventDefault(); setCamera(camera.yaw + delta[e.key][0], camera.pitch + delta[e.key][1]); }
      });
    }
    function prepareMaps() {
      const key = `${state.view}:${state.hemi}`;
      if (key === geometryKey) return;
      releaseMaps();
      const stage = control('brain-stage');
      if (state.view === 'tasks') {
        stage.className = 'brain-stage tasks-view';
        stage.innerHTML = bundle.tasks.map(t => `<figure class="brain-panel"><figcaption><span class="task ${t.id}">${t.label}</span></figcaption><canvas width="680" height="430" data-task="${t.id}" role="img" aria-label="${t.label}, ${metric}. Drag or use arrow keys to rotate."></canvas></figure>`).join('');
      } else {
        stage.className = 'brain-stage';
        stage.innerHTML = `<div class="contour-stage"><div class="contour-legend">${bundle.tasks.map(t => `<span class="task ${t.id}">${t.label}</span>`).join('')}</div><canvas width="680" height="430" role="img" aria-label="${metric} contours and spatial overlap. Drag or use arrow keys to rotate."></canvas></div>`;
      }
      geometryKey = key;
    }
    function renderMaps() {
      prepareMaps();
      if (!visible || !chapter.open || document.hidden) return;
      if (!surfaces.length) surfaces = all('[data-control="brain-stage"] canvas').map(canvas => {
        connectRotation(canvas);
        return {view:new window.LexicalSurfaceView(canvas, bundle, state.hemi), task:canvas.dataset.task || null};
      });
      for (const item of surfaces) item.view.draw(cell(), state.index, {task:item.task, scope:state.scope, camera});
    }
    function trace() {
      const c = cell(), lo = c.times[0], hi = c.times.at(-1);
      const values = bundle.tasks.flatMap(t => c.roiTraces[t.id][state.roi].mean).filter(v => v !== null);
      let min = Math.min(0, ...values), max = Math.max(.01, ...values), pad = (max - min) * .12;
      min -= pad; max += pad;
      const x = t => 45 + (t - lo) / (hi - lo) * 815, y = v => 98 - (v - min) / (max - min) * 80;
      const lines = bundle.tasks.map(t => {
        const curve = c.roiTraces[t.id][state.roi];
        if (!curve.n) return '';
        return `<path d="${curve.mean.map((v,i) => `${i ? 'L' : 'M'}${x(c.times[i]).toFixed(2)} ${y(v).toFixed(2)}`).join(' ')}" fill="none" stroke="${t.color}" stroke-width="2.2" vector-effect="non-scaling-stroke"/>`;
      }).join('');
      control('trace').innerHTML = `<div class="trace-plot"><svg viewBox="0 0 900 130" preserveAspectRatio="none" role="img" aria-label="Mean ${metric} time course in ${bundle.roiLabels[state.roi]}"><line x1="45" x2="860" y1="${y(0)}" y2="${y(0)}" stroke="#bac4c9"/><line x1="${x(0)}" x2="${x(0)}" y1="15" y2="100" stroke="#bac4c9" stroke-dasharray="3 4"/>${lines}<line data-control="trace-cursor" x1="${x(c.times[state.index])}" x2="${x(c.times[state.index])}" y1="12" y2="101" stroke="#142d43"/></svg><span class="trace-axis-label trace-axis-upper" aria-hidden="true">${max.toFixed(2)}</span><span class="trace-axis-label trace-axis-lower" aria-hidden="true">${min.toFixed(2)}</span></div><p class="real-trace-caption">${metric === 'activation' ? 'HGA z-score' : 'Pseudoword − Word · ΔHGA z-score'}</p>`;
    }
    function renderTime() {
      const c = cell(), t = c.times[state.index];
      control('time').value = state.index; control('time-output').textContent = ms(t);
      control('time').setAttribute('aria-valuetext', `${t} milliseconds from stimulus ${state.align}`);
      const cursor = control('trace-cursor');
      if (cursor) {
        const x = 45 + (t - c.times[0]) / (c.times.at(-1) - c.times[0]) * 815;
        cursor.setAttribute('x1', x); cursor.setAttribute('x2', x);
      }
      renderMaps();
    }
    function render() {
      const c = cell(); state.index = Math.max(0, Math.min(c.times.length - 1, state.index));
      for (const key of ['view','roi','hemi']) pressed(key, state[key]);
      control('alignment').value = state.align; control('scope').value = state.scope;
      if (control('direction')) control('direction').value = state.direction;
      control('settings-summary').textContent = `${state.hemi.toUpperCase()} · ${state.align}${metric === 'contrast' ? ' · ' + (state.direction === 'nwwd' ? 'PW > W' : 'W > PW') : ''}`;
      control('overlay-options').hidden = state.view !== 'contours';
      control('time').max = c.times.length - 1; control('speed').value = state.speed;
      control('time-label').textContent = `Time from stimulus ${state.align}`;
      control('time-ticks').dataset.align = state.align;
      control('time-ticks').innerHTML = `<span>${ms(c.times[0])}</span><span class="zero-tick" style="left:${-c.times[0] / (c.times.at(-1) - c.times[0]) * 100}%">0</span><span>${ms(c.times.at(-1))}</span>`;
      control('signal-key').innerHTML = `<span class="key-ramp contrast-ramp"></span><span>−${c.upper} ← 0 → +${c.upper} · ${metric === 'activation' ? 'HGA surface sum' : 'PW − W surface sum'}</span>`;
      control('selection-note').textContent = `Fixed selection window: ${c.selectionWindow.map(v => v.toFixed(2)).join(' to ')} s from stimulus ${state.align}.`;
      control('counts-note').textContent = `${state.hemi.toUpperCase()} map contacts: ${bundle.tasks.map(t => `${t.label} ${c.counts[t.id][state.hemi]}`).join('; ')}. Bilateral curve contacts (${bundle.roiLabels[state.roi]}): ${bundle.tasks.map(t => `${t.label} ${c.roiTraces[t.id][state.roi].n || '0 (no data)'}`).join('; ')}.`;
      control('kernel-note').textContent = `${c.kernel} spatial kernel. Contour level: ±${c.level}. Surface color depends on both amplitude and contact coverage. Curves are selection-conditioned, not an independent test of selection.`;
      trace(); renderTime();
    }
    function pause() {
      state.playing = false; if (raf !== null) cancelAnimationFrame(raf); raf = null; last = null;
      control('play').setAttribute('aria-label', 'Play animation'); control('play').innerHTML = '<span aria-hidden="true">▶</span>';
    }
    function start() {
      controllers.forEach(c => c.pause());
      if (state.index === cell().times.length - 1) state.index = 0;
      state.playing = true; last = null;
      control('play').setAttribute('aria-label', 'Pause animation'); control('play').innerHTML = '<span aria-hidden="true">Ⅱ</span>';
      const tick = now => {
        if (!state.playing) return;
        if (last === null) last = now;
        const interval = 62.5 / state.speed;
        if (now - last >= interval) {
          state.index += Math.floor((now - last) / interval); last = now - (now - last) % interval;
          if (state.index >= cell().times.length) { state.index = cell().times.length - 1; pause(); }
          renderTime();
        }
        if (state.playing) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    function nearest(t) { return cell().times.reduce((best,time,i) => Math.abs(time - t) < Math.abs(cell().times[best] - t) ? i : best, 0); }
    function resetEvent() { pause(); state.index = nearest(0); render(); }
    function restore(params) {
      pause(); Object.assign(state, defaults); camera.yaw = 0; camera.pitch = 0;
      const allowed = {view:['tasks','contours'], align:['onset','offset'], direction:['nwwd','wdnw'], hemi:['lh','rh'], scope:['all','active','none'], roi:Object.keys(bundle.roiLabels)};
      for (const [key, choices] of Object.entries(allowed)) if (choices.includes(params.get(key))) state[key] = params.get(key);
      const number = (key, fallback) => params.has(key) && Number.isFinite(Number(params.get(key))) ? Number(params.get(key)) : fallback;
      setCamera(number('yaw', 0), number('pitch', 0)); state.index = nearest(number('t', 300)); render();
    }
    const controller = {metric, root, chapter, pause, restore, hash:() => (metric === 'activation' ? 'hga?' : 'contrast?') + new URLSearchParams({view:state.view, align:state.align, direction:state.direction, hemi:state.hemi, scope:state.scope, roi:state.roi, t:String(cell().times[state.index]), yaw:camera.yaw.toFixed(1), pitch:camera.pitch.toFixed(1)})};
    control('roi-controls').insertAdjacentHTML('beforeend', Object.entries(bundle.roiLabels).map(([id,label]) => `<button type="button" data-roi="${id}" aria-pressed="${id === state.roi}">${label}</button>`).join(''));
    const settings = () => control('settings').open = !compact.matches;
    settings(); compact.addEventListener('change', settings);
    for (const key of ['view','roi','hemi']) all(`[data-${key}]`).forEach(b => b.addEventListener('click', () => { pause(); state[key] = b.dataset[key]; render(); }));
    control('alignment').addEventListener('change', e => { state.align = e.target.value; resetEvent(); });
    control('direction')?.addEventListener('change', e => { pause(); state.direction = e.target.value; render(); });
    control('scope').addEventListener('change', e => { state.scope = e.target.value; renderTime(); });
    control('time').addEventListener('input', e => { pause(); state.index = Number(e.target.value); renderTime(); });
    control('reset').addEventListener('click', resetEvent);
    control('reset-view').addEventListener('click', () => setCamera(0,0));
    control('play').addEventListener('click', () => state.playing ? pause() : start());
    control('speed').addEventListener('change', e => state.speed = Number(e.target.value));
    control('copy-view').addEventListener('click', () => share('current', controller));
    chapter.addEventListener('toggle', () => { if (!chapter.open) { pause(); releaseMaps(); } else renderMaps(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); releaseMaps(); } else renderMaps(); });
    motion.addEventListener('change', () => { if (motion.matches) pause(); });
    window.addEventListener('resize', queueCameraDraw);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      // An anchor jump can queue both leave and enter records in one delivery.
      visible = entries.at(-1).isIntersecting;
      if (visible) renderMaps(); else { pause(); releaseMaps(); }
    }).observe(root); else visible = true;
    render(); return controller;
  }

  controllers.push(...$$('[data-explorer]').map(createExplorer));
  // The hero is a single still; release its GPU context before visitors scroll to the players.
  const heroCanvas = document.createElement('canvas'); $('#hero-brain').append(heroCanvas);
  const heroView = new window.LexicalSurfaceView(heroCanvas, bundle, 'lh');
  heroView.draw(bundle.cells['activation-onset'], 12, {task:'repeat'});
  const heroImage = new Image(); heroImage.alt = 'Left hemisphere high-gamma activity during repetition';
  heroImage.width = heroCanvas.width; heroImage.height = heroCanvas.height; heroImage.src = heroCanvas.toDataURL();
  heroCanvas.replaceWith(heroImage); heroView.destroy();

  function applyHash() {
    let [target, query = ''] = location.hash.slice(1).split('?');
    const params = new URLSearchParams(query);
    if (target === 'activation') target = 'hga';
    if (target === 'components' || (target === 'hga' && params.get('metric') === 'contrast')) target = 'contrast';
    const element = document.getElementById(target); if (!element) return;
    const controller = controllers.find(c => c.chapter === element);
    controllers.filter(c => c !== controller).forEach(c => c.pause());
    if (element.matches('details')) element.open = true;
    if (controller && query) controller.restore(params);
    requestAnimationFrame(() => (controller?.root || element).scrollIntoView({behavior:motion.matches ? 'instant' : 'smooth', block:'start'}));
  }
  const chapters = $$('.chapter');
  const sync = () => $('#toggle-chapters').textContent = chapters.every(c => c.open) ? 'Collapse all chapters −' : 'Expand all chapters +';
  chapters.forEach(c => c.addEventListener('toggle', sync));
  $('#toggle-chapters').addEventListener('click', () => { const open = !chapters.every(c => c.open); chapters.forEach(c => c.open = open); sync(); });
  window.addEventListener('hashchange', applyHash);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', () => { if (a.getAttribute('href') === location.hash) applyHash(); }));
  $('#copy-story').addEventListener('click', () => share('story'));
  $('#copy-session').addEventListener('click', () => share('session'));
  sync(); if (location.hash) requestAnimationFrame(applyHash);
}());
