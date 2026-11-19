  /* =========================================================
     UI v2: Konfiguration, Analytics (cookielos), Hero-Check, Wizard,
     Brief-Vorschau, .ics, Kantonskarte, Zeitmaschine, Zins-Alarm, Teilen.
     Alles läuft im Browser. Es wird nichts gesendet oder gespeichert.
     ========================================================= */

  /* ----- Konfiguration: hier stehen alle Dinge, die der Gründer entscheidet ----- */
  const CONFIG = {
    price: Number('@@PRICE@@'), // Testpreis aus config.json (zentral änderbar, Entscheid Gründer: 29/39/49)
    /* Kaufweg: Läuft die Seite mit server.py, kommt der Anbieter vom Server (/api/config).
       Ohne Server (z. B. statisches Hosting) bleibt der Kauf deaktiviert (Hinweis-Dialog). */
    stand: '18.11.2026',        // Stand der Rechtsgrundlagen und Zahlen
    nextPubISO: '2026-12-01',   // nächste BWO-Publikation (vor Livegang prüfen)
    demo: /[?&]demo=1/.test(location.search)  // ?demo=1 schaltet den Brief-Druck zum Testen frei
  };

  /* ----- Server (Kaufweg und Messung), optional ----- */
  let SERVER = null, SILENT = false;
  const serverReady = (location.protocol.startsWith('http') ? fetch('/api/config', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null))
    .then(c => { if (c && c.provider) { SERVER = c; CONFIG.price = c.price; }       $$('.js-paynote').forEach(e => e.textContent = (!SERVER || SERVER.provider === 'off') ? 'In dieser Version ist die Bezahlung nicht aktiv. Den Inhalt siehst du trotzdem als Vorschau.' : SERVER.provider === 'sandbox' ? 'Testbetrieb: Die Zahlung ist simuliert, es wird nichts belastet.' : 'Bezahlung per Karte oder TWINT über den Zahlungsanbieter.'); });

  /* ----- Messung ohne Cookies und ohne Eingabewerte -----
     Gesendet werden nur Ereignisname und eine feste Kategorie (z. B. 'anspruch'), nie Beträge, Daten oder Adressen. */
  window.__mk = [];
  const SEND = new Set(['landing_view', 'check_start', 'check_complete', 'preview_view', 'checkout_start', 'purchase_success', 'purchase_failed', 'purchase_cancelled', 'pdf_download', 'pdf_redownload']);
  const ONCE = new Set(['check_complete', 'preview_view']); let sentOnce = new Set();
  function track(name, cat) {
    if (SILENT) return;
    if (name === 'check_start') sentOnce = new Set();
    if (ONCE.has(name)) { if (sentOnce.has(name)) return; sentOnce.add(name); }
    const ev = { n: name, c: cat || null, t: Date.now() }; window.__mk.push(ev);
    try { document.dispatchEvent(new CustomEvent('mk:event', { detail: ev })); } catch (e) {}
    if (SEND.has(name)) serverReady.then(() => { if (!SERVER) return; const body = JSON.stringify({ n: name, c: cat || null });
      try { if (!(navigator.sendBeacon && navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' })))) fetch('/api/event', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {}); } catch (e) {} });
  }
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-track]'); if (a) track(a.dataset.track); });
  track('landing_view');

  /* ----- Datum in Europe/Zurich ----- */
  function zurichNow() {
    try {
      const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const g = t => +p.find(x => x.type === t).value; return new Date(g('year'), g('month') - 1, g('day'), 12);
    } catch (e) { return new Date(); }
  }
  const NOW = zurichNow();
  const chf = n => 'CHF ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '’');
  const num = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '’');
  const pc = (p, d = 1) => p.toFixed(d).replace('.', ',') + ' %';
  const pad2 = n => String(n).padStart(2, '0');
  const fdate = d => pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear();
  const fdateLong = d => d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  /* Betrag aus Texteingabe: 2'100 / 2’100 / 2 100 / 2100.50 / 2100,50 */
  const money = v => { const t = String(v == null ? '' : v).trim().replace(/[’'\s]/g, '').replace(',', '.'); return /^\d+(\.\d{1,2})?$/.test(t) ? +t : NaN; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  $$('.js-stand').forEach(e => e.textContent = CONFIG.stand);
  $$('.js-cur').forEach(e => e.textContent = CUR.label);
  $$('.js-next').forEach(e => e.textContent = CUR.next);
  $$('.js-price').forEach(e => e.textContent = CONFIG.price);
  $('#hCur').textContent = 'Heute: ' + CUR.label + ' (seit ' + CUR.since + ')';

  function fillMY(sm, sy, m, y) {
    sm.innerHTML = MONTHS.map((n, i) => `<option value="${i + 1}"${i + 1 === m ? ' selected' : ''}>${n}</option>`).join('');
    let h = ''; for (let yy = NOW.getFullYear(); yy >= 2008; yy--) h += `<option value="${yy}"${yy === y ? ' selected' : ''}>${yy}</option>`; sy.innerHTML = h;
  }
  const CHG = new Set(REF.map(([y, m]) => y * 12 + m));   /* Monate, in denen der Referenzzins wechselte */
  function disp(r) { const g = Math.round(r.gross), o = Math.round(r.teu + r.kos), t = Math.round(r.teu); return { g, o, t, k: o - t, n: Math.max(0, g - o), ny: Math.max(0, g - o) * 12 }; }
  const setW = (el, w) => el.style.setProperty('--w', Math.max(1.5, Math.min(100, w)) + '%');
  function countTo(el, to, fmt) {
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), d = 900; (function step(t) { const p = clamp((t - t0) / d, 0, 1); el.textContent = fmt(to * easeOut(p)); if (p < 1) requestAnimationFrame(step); })(t0);
  }
  let toastT = 0;
  { const t0 = document.createElement('div'); t0.id = 'toast'; t0.className = 'toast'; t0.setAttribute('role', 'status'); document.body.appendChild(t0); }
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }

  /* ----- Hero Schnell-Check ----- */
  const hR = $('#hRent'), hM = $('#hM'), hY = $('#hY');
  fillMY(hM, hY, 7, 2023);
  function updateHero() {
    const v = money(hR.value), rent = v > 0 ? clamp(v, 0, 100000) : 0, y = +hY.value, m = +hM.value, r = calcRef(rent, y, m, .0025, NOW), chg = CHG.has(y * 12 + m);
    $('#hV0').textContent = chf(rent);
    const reset = (a, b, c) => { $('#hV1').textContent = a; $('#hV2').textContent = b; $('#hV3').textContent = c; setW($('#hB1'), 1); setW($('#hB2'), 1); setW($('#hB3'), 1); };
    if (r.before) { reset('–', '–', '–'); $('#hBase').textContent = 'Vor 9/2008: Satz aus dem Vertrag nötig'; $('#hWarn').textContent = 'Nicht berechenbar'; return; }
    $('#hBase').textContent = 'Basis: Referenzzins ' + pc(r.base, 2);
    if (rent <= 0) { reset('–', '–', '–'); $('#hWarn').textContent = 'Gib deine Miete ein'; return; }
    if (r.steps === 0) { reset('–', '–', 'Kein Anspruch'); $('#hWarn').textContent = chg ? 'Satzwechsel in diesem Monat: Satz laut Vertrag prüfen' : 'Ehrlich: kein Anspruch über den Referenzzins'; return; }
    const d = disp(r); $('#hV1').textContent = '– ' + num(d.g); $('#hV2').textContent = '+ ' + num(d.o); $('#hV3').textContent = chf(d.n) + ' / Mt.';
    setW($('#hB1'), 70); setW($('#hB2'), 70 * d.o / Math.max(d.g, 1)); setW($('#hB3'), 70 * d.n / Math.max(d.g, 1));
    $('#hWarn').textContent = chg ? 'Satzwechsel in diesem Monat: Satz laut Vertrag prüfen' : 'Richtwert, keine Zusage';
    clearTimeout(hSr); hSr = setTimeout(() => { $('#hSr').textContent = 'Möglicher Spielraum ' + chf(d.n) + ' pro Monat, Richtwert.'; }, 900);
  }
  let hSr = 0;
  [hR, hM, hY].forEach(e => { e.addEventListener('input', updateHero); e.addEventListener('change', updateHero); });
  updateHero();

  /* ----- ICS (Kalenderdatei, lokal erzeugt) ----- */
  function fold(line) {
    const enc = new TextEncoder(), out = []; let cur = '', bytes = 0, lim = 75;
    for (const ch of line) { const b = enc.encode(ch).length; if (bytes + b > lim) { out.push(cur); cur = ' '; bytes = 1; lim = 75; } cur += ch; bytes += b; }
    out.push(cur); return out.join('\r\n');
  }
  function makeICS(events) {
    const e2 = s => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const d8 = x => x.getFullYear() + pad2(x.getMonth() + 1) + pad2(x.getDate()), n = new Date();
    const stamp = n.getUTCFullYear() + pad2(n.getUTCMonth() + 1) + pad2(n.getUTCDate()) + 'T' + pad2(n.getUTCHours()) + pad2(n.getUTCMinutes()) + pad2(n.getUTCSeconds()) + 'Z';
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mietklar//Frist//DE', 'CALSCALE:GREGORIAN'];
    events.forEach((ev, i) => {
      const end = new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate() + 1);
      L.push('BEGIN:VEVENT', 'UID:mk-' + d8(ev.date) + '-' + i + '-' + Math.floor(Math.random() * 1e9) + '@mietklar', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d8(ev.date), 'DTEND;VALUE=DATE:' + d8(end), 'TRANSP:TRANSPARENT', 'SUMMARY:' + e2(ev.title), 'DESCRIPTION:' + e2(ev.desc));
      (ev.alarms || []).forEach(a => L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + e2(ev.title), 'TRIGGER:' + a, 'END:VALARM'));
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR'); return L.map(fold).join('\r\n') + '\r\n';
  }
  function downloadICS(events, name) {
    const blob = new Blob([makeICS(events)], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name || 'mietklar-fristen.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const ALARMS = ['-P6DT15H', '-P1DT15H']; /* 7 und 2 Tage vorher um 09:00 */
  const pubDate = () => parseISO(CONFIG.nextPubISO);

  /* ----- Kantone ----- */
  const CANTONS = [['AG','Aargau'],['AI','Appenzell Innerrhoden'],['AR','Appenzell Ausserrhoden'],['BE','Bern'],['BL','Basel-Landschaft'],['BS','Basel-Stadt'],['FR','Freiburg'],['GE','Genf'],['GL','Glarus'],['GR','Graubünden'],['JU','Jura'],['LU','Luzern'],['NE','Neuenburg'],['NW','Nidwalden'],['OW','Obwalden'],['SG','St. Gallen'],['SH','Schaffhausen'],['SO','Solothurn'],['SZ','Schwyz'],['TG','Thurgau'],['TI','Tessin'],['UR','Uri'],['VD','Waadt'],['VS','Wallis'],['ZG','Zug'],['ZH','Zürich']];
  const CNAME = Object.fromEntries(CANTONS);
  const formKind = c => FORM_FULL.includes(c) ? 'full' : FORM_PART.includes(c) ? 'part' : 'none';
  const FORM_TXT = {
    full: 'Hier ist das amtliche Formular für den Anfangsmietzins Pflicht (BWO-Verzeichnis, Stand 9/2026). Dort steht der Vormietzins. Fehlt das Formular, kann der Mietzins nicht gültig vereinbart sein. Das ist ein Einzelfall, frag den Mieterverband.',
    part: 'Hier gilt die Formularpflicht nur teilweise (bestimmte Gemeinden oder Wohnungsgrössen). Prüfe, ob du ein Formular bekommen hast.',
    none: 'Laut BWO-Verzeichnis (Stand 9/2026) gibt es hier keine Formularpflicht. Den Vormietzins kannst du beim Vermieter verlangen (Art. 256a OR).'
  };
  const BEHOERDE = 'Die zuständige Schlichtungsbehörde findest du über deine Gemeinde oder den Mieterverband (mieterverband.ch).';
  const GRID = { SH: [4, 0], TG: [5, 0], BS: [1, 1], BL: [2, 1], AG: [3, 1], ZH: [4, 1], SG: [5, 1], AR: [6, 1], AI: [7, 1], JU: [0, 2], SO: [1, 2], LU: [3, 2], ZG: [4, 2], SZ: [5, 2], GL: [6, 2], NE: [0, 3], FR: [1, 3], BE: [2, 3], OW: [3, 3], NW: [4, 3], UR: [5, 3], GR: [6, 3], VD: [0, 4], VS: [2, 4], TI: [5, 4], GE: [0, 5] };

  /* ----- Wizard ----- */
  const W = { mode: null, step: 'mode', rent: '', m: 12, y: 2023, baseOv: '', kind: 'std', kp: 0.25, termin: '', frist: 3, canton: 'ZH', old: '', nw: '', start: '', reason: '', unknown: false, oldUnknown: false, paidOrder: null,
    bname: '', bstreet: '', bzip: '', name: '', street: '', zip: '', lname: '', lstreet: '', lzip: '', obj: '', ort: '' };
  const FLOW = { bestand: ['mode', 'rent', 'since', 'details', 'result', 'letter'], neu: ['mode', 'canton', 'rents', 'start', 'result', 'letter'] };
  const wBody = $('#wBody'), wBack = $('#wBack'), wBar = $('#wBar'), wStep = $('#wStep'), wiz = $('#wiz');
  let started = false, booted = false, lastResult = null, PAID_LAST = null;
  const flow = () => FLOW[W.mode] || ['mode'];
  const idx = () => Math.max(0, flow().indexOf(W.step));
  function go(step, focus, fromPop) {
    W.step = step; const f = flow(), i = f.indexOf(step), n = f.length;
    wBack.hidden = i <= 0; wBar.style.transform = 'scaleX(' + (n > 1 ? (i / (n - 1)) : 0) + ')';
    wStep.textContent = step === 'result' ? 'Ergebnis' : step === 'letter' ? 'Vorschau' : 'Frage ' + (i + 1) + ' von 4';
    render(step);
    if (!fromPop && booted) { try { history.pushState({ mk: step }, ''); } catch (e) {} }
    if (focus !== false) { const h = $('#wBody [data-focus]'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } if (started) wiz.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    started = true;
  }
  wBack.addEventListener('click', () => { const f = flow(), i = f.indexOf(W.step); if (i > 0) go(f[i - 1]); });
  const next = () => { const f = flow(); go(f[f.indexOf(W.step) + 1]); };
  const errHTML = '<p class="err" id="wErr" role="alert" hidden></p>';
  function showErr(msg, sel) { const e = $('#wErr'); if (!e) return; e.textContent = msg; e.hidden = !msg; $$('#wBody [aria-invalid]').forEach(x => { x.removeAttribute('aria-invalid'); x.removeAttribute('aria-describedby'); }); const f = sel && $(sel); if (f) { f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', 'wErr'); f.focus(); } }
  const optHTML = (arr, sel) => arr.map(([v, n]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const WHERE = `<details class="where"><summary>Wo finde ich das?</summary><ul><li><b>Mietvertrag:</b> gilt ab Mietbeginn, wenn der Mietzins nie geändert wurde. Massgebend ist der im Vertrag genannte Referenzzins.</li><li><b>Mitteilung einer Mietzinsänderung:</b> hat dein Vermieter erhöht oder gesenkt, zählt das Datum dieser Mitteilung.</li><li><b>Amtliches Formular zum Anfangsmietzins:</b> in ZH, BE, BS, ZG, LU, FR und GE.</li><li><b>Verwaltung fragen:</b> Sie muss dir die letzte Änderung nennen können.</li></ul><p class="hint">Nur Nebenkosten angepasst? Das zählt nicht, gemeint ist der Nettomietzins. Wechselte der Referenzzins in dem Monat, in dem dein Mietzins festgelegt wurde, wähle den Satz laut Vertrag.</p></details>`;

  function render(step) {
    const T = {
      mode() {
        return `<h3 data-focus>Wohnst du schon dort oder bist du gerade eingezogen?</h3><p class="lead">So wählen wir den richtigen Check.</p>
        ${PAID_LAST ? `<p class="hint"><a class="linkbtn" href="?order=${esc(PAID_LAST)}#check">Dein gekauftes Dossier erneut öffnen</a></p>` : ''}<div class="choice"><button type="button" data-mode="bestand"><b>Ich wohne schon dort</b><span>Referenzzins: Kann meine Miete sinken?</span></button><button type="button" data-mode="neu"><b>Ich bin gerade eingezogen</b><span>Anfangsmiete: Du hast 30 Tage zum Anfechten</span></button></div>`;
      },
      rent() {
        return `<form class="wform" novalidate><h3 data-focus>Wie hoch ist deine Netto-Miete pro Monat?</h3><div class="fld"><label for="wRent">CHF pro Monat, ohne Nebenkosten</label><input id="wRent" type="text" inputmode="decimal" autocomplete="off" value="${esc(W.rent)}" placeholder="z. B. 2100"></div><p class="hint">Steht im Mietvertrag oder in der letzten Mietzinsanzeige.</p>${errHTML}<button class="btn btn-dark" type="submit">Weiter</button></form>`;
      },
      since() {
        const baseSel = `<div class="fld"><label for="wBase">Referenzzins laut Vertrag (nur wenn du ihn kennst)</label><select id="wBase"><option value="">Automatisch aus dem Datum</option>${[3.5, 3.25, 3.0, 2.75, 2.5, 2.25, 2.0, 1.75, 1.5, 1.25].map(v => `<option value="${v}"${String(W.baseOv) === String(v) ? ' selected' : ''}>${pc(v, 2)}</option>`).join('')}</select></div>`;
        return `<form class="wform" novalidate><h3 data-focus>Seit wann gilt dein aktueller Mietzins?</h3><p class="explain">Wir brauchen das Datum, um den Referenzzins von damals zu finden. Das ist der Zinssatz, an den deine Miete gekoppelt ist. Ist er seither gesunken, darfst du eine tiefere Miete verlangen.</p><div class="row2"><div class="fld"><label for="wM">Monat</label><select id="wM"></select></div><div class="fld"><label for="wY">Jahr</label><select id="wY"></select></div></div>${WHERE.replace('</details>', baseSel + '</details>')}
          ${errHTML}<div class="btnrow"><button class="btn btn-dark" type="submit">Weiter</button><button class="btn btn-line" type="button" id="wUnknown">Ich weiss es nicht genau</button></div></form>`;
      },
      details() {
        return `<form class="wform" novalidate><h3 data-focus>Noch drei kurze Angaben</h3>
          <div class="fld"><label for="wKind">Art der Wohnung</label><select id="wKind">${optHTML([['std', 'Normale Mietwohnung'], ['gen', 'Genossenschaft oder gemeinnützig'], ['idx', 'Staffel- oder Indexmiete'], ['sub', 'Subventioniert oder befristet']], W.kind)}</select></div>
          <div class="row2"><div class="fld"><label for="wTerm">Wann kannst du frühestens kündigen? (optional)</label><input id="wTerm" type="date" value="${esc(W.termin)}"></div><div class="fld"><label for="wFr">Kündigungsfrist</label><select id="wFr">${optHTML([[2, '2 Monate'], [3, '3 Monate'], [4, '4 Monate'], [6, '6 Monate']], +W.frist)}</select></div></div>
          <p class="hint">Beides steht im Mietvertrag. Damit sagen wir dir, bis wann dein Brief ankommen muss. Weisst du es nicht, lass das Datum leer.</p>
          <details class="where"><summary>Annahmen anpassen</summary><div class="fld"><label for="wKp">Kostenpauschale des Vermieters: <b id="wKpV" aria-hidden="true">${pc(W.kp, 2)} pro Jahr</b></label><input id="wKp" type="range" min="0" max="1" step="0.05" value="${W.kp}" aria-valuetext="${pc(W.kp, 2)} pro Jahr" style="height:36px;padding:0"><p class="hint">Vermieter dürfen allgemeine Kostensteigerungen gegenrechnen. Einen amtlichen Richtwert gibt es nicht: Zürcher Schlichtungsbehörden rechnen aktuell mit etwa 0,25 %, ältere Praxis nennt 0,5 bis 1 %, der Mieterverband bestreitet Pauschalen.</p></div></details>${errHTML}<button class="btn btn-dark" type="submit">Ergebnis ansehen</button></form>`;
      },
      canton() {
        return `<form class="wform" novalidate><h3 data-focus>In welchem Kanton liegt die Wohnung?</h3><div class="fld"><label for="wCan">Kanton</label><select id="wCan">${optHTML(CANTONS, W.canton)}</select></div><p class="hint">Der Kanton bestimmt, ob ein amtliches Formular Pflicht ist und welche Behörde zuständig ist.</p><button class="btn btn-dark" type="submit">Weiter</button></form>`;
      },
      rents() {
        return `<form class="wform" novalidate><h3 data-focus>Was zahlte die Vormieterin, was zahlst du jetzt?</h3><div class="row2"><div class="fld"><label for="wOld">Vormietzins netto (CHF/Monat, ohne Nebenkosten)</label><input id="wOld" type="text" inputmode="decimal" autocomplete="off" value="${esc(W.old)}" placeholder="z. B. 1800"${W.oldUnknown ? ' disabled' : ''}></div><div class="fld"><label for="wNew">Neuer Mietzins netto (CHF/Monat, ohne Nebenkosten)</label><input id="wNew" type="text" inputmode="decimal" autocomplete="off" value="${esc(W.nw)}" placeholder="z. B. 2100"></div></div>
          <label class="chk"><input type="checkbox" id="wOldUnk"${W.oldUnknown ? ' checked' : ''}> Ich kenne den Vormietzins nicht</label><p class="hint">${formKind(W.canton) === 'full' ? 'In deinem Kanton steht der Vormietzins auf dem amtlichen Formular.' : 'Weisst du den Vormietzins nicht, kannst du ihn beim Vermieter verlangen (Art. 256a OR).'}</p>${errHTML}<button class="btn btn-dark" type="submit">Weiter</button></form>`;
      },
      start() {
        return `<form class="wform" novalidate><h3 data-focus>Wann hast du die Wohnung übernommen?</h3><div class="fld"><label for="wStart">Datum der Übernahme (Mietantritt)</label><input id="wStart" type="date" value="${esc(W.start)}"></div><p class="hint">Die 30 Tage zählen ab Übernahme der Wohnung, nicht ab Vertragsunterschrift. Im Zweifel früher handeln.</p>${errHTML}<button class="btn btn-dark" type="submit">Ergebnis ansehen</button></form>`;
      },
      result() { return resultHTML(); },
      letter() { return letterHTML(); }
    };
    wBody.innerHTML = T[step](); bind(step);
  }

  function bind(step) {
    const f = $('#wBody form');
    if (step === 'mode') $$('#wBody [data-mode]').forEach(b => b.addEventListener('click', () => { W.mode = b.dataset.mode; W.paidOrder = null; track('check_start', W.mode); next(); }));
    if (step === 'since') { fillMY($('#wM'), $('#wY'), +W.m, +W.y); $('#wUnknown').addEventListener('click', () => { W.unknown = true; track('wizard_step_unknown'); go('result'); }); }
    if (step === 'rents') { const cb = $('#wOldUnk'); cb.addEventListener('change', () => { $('#wOld').disabled = cb.checked; if (cb.checked) $('#wOld').value = ''; }); }
    if (step === 'details') { const kp = $('#wKp'); kp.addEventListener('input', () => { const t = pc(+kp.value, 2) + ' pro Jahr'; $('#wKpV').textContent = t; kp.setAttribute('aria-valuetext', t); }); }
    if (!f) { if (step === 'result' || step === 'letter') bindResult(step); return; }
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (step === 'rent') { const v = money($('#wRent').value); if (!(v > 0 && v <= 100000)) return showErr('Bitte gib eine Netto-Miete zwischen 1 und 100’000 CHF ein.', '#wRent'); W.rent = v; }
      if (step === 'since') { W.unknown = false; W.m = +$('#wM').value; W.y = +$('#wY').value; W.baseOv = $('#wBase').value; if (W.y * 12 + W.m > NOW.getFullYear() * 12 + NOW.getMonth() + 1) return showErr('Das Datum liegt in der Zukunft.', '#wY'); if (W.baseOv === '' && CHG.has(W.y * 12 + W.m)) return showErr('In diesem Monat hat sich der Referenzzins geändert. Wähle unten den Satz laut Vertrag oder Mietzinsmitteilung.', '#wBase'); }
      if (step === 'details') { W.kind = $('#wKind').value; W.termin = $('#wTerm').value; W.frist = +$('#wFr').value; W.kp = +$('#wKp').value; if (W.termin && !parseISO(W.termin)) return showErr('Der Kündigungstermin ist kein gültiges Datum.', '#wTerm'); if (W.termin && parseISO(W.termin) - NOW > 3 * 366 * 864e5) return showErr('Der Kündigungstermin liegt mehr als drei Jahre in der Zukunft. Bitte prüfe das Datum.', '#wTerm'); }
      if (step === 'canton') { W.canton = $('#wCan').value; syncMap(W.canton); }
      if (step === 'rents') { W.oldUnknown = $('#wOldUnk').checked; const o = W.oldUnknown ? 1 : money($('#wOld').value), n = money($('#wNew').value); if (!(o > 0 && o <= 100000) || !(n > 0 && n <= 100000)) return showErr('Bitte gib beide Mietzinse zwischen 1 und 100’000 CHF ein.', (o > 0 && o <= 100000) ? '#wNew' : '#wOld'); W.old = W.oldUnknown ? '' : o; W.nw = n; }
      if (step === 'start') { const v = $('#wStart').value; if (!parseISO(v)) return showErr('Bitte wähle das Datum, an dem du die Wohnung übernommen hast.', '#wStart'); if (parseISO(v) - NOW > 366 * 864e5) return showErr('Der Mietantritt liegt mehr als ein Jahr in der Zukunft. Bitte prüfe das Datum.', '#wStart'); W.start = v; }
      track('wizard_step_' + idx()); next();
    });
  }

  /* ----- Ergebnis ----- */
  const ringHTML = (n, t, frac) => { const c = 326.7; return `<div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="rb" cx="60" cy="60" r="52"/><circle class="rf" cx="60" cy="60" r="52" stroke-dasharray="${c}" stroke-dashoffset="${(c * (1 - clamp(frac, 0, 1))).toFixed(1)}"/></svg><div class="rn"><b>${n}</b><span>${t}</span></div></div>`; };
  const pathHTML = (badge, cls, title, text) => `<div class="path in"><span class="badge ${cls || ''}">${badge}</span><div><b>${title}</b><p>${text}</p></div></div>`;
  const KIND = { gen: 'Bei Genossenschaften und gemeinnützigen Wohnungen gilt oft die Kostenmiete. Der Referenzzins-Mechanismus greift dort häufig nicht. Prüfe Statuten und Mietvertrag.', idx: 'Bei Staffel- oder Indexmiete gelten andere Regeln. Eine Senkung wegen des Referenzzinses ist in der Regel ausgeschlossen. Prüfe deinen Vertrag.', sub: 'Bei subventionierten oder befristeten Mietverhältnissen gelten Sonderregeln. Frag die zuständige Stelle.' };
  const FOOTER_BTNS = (extra, ics, icsLabel) => `<div class="rcta">${extra}${ics === false ? '' : '<button class="btn btn-line" type="button" data-act="ics">' + (icsLabel || 'Frist in den Kalender') + '</button>'}<button class="btn btn-line" type="button" data-act="share">Check teilen</button></div>`;
  const QUELLEN = {
    bwo: ['BWO: Referenzzinssatz', 'https://www.bwo.admin.ch/de/referenzzinssatz'],
    verlauf: ['BWO: Verlauf', 'https://www.bwo.admin.ch/de/entwicklung-referenzzinssatz-und-durchschnittszinssatz'],
    or270a: ['Art. 270a OR', 'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_270_a'],
    vmwg: ['VMWG', 'https://www.fedlex.admin.ch/eli/cc/1990/835_835_835/de'],
    or270: ['Art. 270 OR', 'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_270'],
    or256a: ['Art. 256a OR', 'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_256_a'],
    bge: ['BGE 147 III 431', 'https://www.servat.unibe.ch/dfr/bge/c3147431.html'],
    form: ['BWO: Formularpflicht', 'https://www.bwo.admin.ch/dam/de/sd-web/lp4WEVqxdXWN/2026-02-03_D_Verzeichnis%20Formularpflicht%20Anfangsmietzins_Kantonale%20Gesetze%20und%20Leerwohnungsziffer_.pdf']
  };
  const srcHTML = keys => `<p class="srcline"><b>Datenstand ${CONFIG.stand}</b>${W.mode === 'bestand' ? ' · Referenzzins ' + CUR.label + ' seit ' + CUR.since + ', nächste Publikation ' + CUR.next : ''}. Quellen: ${keys.map(k => `<a href="${QUELLEN[k][1]}" target="_blank" rel="noopener">${QUELLEN[k][0]}</a>`).join(' · ')}</p>`;
  const factsHTML = rows => `<div class="facts"><b class="facts-h">Deine Angaben</b><dl>${rows.map(([k, val, step]) => `<div><dt>${k}</dt><dd>${val}${step ? ` <button type="button" class="linkbtn" data-edit="${step}" aria-label="${k} ändern">ändern</button>` : ''}</dd></div>`).join('')}</dl></div>`;
  const priceTxt = () => 'CHF ' + CONFIG.price;
  const offerHTML = () => `<div class="offer"><div><span class="offer-k">Mietklar Dossier · ${priceTxt()}</span><b>Dein Brief, fertig zum Unterschreiben</b><p>Persönlich formuliert mit deinen Zahlen, dazu die nachvollziehbare Berechnung und dein Fristenplan. Erst die Vorschau ansehen, dann entscheiden.</p></div><button class="btn btn-dark" type="button" data-act="letter" data-track="cta_letter_click">Vorschau ansehen</button></div>`;
  const noOfferHTML = why => `<p class="nooffer"><b>Kein Dossier für dieses Ergebnis.</b> ${why}</p>`;
  const copyBox = (id, title, text) => `<div class="copybox"><label for="${id}"><b>${title}</b></label><textarea id="${id}" rows="8">${esc(text)}</textarea><button class="btn btn-line" type="button" data-copy="${id}">Text kopieren</button></div>`;
  const scenHTML = (rows) => { const mx = Math.max(rows[0][1], 1); return `<div class="scen" role="list" aria-label="Wie die Gegenrechnung wirkt">${rows.map(([k, val, cls]) => `<div class="sc ${cls || ''}" role="listitem"><span>${k}</span><b>${chf(val)} / Mt.</b><i style="--w:${Math.max(1.5, 100 * Math.max(0, val) / mx).toFixed(1)}%"></i></div>`).join('')}</div>`; };
  const ymLabel = (m, y) => MONTHS[m - 1] + ' ' + y;
  const isoD = d => d ? d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) : '';

  function resultHTML() {
    if (W.mode === 'bestand') {
      const rent = +W.rent;
      if (W.unknown) {
        lastResult = { mode: 'bestand', missing: true, offer: false }; track('check_complete', 'angabe_fehlt');
        const rows = [1.5, 1.75, 2.0, 2.25, 2.5, 2.75].map(b => { const st = stepsFor(b); return `<tr><td>${pc(b, 2)}</td><td>${st}</td><td>${chf(rent * reduction(st))}</td></tr>`; }).join('');
        return `<h3 data-focus>Eine Angabe fehlt noch</h3><p class="lead">Ohne das Datum der letzten Mietzinsfestlegung lässt sich nicht sagen, ob du Anspruch hast. Das ist schnell herauszufinden.</p>
        <div class="paths">${pathHTML('Fehlt', 'warn', 'Seit wann gilt dein Mietzins, und auf welchem Referenzzins beruht er?', 'Steht im Mietvertrag (Mietbeginn, oft auch der Referenzzins), in der letzten Mitteilung über eine Mietzinsänderung oder auf dem amtlichen Formular zum Anfangsmietzins.')}${pathHTML('Gratis', 'good', 'Frag die Verwaltung', 'Die Verwaltung kann dir sagen, auf welchem Referenzzins und Teuerungsstand dein Mietzins beruht. Den Text unten kannst du kopieren und anpassen.')}</div>
        <details class="rmore"><summary>So viel könnte es ungefähr sein</summary><p class="hint">Je nach Referenzzins in deinem Vertrag, vor der Gegenrechnung, bei ${chf(rent)} Netto-Miete.</p>
        <table class="mtab"><thead><tr><th scope="col">Referenzzins im Vertrag</th><th scope="col">Schritte</th><th scope="col">Senkung pro Monat</th></tr></thead><tbody>${rows}<tr><td>${CUR.label}</td><td>0</td><td>kein Anspruch</td></tr></tbody></table></details>
        ${copyBox('reqTxt', 'Anfrage an die Verwaltung', 'Sehr geehrte Damen und Herren\n\nBitte teilen Sie mir mit, seit wann mein aktueller Nettomietzins gilt und auf welchem hypothekarischen Referenzzinssatz und welchem Stand des Landesindex der Konsumentenpreise er beruht.\n\nMietobjekt: \n\nFreundliche Grüsse\n')}
        <div class="rcta"><button class="btn btn-dark" type="button" data-edit="since">Datum eingeben</button></div>
        ${noOfferHTML('Erst mit dem Datum lässt sich sagen, ob sich ein Brief lohnt. Sobald du es hast, tippe auf «Datum eingeben».')}
        ${srcHTML(['bwo', 'verlauf', 'or270a'])}<p class="foot">Information, keine Rechtsberatung.</p>`;
      }
      const baseOv = W.baseOv === '' ? undefined : +W.baseOv;
      const r = calcRef(rent, +W.y, +W.m, W.kp / 100, NOW, baseOv), dl = calcDeadline(W.termin, +W.frist, NOW);
      const d = r.before ? null : disp(r), strict = r.before ? null : disp(calcRef(rent, +W.y, +W.m, 0.005, NOW, baseOv));
      const special = W.kind !== 'std', covered = d && d.n <= 0;
      const worth = !!(d && d.n * 12 > CONFIG.price);   /* Paket nur, wenn die geschätzte Entlastung im ersten Jahr den Preis übersteigt */
      const offer = !!(d && r.steps > 0 && !special && !covered && worth);
      lastResult = { mode: 'bestand', r, dl, rent, d, strict: strict ? strict.n : 0, offer };
      const kindP = special ? pathHTML('Achtung', 'warn', 'Besondere Mietform', KIND[W.kind]) : '';
      const facts = factsHTML([['Netto-Miete', chf(rent) + ' pro Monat', 'rent'], ['Mietzins gilt seit', ymLabel(+W.m, +W.y), 'since'],
        ['Referenzzins damals', r.before ? 'vor 9/2008, nicht berechenbar' : pc(r.base, 2) + (W.baseOv === '' ? ' (aus dem BWO-Verlauf)' : ' (laut Vertrag)'), 'since'],
        ['Mietform', { std: 'Normaler Mietvertrag', gen: 'Genossenschaft oder gemeinnützig', idx: 'Staffel- oder Indexmiete', sub: 'Subventioniert oder befristet' }[W.kind], 'details'],
        ['Kündigungstermin', W.termin ? fdate(parseISO(W.termin)) + ', Frist ' + W.frist + ' Monate' : 'nicht angegeben', 'details'], ['Kostenpauschale', pc(W.kp, 2) + ' pro Jahr', 'details']]);
      if (r.before) { track('check_complete', 'unklar'); return `<h3 data-focus>Für diesen Mietzins können wir nichts berechnen</h3><p class="lead">Für Mietzinse vor September 2008 galt noch der frühere Hypothekarzinssatz, nicht der heutige Referenzzins.</p>${facts}<p class="sub2">Eine verlässliche Zahl liegt ausserhalb dessen, was dieser Check kann. Frag den Mieterverband oder die Schlichtungsbehörde. Hat sich dein Mietzins seither geändert, gib das Datum dieser Änderung ein.</p>${noOfferHTML('Ohne verlässliche Grundlage verkaufen wir keinen Brief.')}${srcHTML(['verlauf'])}`; }
      if (r.steps === 0) {
        track('check_complete', 'kein_anspruch');
        return `<h3 data-focus>Dein Ergebnis</h3><div class="big no">Kein Anspruch</div><p class="sub2">Dein Mietzins beruht auf einem Referenzzins von <b>${pc(r.base, 2)}</b>. Heute gilt <b>${CUR.label}</b> (seit ${CUR.since}). Eine Senkung wegen des Referenzzinses ist deshalb nicht möglich.</p>${facts}
        <div class="paths">${kindP}${pathHTML('Später', 'good', 'Wenn sich der Satz ändert', 'Die nächste Publikation ist am ' + CUR.next + '. Sinkt der Satz, kann sich dein Anspruch ändern. Leg dir den Termin in den Kalender.')}${pathHTML('Anderer Weg', '', 'Gerade eingezogen?', 'Die Anfangsmiete lässt sich nur in den 30 Tagen nach Mietantritt anfechten. Starte den Check neu und wähle «gerade eingezogen».')}</div>
        ${noOfferHTML('Ein Brief würde hier nichts bringen. Du bist fertig, ohne etwas zu bezahlen.')}
        ${FOOTER_BTNS('', true, 'Nächsten Zins-Entscheid in den Kalender')}${srcHTML(['bwo', 'verlauf'])}<p class="foot">Information, keine Rechtsberatung.</p>`;
      }
      track('check_complete', special ? 'sonderform' : covered ? 'gedeckt' : 'anspruch');
      const sendTxt = dl.sendBy ? (dl.left >= 0 ? `Dein Brief muss spätestens am <b>${fdate(dl.sendBy)}</b> beim Vermieter sein. Schick ihn eingeschrieben und mit ein paar Tagen Reserve. Verpasst du das Datum, gilt die Senkung erst ab dem nächsten Kündigungstermin.` : `Für den Termin ${fdate(parseISO(W.termin))} wäre der Brief am ${fdate(dl.sendBy)} fällig gewesen. Nimm den nächsten Kündigungstermin.`) : 'Gib deinen Kündigungstermin an, dann zeigen wir dir, bis wann der Brief ankommen muss. Er steht im Mietvertrag.';
      const nextTxt = (covered || special) ? '' : `<div class="nextstep">${sendTxt}${dl.sendBy ? '' : ' <button type="button" class="linkbtn" data-edit="details">Termin eingeben</button>'}</div>`;
      return `<h3 data-focus>${covered ? 'Nach der Gegenrechnung bleibt kaum etwas' : special ? 'Deine Miete kann vielleicht sinken' : 'Deine Miete kann voraussichtlich sinken'}</h3>
      <div class="rtop"><div><div class="big ${(covered || special) ? 'no' : 'ok'}"><span id="bigN" aria-hidden="true">0</span><span class="sr">${chf(d.n)}</span><small>pro Monat weniger</small></div><p class="sub2">${special ? '<b>Bei deiner Mietform ist der Anspruch unklar.</b> Die Zahl gilt nur, falls die Referenzzins-Regel bei dir greift. ' : ''}${covered ? 'Die geschätzte Gegenrechnung des Vermieters deckt die Senkung.' : 'Das sind etwa <b>' + chf(d.ny) + ' pro Jahr</b>. Geschätzt nach der Gegenrechnung des Vermieters, ohne sie wären es ' + chf(d.g) + ' pro Monat.'}</p></div>${dl.sendBy && dl.left >= 0 ? ringHTML(dl.left, dl.left === 1 ? 'Tag Zeit' : 'Tage Zeit', dl.left / (W.frist * 30)) : ''}</div>
      ${nextTxt}
      ${offer ? offerHTML() : noOfferHTML(special ? 'Bei deiner Mietform ist unklar, ob die Referenzzins-Regel gilt. Kläre das zuerst mit dem Mieterverband.' : (covered ? 'Nach der geschätzten Gegenrechnung bleibt kein Vorteil.' : 'Die geschätzte Entlastung im ersten Jahr (' + chf(d.ny) + ') liegt unter dem Preis des Pakets.') + ' Du kannst trotzdem selbst eine Senkung verlangen, ein bezahltes Paket lohnt sich hier aber nicht.')}
      ${facts}
      <details class="rmore"><summary>So haben wir gerechnet</summary>
      ${scenHTML([['Vermieter rechnet nichts gegen', d.g], ['Unsere Schätzung (Kostenpauschale ' + pc(W.kp, 2) + ')', d.n, 'mid'], ['Strenge Gegenrechnung (Kostenpauschale 0,50 %)', strict.n, 'low']])}
      <p class="hint">Der Brief verlangt die volle Senkung (${chf(d.g)} pro Monat). Was der Vermieter gegenrechnet, zeigt erst seine Antwort.</p>
      <div class="paths">
        ${pathHTML('Senkung', 'good', '– ' + chf(d.g) + ' pro Monat (' + pc(r.red * 100, 2) + ')', 'Deine Miete beruht auf einem Referenzzins von ' + pc(r.base, 2) + ', heute gilt ' + CUR.label + '. Pro Viertelprozent sind das rund 2,9 % weniger Miete.')}
        ${pathHTML('Gegenrechnung', 'warn', '+ ' + chf(d.o) + ' (Schätzung)', 'Der Vermieter darf die Teuerung (' + chf(d.t) + ') und gestiegene Kosten (' + chf(d.k) + ') abziehen. Beides sind Näherungen.')}
        ${kindP}
        ${pathHTML('Danach', '', 'Wenn er ablehnt', 'Der Vermieter hat 30 Tage Zeit für die Antwort. Lehnt er ab oder schweigt er, kannst du innert weiterer 30 Tage die Schlichtungsbehörde anrufen. Das kostet nichts.')}
      </div></details>
      ${FOOTER_BTNS('')}
      ${srcHTML(['bwo', 'verlauf', 'or270a', 'vmwg'])}<p class="foot">Richtwert, keine Zusage, keine Rechtsberatung.</p>`;
    }
    /* Neumieter */
    const n = +W.nw, c = W.canton;
    if (W.oldUnknown) {
      const r = calcInit(0, n, W.start, NOW);
      lastResult = { mode: 'neu', r, o: 0, n, c, missing: true, offer: false }; track('check_complete', 'angabe_fehlt');
      const open = r.future !== null || r.left >= 0;
      return `<h3 data-focus>Eine Angabe fehlt noch: der Vormietzins</h3><p class="lead">Ohne den Mietzins deiner Vormieterin oder deines Vormieters lässt sich die Erhöhung nicht einschätzen.</p>
      <div class="rtop"><div><p class="sub2">${open ? `Die Frist läuft trotzdem: Spätestens am <b>${fdate(r.deadline)}</b> muss ein Gesuch bei der Schlichtungsbehörde sein.` : `Die 30 Tage endeten am ${fdate(r.deadline)}. Eine Anfechtung ist in der Regel nicht mehr möglich.`}</p></div>${open ? ringHTML(r.future !== null ? r.future : r.left, r.future !== null ? 'Tage bis Start' : 'Tage übrig', r.future !== null ? 1 : r.left / 30) : ''}</div>
      <div class="paths">${pathHTML('Formular', '', CNAME[c] + ': Vormietzins', FORM_TXT[formKind(c)])}${pathHTML('Gratis', 'good', 'Vormietzins verlangen', 'Du kannst vom Vermieter verlangen, dass er dir den Mietzins des vorherigen Mietverhältnisses mitteilt (Art. 256a Abs. 2 OR). Frag sofort, damit die 30 Tage reichen.')}</div>
      ${open ? copyBox('reqTxt', 'Anfrage an den Vermieter', 'Sehr geehrte Damen und Herren\n\nGestützt auf Art. 256a Abs. 2 OR bitte ich Sie, mir die Höhe des Mietzinses des vorangegangenen Mietverhältnisses für das Mietobjekt mitzuteilen.\n\nMietobjekt: \n\nFür eine Antwort in den nächsten Tagen danke ich Ihnen.\n\nFreundliche Grüsse\n') : ''}
      <div class="rcta"><button class="btn btn-dark" type="button" data-edit="rents">Vormietzins eingeben</button></div>
      ${noOfferHTML('Erst mit dem Vormietzins lässt sich sagen, ob sich ein Gesuch lohnt.')}
      ${FOOTER_BTNS('', open)}${srcHTML(['or256a', 'or270', 'form'])}<p class="foot">Information, keine Rechtsberatung.</p>`;
    }
    const o = +W.old, r = calcInit(o, n, W.start, NOW);
    const p1 = r.pct === null ? null : Math.round(r.pct * 10) / 10, late = r.left !== null && r.left < 0;
    const offer = p1 >= 10 && !late;
    lastResult = { mode: 'neu', r, o, n, c, offer };
    let verdict, text, cat = 'auffaellig';
    if (p1 >= 10) { verdict = 'Die Erhöhung liegt über etwa 10 %.'; text = 'Das Bundesgericht nutzt etwa 10 % als Richtwert für «erheblich». Ob die Anfechtung trägt, entscheidet der Einzelfall.'; }
    else if (p1 > 0) { verdict = 'Die Erhöhung liegt unter etwa 10 %.'; text = 'Allein wegen der Erhöhung ist eine Anfechtung eher schwierig. Notlage oder Wohnungsmangel können trotzdem ein Grund sein.'; cat = 'eher_schwierig'; }
    else { verdict = 'Keine Erhöhung gegenüber der Vormiete.'; text = 'Der Weg über eine erhebliche Erhöhung (Art. 270 Abs. 1 lit. b OR) fällt damit weg. Notlage oder Wohnungsmangel (lit. a) bleiben möglich. Der Referenzzins-Check kann trotzdem etwas ergeben.'; cat = 'kein_anspruch'; }
    if (late) cat = 'frist_vorbei'; track('check_complete', cat);
    let fr;
    if (r.future !== null) fr = `Dein Mietantritt ist in ${r.future === 1 ? '1 Tag' : r.future + ' Tagen'}. Die Frist von 30 Tagen beginnt dann. Spätestens am <b>${fdate(r.deadline)}</b> muss das Gesuch eingereicht sein.`;
    else if (late) fr = `Die 30 Tage endeten am ${fdate(r.deadline)}. Danach ist eine Anfechtung in der Regel nicht mehr möglich. Ausnahme: Fehlt in einem Formularkanton das amtliche Formular, kann der Mietzins nichtig sein. Frag dazu den Mieterverband oder die Schlichtungsbehörde.`;
    else fr = `Spätestens am <b>${fdate(r.deadline)}</b> muss das Gesuch bei der Schlichtungsbehörde sein. Im Zweifel früher.`;
    const rn = r.future !== null ? r.future : Math.max(0, r.left), rt = r.future !== null ? 'Tage bis Start' : (late ? 'Frist vorbei' : 'Tage übrig');
    const facts = factsHTML([['Kanton', CNAME[c], 'canton'], ['Vormietzins (netto)', chf(o) + ' pro Monat', 'rents'], ['Dein Mietzins (netto)', chf(n) + ' pro Monat', 'rents'], ['Mietantritt', fdate(parseISO(W.start)), 'start']]);
    const diff = n - o;
    return `<h3 data-focus>${late ? 'Die 30 Tage sind vorbei' : offer ? 'Eine Anfechtung kann sich lohnen' : 'Eine Anfechtung ist eher schwierig'}</h3>
      <div class="rtop"><div><div class="big ${(offer) ? 'ok' : 'no'}"><span id="bigN" aria-hidden="true">0</span><span class="sr">${r.pct === null ? '' : pc(r.pct)}</span><small>mehr als die Vormiete</small></div><p class="sub2"><b>${verdict}</b> ${diff > 0 ? 'Das sind ' + chf(diff) + ' pro Monat oder ' + chf(diff * 12) + ' pro Jahr mehr als bei der Vormiete. ' : ''}${text}</p></div>${ringHTML(rn, rt, r.future !== null ? 1 : r.left / 30)}</div>
      <div class="nextstep">${fr}</div>
      ${offer ? offerHTML() : noOfferHTML(late ? 'Die Frist ist abgelaufen, ein Gesuch würde dir kaum helfen.' : 'Unter etwa 10 % Erhöhung ist eine Anfechtung eher schwierig. Für Notlage oder Wohnungsmangel berät dich der Mieterverband besser als eine Vorlage.')}
      ${facts}
      <details class="rmore"><summary>Wie es weitergeht</summary><div class="paths">${pathHTML('Formular', '', CNAME[c] + ': Vormietzins', FORM_TXT[formKind(c)])}${pathHTML('Weg', 'good', 'Schlichtungsbehörde', 'Du reichst ein Gesuch bei der Schlichtungsbehörde ein. Das kostet nichts. Wie stark die Miete am Ende sinkt, legt das Verfahren fest. ' + BEHOERDE)}</div></details>
      ${FOOTER_BTNS('', !late)}
      ${srcHTML(['or270', 'bge', 'form'])}<p class="foot">Information, keine Rechtsberatung.</p>`;
  }

  function icsEvents() {
    const L = lastResult, ev = [];
    if (L && L.mode === 'neu' && L.r && L.r.deadline && (L.r.left >= 0 || L.r.future !== null)) ev.push({ date: L.r.deadline, title: 'Mietklar: Frist für die Anfechtung des Anfangsmietzinses', desc: 'Spätestens heute muss das Gesuch bei der Schlichtungsbehörde sein (30 Tage ab Mietantritt). Information, keine Rechtsberatung.', alarms: ALARMS });
    if (L && L.mode === 'bestand' && L.dl && L.dl.sendBy && L.dl.left >= 0) ev.push({ date: L.dl.sendBy, title: 'Mietklar: Mietzins-Begehren spätestens beim Vermieter', desc: 'Das Begehren um Herabsetzung muss spätestens heute beim Vermieter eintreffen (Kündigungsfrist vor dem Termin). Per Einschreiben, mit Reserve für die Post.', alarms: ALARMS });
    const p = pubDate(); if (p && p >= new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate())) ev.push({ date: p, title: 'Mietklar: Referenzzins-Entscheid des BWO', desc: 'Das BWO gibt den Referenzzinssatz bekannt. Mietzins-Check danach erneut machen.', alarms: ['PT9H'] });
    return ev;
  }
  async function shareLink() {
    const url = location.origin && location.origin !== 'null' ? location.origin + location.pathname : location.href.split('#')[0].split('?')[0];
    const data = { title: 'Mietklar: Zahlst du zu viel Miete?', text: 'Mietzins-Check ohne Konto: Referenzzins, Anfangsmiete und Frist. Deine Eingaben bleiben im Browser.', url };
    track('share_click');
    try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('Link kopiert. Er enthält keine deiner Angaben.'); } catch (e) { toast(url); }
  }
  function bindCommon() {
    $$('#wBody [data-edit]').forEach(b => b.addEventListener('click', () => { if (b.dataset.edit === 'since') W.unknown = false; if (b.dataset.edit === 'rents') W.oldUnknown = false; go(b.dataset.edit); }));
    $$('#wBody [data-copy]').forEach(b => b.addEventListener('click', async () => { const t = $('#' + b.dataset.copy); try { await navigator.clipboard.writeText(t.value); toast('Text kopiert.'); } catch (e) { t.select(); toast('Markiert. Kopiere ihn mit Cmd/Ctrl + C.'); } }));
    $$('#wBody [data-act]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'letter') go('letter');
      if (a === 'ics') { const ev = icsEvents(); if (!ev.length) return toast('Für dieses Ergebnis gibt es keine offene Frist.'); track('ics_download'); downloadICS(ev); }
      if (a === 'share') shareLink();
    }));
  }
  function bindResult(step) {
    bindCommon();
    if (step === 'result') {
      const L = lastResult; const bn = $('#bigN');
      if (bn && L && !L.missing) { if (L.mode === 'bestand') countTo(bn, (L.d && L.d.n) || 0, v => chf(v)); else countTo(bn, L.r.pct === null ? 0 : L.r.pct, v => (L.r.pct > 0 ? '+ ' : '') + pc(v)); }
    }
    if (step === 'letter') {
      if (!lastResult || !lastResult.offer) return;
      track('preview_view', W.mode);
      $$('#wBody [data-f]').forEach(i => { i.addEventListener('input', () => { W[i.dataset.f] = i.value; paintLetter(); }); });
      $$('#wBody input[name=reason]').forEach(r => r.addEventListener('change', () => { W.reason = r.value; paintLetter(); }));
      $('#lBuy').addEventListener('click', buy);
      paintLetter();
    }
  }

  /* ----- Vorschau, Lieferumfang und Kauf ----- */
  function snapshot(order) {
    const L = lastResult, f = {}; PAKET.FIELDS[W.mode].forEach(([k]) => { f[k] = String(W[k] || '').trim(); });
    const base = { mode: W.mode, order: order || 'VORSCHAU', stand: CONFIG.stand, today: isoD(NOW), f };
    if (W.mode === 'bestand') {
      const r = L.r, d = L.d;
      return Object.assign(base, { rent: L.rent, base: r.base, baseSource: W.baseOv === '' ? 'datum' : 'vertrag', since: { m: +W.m, y: +W.y }, steps: r.steps, red: r.red, gross: d.g, teu: d.t, kos: d.k, net: d.n, strict: L.strict, kp: W.kp, kind: W.kind,
        termin: W.termin, terminOpen: !!(L.dl.sendBy && L.dl.left >= 0), frist: +W.frist, sendBy: isoD(L.dl.sendBy), cur: { label: CUR.label, since: CUR.since, next: CUR.next } });
    }
    const r = L.r;
    return Object.assign(base, { old: L.o, nw: L.n, pct: r.pct, start: W.start, deadline: isoD(r.deadline), future: r.future !== null, canton: L.c, cname: CNAME[L.c], formKind: formKind(L.c), reason: W.reason });
  }
  const KEEP = ['mode', 'rent', 'm', 'y', 'baseOv', 'kind', 'kp', 'termin', 'frist', 'canton', 'old', 'nw', 'start', 'reason', 'name', 'street', 'zip', 'lname', 'lstreet', 'lzip', 'obj', 'ort', 'bname', 'bstreet', 'bzip'];
  const store = {
    put(id, s) { const w = {}; KEEP.forEach(k => { w[k] = W[k]; }); const v = JSON.stringify({ s, w }); localStorage.setItem('mk:o:' + id, v); localStorage.setItem('mk:last', id); return localStorage.getItem('mk:o:' + id) === v; },
    get(id) { try { return JSON.parse(localStorage.getItem('mk:o:' + id) || 'null'); } catch (e) { return null; } },
    last() { try { return localStorage.getItem('mk:last'); } catch (e) { return null; } },
    drop(id) { try { localStorage.removeItem('mk:o:' + id); if (localStorage.getItem('mk:last') === id) localStorage.removeItem('mk:last'); } catch (e) {} }
  };
  function letterHTML() {
    const L = lastResult, neu = W.mode === 'neu';
    if (!L || !L.offer) return `<h3 data-focus>Für dieses Ergebnis gibt es kein Dossier</h3><p class="lead">Wir bieten das Dossier nur an, wenn dein Check einen plausiblen Vorteil zeigt.</p><div class="rcta"><button class="btn btn-dark" type="button" data-edit="result">Zurück zum Ergebnis</button></div>`;
    const F = (k, l, p) => `<div class="fld"><label for="l_${k}">${l}</label><input id="l_${k}" data-f="${k}" value="${esc(W[k] || '')}" placeholder="${p}" autocomplete="off" spellcheck="false" autocapitalize="off" maxlength="80"></div>`;
    const PH = { name: 'Vorname Nachname', street: 'Strasse Nr.', zip: '8000 Zürich', lname: 'Name', lstreet: 'Strasse Nr.', lzip: '8000 Zürich', obj: 'Strasse Nr., PLZ Ort', ort: 'Zürich', bname: 'z. B. Schlichtungsbehörde ...', bstreet: 'Strasse Nr.', bzip: 'PLZ Ort' };
    if (neu && !W.reason && L.r && L.r.pct >= 10) W.reason = 'b';
    const fields = PAKET.FIELDS[W.mode].map(([k, l]) => F(k, l, PH[k] || '')).join('');
    const reasons = neu ? `<fieldset class="reasons"><legend>Begründung (wähle, was auf dich zutrifft)</legend><label><input type="radio" name="reason" value="b"${W.reason === 'b' ? ' checked' : ''}> Meine Miete ist deutlich höher als die der Vormieterin oder des Vormieters</label><label><input type="radio" name="reason" value="a"${W.reason === 'a' ? ' checked' : ''}> Ich hatte keine Wahl (persönliche Notlage oder Wohnungsmangel)</label></fieldset>` : '';
    const s = snapshot(), ov = PAKET.overview(s), ck = PAKET.checklist(s);
    const paid = W.paidOrder;
    const sandbox = SERVER && SERVER.provider === 'sandbox';
    return `<h3 data-focus>Vorschau: dein Mietklar Dossier</h3><p class="lead">Trag Namen und Adressen ein. Rechts siehst du genau den Text, der im PDF steht.</p>
    <div class="deliver"><b>PDF mit 3 A4-Seiten:</b> ${neu ? 'Gesuch an die Schlichtungsbehörde' : 'Brief an den Vermieter'} (ohne Mietklar-Logo), Berechnung mit Quellen, Fristenplan für Versand und Antwort.</div>
    <div class="lwrap"><div class="lform">${fields}${reasons}${neu ? '<p class="hint">Die Adresse der Schlichtungsbehörde findest du auf der Website deiner Gemeinde (Suchbegriff «Schlichtungsbehörde Miete»).</p>' : ''}<p class="hint">Alle Felder sind nötig. Deine Angaben bleiben in diesem Browser.</p></div>
    <div class="sheetbox"><div class="sheet locked" id="sheet" aria-label="Vorschau Seite 1"></div></div></div>
    <details class="pv-more"><summary>Vorschau Seite 2: Berechnungsübersicht</summary><table class="mtab"><tbody>${ov.rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('')}</tbody></table></details>
    <details class="pv-more"><summary>Vorschau Seite 3: Fristenplan</summary><ul class="cklist">${ck.map(([t, d]) => `<li><b>${t}</b> ${d}</li>`).join('')}</ul></details>
    <div class="buy">
      <div class="buy-price"><span>Mietklar Dossier</span><b>CHF ${CONFIG.price}.–</b><small>Endpreis, einmalig, kein Abo</small></div>
      <p class="buy-data">Der Zahlungsanbieter erhält nur Bestellnummer, Betrag und Produktname. Deine Angaben bleiben auf diesem Gerät, damit du das PDF später erneut laden kannst. Du kannst sie danach löschen.</p>
      <p class="err" id="lMiss" role="alert" hidden></p><p class="hint" id="lChars" hidden></p>
      <div class="rcta"><button class="btn btn-dark" type="button" id="lBuy" data-track="buy_click">${paid ? 'PDF herunterladen (bereits bezahlt)' : 'Weiter zur Zahlung · CHF ' + CONFIG.price}</button><button class="btn btn-line" type="button" data-act="ics">Frist in den Kalender</button></div>
      ${sandbox ? '<p class="testnote">Testbetrieb: Die Zahlung ist simuliert. Es wird nichts belastet.</p>' : ''}
      <p class="foot">Mit dem Kauf gelten die <a href="bedingungen.html" target="_blank" rel="noopener">Bedingungen</a>. Vorlage zum Selbstversand: Wir versenden nichts, vertreten niemanden und prüfen deinen Einzelfall nicht. Bei Unsicherheit hilft der Mieterverband.</p>
    </div>`;
  }
  function paintLetter() {
    const sh = $('#sheet'); if (!sh) return; sh.textContent = '';
    const b = PAKET.letter(snapshot());
    const blocks = [[b.sender], [['Einschreiben'].concat(b.recipient), 'rcpt']];
    if (b.copy) blocks.push([b.copy, 'small']);
    blocks.push([[b.place]], [[b.subject[0]], 'strong'], [b.subject.slice(1)]); b.body.forEach(t => blocks.push([[t]]));
    blocks.push([[(W.name && W.name.trim()) ? W.name.trim() + ' (Unterschrift)' : '[Unterschrift]'], 'sign']); if (b.enclosures) blocks.push([[b.enclosures], 'small']);
    blocks.forEach(([lines, cls]) => {
      const p = document.createElement('p'); if (cls) p.className = cls;
      lines.forEach((line, j) => { if (j) p.appendChild(document.createElement('br')); String(line).split(/(\[[^\]]+\])/).forEach(part => { if (!part) return; if (/^\[[^\]]+\]$/.test(part)) { const s = document.createElement('span'); s.className = 'ph'; s.textContent = part; p.appendChild(s); } else p.appendChild(document.createTextNode(part)); }); });
      sh.appendChild(p);
    });
    const miss = PAKET.missing(snapshot()), m = $('#lMiss'); if (m && !m.hidden) showMiss(miss);
    const bad = PDF.unsupported(PAKET.FIELDS[W.mode].map(([k]) => W[k] || '').join(' ')), cw = $('#lChars');
    if (cw) { cw.hidden = !bad.length; cw.textContent = bad.length ? 'Hinweis: Das PDF kann ' + bad.join(' ') + ' nicht darstellen. Buchstaben mit Akzent schreibt es ohne Akzent (z. B. č als c), andere Zeichen lässt es weg.' : ''; }
  }
  function showMiss(miss) { const m = $('#lMiss'); if (!m) return; m.hidden = !miss.length; m.textContent = miss.length ? 'Für ein druckfertiges PDF fehlt noch: ' + miss.join(', ') + '.' : ''; }
  async function buy() {
    const s = snapshot(), miss = PAKET.missing(s), btn = $('#lBuy');
    if (miss.length) { showMiss(miss); const k = PAKET.FIELDS[W.mode].find(([, l]) => miss.includes(l)); const el = k ? $('#l_' + k[0]) : $('#wBody input[name=reason]'); if (el) el.focus(); return; }
    if (W.paidOrder) return deliver(W.paidOrder, s, true);
    track('checkout_start', W.mode);
    if (!SERVER || SERVER.provider === 'off') { const d = $('#fd'); if (d && d.showModal) d.showModal(); return; }
    btn.disabled = true; btn.textContent = 'Zahlung wird vorbereitet …';
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: W.mode }) }).then(x => x.ok ? x.json() : null).catch(() => null);
    if (!r) { btn.disabled = false; btn.textContent = 'Weiter zur Zahlung · CHF ' + CONFIG.price; return toast('Die Zahlung konnte nicht gestartet werden. Bitte versuche es nochmals.'); }
    let ok = false; try { ok = store.put(r.order, Object.assign(s, { order: r.order })); } catch (e) { ok = false; }
    if (!ok) { btn.disabled = false; btn.textContent = 'Weiter zur Zahlung · CHF ' + CONFIG.price; return toast('Dein Browser erlaubt keine lokale Speicherung (z. B. privates Fenster). Ohne sie können wir das PDF nach der Zahlung nicht erzeugen.'); }
    location.href = r.pay_url;
  }
  let delivering = false;
  async function deliver(id, s, again) {
    if (delivering) return; delivering = true; try { await deliver0(id, s, again); } finally { setTimeout(() => { delivering = false; }, 800); }
  }
  async function deliver0(id, s, again) {
    const r = await fetch('/api/order/' + id + '/download', { method: 'POST' }).then(async x => ({ code: x.status, j: await x.json().catch(() => ({})) })).catch(() => null);
    if (!r) return toast('Keine Verbindung. Bitte versuche es nochmals.');
    if (r.code === 402) return toast('Diese Bestellung ist noch nicht bezahlt.');
    if (r.code === 429) return toast('Das Download-Limit für diese Bestellung ist erreicht. Melde dich beim Support.');
    if (r.code !== 200) return toast('Der Download ist fehlgeschlagen.');
    const bytes = PAKET.pdf(Object.assign({}, s, { order: id })), blob = new Blob([bytes], { type: 'application/pdf' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'Mietklar-' + (s.mode === 'neu' ? 'Gesuch' : 'Brief') + '-' + id.slice(0, 8) + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    track(again || r.j.downloads > 1 ? 'pdf_redownload' : 'pdf_download', s.mode);
    const c = $('#kDl'); if (c) c.textContent = r.j.downloads + ' von ' + (r.j.downloads + r.j.remaining);
    toast('PDF erstellt. Prüfe es, bevor du unterschreibst.');
  }

  /* ----- Rückkehr von der Zahlungsseite ----- */
  const hiddenPaid = id => { try { return localStorage.getItem('mk:h:' + id) === '1'; } catch (e) { return false; } };
  const hidePaid = id => { try { localStorage.setItem('mk:h:' + id, '1'); } catch (e) {} };
  const once = (id, st) => { try { const k = 'mk:t:' + id + ':' + st; if (localStorage.getItem(k)) return false; localStorage.setItem(k, '1'); return true; } catch (e) { return true; } };
  function restore(saved) { Object.assign(W, saved.w); W.unknown = false; W.oldUnknown = false; SILENT = true; resultHTML(); SILENT = false; }
  async function handleReturn() {
    await serverReady; if (!SERVER) return;
    const q = new URLSearchParams(location.search), fromPay = q.get('order');
    const id = fromPay || store.last(); if (!id || !/^[A-Za-z0-9_-]{16}$/.test(id)) return;
    const o = await fetch('/api/order/' + id).then(x => x.ok ? x.json() : null).catch(() => null); if (!o) return;
    const saved = store.get(id);
    if (!fromPay && o.status !== 'paid') { if (saved && !W.mode) { restore(saved); go('letter', false); } return; }
    if (!fromPay && hiddenPaid(id)) { PAID_LAST = id; if (W.step === 'mode') render('mode'); return; }
    if (fromPay && once(id, o.status)) track(o.status === 'paid' ? 'purchase_success' : o.status === 'failed' ? 'purchase_failed' : 'purchase_cancelled', o.path);
    let h;
    const amt = o.currency + ' ' + o.amount.toFixed(2), meta = `<dl class="kmeta"><div><dt>Bestellung</dt><dd>${esc(id)}</dd></div><div><dt>Betrag</dt><dd>${amt}</dd></div>`;
    if (o.status === 'paid' && saved) h = `<h3 data-focus>Zahlung erfolgreich. Dein Dossier ist bereit.</h3><p class="lead">So geht es weiter:</p><ol class="steps3"><li>PDF herunterladen und prüfen.</li><li>Brief ausdrucken und von Hand unterschreiben.</li><li>${saved.s.mode === 'neu' ? (saved.s.deadline ? 'Gesuch eingeschrieben an die Schlichtungsbehörde senden. Es muss spätestens am <b>' + fdate(parseISO(saved.s.deadline)) + '</b> dort sein.' : 'Gesuch eingeschrieben an die Schlichtungsbehörde senden.') : (saved.s.sendBy ? 'Eingeschrieben an den Vermieter senden. Er muss ihn spätestens am <b>' + fdate(parseISO(saved.s.sendBy)) + '</b> haben.' : 'Eingeschrieben an den Vermieter senden, rechtzeitig vor deinem Kündigungstermin.')}</li></ol>
      <div class="rcta"><button class="btn btn-dark" type="button" id="kGet">PDF herunterladen</button>${(saved.s.sendBy || saved.s.deadline) ? '<button class="btn btn-line" type="button" id="kIcs">Frist in den Kalender</button>' : ''}</div>
      ${meta}<div><dt>Downloads</dt><dd id="kDl">${o.downloads} von ${o.max_downloads}</dd></div></dl>
      <p class="kauf-small">Notiere dir die Bestellnummer. Deine Angaben liegen nur in diesem Browser. <button type="button" class="linkbtn" id="kDrop">Angaben auf diesem Gerät löschen</button> · <button type="button" class="linkbtn" id="kNew">Neuen Check starten</button></p>`;
    else if (o.status === 'paid') h = `<h3 data-focus>Bezahlt. Deine Angaben fehlen in diesem Browser.</h3><p class="lead">Der Brief entsteht in deinem Browser, wir speichern deine Angaben nicht. Fülle den Check noch einmal aus, danach lädst du das PDF ohne erneute Zahlung herunter.</p>${meta}</dl><div class="rcta"><button class="btn btn-dark" type="button" id="kRedo">Angaben neu eingeben</button></div>`;
    else h = `<h3 data-focus>${o.status === 'failed' ? 'Die Zahlung ist fehlgeschlagen.' : o.status === 'cancelled' ? 'Du hast die Zahlung abgebrochen.' : 'Die Zahlung ist nicht abgeschlossen.'}</h3><p class="lead">Es wurde nichts belastet. Deine Angaben sind noch da.</p>${meta}</dl>
      <div class="rcta"><button class="btn btn-dark" type="button" id="kRetry">Erneut zur Zahlung</button>${saved ? '<button class="btn btn-line" type="button" id="kBack">Zurück zur Vorschau</button>' : ''}</div>`;
    W.step = 'kauf'; started = true; wBack.hidden = true; wBar.style.transform = 'scaleX(1)'; wStep.textContent = 'Bestellung';
    wBody.innerHTML = '<div id="kauf">' + h + '</div>';
    const on = (sel, fn) => { const b = $(sel); if (b) b.addEventListener('click', fn); };
    on('#kGet', () => deliver(id, saved.s));
    on('#kDrop', () => { store.drop(id); toast('Angaben auf diesem Gerät gelöscht.'); go('mode'); });
    on('#kNew', () => { hidePaid(id); PAID_LAST = id; go('mode'); });
    on('#kIcs', () => { const s = saved.s, dt = parseISO(s.mode === 'neu' ? s.deadline : s.sendBy); if (!dt) return; track('ics_download'); downloadICS([{ date: dt, title: s.mode === 'neu' ? 'Mietklar: Gesuch muss bei der Schlichtungsbehörde sein' : 'Mietklar: Brief muss beim Vermieter sein', desc: 'Eingeschrieben senden, mit Reserve für die Post. Information, keine Rechtsberatung.', alarms: ALARMS }]); });
    on('#kRedo', () => { W.paidOrder = id; W.mode = o.path; go(FLOW[o.path][1]); });
    on('#kRetry', () => { location.href = '/sandbox/pay?order=' + id; });
    on('#kBack', () => { restore(saved); go('letter'); });
    if (fromPay) { const hh = $('#kauf [data-focus]'); wiz.scrollIntoView({ block: 'start' }); if (hh) { hh.setAttribute('tabindex', '-1'); hh.focus({ preventScroll: true }); } }
  }
  handleReturn();
  /* Zurück aus dem Zahlungsfenster (Seiten-Cache): Knopf wieder freigeben */
  addEventListener('pageshow', e => { if (!e.persisted) return; const b = $('#lBuy'); if (b && b.disabled) { b.disabled = false; b.textContent = 'Weiter zur Zahlung · CHF ' + CONFIG.price; } });

  /* ----- Hero -> Wizard ----- */
  $$('[data-start]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); W.mode = a.dataset.start; track('check_start', W.mode); go(FLOW[W.mode][1]); }));
  $('#hFull').addEventListener('click', () => { W.mode = 'bestand'; const v = money(hR.value); W.rent = v > 0 ? clamp(v, 1, 100000) : ''; W.m = +hM.value; W.y = +hY.value; started = false; go(W.rent ? 'since' : 'rent', false); });

  /* ----- Kantonskarte ----- */
  const kgrid = $('#kgrid'), kinfo = $('#kinfo');
  [...CANTONS].sort((a, b) => GRID[a[0]][1] - GRID[b[0]][1] || GRID[a[0]][0] - GRID[b[0]][0]).forEach(([c, n]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'kt k-' + formKind(c); b.dataset.c = c; b.textContent = c; b.setAttribute('aria-label', c + ', ' + n + ', ' + (formKind(c) === 'full' ? 'Formularpflicht' : formKind(c) === 'part' ? 'Formularpflicht teilweise' : 'keine Formularpflicht'));
    b.style.gridColumn = GRID[c][0] + 1; b.style.gridRow = GRID[c][1] + 1; b.addEventListener('click', () => { syncMap(c); W.canton = c; track('map_click'); }); kgrid.appendChild(b);
  });
  function syncMap(c) {
    $$('.kt', kgrid).forEach(b => { b.setAttribute('aria-pressed', b.dataset.c === c); b.tabIndex = b.dataset.c === c ? 0 : -1; });
    kinfo.innerHTML = `<h3>${esc(CNAME[c])}</h3><p>${FORM_TXT[formKind(c)]}</p><p class="hint">${BEHOERDE} Angaben ohne Gewähr, bitte bei der Behörde prüfen.</p>`;
  }
  syncMap('ZH');
  kgrid.addEventListener('keydown', e => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; const cur = e.target.closest && e.target.closest('.kt'); if (!d || !cur) return; e.preventDefault(); const [cx, cy] = GRID[cur.dataset.c]; let best = null, bd = 1e9; $$('.kt', kgrid).forEach(b => { const [x, y] = GRID[b.dataset.c], dx = x - cx, dy = y - cy, along = dx * d[0] + dy * d[1]; if (b === cur || along <= 0) return; const dist = along * 3 + Math.abs(d[0] ? dy : dx); if (dist < bd) { bd = dist; best = b; } }); if (best) { best.tabIndex = 0; cur.tabIndex = -1; best.focus(); } });

  /* ----- Verlauf-Diagramm mit Zeitmaschine ----- */
  let chartApi = null;
  (function () {
    const svg = $('#chart'), W_ = 1000, H = 380, L = 56, Rr = 972, T = 30, B = 332, x0 = 2008 + 8 / 12, x1 = NOW.getFullYear() + (NOW.getMonth() + 1) / 12 + .05, ylo = 1, yhi = 3.75;
    const X = t => L + (t - x0) / (x1 - x0) * (Rr - L), Y = v => B - (v - ylo) / (yhi - ylo) * (B - T), NS = 'http://www.w3.org/2000/svg';
    const mk = (n, a, parent) => { const e = document.createElementNS(NS, n); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); (parent || svg).appendChild(e); return e; };
    const defs = mk('defs', {}); const g = mk('linearGradient', { id: 'ag', x1: 0, y1: 0, x2: 0, y2: 1 }, defs); mk('stop', { offset: '0', 'stop-color': '#2D7A80', 'stop-opacity': '.28' }, g); mk('stop', { offset: '1', 'stop-color': '#2D7A80', 'stop-opacity': '0' }, g);
    [1, 1.5, 2, 2.5, 3, 3.5].forEach(v => { mk('line', { class: 'gl', x1: L, x2: Rr, y1: Y(v), y2: Y(v) }); mk('text', { class: 'gt', x: L - 12, y: Y(v) + 4, 'text-anchor': 'end' }).textContent = v.toFixed(1).replace('.', ',') + ' %'; });
    for (let yy = 2010; yy <= NOW.getFullYear(); yy += 4) mk('text', { class: 'gt', x: X(yy), y: B + 28, 'text-anchor': 'middle' }).textContent = yy;
    let d = ''; const pts = REF.map(([y, m, r]) => [y + (m - 1) / 12, r]);
    pts.forEach(([t, r], i) => { d += (i ? ` H${X(t).toFixed(1)} V${Y(r).toFixed(1)}` : `M${X(t).toFixed(1)} ${Y(r).toFixed(1)}`); }); d += ` H${X(x1).toFixed(1)}`;
    mk('path', { d: d + ` V${B} H${X(pts[0][0]).toFixed(1)} Z`, fill: 'url(#ag)' });
    const line = mk('path', { class: 'ln', d }); const len = line.getTotalLength ? line.getTotalLength() : 3000;
    line.style.strokeDasharray = len; line.style.strokeDashoffset = reduce ? 0 : len; line.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(.65,0,.35,1)';
    const marks = [[pts[0][0], 3.5, '3,5 % (2008)', 'start', 12, -14], [pts[9][0], 1.25, '1,25 % (2020)', 'middle', 0, 30], [pts[11][0], 1.75, '1,75 % (2023)', 'middle', 0, -16], [pts[13][0], 1.25, 'Heute ' + CUR.label, 'end', -14, 34]];
    const dots = marks.map(([t, v, lab, an, dx, dy], i) => { const c = mk('circle', { class: 'pt' + (i === 3 ? ' now' : ''), cx: X(t), cy: Y(v), r: i === 3 ? 9 : 7 }); c.style.opacity = reduce ? 1 : 0; c.style.transition = 'opacity .6s ease ' + (0.5 + i * .55) + 's'; const tx = mk('text', { class: 'lb', x: X(t) + dx, y: Y(v) + dy, 'text-anchor': an }); tx.textContent = lab; tx.style.opacity = reduce ? 1 : 0; tx.style.transition = 'opacity .6s ease ' + (0.6 + i * .55) + 's'; return [c, tx]; });
    new IntersectionObserver((es, o) => { if (!es[0].isIntersecting) return; o.disconnect(); line.style.strokeDashoffset = 0; dots.flat().forEach(e => e.style.opacity = 1); }, { threshold: .35 }).observe($('#chartBox'));
    /* Zeitmaschine */
    const mv = mk('line', { x1: 0, x2: 0, y1: T - 6, y2: B, stroke: '#F0A073', 'stroke-width': 2, 'stroke-dasharray': '5 5' }), md = mk('circle', { cx: 0, cy: 0, r: 9, fill: '#F0A073', stroke: '#fff', 'stroke-width': 3 });
    const total = (NOW.getFullYear() * 12 + NOW.getMonth() + 1) - (2008 * 12 + 9), rng = $('#tmRange'); rng.max = total;
    function tm() {
      const k = +rng.value, ym = 2008 * 12 + 9 + k - 1, y = Math.floor(ym / 12), m = (ym % 12) + 1, base = refAt(y, m), st = stepsFor(base), red = reduction(st), t = y + (m - 1) / 12;
      mv.setAttribute('x1', X(t)); mv.setAttribute('x2', X(t)); md.setAttribute('cx', X(t)); md.setAttribute('cy', Y(base));
      $('#tmDate').textContent = MONTHS[m - 1] + ' ' + y; const rent = clamp(money($('#hRent').value) || 2100, 100, 100000);
      rng.setAttribute('aria-valuetext', MONTHS[m - 1] + ' ' + y + ', Referenzzins ' + pc(base, 2));
      $('#tmOut').innerHTML = st > 0 ? `Ein Mietzins von ${MONTHS[m - 1]} ${y} beruhte auf <b>${pc(base, 2)}</b>. Heute gilt ${CUR.label}: Senkung <b>${pc(red * 100, 2)}</b>, bei ${chf(rent)} Miete etwa <b>${chf(rent * red)} pro Monat</b>, vor der Gegenrechnung des Vermieters.` : `Ein Mietzins von ${MONTHS[m - 1]} ${y} beruhte auf <b>${pc(base, 2)}</b>. Das entspricht dem heutigen Satz (${CUR.label}): Hier gibt es keinen Anspruch über den Referenzzins.`;
    }
    rng.addEventListener('input', tm); rng.value = Math.max(0, total - 48); tm(); $('#hRent').addEventListener('input', tm);
  })();

  /* ----- Zins-Alarm ----- */
  (function () {
    const p = pubDate(), el = $('#alDays'); if (!p) return; const today = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()), days = Math.round((p - today) / 864e5);
    el.textContent = days >= 0 ? days : '–'; if (days < 0) { $('#alTxt').innerHTML = '<span class="tag"><i></i>Zins-Alarm</span><h2>Die Referenzzins-Publikation ist erfolgt.</h2><p>Prüfe den neuen Stand beim BWO. Dieser Check rechnet erst nach der Nachführung mit dem neuen Satz.</p>'; const ib = $('#alIcs'); if (ib) ib.hidden = true; }
    $('#alIcs').addEventListener('click', () => { track('alarm_ics'); downloadICS([{ date: p, title: 'Mietklar: Referenzzins-Entscheid des BWO', desc: 'Das BWO gibt den Referenzzinssatz bekannt. Mietzins-Check danach erneut machen.', alarms: ['PT9H'] }], 'mietklar-referenzzins.ics'); });
  })();

  go('mode', false); started = false;
  /* Browser-Zurück: jeder Schritt bekommt einen History-Eintrag (ohne Eingabewerte in der URL) */
  history.replaceState({ mk: 'mode' }, ''); booted = true;
  const okStep = st => { if (st === 'mode') return true; if (!flow().includes(st)) return false; if (st === 'result' || st === 'letter') { if (!lastResult || lastResult.mode !== W.mode) return false; if (st === 'letter' && !lastResult.offer) return false; return W.mode === 'bestand' ? +W.rent > 0 : !!(parseISO(W.start) && (+W.old > 0 || W.oldUnknown) && +W.nw > 0); } return true; };
  addEventListener('popstate', e => { const st = e.state && e.state.mk; if (st && okStep(st)) go(st, false, true); else if (st) go('mode', false, true); else if (st === undefined && started) go('mode', false, true); });
