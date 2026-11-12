// Demand boundaries, buffering, stale responses, retry, integrity and 32 Hz playback.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const out=path.resolve(process.env.SITE_POSTER_OUTPUT||'../lexical_access_site_preview/lazy-hga-v7');
const root=path.resolve(process.env.SITE_POSTER_ROOT||path.join(out,'meta/review-site'));
let server,browser;const checks=[],errors=[];const check=(n,v)=>{assert.ok(v,n);checks.push(n);};
(async()=>{
 let base=process.env.SITE_POSTER_URL;
 if(!base){server=http.createServer(async(req,res)=>{const rel=new URL(req.url,'http://localhost').pathname.replace(/^\/lexical-access\//,'')||'index.html';if(rel.includes('..')||!/^[-a-zA-Z0-9_./]+$/.test(rel)){res.writeHead(404).end();return;}try{const file=path.join(root,rel),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.gz':'application/gzip','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/lexical-access/`;}
 browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage(),requests=[];page.on('request',r=>{if(r.url().includes('/data/'))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 const ready=async(m,time)=>page.waitForFunction(({m,time})=>{const r=document.querySelector(`[data-explorer=${m}]`),c=r.querySelector('canvas[data-time]');return c&&r.querySelector('[data-control=brain-stage]').getAttribute('aria-busy')==='false'&&(time===undefined||Number(c.dataset.time)===time);},{m,time});
 await page.goto(base+'#hga');await ready('activation',312.5);await page.waitForTimeout(400);
 check('Initial NFC view fetches only activation onset LH',requests.every(u=>u.includes('geometry-lh-')||u.includes('activation-onset-lh-')));
 check('Paused entry requests one time block, support and geometry',new Set(requests).size===3&&requests.length===3);
 const initialBytes=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/data/')).reduce((n,r)=>n+r.decodedBodySize,0));
 check('Initial map data is under 1 MB',initialBytes>0&&initialBytes<1000000);
 check('Manifest does not contain dense fields',await page.evaluate(()=>window.LexicalRealBundle.schema===3&&Object.values(window.LexicalRealBundle.cells).every(c=>!c.tasks&&c.sampleStepMs===31.25)));
 const a=page.locator('#activation-explorer'),time=a.locator('[data-control=time]');
 await time.fill('32');await time.dispatchEvent('input');await ready('activation',750);
 const count=requests.length;await time.fill('18');await time.dispatchEvent('input');await ready('activation',312.5);
 check('Returning to a loaded block needs no request',requests.length===count);
 await page.goto(base+'#contrast?view=contours&t=500');await ready('contrast',500);requests.length=0;
 await page.route('**/contrast-onset-nwwd-lh-016-*.bin.gz',async route=>{await new Promise(r=>setTimeout(r,350));await route.continue();});
 const c=page.locator('#contrast-explorer'),ct=c.locator('[data-control=time]');
 await ct.fill('16');await ct.dispatchEvent('input');await ct.fill('32');await ct.dispatchEvent('input');await ready('contrast',750);await page.waitForTimeout(500);
 check('Late seek response never replaces the newer frame',await c.locator('canvas').first().getAttribute('data-time')==='750'&&await ct.inputValue()==='32');
 check('Contrast uses only requested hemisphere and condition',requests.every(u=>u.includes('contrast-onset-nwwd-lh-')));
 await page.unrouteAll({behavior:'wait'});
 let failed=false;await page.route('**/contrast-offset-nwwd-rh-024-*.bin.gz',async route=>{if(!failed){failed=true;await route.fulfill({status:503,body:'temporary failure'});}else await route.continue();});
 await page.goto(base+'#contrast?align=offset&hemi=rh&t=500');await c.locator('[data-control=retry]').waitFor({state:'visible'});
 check('Download failure offers retry and pauses',await c.locator('[data-control=play]').getAttribute('aria-label')==='Play animation');
 await c.locator('[data-control=retry]').click();await ready('contrast',500);
 check('Retry restores the requested hemisphere',await c.locator('canvas').first().getAttribute('data-hemi')==='rh');await page.unrouteAll({behavior:'wait'});
 let corrupt=false;await page.route('**/contrast-offset-wdnw-lh-024-*.bin.gz',async route=>{if(!corrupt){corrupt=true;const response=await route.fetch(),body=Buffer.from(await response.body());body[body.length-1]^=1;await route.fulfill({response,body});}else await route.continue();});
 await page.goto(base+'#contrast?align=offset&direction=wdnw&t=500');await c.locator('[data-control=retry]').waitFor({state:'visible'});
 check('Corrupt chunks are rejected before drawing',(await c.locator('[data-control=load-message]').textContent()).includes('verified'));
 await c.locator('[data-control=retry]').click();await ready('contrast',500);await page.unrouteAll({behavior:'wait'});
 // Buffering never advances the timeline beyond the last rendered frame.
 let release;const hold=new Promise(r=>release=r);await page.route('**/activation-onset-lh-008-*.bin.gz',async route=>{await hold;await route.continue();});
 await page.goto(base+'#hga?t=-31.25');await ready('activation',-31.25);await a.locator('[data-control=play]').click();await page.waitForTimeout(180);
 check('Buffering holds time and displayed frame together',await time.inputValue()==='7'&&await a.locator('canvas').first().getAttribute('data-time')==='-31.25');await a.locator('[data-control=play]').click();check('Pause during buffering restores the last ready view',await a.locator('[data-control=load-status]').isHidden()&&await time.inputValue()==='7');await a.locator('[data-control=play]').click();release();await page.waitForTimeout(180);await a.locator('[data-control=play]').click();await page.unrouteAll({behavior:'wait'});
 check('Playback resumes after the next block arrives',Number(await time.inputValue())>7);
 // Measure a warm playback pass; source frame spacing must be 31.25 ms at 1x.
 await time.fill('0');await time.dispatchEvent('input');await ready('activation',-250);
 await a.locator('[data-control=play]').click();await page.waitForTimeout(1900); // warms current cell only
 await time.fill('0');await time.dispatchEvent('input');await ready('activation',-250);
 await page.evaluate(()=>{window.frameAudit=[];const c=document.querySelector('#activation-explorer canvas');new MutationObserver(()=>{const t=Number(c.dataset.time),last=window.frameAudit.at(-1);if(!last||last.time!==t)window.frameAudit.push({time:t,at:performance.now()});}).observe(c,{attributes:true,attributeFilter:['data-time']});});
 await a.locator('[data-control=play]').click();await page.waitForTimeout(1050);await a.locator('[data-control=play]').click();
 const frames=await page.evaluate(()=>window.frameAudit),elapsed=frames.at(-1).at-frames[0].at,advance=frames.at(-1).time-frames[0].time;
 check('Playback stays at 1x after doubling sample rate',Math.abs(advance-elapsed)<125&&await a.locator('[data-control=speed]').inputValue()==='1');
 check('New intermediate native frames are displayed',frames.some((v,i)=>i&&v.time-frames[i-1].time===31.25));
 check('No unhandled browser errors',errors.length===0);
 const prefix=process.env.SITE_POSTER_URL?'published-':'';
 await fs.writeFile(path.join(out,'meta',prefix+'lazy-browser.json'),JSON.stringify({status:'passed',checks,initial_map_bytes:initialBytes,measured_software_gpu_frames:frames.length,measured_span_ms:elapsed,target_frames_per_second:32,frames,errors,notes:['Warm Chromium software-GPU measurement, not physical phone FPS.','Expected HTTP failure and corruption were injected to test recovery.']},null,2));
 console.log(JSON.stringify({status:'passed',checks:checks.length,initialBytes,frames:frames.length,elapsed}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.close();});
