// Raster preview of the exact poster SVG; the untouched SVG remains the zoom source.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
(async () => {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: node render_figure.cjs input.svg output.webp');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const svg = await fs.readFile(input);
    const result = await page.evaluate(async source => {
      const img = new Image();
      img.src = source; await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 1800; canvas.height = Math.round(1800 * img.naturalHeight / img.naturalWidth);
      const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return {data: canvas.toDataURL('image/webp', .92).split(',')[1], width:canvas.width, height:canvas.height};
    }, 'data:image/svg+xml;base64,' + svg.toString('base64'));
    await fs.writeFile(output, Buffer.from(result.data, 'base64'));
    console.log(JSON.stringify({width:result.width, height:result.height}));
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
