#!/usr/bin/env python3
"""Mietklar: lokaler Server mit Sandbox-Kaufstrecke.

Start:  python3 server.py            -> http://localhost:4360/
Tests:  node tests/server.test.js    (startet den Server selbst)

Was der Server kennt:   Bestellnummer, Status, Betrag, Anzahl Downloads, Zeitstempel.
Was der Server NIE sieht: Miete, Daten, Namen, Adressen, Kanton. Der Brief entsteht im Browser.

Zahlungsanbieter: 'sandbox' simuliert eine gehostete Zahlungsseite (Erfolg, Abbruch, Fehler).
Ein echter Anbieter (Stripe, Payrexx, Datatrans) ist absichtlich NICHT angebunden:
Das braucht Freigabe von Preis und Anbieter sowie Zugangsdaten des Gründers.
"""
import json, os, re, secrets, threading, time, datetime, html, gzip
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC_FILES = {'index.html', 'calc.js', 'impressum.html', 'datenschutz.html', 'bedingungen.html'}
NOT_FOUND_PAGE = '<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Seite nicht gefunden | Mietklar</title><style>body{margin:0;font:17px/1.6 system-ui,sans-serif;background:#F5F2EC;color:#0F2226}main{max-width:560px;margin:0 auto;padding:80px 20px}a{color:#2B7479;font-weight:600}</style></head><body><main><h1>Seite nicht gefunden</h1><p>Diese Adresse gibt es nicht.</p><p><a href="/">Zur Startseite und zum Mietzins-Check</a></p></main></body></html>'
CFG = json.load(open(os.path.join(ROOT, 'config.json'), encoding='utf-8'))
DATA = os.environ.get('MK_DATA') or os.path.join(ROOT, 'data')
os.makedirs(DATA, exist_ok=True)
ORDERS = os.path.join(DATA, 'orders.json')
EVENTS = os.path.join(DATA, 'events.jsonl')
LOCK = threading.Lock()
ID_RE = re.compile(r'^[A-Za-z0-9_-]{16}$')
# Erlaubte Mess-Ereignisse und Kategorien: keine Beträge, keine Daten, keine Freitexte.
EVENT_NAMES = {'landing_view', 'check_start', 'check_complete', 'preview_view', 'checkout_start',
               'purchase_success', 'purchase_failed', 'purchase_cancelled', 'pdf_download', 'pdf_redownload'}
EVENT_CATS = {None, 'bestand', 'neu', 'anspruch', 'kein_anspruch', 'gedeckt', 'sonderform', 'unklar',
              'angabe_fehlt', 'frist_vorbei', 'auffaellig', 'eher_schwierig'}
PROVIDER = os.environ.get('MK_PROVIDER') or CFG.get('payment_provider', 'sandbox')
if PROVIDER not in ('sandbox', 'off'):
    raise SystemExit('Eingebaut sind nur "sandbox" (Testzahlung) und "off" (Zahlung aus, Messung an). Produktivzahlungen brauchen Freigabe und Zugangsdaten.')


def load_orders():
    try:
        return json.load(open(ORDERS, encoding='utf-8'))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_orders(o):
    tmp = ORDERS + '.tmp'
    json.dump(o, open(tmp, 'w', encoding='utf-8'), indent=1)
    os.replace(tmp, ORDERS)


def public(oid, o):
    return {'order': oid, 'status': o['status'], 'amount': o['amount'], 'currency': o['currency'], 'path': o['path'],
            'downloads': o['downloads'], 'max_downloads': CFG['max_downloads_per_order']}


SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
                               "font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; "
                               "form-action 'self'; object-src 'none'; frame-ancestors 'none'",
}

PAY_PAGE = '''<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Testzahlung | Mietklar</title><style>
@font-face{font-family:'Instrument Sans';font-weight:400 700;font-display:swap;src:url(/vendor/fonts/instrument-sans-latin-600-normal.woff2) format('woff2')}
:root{--ink:#0F2226;--ink2:#41524F;--line:rgba(15,43,51,.14);--fj:#0F2B33;--ok:#2E7D5B;--bad:#A3361B}
*{box-sizing:border-box}body{margin:0;background:#EEF1F0;color:var(--ink);font:17px/1.55 'Instrument Sans',system-ui,sans-serif}
main{max-width:480px;margin:0 auto;padding:28px 16px 60px}.test{background:#FFF3C4;border:1px solid #E5C76B;color:#5A4500;border-radius:12px;padding:12px 14px;font-size:15px;font-weight:600}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;margin-top:16px;box-shadow:0 10px 30px rgba(15,43,51,.08)}
h1{font-size:24px;letter-spacing:-.02em;margin:0 0 4px}.amt{font-size:40px;font-weight:700;letter-spacing:-.03em;margin:10px 0 2px}
dd{word-break:break-all;margin:0}dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:15px;color:var(--ink2);margin:14px 0 0}dt{font-weight:600;color:var(--ink)}
button{display:block;width:100%;min-height:52px;margin-top:12px;border-radius:14px;border:2px solid var(--fj);font:inherit;font-weight:600;cursor:pointer;background:#fff;color:var(--fj)}
button.pay{background:var(--fj);color:#fff}button:focus-visible{outline:3px solid #F0A073;outline-offset:3px}
small{display:block;margin-top:14px;color:var(--ink2);font-size:13.5px}.err{color:var(--bad);font-weight:600}
</style></head><body><main>
<p class="test" role="note">Testmodus (Sandbox). Es wird kein Geld belastet. So sieht später die Zahlungsseite des Anbieters aus.</p>
<div class="card"><h1>{{product}}</h1><p style="margin:0;color:var(--ink2)">Einmalzahlung, kein Abo</p>
<div class="amt">{{currency}} {{amount}}</div><p style="margin:0;font-size:14px;color:var(--ink2)">Endpreis</p>
<dl><dt>Bestellung</dt><dd>{{order}}</dd><dt>Empfänger</dt><dd>Mietklar (Testbetrieb)</dd></dl>
<p id="msg" role="status" class="{{msgclass}}">{{msg}}</p>
<button class="pay" type="button" data-o="paid">Mit Testkarte bezahlen</button>
<button type="button" data-o="failed">Zahlung fehlschlagen lassen (Test)</button>
<button type="button" data-o="cancelled">Abbrechen und zurück</button>
<small>Dieser Anbieter erhält von Mietklar nur Bestellnummer, Betrag und Produktname. Miete, Adressen und Brieftext bleiben in deinem Browser.</small></div>
</main><script>
document.querySelectorAll('button[data-o]').forEach(b => b.addEventListener('click', async () => {
  document.querySelectorAll('button').forEach(x => x.disabled = true);
  const r = await fetch('/api/sandbox/{{order}}/' + b.dataset.o, { method: 'POST' }).then(r => r.json()).catch(() => null);
  if (r && r.redirect) location.href = r.redirect; else { document.getElementById('msg').textContent = 'Verbindung fehlgeschlagen. Bitte neu laden.'; document.querySelectorAll('button').forEach(x => x.disabled = false); }
}));
</script></body></html>'''


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.woff2': 'font/woff2', '.js': 'text/javascript; charset=utf-8',
                      '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.ics': 'text/calendar'}

    def log_message(self, fmt, *args):  # keine IP-Adressen protokollieren
        if os.environ.get('MK_QUIET'):
            return
        print('[%s] %s' % (time.strftime('%H:%M:%S'), fmt % args))

    def end_headers(self):
        for k, v in SECURITY_HEADERS.items():
            self.send_header(k, v)
        if self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def j(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def not_found(self):
        b = NOT_FOUND_PAGE.encode('utf-8')
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def body(self):
        try:
            n = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            return None
        if n < 0 or n > 2048:
            return None
        raw = self.rfile.read(n) if n else b''
        try:
            return json.loads(raw or b'{}')
        except json.JSONDecodeError:
            return None

    # ---------- GET ----------
    def do_GET(self):
        u = urlparse(self.path)
        p = u.path
        if re.match(r'^/(data|tools|tests|src)(/|$)', p) or p.endswith('.py') or p.startswith('/.'):
            return self.j(404, {'error': 'not_found'})
        if p == '/api/config':
            return self.j(200, {'price': CFG['price_chf'], 'currency': CFG['currency'], 'provider': PROVIDER, 'product': CFG['product_name']})
        m = re.match(r'^/api/order/([^/]+)$', p)
        if m:
            oid = m.group(1)
            if not ID_RE.match(oid):
                return self.j(400, {'error': 'bad_id'})
            with LOCK:
                o = load_orders().get(oid)
            return self.j(200, public(oid, o)) if o else self.j(404, {'error': 'unknown_order'})
        if p == '/api/funnel':
            # Zahlen nur für den Betreiber: lokal oder mit Schlüssel aus MK_ADMIN_KEY
            key = os.environ.get('MK_ADMIN_KEY')
            local = self.client_address[0] in ('127.0.0.1', '::1')
            if not (local or (key and (parse_qs(u.query).get('key') or [''])[0] == key)):
                return self.j(404, {'error': 'not_found'})
            return self.j(200, funnel())
        if p == '/sandbox/pay' and PROVIDER == 'sandbox':
            oid = (parse_qs(u.query).get('order') or [''])[0]
            with LOCK:
                o = load_orders().get(oid) if ID_RE.match(oid) else None
            if not o:
                return self.j(404, {'error': 'unknown_order'})
            msg, cls = ('', '')
            if o['status'] == 'paid':
                msg, cls = 'Diese Bestellung ist bereits bezahlt.', ''
            elif o['status'] == 'failed':
                msg, cls = 'Der letzte Versuch ist fehlgeschlagen. Du kannst es erneut versuchen.', 'err'
            page = PAY_PAGE
            for k, v in {'product': html.escape(CFG['product_name']), 'currency': CFG['currency'], 'amount': '%.2f' % o['amount'],
                         'order': oid, 'msg': msg, 'msgclass': cls}.items():
                page = page.replace('{{%s}}' % k, v)
            b = page.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(b)))
            self.end_headers()
            return self.wfile.write(b)
        if p == '/':
            self.path = p = '/index.html'
        return self.static(p)

    def static(self, p):
        """Statische Dateien mit gzip (falls vom Browser akzeptiert) und Cache-Regeln."""
        fp = os.path.realpath(os.path.join(ROOT, p.lstrip('/')))
        rel = os.path.relpath(fp, ROOT).replace(os.sep, '/') if fp.startswith(ROOT + os.sep) else ''
        # Positivliste: nur die öffentliche Seite, Rechtsseiten, Rechenkern und vendor/ (exakte Schreibweise)
        if not (rel in PUBLIC_FILES or (rel.startswith('vendor/') and '/.' not in '/' + rel)) or not os.path.isfile(fp):
            return self.not_found()
        ctype = self.guess_type(fp)
        data = open(fp, 'rb').read()
        gz = 'gzip' in (self.headers.get('Accept-Encoding') or '') and re.search(r'(text/|javascript|json|svg)', ctype or '')
        if gz:
            data = gzip.compress(data, 6)
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        if gz:
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Vary', 'Accept-Encoding')
        self.send_header('Cache-Control', 'public, max-age=31536000, immutable' if p.startswith('/vendor/') else 'no-cache')
        self.end_headers()
        self.wfile.write(data)

    # ---------- POST ----------
    def do_POST(self):
        p = urlparse(self.path).path
        if p == '/api/checkout':
            if PROVIDER == 'off':
                return self.j(503, {'error': 'payment_off'})
            b = self.body()
            if b is None or b.get('path') not in ('bestand', 'neu'):
                return self.j(400, {'error': 'bad_request'})
            oid = secrets.token_urlsafe(12)
            o = {'status': 'open', 'amount': float(CFG['price_chf']), 'currency': CFG['currency'], 'path': b['path'],
                 'downloads': 0, 'created': int(time.time()), 'history': [['open', int(time.time())]]}
            with LOCK:
                all_ = load_orders()
                all_[oid] = o
                save_orders(all_)
            return self.j(201, {'order': oid, 'amount': o['amount'], 'currency': o['currency'], 'pay_url': '/sandbox/pay?order=' + oid})
        m = re.match(r'^/api/sandbox/([^/]+)/(paid|failed|cancelled)$', p)
        if m and PROVIDER == 'sandbox':
            oid, outcome = m.groups()
            if not ID_RE.match(oid):
                return self.j(400, {'error': 'bad_id'})
            with LOCK:
                all_ = load_orders()
                o = all_.get(oid)
                if not o:
                    return self.j(404, {'error': 'unknown_order'})
                if o['status'] != 'paid':        # bezahlt ist endgültig
                    o['status'] = outcome
                    o['history'].append([outcome, int(time.time())])
                    save_orders(all_)
            return self.j(200, {'status': o['status'], 'redirect': '/index.html?order=%s&r=%s#check' % (oid, outcome)})
        m = re.match(r'^/api/order/([^/]+)/download$', p)
        if m:
            oid = m.group(1)
            if not ID_RE.match(oid):
                return self.j(400, {'error': 'bad_id'})
            with LOCK:
                all_ = load_orders()
                o = all_.get(oid)
                if not o:
                    return self.j(404, {'error': 'unknown_order'})
                if o['status'] != 'paid':
                    return self.j(402, {'error': 'not_paid', 'status': o['status']})
                if o['downloads'] >= CFG['max_downloads_per_order']:
                    return self.j(429, {'error': 'download_limit'})
                o['downloads'] += 1
                save_orders(all_)
            return self.j(200, {'ok': True, 'downloads': o['downloads'], 'remaining': CFG['max_downloads_per_order'] - o['downloads']})
        if p == '/api/event':
            b = self.body()
            if not isinstance(b, dict) or b.get('n') not in EVENT_NAMES or b.get('c') not in EVENT_CATS:
                return self.j(400, {'error': 'bad_event'})
            with LOCK, open(EVENTS, 'a', encoding='utf-8') as f:
                f.write(json.dumps({'n': b['n'], 'c': b.get('c'), 'd': datetime.date.today().isoformat()}) + '\n')
            return self.j(200, {"ok": True})
        return self.j(404, {'error': 'not_found'})


def funnel():
    order = ['landing_view', 'check_start', 'check_complete', 'preview_view', 'checkout_start', 'purchase_success', 'pdf_download']
    c = {k: 0 for k in EVENT_NAMES}
    try:
        for line in open(EVENTS, encoding='utf-8'):
            e = json.loads(line)
            c[e['n']] = c.get(e['n'], 0) + 1
    except FileNotFoundError:
        pass
    steps = []
    for i, k in enumerate(order):
        prev = c[order[i - 1]] if i else None
        steps.append({'step': k, 'count': c[k], 'rate_from_prev': (round(c[k] / prev, 3) if prev else None)})
    return {'steps': steps, 'other': {k: c[k] for k in ('purchase_failed', 'purchase_cancelled', 'pdf_redownload')}}


if __name__ == '__main__':
    port = int(os.environ.get('MK_PORT') or CFG.get('port', 4360))
    srv = ThreadingHTTPServer(('127.0.0.1', port), H)
    print('Mietklar läuft auf http://localhost:%d/  (Zahlung: %s, Preis: %s %s)' % (port, PROVIDER, CFG['currency'], CFG['price_chf']), flush=True)
    srv.serve_forever()
