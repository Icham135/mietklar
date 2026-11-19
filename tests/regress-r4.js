/* Regressionstests Runde 4 (Befunde aus dem QA-Review): Dezimal-Komma, Browser-Zurück, Zurück von der Zahlung,
   Doppelklick beim Download, Messung ohne Doppelzählung, 320 px, lange Wörter, Zeichen ausserhalb des PDF-Zeichensatzes.
   Aufruf: PLAYWRIGHT_CORE=/pfad/playwright-core node tests/regress-r4.js [chromium|webkit]
   Startet einen eigenen Server mit leerem Datenordner. */
const path = require('path'), fs = require('fs'), os = require('os'), { spawn } = require('child_process');
const pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core'), ENGINE = process.argv[2] || 'chromium';
const R = path.join(__dirname, '..'), PORT = 4380 + (ENGINE === 'webkit' ? 1 : 0), BASE = 'http://127.0.0.1:' + PORT;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-r4-'));
const res = []; const t = (n, ok, info) => { res.push([n, !!ok]); if (!ok) console.log('  FEHLER: ' + n + (info !== undefined ? ' -> ' + JSON.stringify(info) : '')); };
(async () => {
  const srv = spawn('python3', [path.join(R, 'server.py')], { env: Object.assign({}, process.env, { MK_DATA: DATA, MK_PORT: String(PORT), MK_QUIET: '1' }) });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/api/config')).ok) break; } catch (e) {} await new Promise(r => setTimeout(r, 100)); }
  const browser = await pw[ENGINE].launch();
  const mk = async (w) => { const c = await browser.newContext({ viewport: { width: w || 375, height: 812 }, acceptDownloads: true }); const p = await c.newPage(); const ev = []; await p.exposeFunction('__ev', e => ev.push(e)); await p.addInitScript(() => document.addEventListener('mk:event', e => window.__ev(e.detail.n))); return [p, ev, c]; };
  const sub = p => p.locator('#wBody form button[type=submit]').click();
  try {
    /* B1: Komma als Dezimaltrennzeichen */
    let [p] = await mk(); await p.goto(BASE + '/');
    await p.click('[data-mode=bestand]'); await p.fill('#wRent', '950,50'); await sub(p);
    await p.selectOption('#wM', '1'); await p.selectOption('#wY', '2024'); await sub(p); await sub(p); await p.waitForTimeout(1200);
    t('Komma: 950,50 wird als CHF 951 gerechnet (nicht 95’050)', /CHF 951 pro Monat/.test(await p.locator('.facts').innerText()), await p.locator('.facts').innerText());
    await p.goto(BASE + '/'); await p.click('[data-mode=bestand]'); await p.fill('#wRent', '2.100'); await sub(p);
    t('Mehrdeutig «2.100» wird abgewiesen', await p.locator('#wErr').isVisible());
    await p.fill('#wRent', "2'100"); await sub(p); t("Apostroph «2'100» angenommen", await p.locator('#wM').count() === 1);
    /* W1: Browser-Zurück */
    await p.goto(BASE + '/'); await p.click('[data-mode=bestand]'); await p.fill('#wRent', '2100'); await sub(p); await p.waitForTimeout(200);
    await p.goBack(); await p.waitForTimeout(300);
    t('Zurück: von «Seit wann» auf «Miete»', await p.locator('#wRent').count() === 1);
    await p.goBack(); await p.waitForTimeout(300);
    t('Zurück: dann auf Start, Seite bleibt', /localhost|127\.0\.0\.1/.test(p.url()) && await p.locator('[data-mode=bestand]').count() === 1, p.url());
    /* W7: Messung zählt Ergebnis und Vorschau je Check nur einmal */
    let ev; [p, ev] = await mk(); await p.goto(BASE + '/');
    await p.click('[data-mode=bestand]'); await p.fill('#wRent', '2100'); await sub(p); await p.selectOption('#wM', '1'); await p.selectOption('#wY', '2024'); await sub(p); await p.fill('#wTerm', '2027-03-31'); await sub(p); await p.waitForTimeout(600);
    await p.click('.offer [data-act=letter]'); await p.waitForTimeout(300);
    for (const d of ['back', 'fwd', 'back', 'back', 'fwd', 'fwd']) { if (d === 'back') await p.goBack(); else await p.goForward(); await p.waitForTimeout(250); }
    t('Messung: check_complete nur 1×', ev.filter(e => e === 'check_complete').length === 1, ev.filter(e => e === 'check_complete').length);
    t('Messung: preview_view nur 1×', ev.filter(e => e === 'preview_view').length === 1, ev.filter(e => e === 'preview_view').length);
    /* W5 Vorschau: langes Wort ohne Leerzeichen, kein seitliches Scrollen */
    const f = { name: 'Zoë Łukasiewicz-Vučić', street: 'Seestrasse 12', zip: '8002 Zürich', lname: 'Immobilienverwaltungsgesellschaftmitsehrlangemnamenohneleerzeichen AG', lstreet: 'Bahnhofstrasse 1', lzip: '8001 Zürich', obj: 'Seestrasse 12, 8002 Zürich', ort: 'Zürich' };
    if (!(await p.locator('#l_name').count())) { await p.goto(BASE + '/'); }
    for (const [k, v] of Object.entries(f)) await p.fill('#l_' + k, v);
    t('Vorschau: kein seitliches Scrollen bei langem Wort', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), await p.evaluate(() => document.documentElement.scrollWidth));
    t('Vorschau: Hinweis auf Zeichen ausserhalb des PDF', await p.locator('#lChars').isVisible() && /č/.test(await p.locator('#lChars').innerText()));
    /* W2: Zurück von der Zahlungsseite behält die Angaben */
    await Promise.all([p.waitForURL(/sandbox\/pay/), p.locator('#lBuy').click()]);
    await p.goBack(); await p.waitForTimeout(1200);
    t('Zurück von der Zahlung: Vorschau mit Angaben', (await p.locator('#l_name').count()) === 1 && (await p.inputValue('#l_name')) === f.name);
    /* W6: Doppelklick auf Download */
    await Promise.all([p.waitForURL(/sandbox\/pay/), p.locator('#lBuy').click()]);
    await Promise.all([p.waitForURL(/r=paid/), p.locator('button[data-o=paid]').click()]); await p.waitForSelector('#kGet');
    await p.locator('#kGet').dblclick(); await p.waitForTimeout(1500);
    t('Doppelklick: nur 1 Download gezählt', /^1 von 20$/.test((await p.locator('#kDl').innerText()).trim()), await p.locator('#kDl').innerText());
    /* K3: Neuer Check bleibt neu, Kauf bleibt erreichbar */
    await p.click('#kNew'); await p.goto(BASE + '/'); await p.waitForTimeout(800);
    t('Neuer Check: Start statt Bestellseite', await p.locator('[data-mode=bestand]').count() === 1);
    t('Neuer Check: Link zum gekauften Paket', await p.locator('a[href*="?order="]').count() === 1);
    /* K1: 320 px */
    let p3; [p3] = await mk(320); await p3.goto(BASE + '/'); await p3.waitForTimeout(500);
    t('320 px: kein seitliches Scrollen', await p3.evaluate(() => document.documentElement.scrollWidth <= 321), await p3.evaluate(() => document.documentElement.scrollWidth));
    /* K6: Mietantritt weit in der Zukunft */
    await p3.click('[data-mode=neu]'); await sub(p3); await p3.fill('#wOld', '1600'); await p3.fill('#wNew', '1900'); await sub(p3); await p3.fill('#wStart', '2099-01-01'); await sub(p3);
    t('Mietantritt 2099 wird abgewiesen', await p3.locator('#wErr').isVisible());
  } catch (e) { t('Ausnahme: ' + e.message.split('\n')[0], false); }
  await browser.close(); srv.kill();
  const ok = res.filter(r => r[1]).length; console.log(`regress-r4 (${ENGINE}): ${res.length} Prüfungen, ${ok} bestanden, ${res.length - ok} fehlgeschlagen`);
  process.exit(ok === res.length ? 0 : 1);
})();
