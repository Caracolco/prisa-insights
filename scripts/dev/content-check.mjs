// QA de contenido: titular, resumen y densidad por segmento × página (usa el Edge instalado).
import puppeteer from 'puppeteer-core';
const [, , base = 'http://127.0.0.1:4173'] = process.argv;
const segs = (process.env.SEGS ?? 'huevo,pollo,c-level,mochilero,pensionados').split(',');
const pages = (process.env.PAGES ?? 'perfil,actividades,radio,marcas,digital').split(',');
const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
for (const seg of segs) for (const pg of pages) {
  await page.goto(`${base}/#/${pg}/${seg}`, { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await new Promise((r) => setTimeout(r, 1300));
  const d = await page.evaluate(() => ({
    answer: document.querySelector('.ph__answer')?.textContent,
    panels: [...document.querySelectorAll('.panel__title')].map((e) => e.textContent).join(' | '),
    rows: document.querySelectorAll('.bars__row, .cols__col, .dgrid__cell, .brands__item, .ops li, .plans__item, .prop__legend li').length,
    summary: [...document.querySelectorAll('.sowhat__list li')].map((e) => e.textContent.slice(0, 140)),
    empty: [...document.querySelectorAll('.bars')].filter((b) => !b.children.length).length,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  console.log(`\n[${seg} / ${pg}] filas de datos: ${d.rows}${d.empty ? `  ⚠ ${d.empty} listas vacías` : ''}${d.overflow > 0 ? `  ⚠ desborde ${d.overflow}` : ''}\n  ${d.answer}\n  paneles: ${d.panels}`);
  d.summary.forEach((s) => console.log('   · ' + s));
}
await browser.close();
console.log(errors.length ? 'ERRORES: ' + errors.join(' | ') : '\nSin errores de consola');
