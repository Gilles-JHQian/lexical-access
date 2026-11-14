// Theme lifecycle, first paint, mobile fit and scientific-view isolation.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const output=path.resolve(process.env.SITE_POSTER_OUTPUT||'../lexical_access_site_preview/dark-mode-v19');
const root=path.resolve(process.env.SITE_POSTER_ROOT||path.join(output,'meta/review-site'));
const checks=[],errors=[],check=(name,value)=>{assert.ok(value,name);checks.push(name);};
let server,browser;
(async()=>{
 await fs.mkdir(path.join(output,'figs'),{recursive:true});await fs.mkdir(path.join(output,'meta'),{recursive:true});
 let base=process.env.SITE_POSTER_URL;
 if(!base){
  server=http.createServer(async(req,res)=>{
   let name=new URL(req.url,'http://localhost').pathname.replace(/^\/lexical-access\//,'');if(!name||name.endsWith('/'))name+='index.html';
   if(name.includes('..')||!/^[-a-zA-Z0-9_./]+$/.test(name)){res.writeHead(404).end();return;}
   try{const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.wav':'audio/wav','.gz':'application/gzip'};res.setHeader('Content-Type',types[path.extname(name)]||'application/octet-stream');res.end(await fs.readFile(path.join(root,name)));}catch{res.writeHead(404).end();}
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/lexical-access/`;
 }
 const prefix=process.env.SITE_POSTER_URL?'published-':'';
 browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
 const context=await browser.newContext({colorScheme:'dark',viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const selected=()=>page.locator('[data-theme-choice][aria-pressed=true]').getAttribute('data-theme-choice');
 const theme=()=>page.locator('html').getAttribute('data-theme');
 const waitTheme=value=>page.waitForFunction(value=>document.documentElement.dataset.theme===value,value);
 const choose=value=>page.locator(`[data-theme-choice=${value}]`).click();
 // Hold CSS to check that the OS palette has already been selected before paint.
 let release,seen;const gate=new Promise(r=>release=r),cssSeen=new Promise(r=>seen=r);
 await page.route('**/styles.css*',async route=>{seen();await gate;await route.continue();});
 const navigation=page.goto(base);
 await cssSeen;try{check('OS preference applies before the stylesheet loads',await theme()==='dark');}finally{release();}
 await navigation;await page.unrouteAll({behavior:'wait'});
 check('System is selected on first visit',await selected()==='system');
 check('Dark native controls and browser chrome',await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme==='dark'&&document.querySelector('meta[name=theme-color]').content==='#18232e'));
 await choose('light');await page.reload();check('Explicit light persists through reload',await theme()==='light'&&await selected()==='light');
 await page.emulateMedia({colorScheme:'light'});await page.emulateMedia({colorScheme:'dark'});check('System changes respect explicit light',await theme()==='light');
 await choose('system');await waitTheme('dark');await page.emulateMedia({colorScheme:'light'});await waitTheme('light');check('System reacts to OS changes',await selected()==='system');
 await page.emulateMedia({colorScheme:'dark'});await waitTheme('dark');
 await page.locator('[data-theme-choice=light]').focus();await page.keyboard.press('Enter');await waitTheme('light');
 await page.locator('[data-theme-choice=dark]').focus();await page.keyboard.press('Space');await waitTheme('dark');check('Keyboard activates both explicit choices',await selected()==='dark');
 await page.reload();check('Explicit dark persists through reload',await theme()==='dark'&&await selected()==='dark');
 const second=await context.newPage();await second.goto(base);await second.locator('[data-theme-choice=light]').click();await waitTheme('light');check('Another tab synchronizes the preference',await selected()==='light');await second.close();
 await choose('dark');
 for(const mode of ['light','dark']){
  await choose(mode);
  for(const width of [320,390,620,700,768,1024,1440]){
   await page.setViewportSize({width,height:900});await page.locator('.chapter').evaluateAll(es=>es.forEach(e=>e.open=true));
   check(`${mode} story fits ${width}px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   check(`${mode} theme buttons fit and remain touch sized at ${width}px`,await page.locator('[data-theme-choice]').evaluateAll(es=>es.length===3&&es.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth;})));
  }
 }
 await page.setViewportSize({width:390,height:844});await page.goto(base+'#design');
 const contrast=await page.evaluate(()=>{
  const luminance=color=>{const [r,g,b]=color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
  return ['body','.hero-intro','.theme-switch button[aria-pressed=true]','.theme-switch button[aria-pressed=false]','.trial-row h3','.rotation-controls button','.choice-buttons button[aria-pressed=true]','.choice-buttons button[aria-pressed=false]'].map(selector=>{
   const el=document.querySelector(selector);let node=el,bg='';
   while(node){bg=getComputedStyle(node).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent')break;node=node.parentElement;}
   const a=luminance(getComputedStyle(el).color),b=luminance(bg);return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  });
 });check('Dark text and control labels meet 4.5:1 contrast',contrast.every(item=>item.ratio>=4.5));
 await page.goto(base+'#hga');await page.waitForSelector('#activation-explorer canvas[data-camera]');
 const slider=page.locator('#activation-time');await slider.fill('40');await slider.dispatchEvent('input');
 await page.waitForFunction(()=>document.querySelector('#activation-explorer [data-control=brain-stage]').getAttribute('aria-busy')!=='true');
 await page.locator('#activation-explorer canvas').first().focus();await page.keyboard.press('ArrowRight');
 await page.waitForFunction(()=>[...document.querySelectorAll('#activation-explorer canvas')].every(c=>c.dataset.camera==='5:0'));
 const state=()=>page.evaluate(()=>({time:document.querySelector('#activation-time').value,cameras:[...document.querySelectorAll('#activation-explorer canvas')].map(c=>c.dataset.camera),pixels:[...document.querySelectorAll('#activation-explorer canvas')].map(c=>c.toDataURL()),hash:location.hash}));
 const before=await state(),dataRequests=[];page.on('request',r=>{if(r.url().includes('/data/'))dataRequests.push(r.url());});
 // Activate the real header controls without scrolling the explorer out of view.
 for(const mode of ['light','dark'])await page.locator(`[data-theme-choice=${mode}]`).evaluate(e=>e.click());
 check('Theme switches preserve time, camera and rendered scientific pixels',JSON.stringify(await state())===JSON.stringify(before));
 check('Theme switches request no HGA blocks',dataRequests.length===0);
 await page.locator('#activation-explorer').screenshot({path:path.join(output,'figs',prefix+'dark-activation-390.png')});
 await page.goto(base+'#contrast-results');await page.waitForFunction(()=>document.querySelector('[data-static-panel="stimulus-nwwd"]').dataset.loaded==='true');
 check('Static charts retain white plates and original colors',await page.locator('.contrast-result:not([hidden]) img').evaluateAll(es=>es.every(e=>{const s=getComputedStyle(e);return s.backgroundColor==='rgb(255, 255, 255)'&&s.filter==='none'&&s.mixBlendMode==='normal';})));
 await page.locator('#contrast-results').screenshot({path:path.join(output,'figs',prefix+'dark-static-390.png')});
 await page.locator('.contrast-result:not([hidden]) .poster-charts .figure-open').first().click();
 await page.waitForFunction(()=>document.querySelector('#decoding-dialog img').naturalWidth>0);
 check('Dark dialog has readable chrome and unmodified figure',await page.locator('#decoding-dialog').evaluate(e=>getComputedStyle(e).backgroundColor==='rgb(24, 35, 46)'&&getComputedStyle(e.querySelector('img')).backgroundColor==='rgb(255, 255, 255)'));
 await page.screenshot({path:path.join(output,'figs',prefix+'dark-dialog-390.png')});await page.keyboard.press('Escape');
 await page.goto(base+'?dev=1#contrast');await page.locator('#developer-toggle').click();
 check('Opt-in developer panel uses dark surface',await page.locator('#developer-panel').evaluate(e=>getComputedStyle(e).backgroundColor==='rgb(24, 35, 46)'));
 await page.goto(base);check('Developer options stay hidden for public visits',await page.locator('#developer-toggle').isHidden());
 await page.locator('#hero-brain').scrollIntoViewIfNeeded();await page.waitForSelector('#hero-brain img');await page.evaluate(()=>scrollTo(0,0));
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});await page.screenshot({path:path.join(output,'figs',prefix+`dark-story-${width}.png`)});}
 await page.emulateMedia({media:'print'});check('Print stays light',await page.evaluate(()=>getComputedStyle(document.body).color==='rgb(23, 43, 62)'&&getComputedStyle(document.documentElement).colorScheme==='light'));await page.emulateMedia({media:'screen'});
 const blocked=await browser.newContext({colorScheme:'dark',viewport:{width:390,height:844}});await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
 const restricted=await blocked.newPage();restricted.on('pageerror',e=>errors.push(e.message));await restricted.goto(base);await restricted.locator('[data-theme-choice=light]').click();check('Storage restrictions do not break manual switching',await restricted.locator('html').getAttribute('data-theme')==='light');await blocked.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,colorScheme:'dark',viewport:{width:390,height:844}}),staticPage=await nojs.newPage();await staticPage.goto(base);
 check('Without JavaScript the OS dark palette and narrative still work',await staticPage.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor==='rgb(16, 24, 32)')&&await staticPage.locator('#question .lead').isVisible()&&await staticPage.locator('.theme-switch').isHidden());await nojs.close();
 if(!process.env.SITE_POSTER_URL){
  const html=await fs.readFile(path.join(root,'index.html'),'utf8'),css=await fs.readFile(path.join(root,'styles.css'),'utf8');
  const offline=path.join(output,'meta/theme-file-check.html');
  await fs.writeFile(offline,'<!doctype html><html><head><meta name="theme-color" content="#fff">'+html.match(/<script>[\s\S]*?<\/script>/)[0]+'<style>'+css+'</style></head><body>'+html.match(/<fieldset class="theme-switch" hidden>[\s\S]*?<\/fieldset>/)[0]+'</body></html>');
  const filePage=await context.newPage();filePage.on('pageerror',e=>errors.push(e.message));await filePage.goto('file://'+offline);await filePage.locator('[data-theme-choice=dark]').click();
  check('Inline theme controller works on file URLs',await filePage.locator('html').getAttribute('data-theme')==='dark');await filePage.close();
 }
 check('No theme runtime errors',errors.length===0);
 await fs.writeFile(path.join(output,'meta',prefix+'theme-browser.json'),JSON.stringify({status:'passed',checks,errors,contrast,url:base},null,2));console.log(JSON.stringify({status:'passed',checks:checks.length,url:base}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.close();});
