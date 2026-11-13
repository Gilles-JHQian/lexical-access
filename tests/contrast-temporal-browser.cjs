const {choose,choiceValue}=require('./choice-controls.cjs');
// Variant isolation, native time/camera continuity, demand loading and retry.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const out=path.resolve(process.env.SITE_POSTER_OUTPUT||'../lexical_access_site_preview/contrast-time-v11');
const root=path.resolve(process.env.SITE_POSTER_ROOT||path.join(out,'meta/review-site'));
const checks=[],errors=[],check=(name,value)=>{assert.ok(value,name);checks.push(name);};let browser,server;
(async()=>{
 let base=process.env.SITE_POSTER_URL;
 if(!base){server=http.createServer(async(req,res)=>{const rel=new URL(req.url,'http://localhost').pathname.replace(/^\/lexical-access\//,'')||'index.html';if(rel.includes('..')||!/^[-a-zA-Z0-9_./]+$/.test(rel)){res.writeHead(404).end();return;}try{const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.gz':'application/gzip','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};res.setHeader('Content-Type',types[path.extname(rel)]||'application/octet-stream');res.end(await fs.readFile(path.join(root,rel)));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/lexical-access/`;}
 browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/data/'))requests.push(r.url());});
 const c=page.locator('#contrast-explorer'),option=page.locator('[data-owner=contrast] [data-control=processing]'),prefix=process.env.SITE_POSTER_URL?'published-':'';
 const ready=async(mode,time=500)=>page.waitForFunction(({mode,time})=>{const root=document.querySelector('#contrast-explorer'),canvas=root.querySelector('canvas[data-time]');return canvas&&root.querySelector('[data-control=brain-stage]').getAttribute('aria-busy')==='false'&&canvas.dataset.processing===mode&&Number(canvas.dataset.time)===time;},{mode,time});
 const dev=async()=>{if(await page.locator('#developer-panel').isHidden())await page.locator('#developer-toggle').click();await choose(page.locator('#developer-target'),'contrast');};
 const close=async()=>{if(await page.locator('#developer-panel').isVisible())await page.locator('#developer-close').click();};
 await page.goto(base+'?dev=1#contrast?view=contours&t=500');await ready('smooth');
 check('Gaussian smoothing is the default comparison',await choiceValue(option)==='smooth');
 check('Entry loads only default smoothed fields',requests.length===3&&requests.every(u=>u.includes('geometry-lh-')||u.includes('contrast-onset-nwwd-smooth-lh-')));
 await c.locator('canvas').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('#contrast-explorer canvas').dataset.camera==='5:0');const angle=await c.locator('canvas').getAttribute('data-camera');
 const signatures={};
 for(const mode of ['original','smooth','cluster']){
  await dev();await choose(option,mode);await close();await ready(mode);
  check('Switch preserves time and rotation: '+mode,await c.locator('canvas').getAttribute('data-camera')===angle&&await c.locator('[data-control=time]').inputValue()==='48');
  check('Processing caption is explicit: '+mode,mode==='original'?await c.locator('[data-control=processing-status]').isHidden():(await c.locator('[data-control=processing-status]').textContent()).includes(mode==='smooth'?'50 ms':'SDR1'));
  signatures[mode]=await c.locator('canvas').evaluate(e=>e.toDataURL());
  await c.locator('[data-control=brain-stage]').screenshot({path:path.join(out,'figs',prefix+'contrast-'+mode+'-500ms.png')});
 }
 check('Both comparisons change the rendered map',signatures.smooth!==signatures.original&&signatures.cluster!==signatures.original&&signatures.smooth!==signatures.cluster);
 await c.locator('[data-control=play]').click();await page.waitForFunction(()=>Number(document.querySelector('#contrast-explorer canvas').dataset.time)>500);await c.locator('[data-control=play]').click();
 check('Masked playback advances through native frames',Number(await c.locator('canvas').getAttribute('data-time'))>500&&await c.locator('canvas').getAttribute('data-processing')==='cluster');
 await c.locator('[data-control=time]').fill('48');await c.locator('[data-control=time]').dispatchEvent('input');await ready('cluster');
 check('No other hemisphere or condition loaded for comparison',requests.every(u=>u.includes('geometry-lh-')||u.includes('contrast-onset-nwwd-')));
 const count=requests.length;await dev();await choose(option,'original');await close();await ready('original');check('Returning to Original reuses its blocks',requests.length===count);
 // Every direction/alignment/hemisphere supports both variants.
 for(const align of ['onset','offset'])for(const direction of ['nwwd','wdnw'])for(const hemi of ['lh','rh'])for(const mode of ['smooth','cluster']){
  await page.evaluate(hash=>location.hash=hash,`contrast?view=contours&processing=${mode}&align=${align}&direction=${direction}&hemi=${hemi}&t=500`);await ready(mode);
  check(`Correct variant ${align}/${direction}/${hemi}/${mode}`,await c.locator('canvas').getAttribute('data-cell')===`contrast-${align}-${direction}-${mode}`&&await c.locator('canvas').getAttribute('data-hemi')===hemi);
 }
 await page.evaluate(()=>location.hash='contrast?view=contours&processing=cluster&t=-250');await ready('cluster',-250);
 check('Untested onset times are explicitly labelled',(await c.locator('[data-control=processing-status]').textContent()).includes('Outside the tested window'));
 check('Untested frames contain no contour segments',await c.locator('canvas').getAttribute('data-segments')==='0');
 await page.evaluate(()=>location.hash='contrast?view=tasks&processing=smooth&t=500&yaw=12');await ready('smooth');
 check('Three tasks share processing and rotation',await c.locator('canvas').evaluateAll(es=>es.length===3&&es.every(e=>e.dataset.processing==='smooth'&&e.dataset.camera==='12:0')));
 await dev();await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));await page.locator('#developer-copy').click();
 const saved=await page.locator('#share-url').inputValue();check('Saved comparison includes processing',new URL(saved).hash.includes('processing=smooth'));await page.getByRole('button',{name:'Done',exact:true}).click();await close();
 await page.goto(base+'?dev=1'+new URL(saved).hash);await ready('smooth');check('Saved comparison restores',await choiceValue(option)==='smooth'&&await c.locator('canvas').first().getAttribute('data-camera')==='12:0');
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await dev();await option.scrollIntoViewIfNeeded();
  check('Comparison selector fits and is touch sized at '+width,await option.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height>=44;}));
  if(width===390)await page.screenshot({path:path.join(out,'figs',prefix+'contrast-developer-options.png')});await close();
 }
 // A delayed request for the old mode cannot replace the newest selection.
 await page.setViewportSize({width:390,height:844});await page.goto('about:blank');await page.goto(base+'?dev=1#contrast?view=contours&processing=original&t=500');await ready('original');
 let delayed=0;await page.route('**/contrast-onset-nwwd-smooth-lh-*.bin.gz',async route=>{delayed++;await new Promise(r=>setTimeout(r,300));await route.continue();});
 await dev();await choose(option,'smooth');await choose(option,'cluster');await close();await ready('cluster');await page.waitForTimeout(400);
 check('Late smoothing response never replaces cluster mode',await c.locator('canvas').getAttribute('data-processing')==='cluster'&&delayed>0);await page.unrouteAll({behavior:'wait'});
 let failed=false;await page.route('**/contrast-offset-wdnw-cluster-rh-*.bin.gz',async route=>{if(!failed){failed=true;await route.fulfill({status:503,body:'temporary'});}else await route.continue();});
 await page.goto('about:blank');await page.goto(base+'?dev=1#contrast?view=contours&processing=cluster&align=offset&direction=wdnw&hemi=rh&t=500');await c.locator('[data-control=retry]').waitFor({state:'visible'});check('Variant fetch failure offers retry',failed);await c.locator('[data-control=retry]').click();await ready('cluster');await page.unrouteAll({behavior:'wait'});
 check('Variant retry restores the selected map',await c.locator('canvas').getAttribute('data-cell')==='contrast-offset-wdnw-cluster');
 await page.goto(base+'?dev=1#hga?processing=cluster');await page.waitForSelector('#activation-explorer canvas[data-time]');
 check('Contrast processing cannot alter activation',await page.locator('#activation-explorer canvas').first().getAttribute('data-processing')==='original'&&await page.locator('[data-owner=activation] [data-control=processing]').count()===0);
 check('No JavaScript errors',errors.length===0);
 if(!process.env.SITE_POSTER_URL){await page.goto('file://'+path.join(out,'meta/interactive-preview-real.html')+'#contrast?processing=cluster&view=contours&t=500');await ready('cluster');check('Offline comparison includes mask fields',await choiceValue(option)==='cluster');}
 await fs.writeFile(path.join(out,'meta',prefix+'contrast-temporal-browser.json'),JSON.stringify({status:'passed',checks,errors,url:base},null,2));console.log(JSON.stringify({status:'passed',checks:checks.length,url:base}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.close();});
