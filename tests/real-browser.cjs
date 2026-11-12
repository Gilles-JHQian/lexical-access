const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const http=require('node:http');
const output=path.resolve(process.env.SITE_REAL_OUTPUT||path.join(__dirname,'../../lexical_access_site_preview/real-hga-v1'));
const root=path.join(output,'meta/site'),checks=[],errors=[];const check=(name,v)=>{assert.ok(v,name);checks.push(name)};
const server=http.createServer(async(req,res)=>{const relative=new URL(req.url,'http://localhost').pathname.replace(/^\/project\//,'')||'index.html';if(!['index.html','real-data.js','styles.css','surface-view.js','real-app.js','assets/favicon.svg'].includes(relative)){res.writeHead(404).end();return;}try{res.setHeader('Content-Type',relative.endsWith('.js')?'text/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.svg')?'image/svg+xml':'text/html');res.end(await fs.readFile(path.join(root,relative)))}catch{res.writeHead(500).end();}});
let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/project/`;
 browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});
 await page.goto(url+'#hga');await page.waitForSelector('#brain-stage canvas');
 check('Real mode and visible provenance',await page.locator('.explorer-context').textContent().then(s=>s.includes('REAL DATA')));
 check('Three real maps and GPU renderer',await page.locator('#brain-stage canvas[data-renderer=webgl]').count()===3);
 check('Reduced motion does not autoplay',await page.locator('#play').getAttribute('aria-label')==='Play animation');
 for(const width of [320,375,390,430,768,1440]){
  await page.setViewportSize({width,height:900});check(`No horizontal overflow at ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#toggle-chapters').click();check(`Expanded chapters fit at ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#toggle-chapters').click();await page.locator('.nav-explore').click();await page.waitForFunction(()=>document.querySelector('#hga').open);
 }
 await page.setViewportSize({width:390,height:844});await page.goto(url);await page.goto(url+'#hga');await page.waitForFunction(()=>document.querySelector('#explorer').getBoundingClientRect().top<=100);
 const before=await page.locator('#brain-stage canvas').first().evaluate(c=>c.toDataURL());await page.locator('#time').fill('16');await page.locator('#time').dispatchEvent('input');
 check('Measured frame changes map pixels',before!==await page.locator('#brain-stage canvas').first().evaluate(c=>c.toDataURL()));
 check('Native timestamp displayed',await page.locator('#time-output').textContent()==='+750 ms');
 await page.locator('#time').focus();await page.keyboard.press('ArrowLeft');check('Keyboard moves one native frame',await page.locator('#time').inputValue()==='15');
 await page.locator('#alignment').selectOption('offset');check('Alignment resets to its own zero',await page.locator('#time-output').textContent()==='0 ms');check('Offset uses independent shorter source support',await page.locator('#time').getAttribute('max')==='16');
 await page.locator('[data-hemi=rh]').click();check('RH switches anatomy/counts',await page.locator('[data-count=repeat]').textContent()==='RH · n=221');
 await page.locator('[data-metric=contrast]').click();check('Contrast uses real direction selection',await page.locator('#direction-label').isVisible());
 await page.locator('#direction').selectOption('wdnw');check('W>Nw selection retains signed ΔHGA units',(await page.locator('.real-trace-caption').textContent()).includes('Nonword − Word'));
 await page.locator('[data-view=contours]').click();check('Contour view has one real surface',await page.locator('#brain-stage canvas').count()===1);
 for(const scope of ['active','none','all']){await page.locator('#shared-scope').selectOption(scope);check('Overlap scope '+scope,await page.locator('#shared-scope').inputValue()===scope);}
 await page.locator('[data-roi=ventral]').click();check('ROI curve counts shown',(await page.locator('.real-trace-caption').textContent()).includes('n='));
 await page.locator('#reset').click();await page.locator('#play').click();await page.waitForTimeout(450);check('Real playback advances',Number(await page.locator('#time').inputValue())>4);await page.locator('#play').click();const paused=await page.locator('#time').inputValue();await page.waitForTimeout(160);check('Real pause holds frame',await page.locator('#time').inputValue()===paused);
 await page.locator('#play').click();await page.locator('#hga > summary').click();await page.waitForTimeout(60);check('Collapsing pauses real playback',await page.locator('#play').getAttribute('aria-label')==='Play animation');
 const hash='#hga?metric=contrast&view=contours&align=offset&direction=wdnw&hemi=rh&scope=active&roi=frontal&t=250';await page.goto(url+hash);await page.waitForSelector('#brain-stage canvas');
 check('Saved real state restores native time',await page.locator('#time-output').textContent()==='+250 ms');check('Saved real state restores hemi/direction',await page.locator('[data-hemi=rh]').getAttribute('aria-pressed')==='true'&&await page.locator('#direction').inputValue()==='wdnw');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));await page.locator('#copy-hga').click();const copied=new URL(await page.locator('#share-url').inputValue());const params=new URLSearchParams(copied.hash.split('?')[1]);check('Copy preserves all real-view parameters',params.get('hemi')==='rh'&&params.get('direction')==='wdnw'&&params.get('t')==='250');await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.goto(url+'#hga?metric=contrast&view=contours&align=onset&direction=nwwd&t=700');await page.waitForFunction(()=>document.querySelector('#explorer').getBoundingClientRect().top<=100);await page.screenshot({path:path.join(output,'figs/mobile-contrast.png')});
 await page.goto(url+'#hga');await page.waitForFunction(()=>document.querySelector('#explorer').getBoundingClientRect().top<=100);await page.screenshot({path:path.join(output,'figs/mobile-activation.png')});
 await page.goto(url);await page.screenshot({path:path.join(output,'figs/mobile-story.png')});
 await page.setViewportSize({width:1440,height:1050});await page.goto(url+'#hga?metric=contrast&view=contours&direction=wdnw&t=700');await page.waitForFunction(()=>document.querySelector('#explorer').getBoundingClientRect().top<=100);await page.screenshot({path:path.join(output,'figs/desktop-contrast.png')});
 const frameMs=await page.evaluate(()=>{const canvas=document.createElement('canvas');const view=new window.LexicalSurfaceView(canvas,window.LexicalRealBundle,'lh'),c=window.LexicalRealBundle.cells['contrast-onset-nwwd'];const start=performance.now();for(let i=0;i<20;i++)view.draw(c,i,{scope:'all'});const ms=(performance.now()-start)/20;view.destroy();return ms;});
 check('No runtime or resource errors',errors.length===0);
 const file=await context.newPage();await file.goto('file://'+path.join(output,'meta/interactive-preview-real.html')+'#hga');await file.waitForSelector('#brain-stage canvas');check('Standalone file renders real mode',await file.locator('#brain-stage canvas').count()===3);
 const report={status:'passed',checks,errors,mean_cpu_submission_ms_per_frame:frameMs,notes:['Chromium software-GPU viewport emulation; physical mobile GPUs and Safari not tested.','Geometry is decimated; contours are dynamic level sets, not static poster envelopes.']};await fs.writeFile(path.join(output,'meta/browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:'passed',checks:checks.length,mean_cpu_submission_ms_per_frame:frameMs}));
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
