/* Ergänzende Tests: calcDeadline und parseISO (von Hand gerechnet, nicht aus dem Code kopiert) */
const E = require('../src/calc.js'); let ok = 0, bad = 0;
const iso = d => d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : null;
function t(name, got, exp) { const g = JSON.stringify(got), e = JSON.stringify(exp); if (g === e) ok++; else { bad++; console.log('FAIL', name, 'got', g, 'exp', e); } }
const now = new Date(2026, 10, 18);
// Termin, Frist (Monate) -> spätester Eingang (Tag vor Beginn der Kündigungsfrist)
[['2027-03-31', 3, '2026-12-31'], ['2027-06-30', 3, '2027-03-31'], ['2027-09-30', 3, '2027-06-30'], ['2027-12-31', 3, '2027-09-30'],
 ['2027-03-31', 2, '2027-01-31'], ['2027-03-31', 4, '2026-11-30'], ['2027-02-28', 3, '2026-11-30'], ['2028-02-29', 3, '2027-11-30'],
 ['2027-01-31', 3, '2026-10-31'], ['2027-05-31', 6, '2026-11-30'],
 // kein Monatsende: vorsichtig (früher), kein Überlauf in den Folgemonat
 ['2027-05-29', 3, '2027-02-27'], ['2027-05-30', 3, '2027-02-27'], ['2027-05-31', 3, '2027-02-28'], ['2027-08-30', 6, '2027-02-27'], ['2027-12-15', 3, '2027-09-15']].forEach(([term, f, exp]) => t('deadline ' + term + ' ' + f, iso(E.calcDeadline(term, f, now).sendBy), exp));
t('left bis 31.12.2026', E.calcDeadline('2027-03-31', 3, now).left, 43);
t('left negativ', E.calcDeadline('2027-01-31', 3, now).left < 0, true);
t('ohne Termin', E.calcDeadline('', 3, now), { sendBy: null, left: null });
t('ungültiger Termin 30.2.', E.calcDeadline('2027-02-30', 3, now), { sendBy: null, left: null });
// parseISO
['2026-02-30', '2026-11-31', '2026-13-01', '2026-00-10', '2026-1-5', 'abc', '', null, undefined, 20261118, '18.11.2026'].forEach(v => t('parseISO ungültig ' + v, E.parseISO(v), null));
['2024-02-29', '2026-11-18', '2026-12-31'].forEach(v => t('parseISO gültig ' + v, iso(E.parseISO(v)), v));
t('parseISO 2025-02-29 ungültig', E.parseISO('2025-02-29'), null);
// calcInit über Winterzeitumstellung: Mietantritt 2026-10-19 -> Frist 2026-11-18
t('Frist über Zeitumstellung', iso(E.calcInit(2000, 2100, '2026-10-19', now).deadline), '2026-11-18');
t('left 0 am Fristtag', E.calcInit(2000, 2100, '2026-10-19', now).left, 0);
// calcRef: Eingaben mit Override
const o = E.calcRef(2000, 2021, 5, 0.005, now, 1.75); t('Override base', o.base, 1.75); t('Override steps', o.steps, 2);
t('NaN-Miete -> 0', E.calcRef(NaN, 2019, 12, 0.005, now).net, 0);
console.log('deadline.test: ' + (ok + bad) + ' Tests, ' + ok + ' bestanden, ' + bad + ' fehlgeschlagen'); process.exit(bad ? 1 : 0);
