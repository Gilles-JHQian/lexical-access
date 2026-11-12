const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const config=require('../deployment.json');
const output=path.resolve(process.env.SITE_PAGES_OUTPUT||path.join(__dirname,'../../lexical_access_site_preview/pages-v1'));
const checks=[],errors=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name)};
let browser,server;
(async()=>{
  await fs.mkdir(path.join(output,'figs'),{recursive:true});
  await fs.mkdir(path.join(output,'meta'),{recursive:true});
  let base=process.env.SITE_PAGES_URL;
  if(!base){
    const root=path.join(output,'meta/site');
    server=http.createServer(async(req,res)=>{
      let relative=new URL(req.url,'http://localhost').pathname.replace(/^\/lexical-access\//,'');
      if(!relative||relative.endsWith('/'))relative+='index.html';
      if(!['index.html','real-app.js','surface-view.js','styles.css','real-data.js','site-config.js','version.json','assets/favicon.svg','hga/index.html'].includes(relative)){res.writeHead(404).end();return;}
      try{res.setHeader('Content-Type',relative.endsWith('.js')?'text/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.json')?'application/json':relative.endsWith('.svg')?'image/svg+xml':'text/html');res.end(await fs.readFile(path.join(root,relative)));}catch{res.writeHead(404).end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    base=`http://127.0.0.1:${server.address().port}/lexical-access/`;
  }
  browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+': '+r.status());});
  const response=await page.goto(base);
  check('Full-story entry returns 200',response.status()===200);
  await page.waitForSelector('#brain-stage canvas');
  check('Public artifact uses real data',await page.evaluate(()=>window.LexicalRealBundle.kind==='real'));
  check('Canonical NFC base is stable',await page.locator('link[rel=canonical]').getAttribute('href')===config.base_url);
  for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});
    await page.locator('#toggle-chapters').click();
    check('Expanded chapters fit mobile width '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#toggle-chapters').click();
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'hga/');
  await page.waitForURL('**/#hga');
  await page.waitForFunction(()=>document.querySelector('#hga').open);
  check('NFC /hga/ entrance opens real explorer',await page.locator('#brain-stage canvas[data-renderer=webgl]').count()===3);
  await page.locator('[data-metric=contrast]').click();
  await page.locator('[data-view=contours]').click();
  check('Public contrast contour renders',await page.locator('#brain-stage canvas').count()===1);
  await page.locator('#play').click();await page.waitForTimeout(250);
  check('Public animation advances',await page.locator('#play').getAttribute('aria-label')==='Pause animation');
  await page.locator('#play').click();
  await page.locator('#references > summary').click();
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));
  for(const [id,url] of [['copy-story',config.base_url],['copy-session',config.base_url+'hga/']]){
    await page.locator('#'+id).click();
    check(id+' copies stable public URL',await page.locator('#share-url').inputValue()===url);
    await page.getByRole('button',{name:'Done',exact:true}).click();
  }
  const version=await context.request.get(base+'version.json');
  check('Deployed data version matches pinned release',(await version.json()).data_sha256===config.data_sha256);
  await page.locator('.nav-explore').click();await page.waitForFunction(()=>document.querySelector('#explorer').getBoundingClientRect().top<=100);
  const stem=process.env.SITE_PAGES_URL?'published-mobile-hga':'pages-mobile-hga';
  await page.screenshot({path:path.join(output,'figs',stem+'.png')});
  check('No runtime or asset errors',errors.length===0);
  const report={status:'passed',url:base,checks,errors,viewport:[390,844],notes:['Chromium software GPU; physical phone inspection remains user-side.']};
  await fs.writeFile(path.join(output,'meta',stem+'.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:'passed',checks:checks.length,url:base}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.close();});
