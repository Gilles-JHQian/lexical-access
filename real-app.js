(function () {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const bundle = window.LexicalRealBundle;
  if (!bundle || bundle.kind !== 'real') throw new Error('The real HGA bundle is missing.');
  const dataLoader = new window.LexicalDataLoader(bundle);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width:620px)');
  const controllers = [];
  const renderStyle = {...window.LexicalSurfaceView.defaults};
  let developerPanel = null;
  const defaults = {view:'tasks', align:'onset', direction:'nwwd', hemi:'lh', scope:'all', roi:'all', processing:'original', index:18, speed:1};
  const ms = t => `${t > 0 ? '+' : t < 0 ? '−' : ''}${Math.abs(Math.round(t))} ms`;

  const selectedChoice = group => group.querySelector('button[data-choice][aria-pressed="true"]');
  function setChoice(group, value) {
    group?.querySelectorAll('button[data-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.value === String(value))));
  }
  function onChoice(group, change) {
    group?.addEventListener('click', event => {
      const button = event.target.closest('button[data-choice]');
      if (!button || !group.contains(button) || button.getAttribute('aria-pressed') === 'true') return;
      setChoice(group, button.value); change(button.value);
    });
  }

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
    const developerControls = root.querySelector('.developer-controls');
    const control = name => root.querySelector(`[data-control="${name}"]`) || developerControls.querySelector(`[data-control="${name}"]`);
    const all = selector => [...new Set([...root.querySelectorAll(selector), ...developerControls.querySelectorAll(selector)])];
    const state = {...defaults, playing:false}, camera = {yaw:0, pitch:0};
    const cell = () => bundle.cells[metric === 'activation' ? `activation-${state.align}` : `contrast-${state.align}-${state.direction}${state.processing==='original'?'':'-'+state.processing}`];
    let surfaces = [], geometryKey = '', visible = false, raf = null, last = null, cameraRaf = null;
    let requested = '', failed = '', waitingIndex = null;
    const pressed = (key, value) => all(`[data-${key}]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[key] === value)));

    function releaseMaps() {
      for (const item of surfaces) item.view.destroy();
      surfaces = []; geometryKey = ''; requested = ''; waitingIndex = null;
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
    function loading(message, retry=false) {
      control('load-status').hidden=!message;control('load-message').textContent=message;
      control('retry').hidden=!retry;
      control('brain-stage').setAttribute('aria-busy',String(Boolean(message)));
    }
    function needFrame(index) {
      const c=cell(),hemi=state.hemi,key=`${c.metric}:${c.align}:${c.direction}:${state.processing}:${hemi}:${index}`;
      if(failed===key||requested===key)return;
      requested=key;failed='';loading('Loading this view…');
      dataLoader.ensure(c,hemi,index).then(()=>{
        if(requested!==key)return;
        requested='';last=null;
        if(waitingIndex===index){state.index=index;waitingIndex=null;renderTime();}
        else renderMaps();
      }).catch(error=>{
        if(requested!==key)return;
        requested='';failed=key;pause();
        loading(error.name==='AbortError'?'Loading took too long. Please try again.':error.message+' Please try again.',true);
      });
    }
    function renderMaps() {
      prepareMaps();
      if (!visible || !chapter.open || document.hidden) return;
      const ready=dataLoader.peek(cell(),state.hemi,state.index);
      if(!ready){needFrame(state.index);return;}
      if(waitingIndex!==null)return;
      requested='';failed='';loading('');
      if (!surfaces.length) surfaces = all('[data-control="brain-stage"] canvas').map(canvas => {
        connectRotation(canvas);
        return {view:new window.LexicalSurfaceView(canvas, bundle, state.hemi), task:canvas.dataset.task || null};
      });
      for (const item of surfaces) {
        item.view.draw(ready.cell, ready.index, {task:item.task, scope:state.scope, camera, style:renderStyle});
        item.view.canvas.dataset.time=String(cell().times[state.index]);
        item.view.canvas.dataset.cell=cell().id||`${metric}-${state.align}`;
        item.view.canvas.dataset.hemi=state.hemi;
        item.view.canvas.dataset.processing=metric==='contrast'?state.processing:'original';
      }
      if(state.playing)dataLoader.prefetch(cell(),state.hemi,state.index);
    }
    function renderTime() {
      const c = cell(), t = c.times[state.index];
      control('time').value = state.index; control('time-output').textContent = ms(t);
      control('time').setAttribute('aria-valuetext', `${t} milliseconds from stimulus ${state.align}`);
      const status=control('processing-status');
      if(status){
        status.hidden=state.processing==='original';
        const outside=c.inferenceWindow&&(t<c.inferenceWindow[0]*1000||t>c.inferenceWindow[1]*1000);
        status.textContent=(c.processingLabel||'')+(outside?' · Outside the tested window':'');
      }
      renderMaps();
    }
    function render() {
      const c = cell(); state.index = Math.max(0, Math.min(c.times.length - 1, state.index));
      for (const key of ['view','hemi']) pressed(key, state[key]);
      setChoice(control('alignment'), state.align); setChoice(control('scope'), state.scope);
      setChoice(control('direction'), state.direction);
      setChoice(control('processing'), state.processing);
      control('settings-summary').textContent = `${state.hemi.toUpperCase()} · ${state.align}${metric === 'contrast' ? ' · ' + (state.direction === 'nwwd' ? 'PW > W' : 'W > PW') : ''}`;
      control('overlay-options').hidden = state.view !== 'contours';
      control('time').max = c.times.length - 1; setChoice(control('speed'), state.speed);
      control('time-label').textContent = `Time from stimulus ${state.align}`;
      control('time-ticks').dataset.align = state.align;
      control('time-ticks').innerHTML = `<span>${ms(c.times[0])}</span><span class="zero-tick" style="left:${-c.times[0] / (c.times.at(-1) - c.times[0]) * 100}%">0</span><span>${ms(c.times.at(-1))}</span>`;
      control('signal-key').innerHTML = state.view === 'contours' ? `<span>Solid + · dashed − · pale task fill${state.scope !== 'none' && renderStyle.overlap !== 'none' ? (renderStyle.overlap === 'hatch' ? ' · hatching: spatial overlap' : ' · blue tint: spatial overlap') : ''}</span>` : `<span class="key-ramp contrast-ramp"></span><span>−${c.upper} ← 0 → +${c.upper} · ${metric === 'activation' ? 'HGA surface sum' : 'PW − W surface sum'}</span>`;
      control('selection-note').textContent = `Fixed selection window: ${c.selectionWindow.map(v => v.toFixed(2)).join(' to ')} s from stimulus ${state.align}.`;
      control('counts-note').textContent = `${state.hemi.toUpperCase()} source pool: ${bundle.tasks.map(t => `${t.label} ${c.counts[t.id][state.hemi]}`).join('; ')}.${state.processing==='cluster'?' Only samples inside the directional SDR1 significant clusters contribute.':''}`;
      control('kernel-note').textContent = `${c.kernel} spatial kernel. Contour level: ±${c.level}. Surface color depends on both amplitude and contact coverage.`;
      renderTime();
    }
    function pause() {
      state.playing = false; waitingIndex=null; requested=''; if (raf !== null) cancelAnimationFrame(raf); raf = null; last = null;
      control('play').setAttribute('aria-label', 'Play animation'); control('play').innerHTML = '<span aria-hidden="true">▶</span>';
    }
    function start() {
      controllers.forEach(c => c.pause());
      if (state.index === cell().times.length - 1) state.index = 0;
      state.playing = true; last = null;failed='';
      control('play').setAttribute('aria-label', 'Pause animation'); control('play').innerHTML = '<span aria-hidden="true">Ⅱ</span>';
      renderTime();
      const tick = now => {
        if (!state.playing) return;
        if(waitingIndex!==null||!dataLoader.peek(cell(),state.hemi,state.index)){
          last=null;raf=requestAnimationFrame(tick);return;
        }
        if (last === null) last = now;
        const interval = (cell().times[1]-cell().times[0]) / state.speed;
        if (now - last >= interval) {
          const next=Math.min(cell().times.length-1,state.index+Math.floor((now-last)/interval));
          if(!dataLoader.peek(cell(),state.hemi,next)){
            waitingIndex=next;last=null;needFrame(next);
          }else{
            state.index=next;last=now-(now-last)%interval;
            if(state.index===cell().times.length-1)pause();
            renderTime();
          }
        }
        if (state.playing) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    function nearest(t) { return cell().times.reduce((best,time,i) => Math.abs(time - t) < Math.abs(cell().times[best] - t) ? i : best, 0); }
    function resetEvent() { pause(); state.index = nearest(0); render(); }
    function restore(params) {
      pause(); Object.assign(state, defaults); camera.yaw = 0; camera.pitch = 0;
      const allowed = {view:['tasks','contours'], align:['onset','offset'], direction:['nwwd','wdnw'], hemi:['lh','rh'], scope:['all','active','none'], processing:metric==='contrast'?['original','smooth','cluster']:['original'], roi:Object.keys(bundle.roiLabels)};
      for (const [key, choices] of Object.entries(allowed)) if (choices.includes(params.get(key))) state[key] = params.get(key);
      const number = (key, fallback) => params.has(key) && Number.isFinite(Number(params.get(key))) ? Number(params.get(key)) : fallback;
      for(const [param,key,lo,hi] of [['fill','fillOpacity',0,.45],['line','lineWidth',.75,3],['brain','brightness',.8,1],['fold','curvature',.03,.25],['smooth','smoothing',0,1.5]])if(params.has(param))renderStyle[key]=Math.max(lo,Math.min(hi,number(param,renderStyle[key])));
      if(['none','hatch','tint'].includes(params.get('overlap')))renderStyle.overlap=params.get('overlap');
      developerPanel?.syncAppearance();controllers.filter(c=>c.metric!==metric).forEach(c=>c.refresh());
      setCamera(number('yaw', 0), number('pitch', 0)); state.index = nearest(number('t', 300)); render();
    }
    const controller = {metric, root, chapter, pause, restore, developerControls, refresh:render, hash:() => (metric === 'activation' ? 'hga?' : 'contrast?') + new URLSearchParams({view:state.view, align:state.align, direction:state.direction, hemi:state.hemi, scope:state.scope, roi:state.roi, ...(metric==='contrast'?{processing:state.processing}:{}), t:String(cell().times[state.index]), yaw:camera.yaw.toFixed(1), pitch:camera.pitch.toFixed(1), fill:String(renderStyle.fillOpacity), line:String(renderStyle.lineWidth), brain:String(renderStyle.brightness), fold:String(renderStyle.curvature), overlap:renderStyle.overlap, smooth:String(renderStyle.smoothing)})};

    const settings = () => control('settings').open = !compact.matches;
    settings(); compact.addEventListener('change', settings);
    for (const key of ['view','hemi']) all(`[data-${key}]`).forEach(b => b.addEventListener('click', () => { pause(); state[key] = b.dataset[key]; render(); }));
    onChoice(control('alignment'), value => { state.align = value; resetEvent(); });
    onChoice(control('direction'), value => { pause(); state.direction = value; render(); });
    onChoice(control('processing'), value => { pause(); state.processing = value; render(); });
    onChoice(control('scope'), value => { state.scope = value; render(); });
    control('time').addEventListener('input', e => { pause(); state.index = Number(e.target.value); renderTime(); });
    control('retry').addEventListener('click',()=>{failed='';requested='';renderMaps();});
    control('reset').addEventListener('click', resetEvent);
    control('reset-view').addEventListener('click', () => setCamera(0,0));
    control('play').addEventListener('click', () => {if(state.playing){pause();renderMaps();}else start();});
    onChoice(control('speed'), value => { state.speed = Number(value); });
    chapter.addEventListener('toggle', () => { if (!chapter.open) { pause(); releaseMaps(); } else renderMaps(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); releaseMaps(); } else renderMaps(); });
    motion.addEventListener('change', () => { if (motion.matches) pause(); });
    window.addEventListener('resize', queueCameraDraw);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      // An anchor jump can queue both leave and enter records in one delivery.
      visible = entries.at(-1).isIntersecting;
      if (visible) {renderMaps();developerPanel?.select(controller);} else { pause(); releaseMaps(); }
    }).observe(root); else visible = true;
    root.addEventListener('pointerdown',()=>developerPanel?.select(controller));
    root.addEventListener('focusin',()=>developerPanel?.select(controller));
    render(); return controller;
  }

  function setupDeveloperPanel() {
    const panel=$('#developer-panel'),toggle=$('#developer-toggle'),target=$('#developer-target');
    let active=controllers[0];
    for(const c of controllers){$('#developer-groups').append(c.developerControls);c.developerControls.dataset.owner=c.metric;}
    const ranges=[['brightness','Brain lightness',.8,1,.01],['curvature','Sulcal contrast',.03,.25,.01],['fillOpacity','Contour fill',0,.45,.01],['lineWidth','Contour width',.75,3,.05],['smoothing','Contour line smoothing',0,1.5,.1]];
    $('#developer-appearance').innerHTML=ranges.map(([key,label,min,max,step])=>`<label class="developer-range">${label}<output data-style-output="${key}"></output><input type="range" data-style="${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${renderStyle[key]}"></label>`).join('')+'<fieldset class="choice-field" data-style="overlap"><legend>Overlap style</legend><div class="choice-buttons"><button type="button" data-choice value="hatch" aria-pressed="true">Hatching</button><button type="button" data-choice value="tint" aria-pressed="false">Blue tint</button><button type="button" data-choice value="none" aria-pressed="false">Hidden</button></div></fieldset>';
    function syncAppearance(){
      for(const [key] of ranges){$(`[data-style="${key}"]`).value=renderStyle[key];$(`[data-style-output="${key}"]`).textContent=key==='lineWidth'?`${renderStyle[key].toFixed(2)} px`:key==='smoothing'?`${renderStyle[key].toFixed(1)} mm`:`${Math.round(renderStyle[key]*100)}%`;}
      setChoice($('[data-style=overlap]'), renderStyle.overlap);
    }
    function select(controller){
      if(!controller)return;active=controller;setChoice(target, controller.metric);
      for(const c of controllers)c.developerControls.hidden=c!==controller;
      $('#developer-section-name').textContent=controller.metric==='activation'?'HGA activation':'HGA contrast';
    }
    function close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});}
    toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){clamp();selectedChoice(target).focus({preventScroll:true});}});
    $('#developer-close').addEventListener('click',close);
    panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
    onChoice(target,value=>{const c=controllers.find(c=>c.metric===value);select(c);c.chapter.open=true;c.root.scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'start'});});
    $('#developer-appearance').addEventListener('input',e=>{
      const key=e.target.dataset.style;if(!key)return;renderStyle[key]=Number(e.target.value);
      syncAppearance();controllers.forEach(c=>c.refresh());
    });
    onChoice($('[data-style=overlap]'), value => { renderStyle.overlap = value; syncAppearance(); controllers.forEach(c => c.refresh()); });
    $('#developer-copy').addEventListener('click',()=>share('current',active));
    $('#developer-reset').addEventListener('click',()=>{Object.assign(renderStyle,window.LexicalSurfaceView.defaults);syncAppearance();controllers.forEach(c=>c.refresh());});
    $('#developer-hide').addEventListener('click',()=>{
      panel.hidden=true;toggle.hidden=true;const url=new URL(location.href);url.searchParams.set('dev','0');history.replaceState(null,'',url);active.root.setAttribute('tabindex','-1');active.root.focus({preventScroll:true});
    });
    const dev=new URL(location.href).searchParams.get('dev');
    toggle.hidden=dev==='0'||(dev!=='1'&&document.body.dataset.developerTools==='false');
    const handle=$('#developer-drag');let drag=null,moved=false;
    function clamp(){if(!moved)return;const r=panel.getBoundingClientRect();panel.style.left=`${Math.max(8,Math.min(innerWidth-r.width-8,r.left))}px`;panel.style.top=`${Math.max(8,Math.min(innerHeight-r.height-8,r.top))}px`;}
    handle.addEventListener('pointerdown',e=>{
      if(e.target.closest('button')||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
      const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};handle.setPointerCapture(e.pointerId);moved=true;
      panel.style.right='auto';panel.style.bottom='auto';panel.style.left=r.left+'px';panel.style.top=r.top+'px';
    });
    handle.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;panel.style.left=e.clientX-drag.x+'px';panel.style.top=e.clientY-drag.y+'px';clamp();});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,e=>{if(drag?.id===e.pointerId){drag=null;if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);}});
    window.addEventListener('resize',()=>{if(!panel.hidden)clamp();});
    syncAppearance();select(active);return {select,syncAppearance};
  }

  controllers.push(...$$('[data-explorer]').map(createExplorer));
  developerPanel=setupDeveloperPanel();
  // Fetch one hero block only when the story header is visible. Direct NFC/contrast
  // entrances do not download activation just to build an offscreen illustration.
  const hero=$('#hero-brain');let heroBusy=false,heroDone=false;
  async function renderHero(){
    if(heroBusy||heroDone||document.hidden)return;
    heroBusy=true;
    try{
      const c=bundle.cells['activation-onset'],index=c.times.indexOf(500);
      const ready=await dataLoader.ensure(c,'lh',index);
      const canvas=document.createElement('canvas');hero.append(canvas);
      const view=new window.LexicalSurfaceView(canvas,bundle,'lh');view.draw(ready.cell,ready.index,{task:'repeat'});
      const img=new Image();img.alt='Left hemisphere high-gamma activity during repetition';
      img.width=canvas.width;img.height=canvas.height;img.src=canvas.toDataURL();canvas.replaceWith(img);view.destroy();heroDone=true;
    }catch{hero.textContent='Brain preview unavailable.';}finally{heroBusy=false;}
  }
  if('IntersectionObserver' in window){
    // Let initial hash navigation settle before observing the header.
    setTimeout(()=>new IntersectionObserver(entries=>{if(entries.at(-1).isIntersecting)renderHero();}).observe(hero),150);
  }else if(!location.hash)renderHero();

  function applyHash() {
    let [target, query = ''] = location.hash.slice(1).split('?');
    const params = new URLSearchParams(query);
    if (target === 'activation') target = 'hga';
    if (target === 'components' || (target === 'hga' && params.get('metric') === 'contrast')) target = 'contrast';
    const element = document.getElementById(target); if (!element) return;
    const controller = controllers.find(c => c.chapter === element);
    controllers.filter(c => c !== controller).forEach(c => c.pause());
    if (element.matches('details')) element.open = true;
    if(controller)developerPanel?.select(controller);
    if (controller && query) controller.restore(params);
    requestAnimationFrame(() => (controller?.root || element).scrollIntoView({behavior:motion.matches ? 'instant' : 'smooth', block:'start'}));
  }
  const chapters = $$('.chapter');
  const sync = () => $('#toggle-chapters').textContent = chapters.every(c => c.open) ? 'Collapse all chapters −' : 'Expand all chapters +';
  chapters.forEach(c => c.addEventListener('toggle', sync));
  $('#toggle-chapters').addEventListener('click', () => { const open = !chapters.every(c => c.open); chapters.forEach(c => c.open = open); sync(); });
  window.addEventListener('hashchange', applyHash);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', () => { if (a.getAttribute('href') === location.hash) applyHash(); }));
  // Native audio remains available without JS; do not overlap the two examples.
  const examples = $$('.stimulus-example audio');
  examples.forEach(audio => audio.addEventListener('play', () => {
    examples.filter(other => other !== audio).forEach(other => other.pause());
    controllers.forEach(controller => controller.pause());
  }));
  $('#question').addEventListener('toggle', event => {
    if (!event.currentTarget.open) examples.forEach(audio => audio.pause());
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) examples.forEach(audio => audio.pause()); });
  // Static poster components have their own controls and load only when visited.
  const staticRoot = $('#contrast-results'), staticPanels = $$('.contrast-result');
  let staticVisible = false;
  function selectedPanel() { return staticPanels.find(p => p.dataset.staticPanel === `${selectedChoice($('#static-alignment')).value}-${selectedChoice($('#static-direction')).value}`); }
  async function loadStaticPanel(panel, retry = false) {
    if (!staticVisible || panel.dataset.loaded === 'true' || panel.dataset.loading === 'true') return;
    panel.dataset.loading = 'true';
    const status = panel.querySelector('.static-load-status'), button = status.querySelector('button');
    status.hidden = false; status.querySelector('span').textContent = 'Loading poster figures…'; button.hidden = true;
    try {
      await Promise.all([...panel.querySelectorAll('img[data-src]')].map(async img => {
        if (retry) img.removeAttribute('src');
        if (!img.hasAttribute('src')) img.src = img.dataset.src;
        await img.decode();
      }));
      panel.dataset.loaded = 'true'; status.hidden = true;
    } catch {
      status.querySelector('span').textContent = 'The poster figures could not load.'; button.hidden = false;
    } finally { panel.dataset.loading = 'false'; }
  }
  function showStaticPanel() {
    const selected = selectedPanel();
    staticPanels.forEach(panel => panel.hidden = panel !== selected);
    $('#static-selection').textContent = `${selectedChoice($('#static-alignment')).textContent}, ${selectedChoice($('#static-direction')).textContent}. ${selected.querySelector('.poster-window').textContent}`;
    loadStaticPanel(selected);
  }
  for (const id of ['static-alignment','static-direction']) onChoice($('#'+id), showStaticPanel);
  staticPanels.forEach(panel => panel.querySelector('[data-static-retry]').addEventListener('click', () => loadStaticPanel(panel, true)));
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    staticVisible = entries.at(-1).isIntersecting;
    if (staticVisible) loadStaticPanel(selectedPanel());
  }).observe(staticRoot); else staticVisible = true;
  showStaticPanel();

  // 100% means fit to the available viewport, including tall figures on laptops.
  const figureDialog = $('#decoding-dialog'), figureViewport = figureDialog.querySelector('.figure-zoom');
  const figureCanvas = figureDialog.querySelector('.figure-canvas'), figureImage = figureCanvas.querySelector('img');
  let figureZoom = 100;
  function resizeFigure(center = true) {
    if (!figureDialog.open || !figureImage.naturalWidth) return;
    const width = figureViewport.clientWidth, height = figureViewport.clientHeight;
    const fit = Math.min((width-16)/figureImage.naturalWidth, (height-16)/figureImage.naturalHeight);
    const imageWidth = figureImage.naturalWidth*fit*figureZoom/100, imageHeight = figureImage.naturalHeight*fit*figureZoom/100;
    figureImage.style.width = imageWidth+'px'; figureImage.style.height = imageHeight+'px';
    figureCanvas.style.width = Math.max(width,imageWidth)+'px'; figureCanvas.style.height = Math.max(height,imageHeight)+'px';
    $('#figure-zoom-range').value = figureZoom; $('#figure-zoom-value').textContent = figureZoom+'%';
    $('#figure-zoom-out').disabled = figureZoom <= 25; $('#figure-zoom-in').disabled = figureZoom >= 400;
    if (center) {figureViewport.scrollLeft=(figureCanvas.offsetWidth-width)/2;figureViewport.scrollTop=(figureCanvas.offsetHeight-height)/2;}
  }
  function setFigureZoom(value) { figureZoom=Math.max(25,Math.min(400,value));resizeFigure(); }
  $('#figure-zoom-out').addEventListener('click',()=>setFigureZoom(figureZoom-25));
  $('#figure-zoom-in').addEventListener('click',()=>setFigureZoom(figureZoom+25));
  $('#figure-fit').addEventListener('click',()=>setFigureZoom(100));
  $('#figure-zoom-range').addEventListener('input',event=>setFigureZoom(Number(event.target.value)));
  figureImage.addEventListener('load',()=>resizeFigure());
  window.addEventListener('resize',()=>resizeFigure());
  $$('.figure-open').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !figureDialog.showModal) return;
    event.preventDefault();
    $('#decoding-dialog-title').textContent = link.dataset.figureTitle || 'Poster figure';
    figureImage.alt = link.querySelector('img')?.alt || link.dataset.figureTitle;
    figureZoom = 100; figureImage.style.width='0px';figureImage.style.height='0px';
    figureImage.src = link.href;
    figureDialog.showModal(); resizeFigure();
  }));
  sync(); if (location.hash) requestAnimationFrame(applyHash);
}());
