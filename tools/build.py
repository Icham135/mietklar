#!/usr/bin/env python3
"""Baut mietklar/index.html aus src/ (Vorlage: tools/funded-template.html) und die Rechtsseiten.
Aufruf: python3 tools/build.py"""
import re, os, json, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = lambda *p: os.path.join(ROOT, *p)
rd = lambda p: open(p, encoding='utf-8').read()
ref = rd(R('tools', 'funded-template.html')).split('\n')
head = '\n'.join(ref[0:319])
script = '\n'.join(ref[516:822])      # ab <script> (ohne die beiden d3/topojson-Tags)
body = rd(R('src', 'body.html')); addcss = rd(R('src', 'add.css')); calc = rd(R('src', 'calc.js')); ui = rd(R('src', 'ui.js'))
pdfjs = rd(R('src', 'pdf.js')); paket = rd(R('src', 'paket.js'))
CFG = json.loads(rd(R('config.json'))); PRICE = str(CFG['price_chf'])
LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
LATINEXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'
FONTFACE = ''.join("@font-face{font-family:'Instrument Sans';font-style:normal;font-display:swap;font-weight:%s;src:url(vendor/fonts/instrument-sans-%s-%s-normal.woff2) format('woff2');unicode-range:%s}\n" % (w, sub, w, rng) for w in (400, 500, 600, 700) for sub, rng in (('latin', LATIN), ('latin-ext', LATINEXT)))

FAQ = [
 ("Kann mir der Vermieter kündigen?", "Eine Kündigung, weil du berechtigte Ansprüche geltend machst, ist anfechtbar (Art. 271a OR), und zwar innert 30 Tagen bei der Schlichtungsbehörde. Ganz ausschliessen kann das niemand. Wenn du unsicher bist, hilft der Mieterverband."),
 ("Ist das legal und seriös?", "Wir geben Information, Rechenhilfe und Briefvorlagen. Wir vertreten niemanden, versenden nichts und prüfen keinen Einzelfall. Das ist keine Rechtsberatung. Alle Werte sind Schätzungen, bei wichtigen Schritten hilft der Mieterverband oder ein Anwalt."),
 ("Sind meine Daten sicher?", "Die Berechnung und das PDF entstehen in deinem Browser. Miete, Daten und Adressen werden nicht an uns gesendet. Schrift und Skripte kommen von unserem eigenen Server, nicht von Drittanbietern. Beim Kauf erhält der Zahlungsanbieter nur Bestellnummer, Betrag und Produktname. Details stehen in der Datenschutzerklärung."),
 ("Was passiert, wenn der Vermieter ablehnt?", "Bei der Anfangsmiete rufst du innert 30 Tagen nach Mietantritt die Schlichtungsbehörde an. Beim Referenzzins hat der Vermieter 30 Tage zur Antwort. Lehnt er ab, stimmt er nur teilweise zu oder antwortet er nicht, hast du danach 30 Tage Zeit für die Schlichtungsbehörde (Art. 270a OR), insgesamt spätestens etwa 60 Tage ab Versand."),
 ("Wie finde ich heraus, seit wann mein Mietzins gilt?", "Im Mietvertrag steht der Mietbeginn. Wurde der Mietzins später geändert, zählt das Datum der Mitteilung über die Änderung. In ZH, BE, BS, ZG, LU, FR und GE steht der Anfangsmietzins auf dem amtlichen Formular. Die Verwaltung muss dir die letzte Änderung nennen können."),
 ("Gilt das auch für Genossenschaftswohnungen?", "Oft nicht. Bei Genossenschaften und gemeinnützigen Wohnungen gilt häufig die Kostenmiete, der Referenzzins-Mechanismus greift dort meist nicht. Prüfe Statuten und Mietvertrag."),
 ("Was kostet das?", "Der Check mit Betrag und Frist ist gratis. Das Mietklar Dossier kostet @@PRICE@@ CHF einmalig: unterschriftsbereiter Brief mit deinen Angaben, Berechnung und Fristenplan als PDF. Wir bieten es nur an, wenn sich der Brief für dich lohnt, und du siehst den Inhalt vor dem Kauf."),
 ("Was bekomme ich nach dem Kauf?", "Ein PDF mit drei A4-Seiten: den druckfertigen Brief mit deinen Angaben, eine Berechnungsübersicht mit Quellen und eine Fristenplan für Versand und Antwort. Du kannst es sofort und später erneut herunterladen."),
]
faq_html = '\n'.join('      <details><summary><span class="q">%s</span><span class="plus"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span></summary><div class="ans">%s</div></details>' % (html.escape(q), html.escape(a)) for q, a in FAQ)
body = body.replace('{{FAQ_HTML}}', faq_html)

# ---- Head
TITLE = 'Mietklar. Zahlst du zu viel Miete?'
DESC = 'Mietklar prüft in Sekunden, ob du die Anfangsmiete anfechten oder bei sinkendem Referenzzins eine Senkung verlangen kannst. Mit gesetzlicher Frist, offenem Rechenweg und Briefvorlage. Ohne Konto, im Browser gerechnet.'
head = head.replace('<title>Funded. Wer bezahlt deine nächste Ausbildung?</title>', '<title>%s</title>' % TITLE)
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % DESC, head)
fav = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='45' fill='%230F2B33'/%3E%3Cpath d='M80 40 L119 71 V117 H41 V71 Z' fill='%23FAF8F4' stroke='%23FAF8F4' stroke-width='9' stroke-linejoin='round'/%3E%3Crect x='66' y='84' width='28' height='33' rx='14' fill='%23F0A073'/%3E%3C/svg%3E"
head = re.sub(r'<link rel="icon" href="[^"]*">', '<link rel="icon" href="%s">' % fav, head)
head = head.replace('Funded. Identity: «Alpine Dawn»', 'Mietklar. Identity: «Alpine Dawn»')
head = head.replace('clamp(460px,48vw,660px)', 'clamp(560px,54vw,720px)')
head = head.replace('min-height:calc(680px + ', 'min-height:calc(800px + ')
head = head.replace('.pv-row{display:grid;grid-template-columns:150px 1fr 112px;', '.pv-row{display:grid;grid-template-columns:196px 1fr 138px;')
head = re.sub(r'\.wl[^\n]*\n', '', head)               # verwaiste Warteliste-CSS
head = re.sub(r'\.wl-msg[^\n]*\n', '', head)
head = head.replace('</style>', addcss + '\n</style>')
head = head.replace('<meta name="theme-color" content="#0C242B">', '<meta name="theme-color" content="#0C242B">')
CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'"
ld = [
 {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": "de-CH", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]},
 {"@context": "https://schema.org", "@type": "WebApplication", "name": "Mietklar", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "inLanguage": "de-CH", "description": DESC, "offers": [{"@type": "Offer", "name": "Mietzins-Check", "price": "0", "priceCurrency": "CHF"}, {"@type": "Offer", "name": "Mietklar Dossier (PDF)", "price": PRICE, "priceCurrency": "CHF"}]},
 {"@context": "https://schema.org", "@type": "Organization", "name": "Mietklar"},
]
extra = '''<meta http-equiv="Content-Security-Policy" content="%s">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex">
<!-- noindex bis Impressum und juristische Freigabe stehen (docs/launch-blocker.md) -->

<meta property="og:type" content="website">
<meta property="og:locale" content="de_CH">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<!-- TODO Gründer: og:image (1200x630 PNG), og:url und canonical setzen, sobald die Domain feststeht -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="%s">
<meta name="twitter:description" content="%s">
<script type="application/ld+json">%s</script>
''' % (CSP, TITLE, DESC, TITLE, DESC, json.dumps(ld, ensure_ascii=False))
head = head.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', extra + '<link rel="preload" href="vendor/fonts/instrument-sans-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>', 1)
head = head.replace('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n', '')
head = re.sub(r'<link href="https://fonts.googleapis.com/css2[^"]*" rel="stylesheet">\n?', '', head)
head = head.replace('<style>', '<style>\n' + FONTFACE, 1)

# ---- Script
script = script.replace("const fmtN = (n, d) => n.toFixed(d).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '’');",
                        "const fmtN = (n, d) => n.toFixed(d).replace('.', ',').replace(/\\B(?=(\\d{3})+(?!\\d))/g, '’');")
a = script.index('  /* ===== Check-Demo ===== */')
b = script.index('  /* =========================================================\n     GLOBUS')
script = script[:a] + '\n' + calc + '\n' + pdfjs + '\n' + paket + '\n' + ui + '\n' + script[b:]
for o, n in [("label: 'Bund'", "label: 'Gesetz'"), ("label: 'Branchenfonds'", "label: 'Vormiete'"), ("label: 'Stiftung'", "label: 'Referenzzins'"), ("label: 'Arbeitgeber'", "label: 'Frist'")]:
    script = script.replace(o, n)
script = script.replace("  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { $('#track').classList.add('in'); o.disconnect(); } }, { threshold: .5 }).observe($('#track'));", "  if ($('#track')) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { $('#track').classList.add('in'); o.disconnect(); } }, { threshold: .5 }).observe($('#track'));")
# d3 und topojson erst laden, wenn die Story nahe kommt
assert "  if (window.d3 && window.topojson) {" in script
script = script.replace("  if (window.d3 && window.topojson) {", "  function loadAtlas() {\n    if (!(window.d3 && window.topojson)) return;", 1)
lazy = '''  (function lazyGlobe() {
    let loading = false;
    const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    new IntersectionObserver((es, o) => { if (!es[0].isIntersecting || loading) return; loading = true; o.disconnect();
      load('vendor/d3.min.js').then(() => load('vendor/topojson-client.min.js')).then(loadAtlas).catch(() => {}); }, { rootMargin: '1200px' }).observe(story);
  })();

'''
script = script.replace('  /* ===== Die eine Schleife ===== */', lazy + '  /* ===== Die eine Schleife ===== */', 1)
assert 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json' in script
script = script.replace('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json', 'vendor/countries-110m.json')

page = head + '\n</head>\n' + body + '\n' + script + '\n</body>\n</html>\n'
page = page.replace('</head>\n</head>', '</head>')
_price = PRICE
_rate = re.search(r"label:\s*'([^']+)'", rd(R('src/calc.js'))).group(1)
page = page.replace('@@PRICE@@', _price).replace('@@RATE@@', _rate)
open(R('index.html'), 'w', encoding='utf-8').write(page)

# ---- Rechtsseiten (Platzhalter, ehrlich gekennzeichnet)
LEGAL_CSS = FONTFACE + "body{margin:0;background:#F5F2EC;color:#0F2226;font:17px/1.6 'Instrument Sans',system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:48px 20px 80px}h1{font-size:40px;letter-spacing:-.04em;line-height:1.05}h2{font-size:22px;margin-top:34px;letter-spacing:-.02em}a{color:#2D7A80}.ph{background:rgba(240,160,115,.3);padding:0 4px;border-radius:4px}.warn{padding:14px 18px;border-radius:14px;background:#FBE4D5;color:#6E3A1B;font-weight:600;margin:18px 0}.back{display:inline-block;margin-bottom:24px;font-weight:600}"
def legal(fn, title, content, draft=True):
    h = '<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>%s | Mietklar</title><style>%s</style></head><body><main><a class="back" href="index.html">← Zurück zu Mietklar</a><h1>%s</h1>%s%s</main></body></html>' % (title, LEGAL_CSS, title, '<p class="warn">Entwurf. Die farbig markierten Stellen [in eckigen Klammern] muss der Betreiber vor dem Livegang ausfüllen.</p>' if draft else '', content)
    open(R(fn), 'w', encoding='utf-8').write(h)
P = lambda t: '<span class="ph">[%s]</span>' % t
legal('impressum.html', 'Impressum', '<h2>Betreiber</h2><p>%s<br>%s<br>%s</p><h2>Kontakt</h2><p>E-Mail: %s</p><h2>Unternehmens-Identifikation</h2><p>UID: %s</p><h2>Hinweis</h2><p>Mietklar ist ein unabhängiger Informationsdienst. Er ist keine Anwaltskanzlei, keine Behörde und kein Mieterverband.</p>' % (P('Name oder Firma'), P('Strasse Nr.'), P('PLZ Ort, Schweiz'), P('E-Mail-Adresse'), P('UID oder entfällt')))
legal('datenschutz.html', 'Datenschutz', '''<h2>Verantwortlich</h2><p>Siehe <a href="impressum.html">Impressum</a>.</p>
<h2>Deine Eingaben im Rechner</h2><p>Miete, Daten, Kanton und die Angaben für den Brief werden in deinem Browser verarbeitet. Sie werden nicht an uns oder Dritte übertragen. Auch das PDF entsteht in deinem Browser.</p>
<h2>Speicherung auf deinem Gerät beim Kauf</h2><p>Wenn du das Mietklar Dossier kaufst, speichert dein Browser deine Angaben lokal (localStorage), damit du das PDF nach der Zahlung und nach einem Neuladen herunterladen kannst. Diese Daten verlassen dein Gerät nicht. Du kannst sie nach dem Download mit «Angaben auf diesem Gerät löschen» entfernen oder über die Browser-Einstellungen löschen.</p>
<h2>Bestellung und Zahlung</h2><p>Für eine Bestellung speichern wir auf unserem Server: eine zufällige Bestellnummer, den Betrag, ob es um eine bestehende Miete oder eine neue Miete geht, den Zahlungsstatus, die Anzahl Downloads und Zeitpunkte. An den Zahlungsanbieter übermitteln wir nur Bestellnummer, Betrag und Produktname. Was du auf der Seite des Zahlungsanbieters eingibst (z. B. Karte, E-Mail für die Quittung), verarbeitet der Anbieter nach seiner eigenen Datenschutzerklärung.</p>
<h2>Technische Zugriffsdaten</h2><p>Beim Aufruf der Seite verarbeitet der Hoster technisch notwendige Daten wie IP-Adresse und Zeitpunkt. Unser eigener Server protokolliert keine IP-Adressen. Schrift und Skripte liefern wir selbst aus, ohne Drittanbieter.</p>
<h2>Cookies und Messung</h2><p>Wir setzen keine Cookies und kein externes Tracking ein. Wir zählen anonym, wie viele Besuche zu einem abgeschlossenen Check, einer Vorschau, einem Kauf und einem Download führen. Gespeichert werden nur Ereignisname, eine feste Kategorie (z. B. «Anspruch» oder «kein Anspruch») und das Datum. Keine Beträge, keine Vertragsdaten, keine Adressen, keine IP-Adresse.</p>
<h2>Deine Rechte</h2><p>Nach dem Schweizer Datenschutzgesetz hast du Rechte auf Auskunft, Berichtigung und Löschung. Kontakt: siehe <a href="impressum.html">Impressum</a>.</p><p>Stand: 19.11.2026.</p>''', draft=False)
legal('bedingungen.html', 'Bedingungen', '''<h2>Was Mietklar ist</h2><p>Mietklar bietet Information, Rechenhilfe und Briefvorlagen zum Schweizer Mietrecht. Es ist keine Rechtsberatung, keine Anwaltstätigkeit und keine Vertretung. Anbieter: siehe <a href="impressum.html">Impressum</a>.</p>
<h2>Kostenloser Check</h2><p>Der Check ist kostenlos. Berechnungen sind Schätzungen auf Basis deiner Angaben und der genannten Quellen (Datenstand auf der Seite).</p>
<h2>Mietklar Dossier</h2><p>Das Mietklar Dossier kostet einmalig den auf der Seite genannten Endpreis in CHF. Es umfasst ein PDF mit drei A4-Seiten: einen Brief mit deinen Angaben, eine Berechnungsübersicht und eine Fristenplan für Versand und Antwort. Vor dem Kauf siehst du den Inhalt als Vorschau. Nach erfolgreicher Zahlung kannst du das PDF sofort und bis zu 20 Mal herunterladen. Es gibt kein Abo und keine Erfolgsprovision.</p>
<h2>Deine Verantwortung</h2><p>Du prüfst Zahlen, Fristen und Briefe selbst, unterschreibst und versendest sie selbst. Fristen und Formvorschriften liegen in deiner Verantwortung.</p>
<h2>Kein Erfolgsversprechen</h2><p>Ob ein Begehren oder eine Anfechtung Erfolg hat, entscheiden Vermieter, Schlichtungsbehörde und Gerichte im Einzelfall.</p>
<h2>Technische Probleme</h2><p>Lässt sich das PDF nach einer erfolgreichen Zahlung aus technischen Gründen nicht erzeugen, melde dich über die Kontaktangaben im Impressum.</p><p>Stand: 19.11.2026.</p>''', draft=False)
print('gebaut:', len(page))

import shutil
shutil.copy(R('src', 'calc.js'), R('calc.js'))   # eigenstaendiger Rechenkern (gleicher Code wie in index.html)
