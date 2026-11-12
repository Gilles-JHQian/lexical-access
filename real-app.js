(function () {
  'use strict';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const bundle=window.LexicalRealBundle;
  if(!bundle||bundle.kind!=='real')throw new Error('The real-data bundle is missing; refusing to present mock data as real.');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const state={metric:'activation',view:'tasks',align:'onset',direction:'nwwd',hemi:'lh',scope:'all',roi:'all',index:8,speed:1,playing:false};
  const cell=()=>bundle.cells[state.metric==='activation'?`activation-${state.align}`:`contrast-${state.align}-${state.direction}`];
  let surfaces=[],geometryKey='',raf=null,last=null,cameraRaf=null;
  const camera={yaw:0,pitch:0};
  const ms=t=>`${t>0?'+':t<0?'−':''}${Math.abs(Math.round(t))} ms`;
  const pressed=(key,value)=>$$(`[data-${key}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===value)));
  function initCopy() {
    document.title='Lexical access in motion · real HGA pilot';
    $('.prototype-note').innerHTML='<span class="status-dot"></span> REAL HGA · DATA PILOT';
    $$('.mock-badge').forEach(el=>{el.textContent='REAL DATA · BIPOLAR';el.classList.add('real-badge');});
    $('.explorer-context b').textContent='REAL DATA · BIPOLAR';
    $('.hero-visual figcaption').textContent='Real bipolar HGA on the avg35 inflated template.';
    $('.explorer-intro p').textContent='Explore the existing poster HGA summaries across tasks. Play the native time samples, or drag to inspect one moment.';
    $('.map-key > span').textContent='avg35 inflated · drag to rotate · fixed source selection';
    $('#brain-stage').setAttribute('aria-label','Real bipolar HGA maps');
    $('#trace').setAttribute('aria-label','Real selected-contact mean time courses');
    $('.reading-guide').innerHTML=`<summary>Data source & how to read this pilot</summary><p>Real bipolar HGA summaries from the current poster (11 November 2026), recorded during Passive listening, Decision and Repetition. This pilot contains aggregate surface fields and electrode-mean curves; no subject identifiers, individual electrode time courses or raw recordings are included.</p><p>Activation retains each task’s original significant electrode set. Contrast uses the current Group 3 direction-specific, HGA-gated task memberships; the Nw &gt; W and W &gt; Nw selectors change the fixed selection, while every plotted value remains signed Nonword minus Word. Curves here use ΔHGA z, unlike the poster’s d′ curves.</p><p>Onset and offset are separate event-locked summaries. Switching alignment resets the timeline; it does not translate a common trial with an assumed duration. Frames use exact native samples at 62.5 ms intervals. Selection is fixed over each stated window; no new time-resolved significance test is implied.</p><p>Surface colors show unnormalized Gaussian-weighted sums, which depend on both amplitude and contact coverage. Activation uses the accepted legacy kernel (7 mm, 20 mm reach); contrast uses the accepted tissue kernel (7 mm, 15 mm reach). Curves show an unweighted mean over selected contacts, across both hemispheres; tasks may have different denominators.</p><p>Contours are instantaneous level sets on a denser display mesh. Drag any task map to rotate the common 3D camera; arrow keys rotate a focused map and Home resets its view. The maps retain identical angles across task/contour switches and time playback. Activation level = 2.04, contrast level = ±0.15, shared across tasks and frames. Solid = positive; dashed = negative. Hatching is same-sign spatial overlap above that display level, not an electrode intersection or statistical conjunction. This animation does not apply the static poster’s spatial-envelope closing or island treatment.</p><p>ROI buttons use the established ST, ventral temporal and prefrontal display groups. They are descriptive curve subsets, not the decoding ROI definition. Missing groups remain missing. Curves are selection-conditioned and should not be treated as an independent test of selection.</p>`;
    $('.explorer-bottom p').textContent='Drag any brain to rotate all three tasks together. The contour view keeps the same angle. LH / RH changes the displayed hemisphere; curve summaries remain bilateral.';
    $('.view-bar').insertAdjacentHTML('afterend','<div class="rotation-controls"><span id="rotation-help">Drag a brain · views rotate together</span><button type="button" id="reset-view" aria-label="Reset brain view to lateral">Reset view ↺</button></div>');
    $('.roi-controls').innerHTML=Object.entries(bundle.roiLabels).map(([id,label])=>`<button type="button" data-roi="${id}" aria-pressed="${id===state.roi}">${label}</button>`).join('');
    $('.trace-header > span').textContent='SELECTED-CONTACT MEAN · BOTH HEMISPHERES';
    $('.explorer-toolbar').insertAdjacentHTML('afterend',`<div class="real-options"><fieldset class="view-controls" id="hemi-controls"><legend class="sr-only">Hemisphere</legend><button data-hemi="lh" aria-pressed="true">LH</button><button data-hemi="rh" aria-pressed="false">RH</button></fieldset><label id="direction-label">Selection <select id="direction"><option value="nwwd">Nw &gt; W set</option><option value="wdnw">W &gt; Nw set</option></select></label><span class="source-line" id="selection-note"></span></div>`);
    $('.hero-visual-top').lastElementChild.textContent='BIPOLAR HGA · REAL DATA';
    $('#hero-brain').innerHTML='<canvas aria-label="Real bipolar HGA, left hemisphere" role="img"></canvas>';
    new window.LexicalSurfaceView($('#hero-brain canvas'),bundle,'lh').draw(bundle.cells['activation-onset'],12,{task:'repeat'});
    const componentLinks=$$('.component-link');
    componentLinks[0].href='#hga?metric=contrast&view=contours&scope=all&direction=nwwd&align=onset&roi=st&t=700';
    componentLinks[1].href='#hga?metric=contrast&view=contours&scope=active&direction=wdnw&align=onset&roi=ventral&t=700';
    componentLinks[2].href='#hga?metric=contrast&view=contours&scope=active&direction=nwwd&align=offset&roi=frontal&t=250';
    $('#components .small-note').textContent='Narrative from the poster text draft. Explore opens the corresponding real direction-selected task maps; these are the current Group 3 task sets, not the earlier exact-intersection components.';
  }
  function queueCameraDraw(){
    if(cameraRaf!==null)return;
    cameraRaf=requestAnimationFrame(()=>{cameraRaf=null;renderMaps();});
  }
  function setCamera(yaw,pitch){
    camera.yaw=((yaw+180)%360+360)%360-180;camera.pitch=Math.max(-85,Math.min(85,pitch));queueCameraDraw();
  }
  function connectRotation(canvas){
    canvas.tabIndex=0;canvas.setAttribute('aria-describedby','rotation-help');
    canvas.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight ArrowUp ArrowDown Home');
    canvas.setAttribute('aria-label',canvas.getAttribute('aria-label')+'. Drag or use arrow keys to rotate. Home resets the view.');
    let drag=null;
    canvas.addEventListener('pointerdown',e=>{
      if(e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
      const box=canvas.getBoundingClientRect();
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:camera.yaw,pitch:camera.pitch,scale:180/Math.max(120,Math.min(box.width,box.height))};
      canvas.setPointerCapture(e.pointerId);canvas.classList.add('is-dragging');
      if(e.pointerType==='mouse')canvas.focus({preventScroll:true});
    });
    canvas.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      setCamera(drag.yaw+(e.clientX-drag.x)*drag.scale,drag.pitch+(e.clientY-drag.y)*drag.scale);
    });
    const end=e=>{if(drag?.id===e.pointerId){drag=null;canvas.classList.remove('is-dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
    canvas.addEventListener('dblclick',()=>setCamera(0,0));
    canvas.addEventListener('keydown',e=>{
      const step=e.shiftKey?15:5,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
      if(e.key==='Home'){e.preventDefault();setCamera(0,0);}
      else if(delta[e.key]){e.preventDefault();setCamera(camera.yaw+delta[e.key][0],camera.pitch+delta[e.key][1]);}
    });
  }
  function pause() {state.playing=false;if(raf!==null)cancelAnimationFrame(raf);raf=null;last=null;$('#play').setAttribute('aria-label','Play animation');$('#play').innerHTML='<span aria-hidden="true">▶</span>';}
  function renderMaps() {
    const c=cell(),key=`${state.view}:${state.hemi}`;
    if(key!==geometryKey) {
      for(const surface of surfaces)surface.view.destroy?.();
      const stage=$('#brain-stage');
      if(state.view==='tasks') {
        stage.className='brain-stage tasks-view';
        stage.innerHTML=bundle.tasks.map(t=>`<figure class="brain-panel"><figcaption><span class="task ${t.id}">${t.label}</span><small data-count="${t.id}"></small></figcaption><canvas data-task="${t.id}" role="img" aria-label="Real ${t.label} HGA map"></canvas></figure>`).join('');
      } else {
        stage.className='brain-stage';stage.innerHTML=`<div class="contour-stage"><div class="contour-legend">${bundle.tasks.map(t=>`<span class="task ${t.id}">${t.label}</span>`).join('')}</div><canvas role="img" aria-label="Real task contours and spatial overlap"></canvas></div>`;
      }
      surfaces=$$('#brain-stage canvas').map(canvas=>{connectRotation(canvas);return {view:new window.LexicalSurfaceView(canvas,bundle,state.hemi),task:canvas.dataset.task||null};});geometryKey=key;
    }
    for(const s of surfaces)s.view.draw(c,state.index,{task:s.task,scope:state.scope,camera});
    $$('[data-count]').forEach(el=>el.textContent=`${state.hemi.toUpperCase()} · n=${c.counts[el.dataset.count][state.hemi]}`);
  }
  function trace() {
    const c=cell(),lo=c.times[0],hi=c.times.at(-1);
    const values=bundle.tasks.flatMap(t=>c.roiTraces[t.id][state.roi].mean).filter(v=>v!==null);
    let min=Math.min(0,...values),max=Math.max(.01,...values),pad=(max-min)*.12;min-=pad;max+=pad;
    const x=t=>45+(t-lo)/(hi-lo)*815,y=v=>98-(v-min)/(max-min)*80;
    const lines=bundle.tasks.map(t=>{const curve=c.roiTraces[t.id][state.roi];if(!curve.n)return '';return `<path d="${curve.mean.map((v,i)=>`${i?'L':'M'}${x(c.times[i]).toFixed(2)} ${y(v).toFixed(2)}`).join(' ')}" fill="none" stroke="${t.color}" stroke-width="2.2" vector-effect="non-scaling-stroke"/>`;}).join('');
    $('#trace').innerHTML=`<svg viewBox="0 0 900 130" preserveAspectRatio="none" role="img" aria-label="Real selected-electrode mean time courses"><line x1="45" x2="860" y1="${y(0)}" y2="${y(0)}" stroke="#bac4c9"/><line x1="${x(0)}" x2="${x(0)}" y1="15" y2="100" stroke="#bac4c9" stroke-dasharray="3 4"/>${lines}<line id="trace-cursor" x1="${x(c.times[state.index])}" x2="${x(c.times[state.index])}" y1="12" y2="101" stroke="#142d43"/><text x="3" y="22" font-size="11" fill="#526272">${max.toFixed(2)}</text><text x="3" y="100" font-size="11" fill="#526272">${min.toFixed(2)}</text></svg>`;
    $('#trace').insertAdjacentHTML('beforeend',`<p class="real-trace-caption">${c.units} · ${bundle.tasks.map(t=>`${t.label} n=${c.roiTraces[t.id][state.roi].n || '0 (no data)'}`).join(' · ')}</p>`);
  }
  function renderTime() {
    const c=cell(),t=c.times[state.index];
    $('#time').value=state.index;$('#time-output').textContent=ms(t);$('#frame-label').textContent=ms(t);
    $('#time').setAttribute('aria-valuetext',`${t} milliseconds from stimulus ${state.align}`);
    const cursor=$('#trace-cursor');if(cursor){const x=45+(t-c.times[0])/(c.times.at(-1)-c.times[0])*815;cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);}
    renderMaps();
  }
  function render() {
    const c=cell();state.index=Math.max(0,Math.min(c.times.length-1,state.index));
    for(const key of ['metric','view','roi','hemi'])pressed(key,state[key]);
    $('#alignment').value=state.align;$('#direction').value=state.direction;$('#shared-scope').value=state.scope;
    $('#direction-label').hidden=state.metric!=='contrast';$('#overlay-options').hidden=state.view!=='contours';
    $('#time').min=0;$('#time').max=c.times.length-1;$('#time').step=1;
    $('.time-label label').textContent=`Time from stimulus ${state.align}`;
    $('#time-ticks').dataset.align=state.align;
    $('#time-ticks').innerHTML=`<span>${ms(c.times[0])}</span><span class="zero-tick" style="left:${-c.times[0]/(c.times.at(-1)-c.times[0])*100}%">0</span><span>${ms(c.times.at(-1))}</span>`;
    $('#signal-key').innerHTML=`<span class="key-ramp contrast-ramp"></span><span>−${c.upper} ← 0 → +${c.upper} · HGA-weighted surface sum</span>`;
    $('#selection-note').textContent=`Fixed selection: ${c.selectionWindow.map(v=>v.toFixed(2)).join(' to ')} s`;
    $('#explorer-description').textContent=`Real bipolar data · ${c.kernel} spatial kernel · ${state.view==='contours'?`contour level ±${c.level}; spatial overlap, not statistical conjunction`:'shared fixed color scale; negative values are blue'}. Native event-locked samples; no framewise significance.`;
    trace();renderTime();
  }
  function start() {
    if(state.index===cell().times.length-1)state.index=0;
    state.playing=true;$('#play').setAttribute('aria-label','Pause animation');$('#play').innerHTML='<span aria-hidden="true">Ⅱ</span>';last=null;
    const tick=now=>{if(!state.playing)return;if(last===null)last=now;const interval=62.5/state.speed;if(now-last>=interval){state.index+=Math.floor((now-last)/interval);last=now-(now-last)%interval;if(state.index>=cell().times.length){state.index=cell().times.length-1;pause();}renderTime();}if(state.playing)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
  }
  function resetEvent(){pause();state.index=cell().times.reduce((best,t,i)=>Math.abs(t)<Math.abs(cell().times[best])?i:best,0);render();}
  function applyHash() {
    const [target,query='']=location.hash.slice(1).split('?'),element=document.getElementById(target);if(!element)return;
    if(element.matches('details'))element.open=true;
    if(target==='hga') {
      pause();Object.assign(state,{metric:'activation',view:'tasks',align:'onset',direction:'nwwd',hemi:'lh',scope:'all',roi:'all'});
      const params=new URLSearchParams(query);
      for(const k of ['yaw','pitch'])camera[k]=params.has(k)&&Number.isFinite(Number(params.get(k)))?Number(params.get(k)):0;
      camera.yaw=((camera.yaw+180)%360+360)%360-180;camera.pitch=Math.max(-85,Math.min(85,camera.pitch));
      const allowed={metric:['activation','contrast'],view:['tasks','contours'],align:['onset','offset'],direction:['nwwd','wdnw'],hemi:['lh','rh'],scope:['all','active','none'],roi:Object.keys(bundle.roiLabels)};
      for(const [k,choices] of Object.entries(allowed))if(choices.includes(params.get(k)))state[k]=params.get(k);
      const t=params.has('t')&&Number.isFinite(Number(params.get('t')))?Number(params.get('t')):300;
      state.index=cell().times.reduce((best,time,i)=>Math.abs(time-t)<Math.abs(cell().times[best]-t)?i:best,0);render();
    }
    requestAnimationFrame(()=>(target==='hga'?$('#explorer'):element).scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'start'}));
  }
  initCopy();
  $('#reset-view').addEventListener('click',()=>setCamera(0,0));
  window.addEventListener('resize',queueCameraDraw);
  for(const k of ['metric','view','roi','hemi'])$$(`[data-${k}]`).forEach(b=>b.addEventListener('click',()=>{pause();state[k]=b.dataset[k];render();}));
  $('#alignment').addEventListener('change',e=>{state.align=e.target.value;resetEvent();});
  $('#direction').addEventListener('change',e=>{pause();state.direction=e.target.value;render();});
  $('#shared-scope').addEventListener('change',e=>{state.scope=e.target.value;renderTime();});
  $('#time').addEventListener('input',e=>{pause();state.index=Number(e.target.value);renderTime();});
  $('#reset').addEventListener('click',resetEvent);$('#play').addEventListener('click',()=>state.playing?pause():start());$('#speed').addEventListener('change',e=>state.speed=Number(e.target.value));
  $('#hga').addEventListener('toggle',()=>{if(!$('#hga').open)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});motion.addEventListener('change',()=>{if(motion.matches)pause();});
  if('IntersectionObserver'in window)new IntersectionObserver(e=>{if(!e[0].isIntersecting)pause();}).observe($('#explorer'));
  const chapters=$$('.chapter'),sync=()=>$('#toggle-chapters').textContent=chapters.every(c=>c.open)?'Collapse all chapters −':'Expand all chapters +';
  chapters.forEach(c=>c.addEventListener('toggle',sync));$('#toggle-chapters').addEventListener('click',()=>{const open=!chapters.every(c=>c.open);chapters.forEach(c=>c.open=open);sync();});
  window.addEventListener('hashchange',applyHash);$$('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{if(a.getAttribute('href')===location.hash)applyHash();}));
  async function share(kind) {
    const url=new URL(window.LexicalSiteConfig?.baseUrl||location.href);url.hash='';url.search='';
    if(kind==='session'){if(window.LexicalSiteConfig?.baseUrl)url.pathname+='hga/';else url.hash='hga';}
    if(kind==='current')url.hash='hga?'+new URLSearchParams({metric:state.metric,view:state.view,align:state.align,direction:state.direction,hemi:state.hemi,scope:state.scope,roi:state.roi,t:String(cell().times[state.index]),yaw:camera.yaw.toFixed(1),pitch:camera.pitch.toFixed(1)});
    try {if(!navigator.clipboard||!isSecureContext)throw new Error();await navigator.clipboard.writeText(url.href);$('#toast').textContent='Link copied.';$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,2500);}
    catch{$('#share-url').value=url.href;$('#share-dialog').showModal();$('#share-url').focus();$('#share-url').select();}
  }
  $('#copy-hga').addEventListener('click',()=>share('current'));$('#copy-story').addEventListener('click',()=>share('story'));$('#copy-session').addEventListener('click',()=>share('session'));
  render();sync();if(location.hash)requestAnimationFrame(applyHash);
}());
