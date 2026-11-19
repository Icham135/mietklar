'use strict';
// Runde 2: node tests/round2.test.js  (TZ per Umgebung; Standard: Systemzeit)
// Erwartungswerte werden hier unabhaengig aus den Formeln gerechnet (UTC-Ordinalzahlen, Log-Summen), nicht via calc.js.
const path = require('path');
const C = require(path.join(__dirname, '..', 'src', 'calc.js'));
const results = [];
function test(name, fn) { try { fn(); results.push({ name, ok: true }); } catch (e) { results.push({ name, ok: false, msg: e.message || String(e) }); } }
const fmt = v => (typeof v === 'number' && !isFinite(v)) || v === undefined ? String(v) : v instanceof Date ? 'Date(' + (isNaN(v) ? 'Invalid' : iso(v)) + ')' : JSON.stringify(v);
function eq(a, e, what) { if (a !== e) throw new Error((what || '') + ' erwartet ' + fmt(e) + ', erhalten ' + fmt(a)); }
function near(a, e, what) { if (!(typeof a === 'number') || !isFinite(a) || Math.abs(a - e) > 1e-9 + 1e-9 * Math.abs(e)) throw new Error((what || '') + ' erwartet ' + fmt(e) + ', erhalten ' + fmt(a)); }
function ok(c, msg) { if (!c) throw new Error(msg); }
const p2 = n => String(n).padStart(2, '0');
function iso(d) { return d === null || d === undefined ? null : d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
const ord = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / 864e5);
function fromOrd(o) { const d = new Date(o * 864e5); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const NOW = new Date(2026, 10, 18, 12, 0, 0);
const mk = (y, m, d, h) => new Date(y, m - 1, d, h === undefined ? 12 : h, 0, 0);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- unabhaengiges Orakel ----
const TAB = [[2008,9,3.5],[2009,6,3.25],[2009,9,3.0],[2010,12,2.75],[2011,12,2.5],[2012,6,2.25],[2013,9,2.0],[2015,6,1.75],[2017,6,1.5],[2020,3,1.25],[2023,6,1.5],[2023,12,1.75],[2025,3,1.5],[2025,9,1.25]];
const INFT = {2008:2.4,2009:-0.5,2010:0.7,2011:0.2,2012:-0.7,2013:-0.2,2014:0,2015:-1.1,2016:-0.4,2017:0.5,2018:0.9,2019:0.4,2020:-0.7,2021:0.6,2022:2.8,2023:2.1,2024:1.1,2025:0.2,2026:0.3};
function oRef(y, m) { const x = y * 12 + m; let r = null; for (const t of TAB) if (t[0] * 12 + t[1] <= x) r = t[2]; return r; }
const oSteps = b => { const s = Math.round((b - 1.25) / 0.25); return s > 0 ? s : 0; };
const oRed = s => s > 0 ? 1 - 1 / (1 + 0.03 * s) : 0;
function oCum(y, m, now) {
  const end = now.getFullYear() * 12 + now.getMonth(); let s = 0;
  for (let x = y * 12 + (m - 1) + 1; x <= end; x++) { const yy = Math.floor(x / 12); const i = INFT[yy] !== undefined ? INFT[yy] : INFT[2026]; s += Math.log(1 + i / 100) / 12; }
  return Math.exp(s);
}
function oCalc(rent, y, m, kp, now) {
  const base = oRef(y, m); if (base === null) return null;
  const steps = oSteps(base), red = oRed(steps), months = Math.max(0, (now.getFullYear() * 12 + now.getMonth()) - (y * 12 + m - 1));
  const teuPct = Math.max(0, 0.4 * (oCum(y, m, now) - 1)), kosPct = Math.max(0, kp * months / 12);
  const gross = rent * red, teu = steps ? rent * teuPct : 0, kos = steps ? rent * kosPct : 0;
  const net = Math.max(0, gross - teu - kos);
  return { base, steps, red, months, teuPct, kosPct, gross, teu, kos, net, netYear: net * 12 };
}
function oInit(oldR, newR, sy, sm, sd, now) {
  const today = ord(now.getFullYear(), now.getMonth() + 1, now.getDate()), s = ord(sy, sm, sd);
  return { pct: oldR > 0 ? (newR - oldR) / oldR * 100 : null, left: s + 30 - today, deadline: fromOrd(s + 30), future: s > today ? s - today : null };
}
function oDead(ty, tm, td, f) { // Tag nach Termin, minus f Monate (geklemmt), minus 1 Tag
  const b = new Date(Date.UTC(ty, tm - 1, td + 1)); let by = b.getUTCFullYear(), bm = b.getUTCMonth() + 1 - f, bd = b.getUTCDate();
  while (bm < 1) { bm += 12; by--; }
  bd = Math.min(bd, dim(by, bm)); return fromOrd(ord(by, bm, bd) - 1);
}
const ISO = (y, m, d) => y + '-' + p2(m) + '-' + p2(d);
const cmpCalc = (a, e, tag) => { for (const k of ['base', 'steps', 'red', 'months', 'teuPct', 'kosPct', 'gross', 'teu', 'kos', 'net', 'netYear']) near(a[k], e[k], (tag || '') + k + ':'); };

// ===== refAt =====
TAB.forEach(([y, m, r]) => {
  test(`refAt Wechselmonat ${y}-${m} = ${r}`, () => eq(C.refAt(y, m), r));
  const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  if (!(y === 2008 && m === 9)) test(`refAt Vormonat ${py}-${pm} != neuer Satz`, () => eq(C.refAt(py, pm), oRef(py, pm)));
});
test('refAt 2008-08 = null', () => eq(C.refAt(2008, 8), null));
test('refAt 2008-01 = null', () => eq(C.refAt(2008, 1), null));
test('refAt 1999-12 = null', () => eq(C.refAt(1999, 12), null));
test('refAt 2008-09 = 3.5 (erste Eintragung)', () => eq(C.refAt(2008, 9), 3.5));
test('refAt Zukunft 2035-05 = 1.25', () => eq(C.refAt(2035, 5), 1.25));
test('refAt Dez 2023 / Jan 2024 = 1.75', () => { eq(C.refAt(2023, 12), 1.75); eq(C.refAt(2024, 1), 1.75); });
test('refAt Dez-Jan Jahreswechsel 2010-12/2011-1: 2.75', () => { eq(C.refAt(2010, 12), 2.75); eq(C.refAt(2011, 1), 2.75); eq(C.refAt(2011, 11), 2.75); eq(C.refAt(2011, 12), 2.5); });
test('refAt entspricht Orakel fuer alle Monate 2000..2040', () => { for (let y = 2000; y <= 2040; y++) for (let m = 1; m <= 12; m++) eq(C.refAt(y, m), oRef(y, m), y + '-' + m); });
test('refAt Satz nie < 1.25 und nie > 3.5 ab 2008-09', () => { for (let y = 2008; y <= 2040; y++) for (let m = 1; m <= 12; m++) { const r = C.refAt(y, m); if (r !== null) ok(r >= 1.25 && r <= 3.5, y + '-' + m + ' ' + r); } });

// ===== stepsFor / reduction =====
[[3.5, 9], [3.25, 8], [3.0, 7], [2.75, 6], [2.5, 5], [2.25, 4], [2.0, 3], [1.75, 2], [1.5, 1], [1.25, 0], [1.0, 0], [0, 0], [-5, 0], [1.3, 0], [1.4, 1], [1.37, 0], [1.38, 1]].forEach(([b, s]) =>
  test(`stepsFor(${b}) = ${s}`, () => eq(C.stepsFor(b), s)));
for (let n = 0; n <= 12; n++) test(`reduction(${n}) = ${n ? '1-1/(1+0.03n)' : '0'}`, () => near(C.reduction(n), n ? 1 - 1 / (1 + 0.03 * n) : 0));
test('reduction(1) = 2.912621359...%', () => near(C.reduction(1), 0.03 / 1.03));
test('reduction negativ/NaN -> 0', () => { eq(C.reduction(-3), 0); eq(C.reduction(NaN), 0); });
test('reduction streng monoton fuer n=0..40 und < 1', () => { let p = -1; for (let n = 0; n <= 40; n++) { const r = C.reduction(n); ok(r > p && r < 1, 'n=' + n); p = r; } });
test('stepsFor Rundung: Halbschritte 1.375 -> 0 oder 1 (Math.round), nie negativ/NaN', () => { const s = C.stepsFor(1.375); ok(s === 0 || s === 1, String(s)); });
test('BUG: stepsFor NaN/undefined/null/String/Infinity: keine NaN', () => { [NaN, undefined, null, 'x', {}, Infinity].forEach(v => { const s = C.stepsFor(v); ok(s === s, 'NaN fuer ' + fmt(v)); ok(s >= 0, 'negativ ' + fmt(v)); }); });

// ===== calcRef feste Faelle =====
const fixed = [
  [2000, 2019, 12, 0.005, NOW], [1500, 2009, 9, 0.005, NOW], [3333.33, 2012, 6, 0.01, NOW], [1, 2010, 12, 0, NOW], [2500, 2023, 12, 0.005, NOW],
  [2500, 2025, 3, 0.005, NOW], [2500, 2025, 9, 0.005, NOW], [2500, 2020, 3, 0.005, NOW], [1800, 2008, 9, 0.005, NOW], [1800, 2008, 9, 0.02, NOW],
  [2000, 2019, 12, 0.005, mk(2028, 2, 29)], [2000, 2019, 12, 0.005, mk(2026, 12, 31)], [2000, 2019, 12, 0.005, mk(2027, 1, 1)], [2000, 2013, 9, 0.005, mk(2024, 2, 29, 0)],
  [2000, 2013, 9, 0.005, mk(2024, 2, 29, 23)], [2000, 2030, 1, 0.005, NOW], [2000, 2026, 12, 0.005, NOW], [2000, 2026, 11, 0.005, NOW], [2000, 2011, 12, 0.005, mk(2011, 12, 1)],
];
fixed.forEach((a, i) => test(`calcRef fest #${i} rent=${a[0]} ${a[1]}-${a[2]} kp=${a[3]} now=${iso(a[4])}`, () => {
  const r = C.calcRef(a[0], a[1], a[2], a[3], a[4]), e = oCalc(a[0], a[1], a[2], a[3], a[4]); cmpCalc(r, e);
}));
test('calcRef Handrechnung: 2000 CHF, Basis 1.75 -> 2 Schritte, Bruttosenkung 2000*(1-1/1.06)', () => {
  const r = C.calcRef(2000, 2017, 5, 0, NOW, undefined); near(r.steps, 2); near(r.gross, 2000 * (1 - 1 / 1.06)); near(r.red, 0.06 / 1.06);
});
test('calcRef Handrechnung: Basis 3.5 -> 9 Schritte, red = 0.27/1.27', () => { const r = C.calcRef(1000, 2008, 9, 0, NOW); eq(r.steps, 9); near(r.red, 0.27 / 1.27); near(r.gross, 1000 * 0.27 / 1.27); });
test('calcRef ohne Gegenrechnung (kp=0) bei steps=0: alles 0', () => { const r = C.calcRef(2000, 2021, 5, 0.005, NOW); eq(r.steps, 0); eq(r.gross, 0); eq(r.net, 0); eq(r.teu, 0); eq(r.kos, 0); });
test('calcRef Teuerung: kumuliert 40% (Handrechnung 2026-10 -> 2026-11: 1 Monat, 0.3%)', () => {
  const r = C.calcRef(2000, 2020, 3, 0, mk(2026, 11, 18)); near(r.teuPct, Math.max(0, 0.4 * (oCum(2020, 3, NOW) - 1)));
  const one = C.cumInflation(2026, 10, NOW); near(one, Math.pow(1.003, 1 / 12));
});
test('calcRef Kostenpauschale: kosPct = kp*Monate/12 (60 Monate, kp 0.5% -> 2.5%)', () => {
  const r = C.calcRef(1000, 2021, 11, 0.005, NOW, 1.75); eq(r.months, 60); near(r.kosPct, 0.025); near(r.kos, 25);
});
test('calcRef baseOverride 2.0 ueberschreibt Datum, auch vor 2008', () => { const r = C.calcRef(1000, 1990, 1, 0, NOW, 2.0); eq(r.before, undefined); eq(r.steps, 3); });
test('calcRef baseOverride 1.25 -> 0 Schritte', () => eq(C.calcRef(1000, 2010, 1, 0, NOW, 1.25).steps, 0));
test('calcRef baseOverride als String wird ignoriert (Datum zaehlt)', () => eq(C.calcRef(1000, 2008, 9, 0, NOW, '1.25').base, 3.5));
test('calcRef baseOverride NaN/Infinity wird ignoriert', () => { eq(C.calcRef(1000, 2008, 9, 0, NOW, NaN).base, 3.5); eq(C.calcRef(1000, 2008, 9, 0, NOW, Infinity).base, 3.5); });
test('calcRef vor 2008-09 -> {before:true}', () => { eq(C.calcRef(1000, 2008, 8, 0, NOW).before, true); eq(C.calcRef(1000, 1980, 1, 0, NOW).before, true); });
test('calcRef netYear = 12*net', () => { const r = C.calcRef(2345.67, 2012, 6, 0.005, NOW); near(r.netYear, r.net * 12); });
test('calcRef Zukunftsdatum 2030: months=0, steps=0', () => { const r = C.calcRef(2000, 2030, 6, 0.005, NOW); eq(r.months, 0); eq(r.steps, 0); eq(r.net, 0); });
test('calcRef Datum = Monat von now: months 0, teuPct 0, kosPct 0', () => { const r = C.calcRef(2000, 2026, 11, 0.01, NOW, 1.75); eq(r.months, 0); eq(r.teuPct, 0); eq(r.kosPct, 0); near(r.net, r.gross); });
test('calcRef Datum nach now (2027-03, Override): months 0, keine negativen Werte', () => { const r = C.calcRef(2000, 2027, 3, 0.01, NOW, 2.0); eq(r.months, 0); ok(r.net >= 0 && r.teu >= 0 && r.kos >= 0 && r.teuPct >= 0 && r.kosPct >= 0, 'negativ'); near(r.teuPct, 0); });
test('calcRef gibt kein before-Feld bei Erfolg', () => eq('before' in C.calcRef(1000, 2012, 6, 0, NOW), false));
test('calcRef mutiert now nicht', () => { const n = mk(2026, 11, 18, 5), t = n.getTime(); C.calcRef(1000, 2012, 6, 0.005, n); eq(n.getTime(), t); });
test('calcRef Ergebnis unabhaengig von Uhrzeit von now (0:00 vs 23:59)', () => {
  const a = C.calcRef(1500, 2013, 9, 0.005, new Date(2026, 10, 18, 0, 0, 0)), b = C.calcRef(1500, 2013, 9, 0.005, new Date(2026, 10, 18, 23, 59, 59)); cmpCalc(a, b);
});
test('calcRef Tag im Monat wirkt nicht (1. vs 30.) ', () => { cmpCalc(C.calcRef(1500, 2013, 9, 0.005, mk(2026, 11, 1)), C.calcRef(1500, 2013, 9, 0.005, mk(2026, 11, 30))); });
test('calcRef kp negativ -> kos nie negativ', () => { const r = C.calcRef(2000, 2013, 9, -0.05, NOW); ok(r.kos >= 0 && r.kosPct >= 0, 'kos ' + r.kos); });
test('calcRef kp undefined/null/String: keine NaN', () => { [undefined, null, '', 'x', NaN].forEach(k => { const r = C.calcRef(2000, 2013, 9, k, NOW); ok(Number.isFinite(r.net) && r.net >= 0, 'kp=' + fmt(k) + ' net=' + r.net); }); });
test('cumInflation Monatsmitte: 2024-02-29 now, Start 2024-01', () => near(C.cumInflation(2024, 1, mk(2024, 2, 29)), Math.pow(1.011, 1 / 12)));

// ===== cumInflation =====
test('cumInflation gleicher Monat = 1', () => eq(C.cumInflation(2026, 11, NOW), 1));
test('cumInflation Zukunft = 1', () => eq(C.cumInflation(2028, 1, NOW), 1));
test('cumInflation 12 Monate 2025-11 -> 2026-11: 11 Mon. 2026 (0.3%) + 1 Mon. 2025 (0.2%)', () => near(C.cumInflation(2025, 11, NOW), Math.pow(1.002, 1 / 12) * Math.pow(1.003, 11 / 12)));
test('cumInflation Jahreswechsel 2025-12 -> 2026-01 = 1.003^(1/12)', () => near(C.cumInflation(2025, 12, mk(2026, 1, 15)), Math.pow(1.003, 1 / 12)));
test('cumInflation 2025-12 -> 2025-12 (31.12.2025) = 1', () => eq(C.cumInflation(2025, 12, mk(2025, 12, 31)), 1));
test('cumInflation 2025-12 now 1.1.2026 = 1.003^(1/12)', () => near(C.cumInflation(2025, 12, mk(2026, 1, 1)), Math.pow(1.003, 1 / 12)));
test('cumInflation Jahr nach 2026 nutzt 2026-Wert (now 2028-02)', () => near(C.cumInflation(2026, 12, mk(2028, 2, 10)), Math.pow(1.003, 14 / 12)));
test('cumInflation Deflationsjahr 2009: Faktor < 1 moeglich', () => ok(C.cumInflation(2008, 12, mk(2009, 12, 1)) < 1, 'nicht <1'));
test('cumInflation vs Orakel (Raster 2008-2026 x now)', () => { [NOW, mk(2028, 2, 29), mk(2030, 12, 31), mk(2020, 3, 1)].forEach(n => { for (let y = 2008; y <= 2027; y++) for (let m = 1; m <= 12; m++) near(C.cumInflation(y, m, n), oCum(y, m, n), y + '-' + m); }); });
test('cumInflation Ereignisse vor 2008 (Jahr ohne INF): faellt auf 2026-Wert', () => near(C.cumInflation(2006, 12, mk(2007, 1, 5)), Math.pow(1.003, 1 / 12)));
test('cumInflation Multiplikativ: f(a,c)=f(a,b)*f(b,c)', () => { const mid = mk(2020, 6, 1); near(C.cumInflation(2015, 3, NOW), C.cumInflation(2015, 3, mid) * C.cumInflation(2020, 6, NOW)); });

// ===== Fuzz / Monotonie / Invarianten =====
test('Fuzz Orakel-Vergleich calcRef (2000 Zufallsfaelle, Seed 1)', () => {
  const r = rng(1);
  for (let i = 0; i < 2000; i++) {
    const rent = Math.round(r() * 8000 * 100) / 100 + 1, y = 2008 + Math.floor(r() * 20), m = 1 + Math.floor(r() * 12), kp = r() * 0.02;
    const now = mk(2024 + Math.floor(r() * 5), 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28), Math.floor(r() * 24));
    const e = oCalc(rent, y, m, kp, now), a = C.calcRef(rent, y, m, kp, now);
    if (e === null) { eq(a.before, true); continue; }
    try { cmpCalc(a, e); } catch (x) { throw new Error(`Eingabe rent=${rent} y=${y} m=${m} kp=${kp} now=${iso(now)}: ${x.message}`); }
  }
});
test('Monotonie: hoehere Miete => hoehere (>=) Bruttosenkung (Seed 2)', () => {
  const r = rng(2);
  for (let i = 0; i < 1000; i++) { const y = 2008 + Math.floor(r() * 18), m = 1 + Math.floor(r() * 12), a = r() * 5000, b = a + r() * 5000;
    const x = C.calcRef(a, y, m, 0.005, NOW), z = C.calcRef(b, y, m, 0.005, NOW); if (x.before) continue;
    ok(z.gross >= x.gross - 1e-9, `gross ${a}->${b} ${y}-${m}`); ok(z.net >= x.net - 1e-9, `net ${a}->${b} ${y}-${m}`); }
});
test('Monotonie: hoehere Miete => hoehere net/teu/kos (alle >=) (Seed 3)', () => {
  const r = rng(3);
  for (let i = 0; i < 500; i++) { const y = 2008 + Math.floor(r() * 18), m = 1 + Math.floor(r() * 12), a = r() * 3000, b = a + 1 + r() * 3000;
    const x = C.calcRef(a, y, m, 0.01, NOW), z = C.calcRef(b, y, m, 0.01, NOW); if (x.before) continue; ok(z.teu >= x.teu - 1e-9 && z.kos >= x.kos - 1e-9 && z.netYear >= x.netYear - 1e-9, `${a}/${b} ${y}-${m}`); }
});
test('Monotonie: Miete linear (Verdopplung => doppelte net, 1e-9)', () => { for (const [y, m] of [[2008, 9], [2012, 6], [2019, 1], [2020, 3]]) { const a = C.calcRef(777.77, y, m, 0.005, NOW), b = C.calcRef(1555.54, y, m, 0.005, NOW); near(b.net, 2 * a.net); near(b.gross, 2 * a.gross); } });
test('Monotonie ABER: Referenzzins steigt 2023 (steps nehmen 2023-06 ab 2020-03 zu, nicht ab); Schrittzahl pro Satz-Block konstant', () => {
  for (const [y, m, s] of [[2020, 3, 0], [2023, 6, 1], [2023, 12, 2], [2025, 3, 1], [2025, 9, 0], [2017, 6, 1], [2015, 6, 2], [2013, 9, 3]]) eq(C.calcRef(1000, y, m, 0, NOW).steps, s, y + '-' + m);
});
test('Hinweis (kein Bug): Schritte nicht global monoton im Datum, weil Zins 2023 stieg (Spezifikation "spaeteres Datum => weniger Schritte" gilt nur wenn Zins nicht steigt)', () => {
  // Dokumentiert, dass 2023-06 (1 Schritt) mehr als 2020-03 (0) ist. Kein Codefehler, aber die geforderte Monotonie gilt global nicht.
  ok(C.calcRef(1000, 2023, 6, 0, NOW).steps > C.calcRef(1000, 2022, 12, 0, NOW).steps, 'erwartet Anstieg 2022-12 -> 2023-06');
});
test('Monotonie: spaeteres Datum im fallenden Zinsabschnitt 2008-09..2020-03 => steps nicht zunehmend', () => {
  let prev = Infinity; for (let y = 2008; y <= 2020; y++) for (let m = 1; m <= 12; m++) { if (y * 12 + m < 2008 * 12 + 9 || y * 12 + m > 2020 * 12 + 3) continue; const s = C.calcRef(1000, y, m, 0, NOW).steps; ok(s <= prev, `${y}-${m}`); prev = s; }
});
test('Monotonie: hoehere Kostenpauschale => kleineres oder gleiches net', () => { const r = rng(4); for (let i = 0; i < 500; i++) { const y = 2008 + Math.floor(r() * 18), m = 1 + Math.floor(r() * 12), k1 = r() * 0.01, k2 = k1 + r() * 0.01; const a = C.calcRef(2000, y, m, k1, NOW), b = C.calcRef(2000, y, m, k2, NOW); if (a.before) continue; ok(b.net <= a.net + 1e-9, `${y}-${m}`); } });
test('Monotonie: hoehere Basis (Override) => groessere reduction/gross', () => { let p = -1; for (let b = 1.25; b <= 3.5; b += 0.25) { const g = C.calcRef(1000, 2020, 3, 0, NOW, b).gross; ok(g > p || b === 1.25, 'b=' + b); p = g; } });
test('Invariante: 0 <= net <= gross, teu,kos >= 0 (Fuzz Seed 5, 3000 Faelle inkl. Zukunft/Vergangenheit)', () => {
  const r = rng(5);
  for (let i = 0; i < 3000; i++) { const rent = r() * 1e5, y = 1990 + Math.floor(r() * 60), m = 1 + Math.floor(r() * 12), kp = r() * 0.1 - 0.02, now = mk(2000 + Math.floor(r() * 40), 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28));
    const x = C.calcRef(rent, y, m, kp, now); if (x.before) continue;
    const tag = `rent=${rent} ${y}-${m} kp=${kp} now=${iso(now)}`;
    ok(x.net >= 0 && x.net <= x.gross + 1e-9, 'net ' + tag); ok(x.teu >= 0 && x.kos >= 0 && x.gross >= 0, 'neg ' + tag);
    ok([x.base, x.steps, x.red, x.gross, x.teu, x.kos, x.net, x.netYear, x.teuPct, x.kosPct, x.months].every(Number.isFinite), 'nonfinite ' + tag); ok(x.red >= 0 && x.red < 1, 'red ' + tag); ok(x.months >= 0 && Number.isInteger(x.months), 'months ' + tag); }
});
test('Invariante: net == max(0, gross-teu-kos) exakt', () => { const r = rng(6); for (let i = 0; i < 500; i++) { const x = C.calcRef(r() * 4000, 2008 + Math.floor(r() * 18), 1 + Math.floor(r() * 12), r() * 0.02, NOW); if (x.before) continue; near(x.net, Math.max(0, x.gross - x.teu - x.kos)); } });
test('Invariante: gross <= rent * 0.2126 (max. 9 Schritte)', () => { const r = rng(7); for (let i = 0; i < 500; i++) { const rent = r() * 5000, x = C.calcRef(rent, 2008 + Math.floor(r() * 18), 1 + Math.floor(r() * 12), 0, NOW); if (x.before) continue; ok(x.gross <= rent * 0.27 / 1.27 + 1e-9, 'gross'); } });
test('Invariante: Rundung konsistent - auf Rappen gerundete netYear == 12*gerundetes net innerhalb 6 Rp.', () => { const r = rng(8); for (let i = 0; i < 500; i++) { const x = C.calcRef(r() * 4000, 2008 + Math.floor(r() * 18), 1 + Math.floor(r() * 12), 0.005, NOW); if (x.before) continue; ok(Math.abs(Math.round(x.netYear * 100) / 100 - 12 * (Math.round(x.net * 100) / 100)) <= 0.06 + 1e-9, 'rd'); } });
test('Invariante: Ergebnisobjekt Felder vorhanden & Typen number', () => { const x = C.calcRef(1000, 2012, 6, 0.005, NOW); ['base', 'steps', 'red', 'gross', 'teu', 'kos', 'net', 'netYear', 'teuPct', 'kosPct', 'months'].forEach(k => eq(typeof x[k], 'number', k)); });
test('Invariante: Wiederholbarkeit (gleiche Eingabe => identisches Ergebnis)', () => eq(JSON.stringify(C.calcRef(1234, 2013, 9, 0.005, NOW)), JSON.stringify(C.calcRef(1234, 2013, 9, 0.005, NOW))));
test('Invariante: Rent 0 => alles 0', () => { const x = C.calcRef(0, 2012, 6, 0.005, NOW); eq(x.gross, 0); eq(x.net, 0); eq(x.netYear, 0); });
test('Invariante: Rent negativ => 0', () => { const x = C.calcRef(-500, 2012, 6, 0.005, NOW); eq(x.net, 0); eq(x.gross, 0); });

// ===== Robustheit: seltsame Eingaben =====
const weird = [null, undefined, NaN, Infinity, -Infinity, '', ' ', 'abc', '1e400', '12abc', [], {}, true, false, -0, 1e308, -1e308, Number.MAX_VALUE, Number.MIN_VALUE, '2000', 2000.5, '  2000 '];
weird.forEach((w, i) => test(`Robust: calcRef(rent=${fmt(w)}) keine NaN/Infinity/negativ/Absturz`, () => {
  const x = C.calcRef(w, 2012, 6, 0.005, NOW); if (x.before) return;
  for (const k of ['gross', 'teu', 'kos', 'net']) ok(Number.isFinite(x[k]) && x[k] >= 0, `${k}=${x[k]}`);
}));
test('BUG: rent=1e308 -> netYear endlich (12*net ueberlaeuft)', () => { const x = C.calcRef(1e308, 2008, 9, 0, NOW); ok(Number.isFinite(x.netYear), 'netYear=' + x.netYear); });
test('Robust: rent=Number.MAX_VALUE -> gross endlich', () => { const x = C.calcRef(Number.MAX_VALUE, 2008, 9, 0, NOW); ok(Number.isFinite(x.gross) && x.gross >= 0, 'gross=' + x.gross); });
test('Robust: rent="2000" (String) wie Zahl 2000', () => near(C.calcRef('2000', 2012, 6, 0.005, NOW).net, C.calcRef(2000, 2012, 6, 0.005, NOW).net));
test('Robust: rent=true wird wie 1 behandelt ODER 0, nie NaN', () => { const x = C.calcRef(true, 2012, 6, 0.005, NOW); ok(Number.isFinite(x.net), 'net'); });
[[NaN, 6], [2012, NaN], [undefined, undefined], [null, null], [Infinity, 6], [2012, Infinity], ['2012', '6'], [2012, 13], [2012, 0], [2012, -5]].forEach(([y, m]) =>
  test(`Robust: calcRef Datum y=${fmt(y)} m=${fmt(m)}: kein Absturz, kein NaN`, () => { const x = C.calcRef(1000, y, m, 0.005, NOW); if (x.before) return; for (const k of ['gross', 'net', 'months', 'teuPct']) ok(Number.isFinite(x[k]), `${k}=${x[k]}`); }));
test('BUG: calcRef mit Monat als String "6" == Zahl 6 (DOM liefert Strings)', () => { const a = C.calcRef(1000, '2012', '6', 0.005, NOW), b = C.calcRef(1000, 2012, 6, 0.005, NOW); eq(a.base, b.base, 'base'); near(a.net, b.net, 'net'); });
test('Robust: calcRef ohne now / now=null: kein Absturz', () => { C.calcRef(1000, 2012, 6, 0.005); C.calcRef(1000, 2012, 6, 0.005, null); });
test('BUG: calcRef now=Invalid Date: keine NaN', () => { const x = C.calcRef(1000, 2012, 6, 0.005, new Date('x')); ok(x.before || Number.isFinite(x.net), 'net=' + x.net); });
test('Robust: sehr grosse Jahre (y=9999) endet schnell', () => { const t = Date.now(); C.calcRef(1000, 9999, 12, 0.005, NOW); ok(Date.now() - t < 1000, 'langsam'); });
test('Robust: sehr frühes Datum y=-1e6 (nach before) endet', () => eq(C.calcRef(1000, -1e6, 1, 0.005, NOW).before, true));
test('Robust: refAt mit Strings/null/undefined: kein Absturz', () => { [[null, null], [undefined, 1], ['2012', '6'], [NaN, 1]].forEach(([y, m]) => { const r = C.refAt(y, m); ok(r === null || typeof r === 'number', fmt(r)); }); });
test('BUG: refAt("2012","6") == refAt(2012,6) (String-Konkatenation y*12+m)', () => eq(C.refAt('2012', '6'), C.refAt(2012, 6)));
test('Robust: parseISO mit Objekten/Zahlen/Array: null', () => { [{}, [], 1, true, NaN, () => 1].forEach(v => eq(C.parseISO(v), null)); });

// ===== parseISO =====
[['2024-02-29', true], ['2023-02-29', false], ['1900-02-29', false], ['2000-02-29', true], ['2100-02-29', false], ['2026-04-31', false], ['2026-12-31', true], ['2026-01-00', false], ['2026-01-32', false], [' 2026-01-01', false], ['2026-01-01 ', false], ['2026-01-01T00:00', false], ['26-01-01', false], ['2026/01/01', false], ['２０２６-01-01', false]].forEach(([s, v]) =>
  test(`parseISO(${JSON.stringify(s)}) ${v ? 'gueltig' : 'ungueltig'}`, () => { const d = C.parseISO(s); if (v) { ok(d instanceof Date && !isNaN(d), 'nicht gueltig'); eq(iso(d), s.length === 10 && s.startsWith('0000') ? iso(d) : s); } else eq(d, null); }));
test('parseISO liefert lokale Mitternacht', () => { const d = C.parseISO('2026-03-29'); eq(d.getHours(), 0); eq(d.getMinutes(), 0); });
test('parseISO alle Tage 2023-2029 gueltig und lokal korrekt (DST-Wechsel)', () => { for (let o = ord(2023, 1, 1); o <= ord(2029, 12, 31); o++) { const s = fromOrd(o), d = C.parseISO(s); ok(d && iso(d) === s, s); } });
test('parseISO alle ungueltigen Kalendertage 2023-2025 (Tag 29-31) => null', () => { for (let y = 2023; y <= 2025; y++) for (let m = 1; m <= 12; m++) for (let d = 29; d <= 31; d++) { const s = ISO(y, m, d), valid = d <= dim(y, m); eq(C.parseISO(s) !== null, valid, s); } });

// ===== calcInit =====
const initCases = [
  ['Tag 30 ab Antritt: heute = Antritt+30', 2000, 2100, [2026, 10, 19], NOW], ['Tag 31 ab Antritt (abgelaufen, left -1)', 2000, 2100, [2026, 10, 18], NOW], ['Antritt heute', 2000, 2100, [2026, 11, 18], NOW],
  ['Antritt morgen', 2000, 2100, [2026, 11, 19], NOW], ['Antritt gestern', 2000, 2100, [2026, 11, 17], NOW], ['Tag 29', 2000, 2100, [2026, 10, 20], NOW],
  ['Antritt 31.12. -> Frist 30.1.', 2000, 2100, [2026, 12, 31], NOW], ['Antritt 1.1.', 2000, 2100, [2027, 1, 1], NOW], ['Schalttag-Antritt 29.2.2028', 2000, 2100, [2028, 2, 29], mk(2028, 3, 10)],
  ['Antritt 30.1.2028 -> Frist 29.2.', 2000, 2100, [2028, 1, 30], mk(2028, 2, 29)], ['Antritt 31.1.2027 -> Frist 2.3.', 2000, 2100, [2027, 1, 31], mk(2027, 3, 2)], ['Antritt 31.1.2028 -> 1.3.', 2000, 2100, [2028, 1, 31], mk(2028, 3, 1)],
  ['Antritt 1.12.2026 -> 31.12.', 2000, 2100, [2026, 12, 1], NOW], ['Antritt 2.12.2026 -> 1.1.2027', 2000, 2100, [2026, 12, 2], NOW],
  ['Antritt in 1 Jahr', 2000, 2100, [2027, 11, 18], NOW], ['Antritt vor 5 Jahren', 2000, 2100, [2021, 11, 18], NOW],
  ['Vormiete = Miete', 2000, 2000, [2026, 11, 1], NOW], ['Vormiete > Miete (Senkung)', 2500, 2000, [2026, 11, 1], NOW], ['Vormiete 0', 0, 2000, [2026, 11, 1], NOW],
  ['Vormiete negativ', -100, 2000, [2026, 11, 1], NOW], ['Miete 0', 2000, 0, [2026, 11, 1], NOW], ['beide 0', 0, 0, [2026, 11, 1], NOW], ['Vormiete 1 Rappen', 0.01, 1, [2026, 11, 1], NOW],
  ['now 0:00 Uhr', 2000, 2100, [2026, 10, 19], mk(2026, 11, 18, 0)], ['now 23:00 Uhr', 2000, 2100, [2026, 10, 19], mk(2026, 11, 18, 23)],
];
initCases.forEach(([name, o, n, s, now]) => test('calcInit ' + name, () => {
  const a = C.calcInit(o, n, ISO(...s), now), e = oInit(o, n, s[0], s[1], s[2], now);
  if (e.pct === null) eq(a.pct, null, 'pct'); else near(a.pct, e.pct, 'pct'); eq(a.left, e.left, 'left'); eq(a.future, e.future, 'future'); eq(iso(a.deadline), e.deadline, 'deadline');
}));
test('calcInit Handrechnung: 2000->2100 = +5%', () => near(C.calcInit(2000, 2100, '2026-11-01', NOW).pct, 5));
test('calcInit Vormiete = Miete -> pct 0 (nicht -0 / NaN)', () => eq(Object.is(C.calcInit(2000, 2000, '2026-11-01', NOW).pct, 0), true));
test('calcInit Vormiete > Miete -> pct negativ', () => near(C.calcInit(2500, 2000, '2026-11-01', NOW).pct, -20));
test('calcInit Vormiete 0 -> pct null, Frist trotzdem berechnet', () => { const r = C.calcInit(0, 2000, '2026-11-01', NOW); eq(r.pct, null); eq(iso(r.deadline), '2026-12-01'); });
test('calcInit ungueltiges Datum -> left/deadline/future null', () => { const r = C.calcInit(2000, 2100, '2026-02-30', NOW); eq(r.left, null); eq(r.deadline, null); eq(r.future, null); });
test('calcInit leer/null/undefined Datum -> null, pct bleibt', () => { [ '', null, undefined, 'x' ].forEach(s => { const r = C.calcInit(2000, 2100, s, NOW); eq(r.deadline, null); near(r.pct, 5); }); });
test('calcInit future nur bei Antritt > heute; heute => null', () => { eq(C.calcInit(1, 2, '2026-11-18', NOW).future, null); eq(C.calcInit(1, 2, '2026-11-19', NOW).future, 1); eq(C.calcInit(1, 2, '2026-11-17', NOW).future, null); });
test('calcInit future==Tage bis Antritt ueber Jahreswechsel/Schaltjahr', () => eq(C.calcInit(1, 2, '2028-03-01', mk(2028, 2, 28)).future, 2));
test('calcInit NaN/Strings als Mieten: pct nicht NaN-Absturz', () => { [[NaN, 1], ['a', 'b'], [undefined, undefined], [null, null], [Infinity, 1], [1, Infinity]].forEach(([o, n]) => { const r = C.calcInit(o, n, '2026-11-01', NOW); ok(r.pct === null || typeof r.pct === 'number', 'typ'); }); });
test('BUG: calcInit pct nie NaN (Vormiete Infinity, Miete Infinity)', () => { const r = C.calcInit(Infinity, Infinity, '2026-11-01', NOW); ok(r.pct === null || !Number.isNaN(r.pct), 'NaN'); });
test('calcInit mutiert now nicht', () => { const n = mk(2026, 11, 18, 3), t = n.getTime(); C.calcInit(1, 2, '2026-11-01', n); eq(n.getTime(), t); });
test('calcInit ohne now: kein Absturz', () => { C.calcInit(1, 2, '2026-11-01'); });
test('calcInit Fuzz (Seed 9): Orakel fuer left/future/deadline an 2000 Zufallsdaten', () => {
  const r = rng(9);
  for (let i = 0; i < 2000; i++) { const sy = 2024 + Math.floor(r() * 5), sm = 1 + Math.floor(r() * 12), sd = 1 + Math.floor(r() * dim(sy, sm)), now = mk(2024 + Math.floor(r() * 5), 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28), Math.floor(r() * 24));
    const a = C.calcInit(1000, 1100, ISO(sy, sm, sd), now), e = oInit(1000, 1100, sy, sm, sd, now);
    if (a.left !== e.left || a.future !== e.future || iso(a.deadline) !== e.deadline) throw new Error(`Eingabe start=${ISO(sy, sm, sd)} now=${iso(now)}: erwartet ${e.left}/${e.future}/${e.deadline}, erhalten ${a.left}/${a.future}/${iso(a.deadline)}`); }
});
test('calcInit Invariante left = future-unabhaengig: left - (-future) == 30 wenn future', () => { const r = C.calcInit(1, 2, '2026-12-25', NOW); eq(r.left, r.future + 30); });
test('calcInit deadline ist lokale Mitternacht (Stunde 0, ausser DST-Luecke)', () => eq(C.calcInit(1, 2, '2026-11-01', NOW).deadline.getHours(), 0));

// ===== calcDeadline =====
const dl = [
  ['2027-03-31', 3, '2026-12-31'], ['2027-03-31', 2, '2027-01-31'], ['2027-03-31', 6, '2026-09-30'], ['2027-06-30', 3, '2027-03-31'], ['2027-06-30', 2, '2027-04-30'], ['2027-06-30', 6, '2026-12-31'],
  ['2027-09-30', 3, '2027-06-30'], ['2027-09-30', 6, '2027-03-31'], ['2027-12-31', 3, '2027-09-30'], ['2027-12-31', 2, '2027-10-31'], ['2027-12-31', 6, '2027-06-30'],
  ['2027-02-28', 3, '2026-11-30'], ['2027-02-28', 2, '2026-12-31'], ['2027-02-28', 6, '2026-08-31'], ['2028-02-29', 3, '2027-11-30'], ['2028-02-29', 2, '2027-12-31'], ['2028-02-29', 6, '2027-08-31'],
  ['2028-02-28', 3, '2027-11-28'], ['2027-01-31', 6, '2026-07-31'], ['2027-01-31', 2, '2026-11-30'], ['2027-07-31', 3, '2027-04-30'], ['2027-10-31', 3, '2027-07-31'],
  ['2027-04-30', 3, '2027-01-31'], ['2027-11-30', 3, '2027-08-31'], ['2027-12-30', 3, '2027-09-29'], ['2027-12-30', 2, '2027-10-30'], ['2026-12-31', 3, '2026-09-30'], ['2027-01-01', 3, '2026-10-01'],
  ['2027-03-30', 3, '2026-12-30'], ['2027-05-30', 2, '2027-03-30'], ['2027-08-31', 6, '2027-02-28'], ['2024-08-31', 6, '2024-02-29'], ['2027-03-01', 3, '2026-12-01'], ['2027-03-01', 6, '2026-09-01'],
];
dl.forEach(([t, f, e]) => test(`calcDeadline ${t} Frist ${f} Mon. => ${e}`, () => eq(iso(C.calcDeadline(t, f, NOW).sendBy), e)));
test('calcDeadline vs Orakel alle Tage 2027 x Fristen 2/3/6', () => { for (const f of [2, 3, 6]) for (let o = ord(2027, 1, 1); o <= ord(2028, 12, 31); o++) { const s = fromOrd(o), [y, m, d] = s.split('-').map(Number), a = iso(C.calcDeadline(s, f, NOW).sendBy), e = oDead(y, m, d, f); if (a !== e) throw new Error(`Eingabe ${s} Frist ${f}: erwartet ${e}, erhalten ${a}`); } });
test('calcDeadline Fuzz (Seed 10), Fristen 1..12, Jahre 2020-2035', () => { const r = rng(10); for (let i = 0; i < 2000; i++) { const y = 2020 + Math.floor(r() * 16), m = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * dim(y, m)), f = 1 + Math.floor(r() * 12); const a = iso(C.calcDeadline(ISO(y, m, d), f, NOW).sendBy), e = oDead(y, m, d, f); if (a !== e) throw new Error(`Eingabe ${ISO(y, m, d)} Frist ${f}: erwartet ${e}, erhalten ${a}`); } });
test('calcDeadline Monotonie: spaeterer Termin => spaeterer oder gleicher Versand (Frist 3, Tage 2027)', () => { let p = ''; for (let o = ord(2027, 1, 1); o <= ord(2028, 12, 31); o++) { const s = iso(C.calcDeadline(fromOrd(o), 3, NOW).sendBy); ok(s >= p, fromOrd(o) + ' ' + s + '<' + p); p = s; } });
test('calcDeadline Invariante: sendBy < Termin und Abstand 2..6 Mon. liegt im Bereich (Frist 2: 58-62 Tage)', () => { for (let o = ord(2027, 1, 1); o <= ord(2028, 12, 31); o += 7) { const s = fromOrd(o), [y, m, d] = s.split('-').map(Number), r = C.calcDeadline(s, 2, NOW).sendBy; const diff = o - ord(r.getFullYear(), r.getMonth() + 1, r.getDate()); ok(diff >= 58 && diff <= 62, s + ' diff ' + diff); } });
test('calcDeadline left = Tage bis sendBy (Handrechnung 43 Tage zum 31.12.2026)', () => eq(C.calcDeadline('2027-03-31', 3, NOW).left, 43));
test('calcDeadline left 0 am Fristtag, -1 am Tag danach, +1 am Vortag', () => { eq(C.calcDeadline('2027-03-31', 3, mk(2026, 12, 31, 23)).left, 0); eq(C.calcDeadline('2027-03-31', 3, mk(2027, 1, 1, 0)).left, -1); eq(C.calcDeadline('2027-03-31', 3, mk(2026, 12, 30, 5)).left, 1); });
test('calcDeadline left ueber Zeitumstellung ganzzahlig (Fristen im Maerz/Oktober)', () => { for (const [t, n] of [['2027-06-30', mk(2027, 3, 20)], ['2027-12-31', mk(2027, 9, 20)], ['2027-03-31', mk(2026, 10, 20)], ['2027-06-30', mk(2026, 10, 1)]]) { const r = C.calcDeadline(t, 3, n); ok(Number.isInteger(r.left), t + ' ' + r.left); const [y, m, d] = oDead(...t.split('-').map(Number), 3).split('-').map(Number); eq(r.left, ord(y, m, d) - ord(n.getFullYear(), n.getMonth() + 1, n.getDate()), t); } });
test('calcDeadline left unabhaengig von Uhrzeit von now', () => eq(C.calcDeadline('2027-03-31', 3, mk(2026, 11, 18, 0)).left, C.calcDeadline('2027-03-31', 3, new Date(2026, 10, 18, 23, 59, 59)).left));
[[null, 3], ['', 3], ['2027-03-31', 0], ['2027-03-31', null], ['2027-03-31', undefined], ['2027-03-31', NaN], ['2027-02-30', 3], ['xx', 3], [undefined, undefined], [20270331, 3]].forEach(([t, f]) =>
  test(`calcDeadline Fehleingabe (${fmt(t)}, ${fmt(f)}): kein Absturz, sendBy null oder gueltig`, () => { const r = C.calcDeadline(t, f, NOW); ok(r.sendBy === null || (r.sendBy instanceof Date && !isNaN(r.sendBy)), fmt(r.sendBy)); if (r.sendBy === null) eq(r.left, null); }));
test('BUG: calcDeadline Frist negativ/Bruchteil/String/Infinity: kein Invalid Date', () => { [-3, 2.5, '3', '6', 1e6, Infinity].forEach(f => { const r = C.calcDeadline('2027-03-31', f, NOW); ok(r.sendBy === null || !isNaN(r.sendBy), 'f=' + f + ' ' + fmt(r.sendBy)); }); });
test('BUG?: calcDeadline Frist "3" (String aus DOM) == 3', () => eq(iso(C.calcDeadline('2027-03-31', '3', NOW).sendBy), '2026-12-31'));
test('calcDeadline Frist 12 Monate (Jahreswechsel rueckwaerts)', () => eq(iso(C.calcDeadline('2027-03-31', 12, NOW).sendBy), oDead(2027, 3, 31, 12)));
test('calcDeadline Frist 1 Monat an Monatsenden: 31.3.->31.3 bzw. 30.4.->30.4 (Tag nach Termin - 1M - 1T)', () => { eq(iso(C.calcDeadline('2027-03-31', 1, NOW).sendBy), oDead(2027, 3, 31, 1)); eq(iso(C.calcDeadline('2027-05-31', 1, NOW).sendBy), '2027-04-30'); });
test('calcDeadline mutiert now nicht; ohne now kein Absturz', () => { const n = mk(2026, 11, 18), t = n.getTime(); C.calcDeadline('2027-03-31', 3, n); eq(n.getTime(), t); C.calcDeadline('2027-03-31', 3); });
test('calcDeadline Schaltjahr-Termin 29.2.2028 + Termin 28.2.2027 Frist 6', () => { eq(iso(C.calcDeadline('2028-02-29', 6, NOW).sendBy), '2027-08-31'); eq(iso(C.calcDeadline('2027-02-28', 6, NOW).sendBy), '2026-08-31'); });
test('calcDeadline Jahreswechsel: Termin 31.12.2026 Frist 6 / 1.1.2027 Frist 3', () => { eq(iso(C.calcDeadline('2026-12-31', 6, NOW).sendBy), '2026-06-30'); eq(iso(C.calcDeadline('2027-01-01', 2, NOW).sendBy), '2026-11-01'); });

// ===== Zeitumstellung (laufen unter allen TZ; Orakel rechnet in UTC-Ordinalzahlen) =====
const DSTDAYS = [[2026, 3, 29], [2026, 10, 25], [2026, 3, 8], [2026, 11, 1], [2026, 9, 27], [2027, 4, 4], [2027, 3, 28], [2027, 10, 31], [2027, 3, 14], [2027, 11, 7], [2027, 9, 26], [2028, 4, 2], [2028, 3, 26], [2028, 10, 29]];
DSTDAYS.forEach(([y, m, d]) => {
  test(`DST-Tag ${ISO(y, m, d)}: calcInit als now/Antritt und Frist exakt`, () => {
    for (const h of [0, 1, 2, 3, 12, 23]) { const now = new Date(y, m - 1, d, h, 30, 0); const today = ord(now.getFullYear(), now.getMonth() + 1, now.getDate());
      for (let k = -40; k <= 40; k += 3) { const s = fromOrd(today + k), [sy, sm, sd] = s.split('-').map(Number), a = C.calcInit(1, 2, s, now), e = oInit(1, 2, sy, sm, sd, now); if (a.left !== e.left || a.future !== e.future || iso(a.deadline) !== e.deadline) throw new Error(`Eingabe now=${iso(now)} h=${h} start=${s}: erwartet ${e.left}/${e.future}/${e.deadline}, erhalten ${a.left}/${a.future}/${iso(a.deadline)}`); } }
  });
  test(`DST-Tag ${ISO(y, m, d)}: calcDeadline left exakt, Termin Frist 2/3/6`, () => {
    for (const f of [2, 3, 6]) for (const h of [0, 2, 23]) { const now = new Date(y, m - 1, d, h, 15, 0); for (let k = 0; k < 400; k += 17) { const s = fromOrd(ord(y, m, d) + k), [ty, tm, td] = s.split('-').map(Number), r = C.calcDeadline(s, f, now), e = oDead(ty, tm, td, f); const [ey, em, ed] = e.split('-').map(Number); const el = ord(ey, em, ed) - ord(now.getFullYear(), now.getMonth() + 1, now.getDate()); if (iso(r.sendBy) !== e || r.left !== el) throw new Error(`Eingabe ${s} f=${f} now=${iso(now)} h=${h}: erwartet ${e}/${el}, erhalten ${iso(r.sendBy)}/${r.left}`); } }
  });
  test(`DST-Tag ${ISO(y, m, d)}: calcRef bleibt von Uhrzeit unabhaengig`, () => { const a = C.calcRef(2000, 2013, 9, 0.005, new Date(y, m - 1, d, 0, 5)), b = C.calcRef(2000, 2013, 9, 0.005, new Date(y, m - 1, d, 23, 55)); cmpCalc(a, b); });
});
test('DST-Sweep: jeder Tag 2026-01-01..2028-12-31 als now: calcInit(Antritt = heute) left=30, future=null', () => { for (let o = ord(2026, 1, 1); o <= ord(2028, 12, 31); o++) { const [y, m, d] = fromOrd(o).split('-').map(Number); for (const h of [0, 12, 23]) { const r = C.calcInit(1, 2, fromOrd(o), new Date(y, m - 1, d, h, 0, 0)); if (r.left !== 30 || r.future !== null || iso(r.deadline) !== fromOrd(o + 30)) throw new Error(`Eingabe ${fromOrd(o)} h=${h}: erhalten left=${r.left} future=${r.future} dl=${iso(r.deadline)}`); } } });
test('DST-Sweep: jeder Tag 2026..2028: calcDeadline left=0 wenn now = sendBy', () => { for (let o = ord(2027, 1, 1); o <= ord(2028, 12, 31); o += 1) { const s = fromOrd(o), [ty, tm, td] = s.split('-').map(Number), e = oDead(ty, tm, td, 3), [ey, em, ed] = e.split('-').map(Number), r = C.calcDeadline(s, 3, new Date(ey, em - 1, ed, 12)); if (r.left !== 0) throw new Error(`Eingabe ${s}: left=${r.left} (sendBy ${e})`); } });
test('DST: now am Tag der Zeitumstellung um 2:30 (nicht existierende Stunde) liefert gueltige Werte', () => { const r = C.calcRef(2000, 2013, 9, 0.005, new Date(2026, 2, 29, 2, 30)); ok(Number.isFinite(r.net), 'net'); const i = C.calcInit(1, 2, '2026-03-29', new Date(2026, 2, 29, 2, 30)); eq(i.future, null); eq(i.left, 30); });
test('TZ-Info: aktuelle TZ ' + (process.env.TZ || 'System') + ' aktiv, Date-Konstruktion lokal', () => { eq(new Date(2026, 5, 1, 12).getHours(), 12); });

// ===== Ausgabe =====
const fails = results.filter(r => !r.ok);
fails.forEach(f => console.log('FAIL ' + f.name + '\n     ' + f.msg));
console.log(`round2 [TZ=${process.env.TZ || 'System'}]: ${results.length} Tests, ${results.length - fails.length} bestanden, ${fails.length} fehlgeschlagen`);
process.exit(fails.length ? 1 : 0);
