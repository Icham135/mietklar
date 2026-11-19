  /* =========================================================
     RECHENKERN (rein, ohne DOM). Stand der Daten: 18.11.2026
     Quellen: BWO-Verlauf (law.ch-Wiedergabe bis 2020, danach Pressemitteilungen),
     Überwälzung: 3 % pro Viertelprozent (Moneyland, law.ch). Alles Schätzung, keine Rechtsberatung.
     ========================================================= */
  const CUR = { rate: 1.25, label: '1,25 %', since: '2.9.2025', next: '1.12.2026' };
  /* [Jahr, Monat, Satz] ab Gültigkeit */
  const REF = [[2008,9,3.5],[2009,6,3.25],[2009,9,3.0],[2010,12,2.75],[2011,12,2.5],[2012,6,2.25],[2013,9,2.0],[2015,6,1.75],[2017,6,1.5],[2020,3,1.25],[2023,6,1.5],[2023,12,1.75],[2025,3,1.5],[2025,9,1.25]];
  /* Jahresmittel Landesindex (Näherung, in %); 2026 geschätzt */
  const INF = {2008:2.4,2009:-0.5,2010:0.7,2011:0.2,2012:-0.7,2013:-0.2,2014:0.0,2015:-1.1,2016:-0.4,2017:0.5,2018:0.9,2019:0.4,2020:-0.7,2021:0.6,2022:2.8,2023:2.1,2024:1.1,2025:0.2,2026:0.3};
  const FORM_FULL = ['BS','BE','FR','GE','LU','ZG','ZH'], FORM_PART = ['NE','VD'];
  function refAt(y, m) {
    y = +y; m = +m; if (!isFinite(y) || !isFinite(m)) return null;
    if (y * 12 + m < 2008 * 12 + 9) return null;
    let r = null; for (const [yy, mm, rate] of REF) { if (yy * 12 + mm <= y * 12 + m) r = rate; } return r;
  }
  const stepsFor = base => { const n = Math.round((+base - CUR.rate) / 0.25); return isFinite(n) ? Math.max(0, n) : 0; };
  const reduction = n => n > 0 ? 1 - 1 / (1 + 0.03 * n) : 0;
  function cumInflation(y, m, now) {
    const ny = now.getFullYear(), nm = now.getMonth() + 1; let f = 1, yy = y, mm = m;
    while (yy * 12 + mm < ny * 12 + nm) { mm++; if (mm > 12) { mm = 1; yy++; } const i = (INF[yy] !== undefined ? INF[yy] : INF[2026]) / 100; f *= Math.pow(1 + i, 1 / 12); }
    return f;
  }
  function monthsSince(y, m, now) { return Math.max(0, (now.getFullYear() * 12 + now.getMonth() + 1) - (y * 12 + m)); }
  /* Hauptrechnung: Referenzzins-Senkung inkl. Gegenrechnung */
  function calcRef(rent, y, m, kp, now, baseOverride) {
    now = (now instanceof Date && !isNaN(now)) ? now : new Date();
    y = +y; m = +m; kp = (isFinite(+kp) && +kp > 0) ? +kp : 0;
    rent = (isFinite(+rent) && +rent > 0) ? +rent : 0;
    const base = (typeof baseOverride === 'number' && isFinite(baseOverride)) ? baseOverride : refAt(y, m);
    if (base === null) return { before: true };
    const steps = stepsFor(base), red = reduction(steps);
    const cum = cumInflation(y, m, now), months = monthsSince(y, m, now);
    const teuPct = Math.max(0, 0.4 * (cum - 1)), kosPct = Math.max(0, (kp || 0) * months / 12);
    const gross = rent * red, teu = steps > 0 ? rent * teuPct : 0, kos = steps > 0 ? rent * kosPct : 0;
    const net = Math.min(1e9, Math.max(0, gross - teu - kos));
    return { base, steps, red, gross, teu, kos, net, netYear: net * 12, teuPct, kosPct, months };
  }
  /* ISO-Datum (YYYY-MM-DD) streng parsen: ungültige Kalendertage (30.2., 31.11.) gelten als ungültig */
  function parseISO(iso) {
    if (typeof iso !== 'string') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3], dt = new Date(y, mo - 1, d);
    return (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) ? dt : null;
  }
  /* Anfangsmiete: Erhöhung, Frist (30 Tage ab Mietantritt). Kalendertage statt Millisekunden (Zeitumstellung!) */
  function calcInit(oldR, newR, startISO, now) {
    now = now || new Date();
    const pct = (oldR > 0 && isFinite(oldR) && isFinite(newR)) ? (newR - oldR) / oldR * 100 : null;
    const d0 = parseISO(startISO); let left = null, deadline = null, future = null;
    if (d0) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      deadline = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 30);
      left = Math.round((deadline - today) / 864e5);
      if (d0 > today) future = Math.round((d0 - today) / 864e5);
    }
    return { pct, left, deadline, future };
  }
  /* Frist für das Senkungsbegehren: Das Begehren muss spätestens am Tag VOR Beginn der Kündigungsfrist beim Vermieter eintreffen.
     Beispiel: Termin 31.3., Frist 3 Monate -> Eingang spätestens 31.12. */
  function calcDeadline(terminISO, fristMonths, now) {
    now = now || new Date();
    const t = parseISO(terminISO);
    if (!t || !isFinite(fristMonths) || !(fristMonths > 0)) return { sendBy: null, left: null };
    /* Tag nach dem Termin, minus Frist in Monaten; fehlt der Tag im Zielmonat (z. B. 30.2.), wird auf den Monatsletzten
       zurückgesetzt (vorsichtig = früher). Danach ein Tag zurück: spätester Eingang beim Vermieter. */
    const b = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1), tm = b.getMonth() - fristMonths;
    const last = new Date(b.getFullYear(), tm + 1, 0).getDate();
    const d = new Date(b.getFullYear(), tm, Math.min(b.getDate(), last)); d.setDate(d.getDate() - 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { sendBy: d, left: Math.round((d - today) / 864e5) };
  }
  if (typeof module !== 'undefined') module.exports = { parseISO, refAt, stepsFor, reduction, calcRef, calcInit, calcDeadline, cumInflation, CUR, REF };
