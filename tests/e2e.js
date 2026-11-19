/* End-to-End-Abnahme: drei Nutzeraufgaben in echten Browser-Engines, mobil (375 x 812).
   Aufruf:  PLAYWRIGHT_CORE=/pfad/zu/playwright-core node tests/e2e.js [chromium|webkit] [axe-core-pfad]
   Startet einen eigenen server.py mit leerem Datenordner. Schreibt ein Protokoll nach docs/testlauf-e2e-<engine>.md */
const pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const R = path.join(__dirname, '..'), ENGINE = process.argv[2] || 'chromium', AXE = process.argv[3] || process.env.AXE_CORE;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-e2e-')), PORT = 4800 + Math.floor(Math.random() * 300), BASE = 'http://localhost:' + PORT;
const log = [], fails = []; let n = 0, ok = 0, run = '';
const step = (msg) => log.push(`- ${run ? '[' + run + '] ' : ''}${msg}`);
const t = (name, cond, info) => { n++; if (cond) { ok++; step('OK: ' + name); } else { fails.push(`[${run}] ${name}` + (info !== undefined ? ' :: ' + JSON.stringify(info).slice(0, 300) : '')); step('FEHLER: ' + name + (info !== undefined ? ' (' + JSON.stringify(info).slice(0, 160) + ')' : '')); } };

async function newPage(browser) {
  const ctx = await browser.newContext(ENGINE === 'webkit' ? Object.assign({}, pw.devices['iPhone 13'], { viewport: { width: 375, height: 812 }, acceptDownloads: true }) : { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true, locale: 'de-CH' });
  const page = await ctx.newPage(); const net = [], posts = [], errors = [];
  page.on('request', r => { net.push(r.url()); if (r.method() === 'POST') posts.push({ url: r.url(), body: r.postData() || '' }); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { ctx, page, net, posts, errors };
}
const sub = (page) => page.locator('#wBody form button[type=submit]').click();
async function heading(page) { return (await page.locator('#wBody h3').first().textContent()).trim(); }
async function axe(page, label) {
  if (!AXE) return;
  await page.addScriptTag({ path: AXE });
  const res = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] }); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0] && v.nodes[0].target.join(' ') })); });
  step(`axe (${label}): ${res.length ? res.map(v => v.id + ' [' + v.impact + '] x' + v.n + ' @ ' + v.sample).join('; ') : 'keine Verstösse in den geprüften Regeln'}`);
  axeAll.push({ label, res });
}
const axeAll = [];
const fill = async (page, vals) => { for (const [k, v] of Object.entries(vals)) await page.fill('#l_' + k, v); };
const PERSON = { name: 'Anna Müller', street: 'Seestrasse 12', zip: '8002 Zürich', lname: 'Immo Verwaltung AG', lstreet: 'Bahnhofstrasse 1', lzip: '8001 Zürich', obj: 'Seestrasse 12, 8002 Zürich', ort: 'Zürich' };
const pdfText = (p) => Buffer.from(fs.readFileSync(p)).toString('latin1');

(async () => {
  const srv = spawn('python3', [path.join(R, 'server.py')], { env: Object.assign({}, process.env, { MK_DATA: DATA, MK_PORT: String(PORT), MK_QUIET: '1' }) });
  for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/api/config'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
  const browser = await pw[ENGINE].launch({ headless: true });
  const allNet = [], allPosts = [], allErrors = [];
  const track = (o) => { allNet.push(...o.net); allPosts.push(...o.posts); allErrors.push(...o.errors); };
  log.push(`# E2E-Protokoll (${ENGINE}${ENGINE === 'webkit' ? ', iPhone-13-Emulation' : ', mobil 375 x 812'})`, '', `Datum: ${new Date().toISOString()}  ·  Server: lokaler Sandbox-Server  ·  Browser: ${browser.version()}`, '');
  try {
    /* ---------- Durchlauf 1: plausible Senkung bis zum PDF ---------- */
    run = 'D1 Senkung bis PDF'; log.push('', '## Durchlauf 1: Bestandsmieterin mit plausibler Senkung, bis zum PDF', '', 'Ziel: Anna (Netto-Miete CHF 2’100, Mietzins seit Januar 2024, Termin 31.3.2027) kauft das Brief-Paket und öffnet das richtige PDF.', '');
    let o = await newPage(browser), page = o.page;
    await page.goto(BASE + '/index.html'); step('Startseite geladen');
    const hero = await page.locator('.hero').innerText();
    t('Startseite nennt Zielgruppe', /Schweiz/.test(hero));
    t('Startseite nennt Gratis-Teil', /Kostenlos/i.test(hero) && /bis wann/.test(hero));
    t('Startseite nennt Preis des Bezahlteils', /CHF\s*39/.test(hero));
    t('Haupt-CTA «Mietzins kostenlos prüfen»', await page.locator('.hero a.btn-light', { hasText: 'Mietzins kostenlos prüfen' }).isVisible());
    t('Kein horizontales Scrollen (375 px)', await page.evaluate(() => document.documentElement.scrollWidth <= 376), await page.evaluate(() => document.documentElement.scrollWidth));
    await axe(page, 'Startseite');
    await page.locator('[data-mode=bestand]').click(); step('«Ich wohne schon dort» geklickt');
    t('Direkt im Bestandsablauf (Miete-Frage)', /Netto-Miete/.test(await heading(page)));
    await sub(page); t('Leere Miete: Fehlermeldung', await page.locator('#wErr').isVisible());
    t('Fehlerfeld fokussiert und markiert', await page.evaluate(() => document.activeElement.id === 'wRent' && document.activeElement.getAttribute('aria-invalid') === 'true'));
    await page.fill('#wRent', '2100'); await sub(page);
    t('Fokus auf neuer Frage', await page.evaluate(() => document.activeElement && document.activeElement.matches('[data-focus]')));
    await page.selectOption('#wM', '1'); await page.selectOption('#wY', '2024'); await sub(page);
    await page.fill('#wTerm', '2027-03-31'); await sub(page); step('Angaben: 2100, Januar 2024, Termin 31.3.2027, Frist 3 Monate');
    const res1 = await page.locator('#wBody').innerText();
    t('Ergebnis zeigt Betrag pro Monat', /pro Monat weniger/.test(res1) && /Gegenrechnung/.test(res1));
    t('Ergebnis zeigt Betrag pro Jahr', /pro Jahr/.test(res1));
    t('Ergebnis zeigt Gegenrechnung (3 Szenarien)', await page.locator('.scen .sc').count() === 3);
    t('Ergebnis zeigt Angaben mit «ändern»', await page.locator('.facts [data-edit]').count() >= 5);
    t('Ergebnis zeigt Datenstand und Primärquelle', /Datenstand/.test(res1) && await page.locator('.srcline a[href*="bwo.admin.ch"]').count() > 0);
    t('Ergebnis zeigt Frist', /31\.12\.2026/.test(res1));
    t('Kaufangebot sichtbar', await page.locator('.offer').isVisible());
    await axe(page, 'Ergebnis');
    await page.locator('.offer [data-act=letter]').click(); step('«Vorschau ansehen» geklickt');
    const pv = await page.locator('#wBody').innerText();
    t('Vorschau: Lieferumfang genannt', /3 A4-Seiten/.test(pv) && /Berechnung/.test(pv) && /Fristenplan/.test(pv));
    t('Vorschau: vollständiger Preis', /CHF 39\.–/.test(pv) && /Endpreis/.test(pv));
    t('Vorschau: Daten an Zahlungsanbieter genannt', /Zahlungsanbieter erhält nur Bestellnummer/.test(pv));
    t('Vorschau: Seite 2 und 3 einsehbar', await page.locator('details.pv-more').count() === 2);
    await page.locator('#lBuy').click(); t('Kauf ohne Angaben: Hinweis auf fehlende Felder', await page.locator('#lMiss').isVisible());
    await fill(page, PERSON); step('Absender, Vermieter, Mietobjekt ausgefüllt');
    t('Vorschau ohne Platzhalter', await page.locator('#sheet .ph').count() === 0);
    await axe(page, 'Vorschau');
    await Promise.all([page.waitForURL(/sandbox\/pay/), page.locator('#lBuy').click()]); step('Zur Testzahlung weitergeleitet');
    t('Zahlungsseite: Betrag', /CHF 39\.00/.test(await page.locator('body').innerText()));
    await Promise.all([page.waitForURL(/r=failed/), page.locator('button[data-o=failed]').click()]); step('Zahlung schlägt fehl (Test)');
    await page.waitForSelector('#kauf h3');
    t('Fehlgeschlagene Zahlung: klare Meldung', /fehlgeschlagen/.test(await page.locator('#kauf').innerText()) && /nichts belastet/.test(await page.locator('#kauf').innerText()));
    await Promise.all([page.waitForURL(/sandbox\/pay/), page.locator('#kRetry').click()]); step('Erneut zur Zahlung');
    await Promise.all([page.waitForURL(/r=paid/), page.locator('button[data-o=paid]').click()]); step('Mit Testkarte bezahlt');
    await page.waitForSelector('#kGet');
    t('Erfolg: Paket bereit', /Zahlung erfolgreich/.test(await page.locator('#kauf').innerText()));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#kGet').click()]);
    const f1 = path.join(DATA, 'd1.pdf'); await dl.saveAs(f1); const p1 = pdfText(f1); step('PDF heruntergeladen: ' + dl.suggestedFilename() + ' (' + fs.statSync(f1).size + ' Bytes)');
    t('PDF: gültige Datei', p1.startsWith('%PDF-1.4') && p1.trimEnd().endsWith('%%EOF'));
    t('PDF: 3 Seiten', (p1.match(/\/Type \/Page /g) || []).length === 3);
    t('PDF: richtiger Name', p1.includes('Anna M\xfcller'));
    t('PDF: richtige Miete und Senkung (2’100 auf 1’981)', p1.includes('2\x92100') && p1.includes('1\x92981'));
    t('PDF: richtiger Termin', p1.includes('31. M\xe4rz 2027'));
    t('PDF: keine Platzhalter', !/\[(Name|Strasse|PLZ|Vermieter|Adresse|Ort)/.test(p1));
    const orderId = new URL(page.url()).searchParams.get('order');
    t('PDF: richtige Bestellnummer', p1.includes(orderId));
    await page.reload(); step('Seite neu geladen'); await page.waitForSelector('#kGet');
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.locator('#kGet').click()]);
    const f2 = path.join(DATA, 'd2.pdf'); await dl2.saveAs(f2);
    t('Neuladen: erneuter Download gleicher Inhalt', pdfText(f2).replace(/\/CreationDate[^>]*/, '') === p1.replace(/\/CreationDate[^>]*/, ''));
    t('Neuladen: Zähler 2 von 20', /2 von 20/.test(await page.locator('#kDl').innerText()));
    track(o); await o.ctx.close();

    /* Abbruch im selben Ablauf, neuer Browser-Kontext */
    run = 'D1b Abbruch'; log.push('', '### Zusatz: Zahlungsabbruch', '');
    o = await newPage(browser); page = o.page;
    await page.goto(BASE + '/index.html'); await page.locator('[data-mode=bestand]').click(); await page.fill('#wRent', '2100'); await sub(page);
    await page.selectOption('#wM', '1'); await page.selectOption('#wY', '2024'); await sub(page); await sub(page);
    await page.locator('.offer [data-act=letter]').click(); await fill(page, PERSON);
    await Promise.all([page.waitForURL(/sandbox\/pay/), page.locator('#lBuy').click()]);
    await Promise.all([page.waitForURL(/r=cancelled/), page.locator('button[data-o=cancelled]').click()]); await page.waitForSelector('#kauf h3');
    t('Abbruch: klare Meldung', /abgebrochen/.test(await page.locator('#kauf').innerText()));
    await page.locator('#kBack').click();
    t('Abbruch: zurück zur Vorschau mit allen Angaben', (await page.inputValue('#l_name')) === 'Anna Müller' && await page.locator('#sheet .ph').count() === 0);
    t('Abbruch: Brief ohne Termin sagt «nächstmöglichen»', /nächstmöglichen Kündigungstermin/.test(await page.locator('#sheet').innerText()));
    track(o); await o.ctx.close();

    /* ---------- Durchlauf 2: kein plausibler Anspruch ---------- */
    run = 'D2 kein Anspruch'; log.push('', '## Durchlauf 2: Personen ohne plausiblen Anspruch, bis zu einem verständlichen Abschluss', '', 'Ziel a: Bestandsmieter mit Mietzins seit März 2021 (Referenzzins 1,25 %). Ziel b: Neumieterin mit 5 % Erhöhung.', '');
    o = await newPage(browser); page = o.page;
    await page.goto(BASE + '/index.html'); await page.locator('[data-mode=bestand]').click(); await page.fill('#wRent', '1800'); await sub(page);
    await page.selectOption('#wM', '3'); await page.selectOption('#wY', '2021'); await sub(page); await sub(page);
    const r2 = await page.locator('#wBody').innerText();
    t('a) klares «Kein Anspruch»', /Kein Anspruch/.test(r2));
    t('a) Begründung mit Satz damals und heute', /1,25 %/.test(r2));
    t('a) kein Kaufaufruf', await page.locator('.offer').count() === 0 && await page.locator('#lBuy').count() === 0);
    t('a) Abschluss ohne Kosten erklärt', /ohne etwas zu bezahlen/.test(r2));
    await axe(page, 'Kein Anspruch');
    await page.goto(BASE + '/index.html'); await page.locator('[data-mode=neu]').click();
    t('b) Direkt im Neumieter-Ablauf (Kanton)', /Kanton/.test(await heading(page)));
    await page.selectOption('#wCan', 'BE'); await sub(page); await page.fill('#wOld', '2000'); await page.fill('#wNew', '2100'); await sub(page);
    const d = new Date(); d.setDate(d.getDate() - 5); await page.fill('#wStart', d.toISOString().slice(0, 10)); await sub(page);
    const r2b = await page.locator('#wBody').innerText();
    t('b) Einordnung unter 10 %', /unter etwa 10 %/.test(r2b));
    t('b) kein Kaufaufruf, mit Begründung', await page.locator('.offer').count() === 0 && /Kein Dossier/.test(r2b));
    t('b) Mehrkosten pro Jahr genannt', /pro Jahr mehr/.test(r2b));
    track(o); await o.ctx.close();

    /* ---------- Durchlauf 3: unvollständige Angaben ---------- */
    run = 'D3 Angaben fehlen'; log.push('', '## Durchlauf 3: Personen mit unvollständigen Angaben, bis zum passenden nächsten Schritt', '', 'Ziel a: Bestandsmieter kennt das Datum der letzten Mietzinsfestlegung nicht. Ziel b: Neumieter kennt den Vormietzins nicht.', '');
    o = await newPage(browser); page = o.page;
    await page.goto(BASE + '/index.html'); await page.locator('[data-mode=bestand]').click(); await page.fill('#wRent', '2400'); await sub(page);
    await page.locator('#wUnknown').click();
    const r3 = await page.locator('#wBody').innerText();
    t('a) nennt fehlende Angabe', /Eine Angabe fehlt/.test(r3) && /Seit wann gilt dein Mietzins/.test(r3));
    t('a) sagt, wo man sie findet', /Mietvertrag/.test(r3) && /Mitteilung/.test(r3));
    t('a) Spanne je nach Basis', await page.locator('.mtab tbody tr').count() >= 6);
    t('a) Anfrage-Text zum Kopieren', await page.locator('#reqTxt').count() === 1);
    t('a) kein Kaufaufruf', await page.locator('.offer').count() === 0);
    await axe(page, 'Angabe fehlt');
    await page.locator('[data-edit=since]').first().click();
    t('a) «Datum eingeben» führt zur Frage', /Seit wann/.test(await heading(page)));
    await page.goto(BASE + '/index.html'); await page.locator('[data-mode=neu]').click(); await page.selectOption('#wCan', 'ZH'); await sub(page);
    await page.locator('#wOldUnk').check(); t('b) Vormietzins-Feld deaktiviert', await page.locator('#wOld').isDisabled());
    await page.fill('#wNew', '2300'); await sub(page);
    const d3 = new Date(); d3.setDate(d3.getDate() - 3); await page.fill('#wStart', d3.toISOString().slice(0, 10)); await sub(page);
    const r3b = await page.locator('#wBody').innerText();
    t('b) nennt fehlenden Vormietzins', /Vormietzins/.test(r3b) && /fehlt/.test(r3b));
    t('b) Frist läuft trotzdem, mit Datum', /Die Frist läuft trotzdem/.test(r3b));
    t('b) nächster Schritt: Vormietzins verlangen (Art. 256a OR)', /256a/.test(r3b) && await page.locator('#reqTxt').count() === 1);
    t('b) Formularkanton-Hinweis', /amtliche Formular/.test(r3b));
    t('b) kein Kaufaufruf', await page.locator('.offer').count() === 0);
    track(o); await o.ctx.close();

    /* ---------- Tastatur ---------- */
    run = 'Tastatur'; log.push('', '## Tastaturbedienung (Bestand, ohne Maus)', '');
    o = await newPage(browser); page = o.page; await page.goto(BASE + '/index.html#check');
    await page.locator('[data-mode=bestand]').focus(); await page.keyboard.press('Enter');
    t('Enter auf Auswahl startet Ablauf', /Netto-Miete/.test(await heading(page)));
    await page.locator('#wRent').focus(); await page.keyboard.type('2100'); await page.keyboard.press('Enter');
    t('Enter im Feld sendet Formular', /Seit wann/.test(await heading(page)));
    await page.locator('#wY').focus(); await page.keyboard.press('Tab'); t('Tab-Reihenfolge Jahr -> Satz-Auswahl', await page.evaluate(() => document.activeElement.id) === 'wBase' || await page.evaluate(() => document.activeElement.tagName) === 'SUMMARY', await page.evaluate(() => document.activeElement.id || document.activeElement.tagName));
    const kt = page.locator('.kt[data-c=ZH]'); await kt.focus(); await page.keyboard.press('ArrowRight');
    t('Kantonskarte: Pfeiltaste bewegt Fokus', await page.evaluate(() => document.activeElement.dataset.c) === 'SG');
    track(o); await o.ctx.close();

    /* ---------- Netzwerk und Datenschutz ---------- */
    run = 'Netzwerk'; log.push('', '## Netzwerkzugriffe über alle Durchläufe', '');
    const hosts = [...new Set(allNet.map(u => { try { return new URL(u).host; } catch (e) { return u.slice(0, 20); } }))];
    step('Angefragte Hosts: ' + hosts.join(', '));
    t('Nur eigener Server angefragt', hosts.every(h => h === 'localhost:' + PORT || h === ''), hosts);
    const leak = allPosts.filter(p => /2100|2\x92100|Anna|Seestrasse|Immo|8002/.test(p.body));
    t('Keine Miete/Adresse/Name in POST-Anfragen', leak.length === 0, leak);
    step('POST-Ziele: ' + [...new Set(allPosts.map(p => new URL(p.url).pathname.replace(/\/[A-Za-z0-9_-]{16}/, '/<id>')))].join(', '));
    t('Keine JS-Fehler', allErrors.length === 0, allErrors.slice(0, 3));
    const fu = await (await fetch(BASE + '/api/funnel')).json();
    step('Trichter nach den Durchläufen: ' + fu.steps.map(s => s.step + '=' + s.count).join(', '));
    t('Messung: Kauf und Download gezählt', fu.steps.find(s => s.step === 'purchase_success').count >= 1 && fu.steps.find(s => s.step === 'pdf_download').count >= 1);
  } catch (e) { fails.push(`[${run}] Ausnahme: ${e.message.split('\n')[0]}`); step('AUSNAHME: ' + e.message.split('\n')[0]); }
  await browser.close(); srv.kill();
  log.push('', `## Ergebnis: ${ok} von ${n} Prüfungen bestanden`, '', ...fails.map(f => '- FEHLER ' + f));
  fs.writeFileSync(path.join(R, 'docs', `testlauf-e2e-${ENGINE}.md`), log.join('\n') + '\n');
  fs.rmSync(DATA, { recursive: true, force: true });
  console.log(`e2e (${ENGINE}): ${n} Prüfungen, ${ok} bestanden, ${n - ok} fehlgeschlagen`);
  fails.forEach(f => console.log('  FEHLER: ' + f));
  if (axeAll.length) console.log('  axe: ' + axeAll.map(a => a.label + '=' + a.res.length).join(', '));
  process.exitCode = fails.length ? 1 : 0;
})();
