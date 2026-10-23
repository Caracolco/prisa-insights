// QA visual local: capturas en escritorio y móvil (390px) con el Edge/Chrome instalado.
// Uso: node scripts/dev/screens.mjs <baseUrl> <carpetaSalida>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [, , base = 'http://127.0.0.1:8787', out = 'screens'] = process.argv;
const exe = process.env.BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--disable-gpu'] });
const errors = [];
async function shot(name, url, vp, { reduced = false, wait = 1600, action } = {}) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  await page.setViewport(vp);
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(base + url, { waitUntil: 'load', timeout: 20000 });
  await new Promise((r) => setTimeout(r, wait));
  if (action) await action(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log(`${name}: ok${overflow > 0 ? `  ⚠ desborde horizontal ${overflow}px` : ''}`);
  await page.close();
}
const mobile = { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const desk = { width: 1440, height: 900 };
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const plan = [
  ['act-clevel', '/#/actividades/c-level', desk, {}],
  ['radio-pens', '/#/radio/pensionados', desk, {}],
  ['marcas-moch', '/#/marcas/mochilero', desk, {}],
  ['digital-pollo', '/#/digital/pollo', desk, {}],
  ['radio-mob', '/#/radio/huevo', mobile, {}],
  ['marcas-mob', '/#/marcas/c-level', mobile, {}],
  ['act-mob', '/#/actividades/pensionados', mobile, {}],
  ['digital-mob', '/#/digital/c-level', mobile, {}],
  ['cover-desk', '/', desk, { wait: 3200 }],
  ['perfil-desk', '/#/perfil/huevo', desk, {}],
  ['social-huevo', '/#/social/huevo', desk, {}],
  ['social-pollo', '/#/social/pollo', desk, {}],
  ['social-mob', '/#/social/pollo', mobile, {}],
  ['social-sin', '/#/social/moteros', desk, {}],
  ['perfil-mob', '/#/perfil/moteros', mobile, {}],
  ['sintetica-chat', '/#/sintetica/pollo', desk, { action: async (p) => {
    for (const q of ['¿Qué dicen las redes sobre el pollo?', '¿Cuál es tu equipo de fútbol favorito?']) { await p.type('#ask-input', q); await p.keyboard.press('Enter'); await new Promise((r) => setTimeout(r, 900)); }
    const btns = await p.$$('.ans__ev'); if (btns[0]) await btns[0].click(); await new Promise((r) => setTimeout(r, 600)); } }],
  ['tooltip', '/#/perfil/huevo', desk, { action: async (p) => { const el = await p.$('.cols__col'); await el.scrollIntoView(); await el.hover(); await new Promise((r) => setTimeout(r, 500)); const b = await el.boundingBox(); console.log('  tooltip visible:', Boolean(await p.$('.tip'))); await p.screenshot({ path: `${out}/tooltip-crop.png`, clip: { x: Math.max(0, b.x - 40), y: Math.max(0, b.y - 140), width: 520, height: 300 } }); } }],
  ['seg-open', '/#/perfil/huevo', mobile, { action: async (p) => { await p.click('.seg__btn'); await new Promise((r) => setTimeout(r, 400)); } }],
  ['perfil-tablet', '/#/perfil/c-level', { width: 820, height: 1180 }, {}],
  ['sintetica-mob', '/#/sintetica/huevo', mobile, {}],
  ['social-emerg-open', '/#/social/pollo', desk, { action: async (p) => { const b = await p.$$('.emerg .evid__btn'); if (b[0]) await b[0].click(); await new Promise((r) => setTimeout(r, 600)); } }],
];
for (const [name, url, vp, opts] of plan) if (!only || only.includes(name)) await shot(name, url, vp, opts);
await browser.close();
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'Sin errores de consola');
