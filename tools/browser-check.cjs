// QA local opcional: PLAYWRIGHT_MODULE=<ruta o paquete> node tools/browser-check.cjs
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu'] });
  const output = path.join(__dirname, '..', 'artifacts');
  fs.mkdirSync(output, { recursive: true });
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle' });
    if (await page.locator('.book-card').count() !== 14) throw new Error(`${name}: catálogo incompleto`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (overflow) {
      const offenders = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(e => `${e.tagName}.${e.className}: ${Math.round(e.getBoundingClientRect().right)}`));
      throw new Error(`${name}: desborde horizontal: ${offenders.join(', ')}`);
    }
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
    await page.locator('#search').fill('cerebro');
    if (await page.locator('.book-card').count() < 1) throw new Error(`${name}: búsqueda falló`);
    await page.locator('#clear-filters').click();
    await page.locator('.route[data-route="entender"]').click();
    if (await page.locator('.book-card').count() !== 6) throw new Error(`${name}: recorrido falló`);
    await page.locator('#clear-filters').click();
    await page.locator('.chip[data-filter="conocimiento"]').click();
    if (await page.locator('.book-card').count() !== 3) throw new Error(`${name}: filtro falló`);
    await page.locator('.book-open').first().click();
    if (!(await page.locator('#book-dialog').evaluate(e => e.open))) throw new Error(`${name}: diálogo no abrió`);
    if (errors.length) throw new Error(`${name}: ${errors.join('; ')}`);
    console.log(`${name}: catálogo, búsqueda, filtro y diálogo OK`);
    await page.close();
  }
  const reader = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await reader.goto('http://127.0.0.1:8765/reader.html?libro=11_del_texto_al_contexto', { waitUntil: 'networkidle' });
  if (!(await reader.locator('#book-frame').getAttribute('src')).includes('libro.html')) throw new Error('Lector no cargó el volumen XI');
  const frame = reader.frameLocator('#book-frame');
  if (await frame.locator('figure svg').count() !== 6) throw new Error('Faltan figuras en el volumen XI');
  const bookOverflow = await frame.locator('body').evaluate(e => e.ownerDocument.documentElement.scrollWidth > e.ownerDocument.documentElement.clientWidth + 1);
  if (bookOverflow) throw new Error('Volumen XI con desborde horizontal en móvil');
  const readerOverflow = await reader.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (readerOverflow) throw new Error('Lector móvil con desborde horizontal');
  await reader.goto('http://127.0.0.1:8765/reader.html?libro=12_la_red_que_aprende', { waitUntil: 'networkidle' });
  if (await reader.frameLocator('#book-frame').locator('figure svg').count() !== 15) throw new Error('Faltan figuras en el volumen XII');
  const newBookOverflow = await reader.frameLocator('#book-frame').locator('body').evaluate(e => e.ownerDocument.documentElement.scrollWidth > e.ownerDocument.documentElement.clientWidth + 1);
  if (newBookOverflow) throw new Error('Volumen XII con desborde horizontal en móvil');
  await reader.goto('http://127.0.0.1:8765/reader.html?libro=13_aprender_de_los_datos', { waitUntil: 'networkidle' });
  if (await reader.frameLocator('#book-frame').locator('figure svg').count() !== 21) throw new Error('Faltan figuras en el volumen XIII');
  const mlOverflow = await reader.frameLocator('#book-frame').locator('body').evaluate(e => e.ownerDocument.documentElement.scrollWidth > e.ownerDocument.documentElement.clientWidth + 1);
  if (mlOverflow) throw new Error('Volumen XIII con desborde horizontal en móvil');
  await reader.screenshot({ path: path.join(output, 'reader-mobile.png'), fullPage: true });
  console.log('lector móvil OK');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
