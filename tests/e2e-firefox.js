/* Firefox-Abnahme über WebDriver BiDi (puppeteer-core) mit dem installierten Firefox.
   Aufruf: PUPPETEER_CORE=/pfad/zu/puppeteer-core FIREFOX=/Applications/Firefox.app/Contents/MacOS/firefox node tests/e2e-firefox.js
   Prüft Durchlauf 1 (bis zum PDF, inkl. Neuladen) und Durchlauf 2a. Das PDF wird im Browser abgefangen und geprüft. */
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const R = path.join(__dirname, '..'), DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-ff-')), PORT = 5200 + Math.floor(Math.random() * 300), BASE = 'http://localhost:' + PORT;
let n = 0, ok = 0; const fails = [], log = [];
const t = (name, cond, info) => { n++; log.push((cond ? '- OK: ' : '- FEHLER: ') + name); if (cond) ok++; else fails.push(name + (info !== undefined ? ' :: ' + JSON.stringify(info).slice(0, 200) : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HOOK = `window.__pdf=null;const __oc=URL.createObjectURL;URL.createObjectURL=b=>{if(b&&b.type==='application/pdf'){b.arrayBuffer().then(a=>{let s='';new Uint8Array(a).forEach(c=>s+=String.fromCharCode(c));window.__pdf=s;});}return __oc(b);};HTMLAnchorElement.prototype.click=function(){if(!this.download)location.href=this.href;};`;

(async () => {
  const srv = spawn('python3', [path.join(R, 'server.py')], { env: Object.assign({}, process.env, { MK_DATA: DATA, MK_PORT: String(PORT), MK_QUIET: '1' }) });
  for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/api/config'); break; } catch (e) { await sleep(100); } }
  const browser = await puppeteer.launch({ browser: 'firefox', executablePath: process.env.FIREFOX || '/Applications/Firefox.app/Contents/MacOS/firefox', headless: true });
  const version = await browser.version();
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 375, height: 812 });
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    const sub = () => page.click('#wBody form button[type=submit]');
    const text = sel => page.$eval(sel, e => e.innerText);
    await page.goto(BASE + '/index.html', { waitUntil: 'load' });
    t('Startseite: Zielgruppe, Gratis, Preis', /Schweiz/.test(await text('.hero')) && /CHF\s*39/.test(await text('.hero')));
    t('Kein horizontales Scrollen (375 px)', await page.evaluate(() => document.documentElement.scrollWidth <= 376));
    await page.click('[data-mode=bestand]'); await sleep(150);
    await page.type('#wRent', '2100'); await sub(); await sleep(150);
    await page.select('#wM', '1'); await page.select('#wY', '2024'); await sub(); await sleep(150);
    await page.$eval('#wTerm', e => { e.value = '2027-03-31'; }); await sub(); await sleep(300);
    const res = await text('#wBody');
    t('Ergebnis mit Monat und Jahr', /pro Monat weniger/.test(res) && /pro Jahr/.test(res));
    t('Kaufangebot sichtbar', !!(await page.$('.offer')));
    await page.click('.offer [data-act=letter]'); await sleep(200);
    for (const [k, v] of Object.entries({ name: 'Anna Müller', street: 'Seestrasse 12', zip: '8002 Zürich', lname: 'Immo Verwaltung AG', lstreet: 'Bahnhofstrasse 1', lzip: '8001 Zürich', obj: 'Seestrasse 12, 8002 Zürich', ort: 'Zürich' })) await page.type('#l_' + k, v);
    t('Vorschau ohne Platzhalter', (await page.$$('#sheet .ph')).length === 0);
    await Promise.all([page.waitForNavigation(), page.click('#lBuy')]);
    t('Zahlungsseite erreicht', /sandbox\/pay/.test(page.url()));
    await Promise.all([page.waitForNavigation(), page.click('button[data-o=paid]')]); await page.waitForSelector('#kGet');
    t('Zahlung erfolgreich angezeigt', /Zahlung erfolgreich/.test(await text('#kauf')));
    await page.evaluate(HOOK); await page.click('#kGet');
    for (let i = 0; i < 40 && !(await page.evaluate(() => window.__pdf)); i++) await sleep(100);
    const pdf = await page.evaluate(() => window.__pdf) || '';
    t('PDF erzeugt (Firefox)', pdf.startsWith('%PDF-1.4'), pdf.length);
    t('PDF: Name und Beträge', pdf.includes('Anna M\xfcller') && pdf.includes('2\x92100') && pdf.includes('1\x92981'));
    t('PDF: 3 Seiten', (pdf.match(/\/Type \/Page /g) || []).length === 3);
    await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#kGet');
    await page.evaluate(HOOK); await page.click('#kGet');
    for (let i = 0; i < 40 && !(await page.evaluate(() => window.__pdf)); i++) await sleep(100);
    t('Neuladen: erneuter Download', ((await page.evaluate(() => window.__pdf)) || '').includes('Anna M\xfcller'));
    t('Neuladen: Zähler 2 von 20', /2 von 20/.test(await text('#kDl')));
    await page.goto(BASE + '/index.html', { waitUntil: 'load' }); await sleep(400);
    if (await page.$('#kNew')) { await page.click('#kNew'); await sleep(150); }
    await page.click('[data-mode=bestand]'); await sleep(150); await page.type('#wRent', '1800'); await sub(); await sleep(150);
    await page.select('#wM', '3'); await page.select('#wY', '2021'); await sub(); await sleep(150); await sub(); await sleep(300);
    t('Kein Anspruch ohne Kaufaufruf', /Kein Anspruch/.test(await text('#wBody')) && !(await page.$('.offer')));
    t('Keine JS-Fehler', errors.length === 0, errors);
  } catch (e) { fails.push('Ausnahme: ' + e.message.split('\n')[0]); }
  await browser.close(); srv.kill(); fs.rmSync(DATA, { recursive: true, force: true });
  fs.writeFileSync(path.join(R, 'docs', 'testlauf-e2e-firefox.md'), `# E2E-Protokoll (Firefox ${version}, 375 x 812)\n\nDatum: ${new Date().toISOString()}\n\n${log.join('\n')}\n\n## Ergebnis: ${ok} von ${n} Prüfungen bestanden\n${fails.map(f => '- FEHLER ' + f).join('\n')}\n`);
  console.log(`e2e (firefox ${version}): ${n} Prüfungen, ${ok} bestanden, ${n - ok} fehlgeschlagen`);
  fails.forEach(f => console.log('  FEHLER: ' + f));
  process.exitCode = fails.length ? 1 : 0;
})();
