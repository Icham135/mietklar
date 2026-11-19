/* Tests für PDF-Erzeugung und Brief-Paket (src/pdf.js, src/paket.js). Aufruf: node tests/paket.test.js */
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..');
const m = { exports: {} };
new Function('module', fs.readFileSync(path.join(R, 'src/pdf.js'), 'utf8') + fs.readFileSync(path.join(R, 'src/paket.js'), 'utf8'))(m);
const { PDF, PAKET } = m.exports;
let n = 0, ok = 0; const fails = [];
const t = (name, cond, info) => { n++; if (cond) ok++; else fails.push(name + (info !== undefined ? ' :: ' + JSON.stringify(info) : '')); };
const txt = b => Buffer.from(b).toString('latin1');

const F_B = { name: 'Anna Müller', street: 'Seestrasse 12', zip: '8002 Zürich', lname: 'Immo Verwaltung AG', lstreet: 'Bahnhofstrasse 1', lzip: '8001 Zürich', obj: 'Seestrasse 12, 8002 Zürich', ort: 'Zürich' };
const F_N = Object.assign({}, F_B, { bname: 'Schlichtungsbehörde Zürich', bstreet: 'Wengistrasse 30', bzip: '8004 Zürich' });
const B = (o) => Object.assign({ mode: 'bestand', order: 'ABCDEFGH12345678', stand: '18.11.2026', today: '2026-11-19', rent: 2100, base: 1.75, baseSource: 'datum', since: { m: 7, y: 2023 }, steps: 2, red: 1 - 1 / 1.06, gross: 119, teu: 22, kos: 16, net: 81, strict: 59, kp: 0.25, kind: 'std', termin: '2027-03-31', terminOpen: true, frist: 3, sendBy: '2026-12-31', cur: { label: '1,25 %', since: '2.9.2025', next: '1.12.2026' }, f: Object.assign({}, F_B) }, o || {});
const N = (o) => Object.assign({ mode: 'neu', order: 'ABCDEFGH12345678', stand: '18.11.2026', today: '2026-11-19', old: 1800, nw: 2100, pct: 16.67, start: '2026-11-01', deadline: '2026-12-01', future: false, canton: 'ZH', cname: 'Zürich', formKind: 'full', reason: 'b', f: Object.assign({}, F_N) }, o || {});

/* --- PDF-Struktur --- */
function checkStructure(bytes, label) {
  const s = txt(bytes);
  t(label + ': Kopf %PDF-1.4', s.startsWith('%PDF-1.4\n'));
  t(label + ': endet mit %%EOF', s.trimEnd().endsWith('%%EOF'));
  const sx = +s.slice(s.lastIndexOf('startxref') + 10).trim().split('\n')[0];
  t(label + ': startxref zeigt auf xref', s.slice(sx, sx + 4) === 'xref', sx);
  const xr = s.slice(sx).split('\n'), cnt = +xr[1].split(' ')[1];
  let good = true; for (let i = 1; i < cnt; i++) { const off = +xr[2 + i].slice(0, 10); if (!s.slice(off).startsWith(i + ' 0 obj')) { good = false; break; } }
  t(label + ': alle xref-Offsets stimmen', good);
  const lens = [...s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)];
  t(label + ': Content-Streams vorhanden', lens.length === 3, lens.length);
  t(label + ': Stream-Längen stimmen', lens.every(mm => s.slice(mm.index + mm[0].length + +mm[1], mm.index + mm[0].length + +mm[1] + 10) === '\nendstream'));
  t(label + ': 3 Seiten', (s.match(/\/Type \/Page /g) || []).length === 3);
  t(label + ': /Count 3', s.includes('/Count 3'));
  t(label + ': WinAnsi-Schriften', (s.match(/\/WinAnsiEncoding/g) || []).length === 2);
  t(label + ': A4', s.includes('/MediaBox [0 0 595.28 841.89]'));
  t(label + ': keine Platzhalter', !/\[[A-ZÄÖÜa-zäöü .]+\]/.test(s.replace(/\[0 0 595\.28 841\.89\]|\/Kids \[[^\]]*\]/g, '')));
  return s;
}
const sb = checkStructure(PAKET.pdf(B()), 'Bestand');
const sn = checkStructure(PAKET.pdf(N()), 'Neu');

/* --- Inhalte Bestand --- */
t('B: Name umlautkorrekt (WinAnsi ü=0xFC)', sb.includes('Anna M\xfcller'));
t('B: Apostroph als 0x92', sb.includes('2\x92100'));
t('B: neuer Mietzins 1’981', sb.includes('1\x92981'));
t('B: Prozent 5,66', sb.includes('5,66 %'));
t('B: Termin im Brief', sb.includes('31. M\xe4rz 2027'));
t('B: Eingang spätestens 31. Dezember 2026', sb.includes('31. Dezember 2026'));
t('B: Bestellnummer im Beiblatt', sb.includes('ABCDEFGH12345678'));
t('B: Seite 1 ohne Mietklar-Fusszeile', !sb.split('endstream')[0].includes('Bestellung'));
t('B: Quellen BWO', sb.includes('bwo.admin.ch/de/referenzzinssatz'));
t('B: Szenario streng', sb.includes('CHF 59 pro Monat'));
t('B: Jahresbetrag', sb.includes('CHF 972 pro Jahr'));
t('B: Art. 270a OR', sb.includes('Art. 270a OR'));
t('B: Klammern escaped', !/[^\\]\((Art\. 270a OR)\)/.test('') && sb.includes('\\(Art. 270a OR\\)'));
const sbNo = txt(PAKET.pdf(B({ terminOpen: false })));
t('B: ohne offenen Termin -> nächstmöglich', sbNo.includes('auf den n\xe4chstm\xf6glichen K\xfcndigungstermin') && !sbNo.includes('31. M\xe4rz 2027'));
t('B: Checkliste ohne Termin verweist auf Vertrag', sbNo.includes('Mietvertrag'));
const sbV = txt(PAKET.pdf(B({ baseSource: 'vertrag' })));
t('B: Basis laut Vertrag', sbV.includes('laut deinem Vertrag'));

/* --- Inhalte Neu --- */
t('N: Empfänger Behörde', sn.includes('Schlichtungsbeh\xf6rde Z\xfcrich'));
t('N: Kopie an Vermieter', sn.includes('Kopie an: Immo Verwaltung AG'));
t('N: lit. b Text', sn.includes('erheblich erh\xf6ht'));
t('N: Frist 1. Dezember 2026', sn.includes('1. Dezember 2026'));
t('N: Erhöhung 16,7 %', sn.includes('16,7 %'));
t('N: Formular-Beilage (Formularkanton)', sn.includes('amtliches Formular zum Anfangsmietzins'));
const snA = txt(PAKET.pdf(N({ reason: 'a' })));
t('N: lit. a Text', snA.includes('Notlage') && !snA.includes('erheblich erh\xf6ht (Art'));
const snF = txt(PAKET.pdf(N({ future: true, start: '2026-12-01', deadline: '2026-12-31' })));
t('N: Zukunft -> werde übernehmen', snF.includes('Ich werde die Wohnung am 1. Dezember 2026 \xfcbernehmen'));
const snNone = txt(PAKET.pdf(N({ formKind: 'none', canton: 'AG', cname: 'Aargau' })));
t('N: ohne Formularpflicht keine Formular-Beilage', !snNone.includes('amtliches Formular zum Anfangsmietzins (falls'));
t('N: Einordnung unter 10 %', txt(PAKET.pdf(N({ pct: 5, nw: 1890 }))).includes('unter dem Richtwert'));

/* --- Pflichtfelder --- */
t('missing: vollständig Bestand = 0', PAKET.missing(B()).length === 0);
t('missing: vollständig Neu = 0', PAKET.missing(N()).length === 0);
t('missing: Neu ohne Begründung', PAKET.missing(N({ reason: '' })).includes('Begründung'));
PAKET.FIELDS.bestand.forEach(([k, l]) => { const s = B(); s.f[k] = '  '; t('missing Bestand: ' + k, PAKET.missing(s).includes(l)); });
PAKET.FIELDS.neu.forEach(([k, l]) => { const s = N(); s.f[k] = ''; t('missing Neu: ' + k, PAKET.missing(s).includes(l)); });
const lb = PAKET.letter(B({ f: {} }));
t('Vorschau mit Platzhaltern', lb.sender[0] === '[Name]' && lb.recipient[0] === '[Vermieter oder Verwaltung]');
t('Vorschau Neu ohne Begründung -> Platzhalter', PAKET.letter(N({ reason: '' })).body[2].includes('[Begründung wählen]'));

/* --- Vorschau = Lieferung: jeder Brieftext-Absatz steht im PDF --- */
function inPdf(s, para) { const words = para.split(' ').filter(w => w.length > 3).slice(0, 6); return words.every(w => s.includes(PDF.enc(w).replace(/\(/g, '\\(').replace(/\)/g, '\\)'))); }
PAKET.letter(B()).body.forEach((p, i) => t('Vorschau=PDF Bestand Absatz ' + i, inPdf(sb, p)));
PAKET.letter(N()).body.forEach((p, i) => t('Vorschau=PDF Neu Absatz ' + i, inPdf(sn, p)));

/* --- Kodierung und Umbruch --- */
t('enc: ä', PDF.enc('ä') === '\xe4'); t('enc: ’', PDF.enc('’') === '\x92'); t('enc: –', PDF.enc('–') === '\x96'); t('enc: «»', PDF.enc('«»') === '\xab\xbb');
t('enc: Emoji wird weggelassen', PDF.enc('a😀b') === 'ab');
t('enc: osteuropäische Zeichen ohne Akzent', PDF.enc('Łukasiewicz-Vučić') === 'Lukasiewicz-Vucic');
t('unsupported: meldet č und Emoji', PDF.unsupported('Zoë Vučić 😀').join('') === 'čć😀');
{ const lw = PDF.wrap('Immobilienverwaltungsgesellschaftmitsehrlangemnamenohneleerzeichen', 10.5, 60 * 72 / 25.4); t('wrap: überlanges Wort wird getrennt', lw.length > 1 && lw.every(l => PDF.width(l, 10.5) <= 60 * 72 / 25.4 + 0.01), lw); }
t('enc: Zeilenumbruch -> Leerzeichen', PDF.enc('a\nb') === 'a b');
t('width: "W" breiter als "i"', PDF.width('W', 10) > PDF.width('i', 10));
t('width: fett breiter', PDF.width('Mietzins', 10, true) > PDF.width('Mietzins', 10));
const long = 'Wort '.repeat(80).trim(), lines = PDF.wrap(long, 10.5, 160 * 72 / 25.4);
t('wrap: mehrere Zeilen', lines.length > 1); t('wrap: keine Zeile zu breit', lines.every(l => PDF.width(l, 10.5) <= 160 * 72 / 25.4 + 0.01));
t('wrap: kein Wort verloren', lines.join(' ').split(' ').length === 80);
t('wrap: überlanges Wort bleibt erhalten', PDF.wrap('x'.repeat(300), 10, 50).join('') === 'x'.repeat(300));
/* Sonderzeichen in Eingaben dürfen den PDF-Text nicht aufbrechen */
const evil = PAKET.pdf(B({ f: Object.assign({}, F_B, { name: 'a) Tj ET (b\\', obj: '(x)' }) }));
const se = txt(evil); t('Injection: Klammern und Backslash escaped', se.includes('a\\) Tj ET \\(b\\\\'));
checkStructure(evil, 'Injection');

/* --- Robustheit über viele Eingaben --- */
let rnd = 7; const R01 = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let i = 0; i < 40; i++) {
  const rent = Math.round(500 + R01() * 9500), st = 1 + Math.floor(R01() * 9), red = 1 - 1 / (1 + 0.03 * st), g = Math.round(rent * red);
  const s = B({ rent, steps: st, red, gross: g, teu: Math.round(g * 0.2), kos: Math.round(g * 0.1), net: Math.round(g * 0.7), strict: Math.round(g * 0.5), f: Object.assign({}, F_B, { name: 'Ä'.repeat(1 + Math.floor(R01() * 70)) }) });
  const p = txt(PAKET.pdf(s));
  t('Fuzz ' + i + ': gültig und Betrag drin', p.startsWith('%PDF') && p.includes(('CHF ' + (rent - g).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\x92'))));
}
console.log(`paket.test: ${n} Tests, ${ok} bestanden, ${n - ok} fehlgeschlagen`);
fails.forEach(f => console.log('  FEHLER: ' + f));
process.exitCode = fails.length ? 1 : 0;
