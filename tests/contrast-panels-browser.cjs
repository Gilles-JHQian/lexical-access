const {choose,choiceValue}=require('./choice-controls.cjs');
// Independent static selections, original components, deferred loading and usable zoom.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const out=path.resolve(process.env.SITE_POSTER_OUTPUT||'../lexical_access_site_preview/contrast-panels-v9');
const root=path.resolve(process.env.SITE_POSTER_ROOT||path.join(out,'meta/review-site'));
const checks=[],errors=[],check=(n,v)=>{assert.ok(v,n);checks.push(n);};let server,browser;
(async()=>{
 let base=process.env.SITE_POSTER_URL;
 if(!base){server=http.createServer(async(req,res)=>{const rel=new URL(req.url,'http://localhost').pathname.replace(/^\/lexical-access\//,'')||'index.html';if(rel.includes('..')||!/^[-a-zA-Z0-9_./]+$/.test(rel)){res.writeHead(404).end();return;}try{const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.wav':'audio/wav','.gz':'application/gzip'};res.setHeader('Content-Type',types[path.extname(rel)]||'application/octet-stream');res.end(await fs.readFile(path.join(root,rel)));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/lexical-access/`;}
 browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/media/'))requests.push(r.url());});
 await page.goto(base+'#hga');await page.waitForSelector('#activation-explorer canvas[data-camera]');await page.waitForTimeout(300);
 check('NFC entrance requests no static media',requests.length===0);
 check('Activation contains only its dynamic explorer',await page.locator('#hga .trace,#hga .roi-controls,#hga .contrast-static').count()===0);
 check('Static contrast is separate from its player',await page.locator('#contrast .contrast-static').count()===1&&await page.locator('#contrast-explorer .contrast-static,#contrast-explorer .trace').count()===0);
 let failed=false;await page.route('**/contrast-offset-wdnw-roi.svg*',async route=>{if(!failed){failed=true;await route.fulfill({status:503,body:'temporary'});}else await route.continue();});
 await page.evaluate(()=>location.hash='#contrast-results');
 const ready=async key=>page.waitForFunction(key=>{const e=document.querySelector(`[data-static-panel="${key}"]`);return !e.hidden&&e.dataset.loaded==='true';},key);
 await ready('stimulus-nwwd');
 check('First visit requests only four selected components',requests.length===4&&requests.every(u=>u.includes('contrast-stimulus-nwwd-')));
 const cases=[['stimulus','nwwd','0.5–0.9 s after stimulus onset'],['stimulus','wdnw','0.5–0.9 s after stimulus onset'],['offset','nwwd','0–0.5 s after stimulus offset'],['offset','wdnw','0–0.5 s after stimulus offset']];
 for(const [align,direction,window] of cases){
  await choose(page.locator('#static-alignment'),align);await choose(page.locator('#static-direction'),direction);const key=`${align}-${direction}`;
  if(key==='offset-wdnw'){await page.locator(`[data-static-panel="${key}"] [data-static-retry]`).waitFor({state:'visible'});check('Failed static figure offers retry',failed);await page.locator(`[data-static-panel="${key}"] [data-static-retry]`).click();}
  await ready(key);const panel=page.locator(`[data-static-panel="${key}"]`);
  check('Exactly one result set selected: '+key,await page.locator('.contrast-result:not([hidden])').count()===1);
  check('Correct original components: '+key,await panel.locator('img').evaluateAll((es,key)=>es.length===4&&es.every(e=>e.src.includes(`contrast-${key}-`)&&e.complete&&e.naturalWidth>0),key));
  check('Correct poster window: '+key,(await panel.locator('.poster-window').textContent()).includes(window));
 }
 check('Static choices leave animation settings alone',await choiceValue(page.locator('#contrast-explorer [data-control=alignment]'))==='onset'&&await choiceValue(page.locator('#contrast-explorer [data-control=direction]'))==='nwwd');
 const count=requests.length;await choose(page.locator('#static-alignment'),'stimulus');await choose(page.locator('#static-direction'),'nwwd');await ready('stimulus-nwwd');
 check('Revisiting a result reuses loaded components',requests.length===count);
 check('Pie semantics are effect contributions, not counts',(await page.locator('.static-notes').textContent()).includes('not percentages of electrodes'));
 const prefix=process.env.SITE_POSTER_URL?'published-':'';
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.locator('#contrast-results').scrollIntoViewIfNeeded();
  check('Static components fit '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check('Selectors are touch sized at '+width,await page.locator('.static-options button').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=44)));
  if(width<620)check('Charts stack on phones at '+width,await page.locator('.contrast-result:not([hidden]) .poster-charts').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length===1));
  await page.locator('#contrast-results').screenshot({style:'.skip-link:not(:focus),.developer-toggle{visibility:hidden}',path:path.join(out,'figs',`${prefix}contrast-static-${width}.png`)});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('.contrast-result:not([hidden]) .poster-charts .figure-open').first().click();
 await page.waitForFunction(()=>document.querySelector('#decoding-dialog img').naturalWidth>0);
 const fits=()=>page.locator('.figure-zoom').evaluate(e=>{const r=e.querySelector('img').getBoundingClientRect();return r.width<=e.clientWidth&&r.height<=e.clientHeight&&e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight;});
 check('Static chart opens fitted to phone',await fits());
 const width=await page.locator('#decoding-dialog img').evaluate(e=>e.getBoundingClientRect().width);
 await page.locator('#figure-zoom-range').fill('25');await page.locator('#figure-zoom-range').dispatchEvent('input');
 check('Figure can shrink below its fitted size',await page.locator('#decoding-dialog img').evaluate(e=>e.getBoundingClientRect().width)<width*.3&&await page.locator('#figure-zoom-out').isDisabled());
 await page.locator('#figure-fit').click();check('Fit resets zoom to 100%',await page.locator('#figure-zoom-value').textContent()==='100%'&&await fits());
 await page.setViewportSize({width:1440,height:600});await page.waitForTimeout(100);check('Fit survives viewport and orientation changes',await fits());
 await page.keyboard.press('Escape');await page.unrouteAll({behavior:'wait'});
 const provenance=JSON.parse(await fs.readFile(path.join(out,'meta/contrast-panel-provenance.json'),'utf8'));
 for(const [name,expected] of Object.entries(provenance.files).filter(([name])=>name.includes('/contrast-'))){const response=await context.request.get(base+name);check('Published component hash: '+name,response.ok()&&crypto.createHash('sha256').update(await response.body()).digest('hex')===expected.sha256);}
 check('No JavaScript errors',errors.length===0);
 await fs.writeFile(path.join(out,'meta',prefix+'contrast-panels-browser.json'),JSON.stringify({status:'passed',checks,errors,url:base},null,2));console.log(JSON.stringify({status:'passed',checks:checks.length,url:base}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.close();});
