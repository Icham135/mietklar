/* Erzeugt die Bildstrecke des Kaufwegs (mobil, 375 x 812) und das Beispiel-PDF nach docs/kaufweg/.
   Aufruf: PLAYWRIGHT_CORE=/pfad/zu/playwright-core node tools/kaufweg.js */
const pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const R = path.join(__dirname, '..'), OUT = path.join(R, 'docs', 'kaufweg'), DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-kw-')), PORT = 6100, BASE = 'http://localhost:' + PORT;
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const srv = spawn('python3', [path.join(R, 'server.py')], { env: Object.assign({}, process.env, { MK_DATA: DATA, MK_PORT: String(PORT), MK_QUIET: '1' }) });
  for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/api/config'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
  const b = await pw.chromium.launch(); const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage(), shot = async (name, sel) => { if (sel) await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, name + '.png') }); };
  const sub = () => page.locator('#wBody form button[type=submit]').click();
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(900); await shot('1-startseite');
  await page.locator('[data-start=bestand]').click(); await page.fill('#wRent', '2100'); await sub();
  await page.selectOption('#wM', '1'); await page.selectOption('#wY', '2024'); await sub(); await page.fill('#wTerm', '2027-03-31'); await sub();
  await page.evaluate(() => document.querySelector('#wiz').scrollIntoView()); await shot('2-ergebnis');
  await page.locator('.offer').scrollIntoViewIfNeeded(); await shot('3-angebot');
  await page.locator('.offer [data-act=letter]').click();
  for (const [k, v] of Object.entries({ name: 'Anna Müller', street: 'Seestrasse 12', zip: '8002 Zürich', lname: 'Immo Verwaltung AG', lstreet: 'Bahnhofstrasse 1', lzip: '8001 Zürich', obj: 'Seestrasse 12, 8002 Zürich', ort: 'Zürich' })) await page.fill('#l_' + k, v);
  await page.evaluate(() => document.querySelector('#wiz').scrollIntoView()); await shot('4-vorschau-lieferumfang');
  await page.locator('#sheet').scrollIntoViewIfNeeded(); await shot('5-vorschau-brief');
  await page.locator('.buy').scrollIntoViewIfNeeded(); await shot('6-preis-und-daten');
  await Promise.all([page.waitForURL(/sandbox/), page.locator('#lBuy').click()]); await shot('7-zahlung-sandbox');
  await Promise.all([page.waitForURL(/r=paid/), page.locator('button[data-o=paid]').click()]); await page.waitForSelector('#kGet'); await shot('8-bezahlt');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#kGet').click()]); await dl.saveAs(path.join(OUT, 'beispiel-brief-paket.pdf'));
  console.log('ok', dl.suggestedFilename());
  await b.close(); srv.kill(); fs.rmSync(DATA, { recursive: true, force: true });
})();
