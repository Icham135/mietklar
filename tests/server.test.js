/* API-Tests für server.py (Sandbox-Kaufstrecke, Messung, Sicherheit). Startet einen eigenen Server mit leerem Datenordner.
   Aufruf: node tests/server.test.js */
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const R = path.join(__dirname, '..'), DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-test-')), PORT = 4390 + Math.floor(Math.random() * 400);
const BASE = 'http://127.0.0.1:' + PORT, CFG = JSON.parse(fs.readFileSync(path.join(R, 'config.json'), 'utf8'));
let n = 0, ok = 0; const fails = [];
const t = (name, cond, info) => { n++; if (cond) ok++; else fails.push(name + (info !== undefined ? ' :: ' + JSON.stringify(info) : '')); };
const req = async (method, p, body, raw) => { const r = await fetch(BASE + p, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined, redirect: 'manual' }); let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j, txt, h: r.headers }; };

(async () => {
  const srv = spawn('python3', [path.join(R, 'server.py')], { env: Object.assign({}, process.env, { MK_DATA: DATA, MK_PORT: String(PORT), MK_QUIET: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  let errOut = ''; srv.stderr.on('data', d => { errOut += d; });
  for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/api/config'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
  try {
    /* Konfiguration */
    const c = await req('GET', '/api/config');
    t('config: 200', c.s === 200); t('config: Preis aus config.json', c.j.price === CFG.price_chf, c.j); t('config: Sandbox', c.j.provider === 'sandbox'); t('config: CHF', c.j.currency === 'CHF');
    /* Sicherheits-Header */
    const idx = await req('GET', '/index.html');
    t('index: 200', idx.s === 200); t('Header: nosniff', idx.h.get('x-content-type-options') === 'nosniff'); t('Header: frame-ancestors none', /frame-ancestors 'none'/.test(idx.h.get('content-security-policy') || ''));
    t('Header: Referrer-Policy', idx.h.get('referrer-policy') === 'no-referrer'); t('index: keine Drittanbieter-URLs', !/https:\/\/(fonts\.googleapis|fonts\.gstatic|cdnjs|cdn\.jsdelivr)/.test(idx.txt));
    for (const p of ['/vendor/d3.min.js', '/vendor/topojson-client.min.js', '/vendor/countries-110m.json', '/vendor/fonts/instrument-sans-latin-600-normal.woff2']) { const r = await fetch(BASE + p); t('vendor erreichbar ' + p, r.status === 200); }
    const woff = await fetch(BASE + '/vendor/fonts/instrument-sans-latin-400-normal.woff2'); t('woff2 MIME', woff.headers.get('content-type') === 'font/woff2', woff.headers.get('content-type'));
    /* Gesperrte Pfade */
    for (const p of ['/data/orders.json', '/server.py', '/tools/build.py', '/tests/server.test.js', '/src/ui.js', '/.claude/launch.json', '/data/events.jsonl']) { const r = await req('GET', p); t('gesperrt ' + p, r.s === 404, r.s); }
    /* QA Runde 4: rohe Pfade (ohne Normalisierung durch fetch), Gross-/Kleinschreibung, Doku */
    const raw = pth => new Promise(res => { require('http').get({ host: '127.0.0.1', port: PORT, path: pth }, r => { r.resume(); res(r.statusCode); }).on('error', () => res(0)); });
    for (const p of ['/vendor/../data/events.jsonl', '/vendor/../server.py', '/Data/orders.json', '/server.PY', '/Tests/e2e.js', '/Src/ui.js', '/docs/launch-blocker.md', '/README.md', '/config.json', '/vendor/%2e%2e/data/orders.json']) t('gesperrt (roh) ' + p, (await raw(p)) === 404, await raw(p));
    { const r = await fetch(BASE + '/gibtsnicht'); t('404 als HTML-Seite', r.status === 404 && /text\/html/.test(r.headers.get('content-type') || '')); }
    t('Rechtsseite erreichbar', (await fetch(BASE + '/impressum.html')).status === 200);
    /* Checkout: Validierung */
    t('checkout ohne path -> 400', (await req('POST', '/api/checkout', {})).s === 400);
    t('checkout falscher path -> 400', (await req('POST', '/api/checkout', { path: 'x' })).s === 400);
    t('checkout kaputtes JSON -> 400', (await req('POST', '/api/checkout', null, '{nope')).s === 400);
    t('checkout zu gross -> 400', (await req('POST', '/api/checkout', null, JSON.stringify({ path: 'bestand', pad: 'x'.repeat(5000) }))).s === 400);
    /* Erfolgreicher Kauf */
    const co = await req('POST', '/api/checkout', { path: 'bestand', name: 'Anna Müller', rent: 2100 });
    t('checkout: 201', co.s === 201); const id = co.j.order;
    t('checkout: ID 16 Zeichen', /^[A-Za-z0-9_-]{16}$/.test(id), id); t('checkout: Betrag', co.j.amount === CFG.price_chf); t('checkout: pay_url', co.j.pay_url === '/sandbox/pay?order=' + id);
    const stored = JSON.parse(fs.readFileSync(path.join(DATA, 'orders.json'), 'utf8'));
    t('Server speichert keine Personendaten', !JSON.stringify(stored).includes('Anna') && !JSON.stringify(stored).includes('2100'));
    t('Bestellung: Felder minimal', Object.keys(stored[id]).sort().join(',') === 'amount,created,currency,downloads,history,path,status', Object.keys(stored[id]));
    const o1 = await req('GET', '/api/order/' + id); t('order: open', o1.j.status === 'open');
    const pay = await req('GET', '/sandbox/pay?order=' + id);
    t('pay: 200 HTML', pay.s === 200 && /text\/html/.test(pay.h.get('content-type'))); t('pay: Betrag sichtbar', pay.txt.includes('CHF ' + CFG.price_chf.toFixed(2))); t('pay: Testmodus-Hinweis', pay.txt.includes('Testmodus'));
    t('pay: Datenhinweis', pay.txt.includes('nur Bestellnummer, Betrag und Produktname')); t('pay: keine Template-Reste', !pay.txt.includes('{{'));
    t('pay: unbekannte Bestellung 404', (await req('GET', '/sandbox/pay?order=AAAAAAAAAAAAAAAA')).s === 404);
    t('download vor Zahlung -> 402', (await req('POST', '/api/order/' + id + '/download')).s === 402);
    const pd = await req('POST', '/api/sandbox/' + id + '/paid');
    t('paid: Status', pd.j.status === 'paid'); t('paid: Redirect', pd.j.redirect === '/index.html?order=' + id + '&r=paid#check');
    t('order: paid', (await req('GET', '/api/order/' + id)).j.status === 'paid');
    const d1 = await req('POST', '/api/order/' + id + '/download'); t('download 1: 200', d1.s === 200 && d1.j.downloads === 1);
    const d2 = await req('POST', '/api/order/' + id + '/download'); t('download 2 (Neuladen): 200', d2.s === 200 && d2.j.downloads === 2 && d2.j.remaining === CFG.max_downloads_per_order - 2);
    t('bezahlt ist endgültig (failed danach ignoriert)', (await req('POST', '/api/sandbox/' + id + '/failed')).j.status === 'paid');
    t('bezahlt ist endgültig (cancelled ignoriert)', (await req('POST', '/api/sandbox/' + id + '/cancelled')).j.status === 'paid');
    /* Limit */
    for (let i = 2; i < CFG.max_downloads_per_order; i++) await req('POST', '/api/order/' + id + '/download');
    t('Download-Limit -> 429', (await req('POST', '/api/order/' + id + '/download')).s === 429);
    /* Abbruch und Fehler */
    const c2 = (await req('POST', '/api/checkout', { path: 'neu' })).j.order;
    const ca = await req('POST', '/api/sandbox/' + c2 + '/cancelled'); t('cancelled: Status', ca.j.status === 'cancelled'); t('cancelled: Redirect', ca.j.redirect.includes('r=cancelled'));
    t('cancelled: kein Download', (await req('POST', '/api/order/' + c2 + '/download')).s === 402);
    const fa = await req('POST', '/api/sandbox/' + c2 + '/failed'); t('failed nach Abbruch erlaubt', fa.j.status === 'failed');
    t('failed: kein Download', (await req('POST', '/api/order/' + c2 + '/download')).s === 402);
    const payF = await req('GET', '/sandbox/pay?order=' + c2); t('pay nach Fehler: Hinweis', payF.txt.includes('fehlgeschlagen'));
    t('erneuter Versuch nach Fehler -> paid', (await req('POST', '/api/sandbox/' + c2 + '/paid')).j.status === 'paid');
    t('danach Download 200', (await req('POST', '/api/order/' + c2 + '/download')).s === 200);
    t('order: Pfad neu', (await req('GET', '/api/order/' + c2)).j.path === 'neu');
    /* Ungültige IDs */
    for (const bad of ['../../etc', 'x', 'AAAAAAAAAAAAAAA!', '%2e%2e']) { const r = await req('GET', '/api/order/' + bad); t('bad id ' + bad, r.s === 400 || r.s === 404, r.s); }
    t('unbekannte Bestellung -> 404', (await req('GET', '/api/order/AAAAAAAAAAAAAAAA')).s === 404);
    t('sandbox unbekannt -> 404', (await req('POST', '/api/sandbox/AAAAAAAAAAAAAAAA/paid')).s === 404);
    t('sandbox ungültiger Ausgang -> 404', (await req('POST', '/api/sandbox/' + c2 + '/refund')).s === 404);
    /* Messung */
    t('event ok', (await req('POST', '/api/event', { n: 'check_complete', c: 'anspruch' })).s === 200);
    t('event unbekannt -> 400', (await req('POST', '/api/event', { n: 'rent_2100' })).s === 400);
    t('event mit freier Kategorie -> 400', (await req('POST', '/api/event', { n: 'check_complete', c: '2100 CHF' })).s === 400);
    t('event zu gross -> 400', (await req('POST', '/api/event', null, JSON.stringify({ n: 'landing_view', x: 'y'.repeat(4000) }))).s === 400);
    for (const e of ['landing_view', 'landing_view', 'check_start', 'preview_view', 'checkout_start', 'purchase_success', 'pdf_download']) await req('POST', '/api/event', { n: e, c: null });
    const ev = fs.readFileSync(path.join(DATA, 'events.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
    t('events: nur n, c, d', ev.every(e => Object.keys(e).sort().join(',') === 'c,d,n'));
    t('events: keine Beträge', !/\d{3,}/.test(ev.map(e => e.n + (e.c || '')).join('')));
    const fu = (await req('GET', '/api/funnel')).j;
    t('funnel: Reihenfolge', fu.steps.map(s => s.step).join(',') === 'landing_view,check_start,check_complete,preview_view,checkout_start,purchase_success,pdf_download');
    t('funnel: Zählung', fu.steps[0].count === 2 && fu.steps[1].count === 1 && fu.steps[1].rate_from_prev === 0.5, fu.steps);
    /* Nicht vorhandene Routen */
    t('POST unbekannt -> 404', (await req('POST', '/api/nope', {})).s === 404);
    t('kein IP-Logging im Code', !/client_address|address_string\(\)/.test(fs.readFileSync(path.join(R, 'server.py'), 'utf8').split('def log_message')[1].split('def end_headers')[0]));
  } catch (e) { fails.push('Ausnahme: ' + e.stack); }
  srv.kill(); fs.rmSync(DATA, { recursive: true, force: true });
  if (errOut.includes('Traceback')) fails.push('Server-Traceback: ' + errOut.slice(0, 400));
  /* Modus 'off': Zahlung aus, Messung an */
  const P2 = PORT + 1, D2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-off-'));
  const off = spawn('python3', [path.join(R, 'server.py')], { env: Object.assign({}, process.env, { MK_DATA: D2, MK_PORT: String(P2), MK_PROVIDER: 'off', MK_QUIET: '1' }) });
  const B2 = 'http://127.0.0.1:' + P2;
  for (let i = 0; i < 50; i++) { try { await fetch(B2 + '/api/config'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
  try {
    t('off: config meldet off', (await (await fetch(B2 + '/api/config')).json()).provider === 'off');
    t('off: checkout 503', (await fetch(B2 + '/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"path":"bestand"}' })).status === 503);
    t('off: Sandbox-Seite 404', (await fetch(B2 + '/sandbox/pay?order=AAAAAAAAAAAAAAAA')).status === 404);
    t('off: Sandbox-API 404', (await fetch(B2 + '/api/sandbox/AAAAAAAAAAAAAAAA/paid', { method: 'POST' })).status === 404);
    t('off: Messung läuft', (await fetch(B2 + '/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"n":"checkout_start","c":"bestand"}' })).status === 200);
  } catch (e) { fails.push('off: ' + e.message); }
  off.kill(); fs.rmSync(D2, { recursive: true, force: true });
  console.log(`server.test: ${n} Tests, ${ok} bestanden, ${n - ok} fehlgeschlagen`);
  fails.forEach(f => console.log('  FEHLER: ' + f));
  process.exitCode = fails.length ? 1 : 0;
})();
