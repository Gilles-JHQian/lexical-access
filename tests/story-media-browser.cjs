// Real stimulus playback, deferred poster media, readable mobile layout and zoom.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const out=path.resolve(process.env.SITE_POSTER_OUTPUT||'../lexical_access_site_preview/contrast-panels-v9');
const root=path.resolve(process.env.SITE_POSTER_ROOT||path.join(out,'meta/review-site'));
const checks=[],errors=[],check=(name,value)=>{assert.ok(value,name);checks.push(name);};
let browser,server;
(async()=>{
 let base=process.env.SITE_POSTER_URL;
 if(!base){
  server=http.createServer(async(req,res)=>{const rel=new URL(req.url,'http://localhost').pathname.replace(/^\/lexical-access\//,'')||'index.html';if(rel.includes('..')||!/^[-a-zA-Z0-9_./]+$/.test(rel)){res.writeHead(404).end();return;}try{const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.wav':'audio/wav','.gz':'application/gzip'};res.setHeader('Content-Type',types[path.extname(rel)]||'application/octet-stream');res.end(await fs.readFile(path.join(root,rel)));}catch{res.writeHead(404).end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/lexical-access/`;
 }
 browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage(),media=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});page.on('request',r=>{if(r.url().includes('/media/'))media.push(r.url());});
 await page.goto(base+'#hga');await page.waitForSelector('#activation-explorer canvas[data-camera]');await page.waitForTimeout(500);
 check('Direct HGA entrance loads no audio or figure',media.length===0);
 await page.goto(base);await page.waitForSelector('#hero-brain img');
 check('Opening story does not download audio or decoding',media.length===0);
 check('Six requested titles',await page.locator('.chapter-title').evaluateAll(es=>es.slice(0,6).map(e=>e.textContent).join('|'))==='What is Lexical Access?|Our Design|Shared Auditory Activation and Task-Dependent Recruitment|Shared and Task-Dependent Lexicality Effects|Shared Lexical Representations Across Tasks|Take home message');
 check('Original audio filenames and no preload',await page.locator('.stimulus-example audio').evaluateAll(es=>es.length===2&&es.every(e=>e.preload==='none')&&es[0].querySelector('source').src.endsWith('/media/altitude.wav')&&es[1].querySelector('source').src.endsWith('/media/aelkahhaazh.wav')));
 await page.locator('.chapter-nav a[href="#question"]').click();await page.locator('.stimulus-pair').scrollIntoViewIfNeeded();
 const audio=page.locator('audio');
 // A real user click supplies the activation required by mobile audio policies.
 await audio.nth(0).click({position:{x:22,y:27}});
 await page.waitForFunction(()=>{const a=document.querySelector('audio');return a.currentTime>0&&a.duration>0;});
 check('Altitude plays its 0.901-second recording',Math.abs(await audio.nth(0).evaluate(a=>a.duration)-.9009977324)<.002);
 check('Playing one stimulus downloads only that recording',media.filter(u=>u.endsWith('.wav')).length===1&&media.some(u=>u.endsWith('altitude.wav')));
 await audio.nth(1).click({position:{x:22,y:27}});await page.waitForFunction(()=>document.querySelectorAll('audio')[1].currentTime>0);
 check('Pseudoword plays its 1.108-second recording',Math.abs(await audio.nth(1).evaluate(a=>a.duration)-1.1080045351)<.002);
 check('Audio examples never overlap',await audio.nth(0).evaluate(a=>a.paused));
 await page.locator('#question > summary').click();await page.waitForFunction(()=>!document.querySelector('#question').open&&document.querySelectorAll('audio')[1].paused);check('Collapsing examples pauses playback',await audio.nth(1).evaluate(a=>a.paused));
 await page.locator('#question > summary').click();
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  await page.locator('.stimulus-pair').scrollIntoViewIfNeeded();
  check('Stimulus controls fit at '+width,await audio.evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})));
  await page.screenshot({path:path.join(out,'figs',`${process.env.SITE_POSTER_URL?'published-':''}stimuli-${width}.png`)});
  await page.evaluate(()=>{document.querySelector('#design').open=true;document.querySelector('#design').scrollIntoView();});
  check('Design fits viewport at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check('All three task paths present',await page.locator('.trial-row').count()===3&&await page.locator('.design-rationale article').count()===2);
  await page.screenshot({path:path.join(out,'figs',`${process.env.SITE_POSTER_URL?'published-':''}design-${width}.png`)});
 }
 check('Decoding remains unloaded before section visit',!media.some(u=>u.includes('poster-decoding')));
 await page.setViewportSize({width:390,height:844});await page.locator('.chapter-nav a[href="#decoding"]').click();
 await page.locator('.decoding-figure img').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.decoding-figure img').naturalWidth===1800);
 check('Reading decoding downloads only the small preview',media.some(u=>u.endsWith('.webp'))&&!media.some(u=>u.endsWith('/poster-decoding.svg')));
 await page.locator('.decoding-figure').screenshot({path:path.join(out,'figs',`${process.env.SITE_POSTER_URL?'published-':''}decoding-mobile.png`)});
 await page.locator('.decoding-figure .text-link').click();await page.waitForFunction(()=>document.querySelector('#decoding-dialog img').naturalWidth>1000);
 check('Enlarge loads the original SVG on demand',media.some(u=>u.endsWith('poster-decoding.svg'))&&await page.locator('#decoding-dialog').isVisible());
 await page.screenshot({path:path.join(out,'figs',`${process.env.SITE_POSTER_URL?'published-':''}decoding-fitted.png`)});
 check('Enlargement defaults to the whole figure',await page.locator('.figure-zoom').evaluate(e=>{const i=e.querySelector('img').getBoundingClientRect(),r=e.getBoundingClientRect();return i.width<=r.width&&i.height<=r.height&&e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight;})&&await page.locator('#figure-zoom-value').textContent()==='100%');
 await page.locator('#figure-zoom-range').fill('300');await page.locator('#figure-zoom-range').dispatchEvent('input');
 check('Zooming in makes detailed panels scrollable',await page.locator('.figure-zoom').evaluate(e=>e.scrollWidth>e.clientWidth&&e.scrollHeight>e.clientHeight));
 await page.locator('.figure-zoom').evaluate(e=>{e.scrollLeft=500;e.scrollTop=900;});
 check('Lower and right-hand decoding panels reachable',await page.locator('.figure-zoom').evaluate(e=>e.scrollLeft>0&&e.scrollTop>0));
 await page.locator('#figure-zoom-out').click();check('Zoom out reduces the figure',await page.locator('#figure-zoom-value').textContent()==='275%');await page.locator('#figure-fit').click();check('Fit restores the whole figure',await page.locator('.figure-zoom').evaluate(e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight));
 await page.keyboard.press('Escape');check('Escape closes enlargement',await page.locator('#decoding-dialog').isHidden());
 check('Focus returns to enlarge control',await page.locator('.decoding-figure .text-link').evaluate(e=>e===document.activeElement));
 const provenance=JSON.parse(await fs.readFile(path.join(out,'meta/story-media-provenance.json'),'utf8'));
 for(const [name,expected] of Object.entries(provenance.files)){
  const response=await context.request.get(base+name);check('Served media matches source: '+name,response.ok()&&crypto.createHash('sha256').update(await response.body()).digest('hex')===expected.sha256);
 }
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),staticPage=await nojs.newPage();await staticPage.goto(base);await staticPage.locator('#decoding > summary').click();await staticPage.locator('.decoding-figure img').scrollIntoViewIfNeeded();
 check('No-JS visitors retain native audio and original figure link',await staticPage.locator('audio[controls]').count()===2&&(await staticPage.locator('.decoding-figure .text-link').getAttribute('href')).endsWith('poster-decoding.svg'));
 await nojs.close();
 if(!process.env.SITE_POSTER_URL){
  const offline=await context.newPage(),requests=[];offline.on('request',r=>{if(r.url().startsWith('http'))requests.push(r.url());});
  await offline.goto('file://'+path.join(out,'meta/interactive-preview-real.html')+'#decoding');await offline.waitForFunction(()=>document.querySelector('.decoding-figure img').naturalWidth===1800);
  await offline.locator('.decoding-figure .text-link').click();await offline.waitForFunction(()=>document.querySelector('#decoding-dialog img').naturalWidth>1000);
  check('Standalone embeds preview, original figure and audio',requests.length===0&&await offline.locator('audio source').evaluateAll(es=>es.every(e=>e.src.startsWith('data:audio/wav;base64,'))));await offline.close();
 }
 check('No media or runtime errors',errors.length===0);
 await fs.writeFile(path.join(out,'meta',`${process.env.SITE_POSTER_URL?'published-':''}story-media-browser.json`),JSON.stringify({status:'passed',checks,errors,url:base},null,2));console.log(JSON.stringify({status:'passed',checks:checks.length,url:base}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.close();});
