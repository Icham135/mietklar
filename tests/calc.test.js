'use strict';
// Aufruf: node tests/calc.test.js   (Zeitzone via TZ=... uebersteuerbar, Standard Europe/Zurich)
// Erwartete Werte kommen ausschliesslich aus tests/oracle.py (unabhaengig von src/calc.js).
if (!process.env.TZ) process.env.TZ = 'Europe/Zurich';
const path = require('path');
const { execFileSync } = require('child_process');
const calc = require(path.join(__dirname, '..', 'src', 'calc.js'));

// ---- Mini-Runner -------------------------------------------------------------
const results = []; // {name, ok, msg}
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, msg: e && e.message ? e.message : String(e) }); }
}
const fmt = v => v instanceof Date ? 'Date(' + (isNaN(v) ? 'Invalid' : localIso(v) + ' ' + v.toTimeString().slice(0, 8)) + ')' :
  (typeof v === 'number' && !isFinite(v)) || v === undefined ? String(v) : JSON.stringify(v);
function localIso(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function close(a, e) {
  if (e === null || a === null || typeof a !== 'number' || typeof e !== 'number') return a === e;
  if (a === e) return true;
  if (!isFinite(a) || !isFinite(e)) return false;
  return Math.abs(a - e) <= 1e-9 + 1e-9 * Math.abs(e);
}
const mkNow = a => new Date(a[0], a[1] - 1, a[2], a[3], a[4], 0, 0); // lokale Zeit

// Gibt Liste von Abweichungen "Feld: erwartet X, tatsaechlich Y" zurueck
function diffCase(c) {
  const out = [];
  const a = c.args;
  if (c.fn === 'refAt' || c.fn === 'stepsFor' || c.fn === 'reduction') {
    const act = calc[c.fn](...a);
    if (!close(act, c.expected)) out.push(`erwartet ${fmt(c.expected)}, tatsaechlich ${fmt(act)}`);
  } else if (c.fn === 'cumInflation') {
    const act = calc.cumInflation(a[0], a[1], mkNow(a[2]));
    if (!close(act, c.expected)) out.push(`erwartet ${fmt(c.expected)}, tatsaechlich ${fmt(act)}`);
  } else if (c.fn === 'calcRef') {
    const act = calc.calcRef(a[0], a[1], a[2], a[3], mkNow(a[4]));
    const e = c.expected;
    if (e.before) {
      if (!act || act.before !== true) out.push(`erwartet {before:true}, tatsaechlich ${fmt(act)}`);
    } else {
      if (!act || act.before) { out.push(`erwartet Ergebnis, tatsaechlich ${fmt(act)}`); return out; }
      for (const k of ['base', 'steps', 'red', 'months', 'teuPct', 'kosPct', 'gross', 'teu', 'kos', 'net', 'netYear'])
        if (!close(act[k], e[k])) out.push(`${k}: erwartet ${fmt(e[k])}, tatsaechlich ${fmt(act[k])}`);
      if (act.net < 0) out.push('net negativ: ' + act.net);
    }
  } else if (c.fn === 'calcInit') {
    const act = calc.calcInit(a[0], a[1], a[2], mkNow(a[3]));
    const e = c.expected;
    if (!close(act.pct, e.pct)) out.push(`pct: erwartet ${fmt(e.pct)}, tatsaechlich ${fmt(act.pct)}`);
    if (act.left !== e.left) out.push(`left: erwartet ${fmt(e.left)}, tatsaechlich ${fmt(act.left)}`);
    if (act.future !== e.future) out.push(`future: erwartet ${fmt(e.future)}, tatsaechlich ${fmt(act.future)}`);
    // deadline: Kalendertag lokal vergleichen (Datentyp Date oder ISO-String)
    let dl = act.deadline;
    if (dl instanceof Date) dl = isNaN(dl) ? 'Invalid' : localIso(dl);
    if (dl !== e.deadline) out.push(`deadline: erwartet ${fmt(e.deadline)}, tatsaechlich ${fmt(act.deadline)}`);
  } else throw new Error('unbekannte fn ' + c.fn);
  return out;
}

// ---- Orakel ausfuehren -------------------------------------------------------------
const oracleOut = execFileSync('python3', [path.join(__dirname, 'oracle.py')], { maxBuffer: 1 << 28 }).toString();
const oracle = JSON.parse(oracleOut);

const groups = new Map();
for (const c of oracle.cases) {
  const label = `${c.fn}: ${c.id}`;
  if (c.group) {
    if (!groups.has(c.group)) groups.set(c.group, []);
    groups.get(c.group).push(c);
    continue;
  }
  test(label, () => {
    const d = diffCase(c);
    if (d.length) throw new Error(`Eingabe ${JSON.stringify(c.args)} -> ` + d.join('; '));
  });
}
for (const [g, list] of groups) {
  test(`Gruppe (${list.length} Faelle) ${g}`, () => {
    const bad = [];
    for (const c of list) { const d = diffCase(c); if (d.length) bad.push(`${c.id} args=${JSON.stringify(c.args)}: ${d.join('; ')}`); }
    if (bad.length) throw new Error(`${bad.length}/${list.length} Abweichungen, z.B.:\n      ` + bad.slice(0, 5).join('\n      '));
  });
}

// ---- Invarianten (unabhaengig vom Orakel) -------------------------------------------------
test('Invariante: net >= 0 und netYear = 12*net ueber alle Monate/Mieten >= 0/kp', () => {
  const now = mkNow([2026, 11, 18, 12, 0]);
  for (let k = 2008 * 12 + 8; k <= 2027 * 12; k++) {
    const y = Math.floor(k / 12), m = k % 12 + 1;
    for (const rent of [0, 1, 500, 2100, 8000, 1234.56]) for (const kp of [0, 0.005, 0.015, 0.2]) {
      const r = calc.calcRef(rent, y, m, kp, now);
      if (r.before) continue;
      if (!(r.net >= 0)) throw new Error(`net=${r.net} bei ${rent},${y}-${m},${kp}`);
      if (!close(r.netYear, 12 * r.net)) throw new Error('netYear != 12*net');
    }
  }
});
test('Invariante: Miete 0 liefert ueberall net 0', () => {
  const now = mkNow([2026, 11, 18, 12, 0]);
  for (const [y, m] of [[2008, 9], [2015, 6], [2025, 9]]) if (calc.calcRef(0, y, m, 0.005, now).net !== 0) throw new Error('net != 0');
});
test('Invariante: REF-Tabelle exportiert 14 Eintraege und CUR.rate=1.25', () => {
  if (calc.REF.length !== 14) throw new Error('REF.length=' + calc.REF.length);
  if (calc.CUR.rate !== 1.25) throw new Error('CUR.rate=' + calc.CUR.rate);
});
test('Invariante: Ergebnis hat vor 2008-09 genau {before:true}', () => {
  const r = calc.calcRef(2000, 2008, 8, 0.005, mkNow([2026, 11, 18, 12, 0]));
  if (r.before !== true) throw new Error(fmt(r));
});
test('Invariante: calcRef gibt bei Zukunftsdatum months=0 und cum-Faktor 1 (teuPct=0)', () => {
  const r = calc.calcRef(2100, 2027, 1, 0.005, mkNow([2026, 11, 18, 12, 0]));
  if (r.before) throw new Error('before');
  if (r.months !== 0 || r.teuPct !== 0 || r.kosPct !== 0) throw new Error(fmt(r));
});

// ---- Robustheit: kein Absturz erwartet, Verhalten wird dokumentiert ---------------------------------
const documented = [];
function robust(label, fn) {
  test('Robustheit (kein Absturz): ' + label, () => {
    let r; try { r = fn(); } catch (e) { throw new Error('Exception: ' + e.message); }
    documented.push(`${label} -> ${fmt(r)}`);
  });
}
const NOW = mkNow([2026, 11, 18, 12, 0]);
const compact = r => r && !r.before ? { net: r.net, gross: r.gross, steps: r.steps, months: r.months, teu: r.teu, kos: r.kos } : r;
for (const [lbl, v] of [['NaN', NaN], ['undefined', undefined], ['null', null], ['"1200" (Text numerisch)', '1200'], ['"abc"', 'abc'], ['Infinity', Infinity], ['""', ''], ['{} Objekt', {}]])
  robust(`calcRef Miete=${lbl}`, () => compact(calc.calcRef(v, 2015, 6, 0.005, NOW)));
for (const [lbl, y, m] of [['Jahr NaN', NaN, 6], ['Monat undefined', 2015, undefined], ['Jahr "2015" Text', '2015', 6], ['Monat 13', 2015, 13], ['Monat 0', 2015, 0]])
  robust(`refAt ${lbl}`, () => calc.refAt(y, m));
for (const [lbl, v] of [['undefined', undefined], ['NaN', NaN], ['"x"', 'x'], ['null', null]])
  robust(`calcRef kp=${lbl}`, () => compact(calc.calcRef(2100, 2015, 6, v, NOW)));
robust('stepsFor(NaN)', () => calc.stepsFor(NaN));
robust('stepsFor(undefined)', () => calc.stepsFor(undefined));
robust('stepsFor("2.0")', () => calc.stepsFor('2.0'));
robust('reduction(NaN)', () => calc.reduction(NaN));
robust('reduction(undefined)', () => calc.reduction(undefined));
robust('reduction("3")', () => calc.reduction('3'));
robust('cumInflation mit now=Invalid Date', () => calc.cumInflation(2020, 3, new Date('x')));
robust('calcRef ohne now (Systemzeit; nur Absturzpruefung)', () => { const r = calc.calcRef(2100, 2025, 9, 0.005); return r && r.steps; });
for (const [lbl, o, n] of [['old NaN', NaN, 2000], ['new NaN', 2000, NaN], ['old undefined', undefined, 2000], ['old "2000" Text', '2000', '2200'], ['beide Text abc', 'a', 'b']])
  robust(`calcInit ${lbl}`, () => calc.calcInit(o, n, '2026-11-01', NOW));
robust('calcInit startISO=undefined', () => calc.calcInit(2000, 2100, undefined, NOW));
robust('calcInit startISO=Zahl 20261101', () => calc.calcInit(2000, 2100, 20261101, NOW));

// ---- Ausgabe ------------------------------------------------------------------------
const failed = results.filter(r => !r.ok);
for (const f of failed) console.log(`FAIL  ${f.name}\n      ${f.msg}`);
console.log('\n--- Dokumentiertes Verhalten bei Fehleingaben (keine Spezifikation, nur Beobachtung) ---');
for (const d of documented) console.log('  ' + d);
console.log(`\nTZ=${process.env.TZ}  Tests gesamt: ${results.length}  bestanden: ${results.length - failed.length}  fehlgeschlagen: ${failed.length}`);
console.log(`(Orakel-Einzelfaelle: ${oracle.cases.length}, davon in ${groups.size} Gruppen zusammengefasst)`);
process.exit(failed.length ? 1 : 0);
