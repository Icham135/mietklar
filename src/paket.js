  /* =========================================================
     Brief-Paket: Brieftext, Berechnungsübersicht, Checkliste.
     Eine Quelle für Vorschau UND PDF: Was du siehst, bekommst du.
     Eingabe ist ein "Snapshot" (nur im Browser), Ausgabe Text bzw. PDF-Bytes.
     ========================================================= */
  const PAKET = (function () {
    const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const p2 = n => String(n).padStart(2, '0');
    const iso2d = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const fd = d => d ? p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear() : '';
    const fdl = d => d ? d.getDate() + '. ' + MON[d.getMonth()] + ' ' + d.getFullYear() : '';
    const n0 = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '’');
    const chf = n => 'CHF ' + n0(n);
    const pc = (p, d = 1) => p.toFixed(d).replace('.', ',') + ' %';
    const SOURCES = {
      bestand: [
        ['Referenzzinssatz (BWO)', 'https://www.bwo.admin.ch/de/referenzzinssatz'],
        ['Verlauf des Referenzzinssatzes (BWO)', 'https://www.bwo.admin.ch/de/entwicklung-referenzzinssatz-und-durchschnittszinssatz'],
        ['Art. 270a OR (Herabsetzungsbegehren)', 'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_270_a'],
        ['Art. 13 und 16 VMWG (Hypothekarzins, Teuerung)', 'https://www.fedlex.admin.ch/eli/cc/1990/835_835_835/de'],
        ['Teuerung und Kostensteigerung (Gerichte Kanton Zürich)', 'https://www.gerichte-zh.ch/de/themen/miete/mietzinsgestaltung/missbrauchskriterien/kostensteigerungen'],
        ['Landesindex der Konsumentenpreise (BFS)', 'https://www.bfs.admin.ch/bfs/de/home/statistiken/preise/landesindex-konsumentenpreise/indexierung.html']],
      neu: [
        ['Art. 270 OR (Anfechtung des Anfangsmietzinses)', 'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_270'],
        ['BGE 147 III 431 (Richtwert etwa 10 %)', 'https://www.servat.unibe.ch/dfr/bge/c3147431.html'],
        ['Formularpflicht nach Kanton (BWO-Verzeichnis)', 'https://www.bwo.admin.ch/dam/de/sd-web/lp4WEVqxdXWN/2026-02-03_D_Verzeichnis%20Formularpflicht%20Anfangsmietzins_Kantonale%20Gesetze%20und%20Leerwohnungsziffer_.pdf'],
        ['Anfechtung des Anfangsmietzinses (Gerichte Kanton Zürich)', 'https://www.gerichte-zh.ch/de/themen/miete/mietzinsgestaltung/anfechtung-des-anfangsmietzinses'],
        ['Art. 113 ZPO (kostenloses Schlichtungsverfahren)', 'https://www.fedlex.admin.ch/eli/cc/2010/262/de#art_113']]
    };
    /* Pflichtfelder für ein druckfertiges PDF */
    const FIELDS = {
      bestand: [['name', 'Dein Name'], ['street', 'Deine Strasse'], ['zip', 'PLZ und Ort'], ['lname', 'Vermieter oder Verwaltung'], ['lstreet', 'Strasse Vermieter'], ['lzip', 'PLZ und Ort Vermieter'], ['obj', 'Mietobjekt (Adresse)'], ['ort', 'Ort für das Datum']],
      neu: [['name', 'Dein Name'], ['street', 'Deine Strasse'], ['zip', 'PLZ und Ort'], ['bname', 'Schlichtungsbehörde'], ['bstreet', 'Strasse Behörde'], ['bzip', 'PLZ und Ort Behörde'], ['lname', 'Vermieter oder Verwaltung'], ['lstreet', 'Strasse Vermieter'], ['lzip', 'PLZ und Ort Vermieter'], ['obj', 'Mietobjekt (Adresse)'], ['ort', 'Ort für das Datum']]
    };
    const missing = s => {
      const m = FIELDS[s.mode].filter(([k]) => !(s.f[k] && String(s.f[k]).trim())).map(([, l]) => l);
      if (s.mode === 'neu' && !s.reason) m.push('Begründung');
      return m;
    };
    const v = (s, k, ph) => (s.f[k] && String(s.f[k]).trim()) ? String(s.f[k]).trim() : '[' + ph + ']';

    /* Brief als Absätze (Liste von Zeilen). strong = Betreff */
    function letter(s) {
      const today = iso2d(s.today), sender = [v(s, 'name', 'Name'), v(s, 'street', 'Strasse Nr.'), v(s, 'zip', 'PLZ Ort')];
      const ort = v(s, 'ort', 'Ort');
      if (s.mode === 'neu') {
        const start = iso2d(s.start);
        const reason = !s.reason ? '[Begründung wählen]' : s.reason === 'b'
          ? 'Der Mietzins wurde gegenüber dem Vormietzins erheblich erhöht (Art. 270 Abs. 1 lit. b OR).'
          : 'Ich war wegen einer persönlichen oder familiären Notlage oder wegen der Verhältnisse auf dem örtlichen Markt für Wohnräume zum Vertragsabschluss gezwungen (Art. 270 Abs. 1 lit. a OR).';
        return {
          sender, recipient: [v(s, 'bname', 'Schlichtungsbehörde'), v(s, 'bstreet', 'Strasse Nr.'), v(s, 'bzip', 'PLZ Ort')],
          copy: ['Kopie an: ' + v(s, 'lname', 'Vermieter oder Verwaltung') + ', ' + v(s, 'lstreet', 'Strasse Nr.') + ', ' + v(s, 'lzip', 'PLZ Ort')],
          place: ort + ', ' + fd(today),
          subject: ['Gesuch um Anfechtung des Anfangsmietzinses (Art. 270 OR)', 'Mietobjekt: ' + v(s, 'obj', 'Adresse des Mietobjekts')],
          body: [
            'Sehr geehrte Damen und Herren',
            (s.future ? 'Ich werde die Wohnung am ' + fdl(start) + ' übernehmen.' : 'Ich habe die Wohnung am ' + fdl(start) + ' übernommen.') +
              ' Der vereinbarte Nettomietzins beträgt ' + chf(s.nw) + ' pro Monat. Der Vormietzins betrug ' + chf(s.old) + ' pro Monat' + (s.pct !== null ? ' (Erhöhung ' + pc(s.pct) + ')' : '') + '.',
            'Ich fechte den Anfangsmietzins an und beantrage dessen Herabsetzung auf einen nicht missbräuchlichen Betrag. ' + reason,
            'Ich bitte um Ansetzung einer Schlichtungsverhandlung.',
            'Freundliche Grüsse'],
          enclosures: 'Beilagen: Kopie des Mietvertrags' + (s.formKind !== 'none' ? ', amtliches Formular zum Anfangsmietzins (falls erhalten)' : '')
        };
      }
      const termin = iso2d(s.termin);
      const when = s.terminOpen && termin ? 'auf den Kündigungstermin vom ' + fdl(termin) : 'auf den nächstmöglichen Kündigungstermin';
      return {
        sender, recipient: [v(s, 'lname', 'Vermieter oder Verwaltung'), v(s, 'lstreet', 'Strasse Nr.'), v(s, 'lzip', 'PLZ Ort')], copy: null,
        place: ort + ', ' + fd(today),
        subject: ['Begehren um Herabsetzung des Mietzinses (Art. 270a OR)', 'Mietobjekt: ' + v(s, 'obj', 'Adresse des Mietobjekts')],
        body: [
          'Sehr geehrte Damen und Herren',
          'Der Nettomietzins für das oben genannte Mietobjekt beträgt zurzeit ' + chf(s.rent) + ' pro Monat. Er beruht auf einem hypothekarischen Referenzzinssatz von ' + pc(s.base, 2) + '. Der aktuelle Referenzzinssatz beträgt seit dem ' + s.cur.since + ' ' + s.cur.label + '.',
          'Gestützt auf Art. 270a OR verlange ich die Herabsetzung des Nettomietzinses um ' + pc(s.red * 100, 2) + ' auf ' + chf(s.rent - s.gross) + ' pro Monat, ' + when + '.',
          'Ich bitte Sie, innert 30 Tagen schriftlich Stellung zu nehmen. Falls Sie der Herabsetzung nicht oder nicht vollständig zustimmen, bitte ich um eine schriftliche Begründung samt Berechnung. Ich behalte mir vor, die Schlichtungsbehörde anzurufen.',
          'Freundliche Grüsse'],
        enclosures: null
      };
    }

    /* Berechnungsübersicht als Zeilen [Bezeichnung, Wert] */
    function overview(s) {
      if (s.mode === 'neu') {
        const start = iso2d(s.start), dl = iso2d(s.deadline);
        return {
          title: 'Berechnungsübersicht: Anfangsmietzins',
          rows: [['Vormietzins (netto)', chf(s.old) + ' pro Monat'], ['Dein Anfangsmietzins (netto)', chf(s.nw) + ' pro Monat'],
            ['Erhöhung', s.pct === null ? 'nicht berechenbar' : pc(s.pct) + ' (' + chf(s.nw - s.old) + ' pro Monat, ' + chf((s.nw - s.old) * 12) + ' pro Jahr)'],
            ['Einordnung', s.pct >= 9.95 ? 'über dem Richtwert von etwa 10 % für «erheblich» (BGE 147 III 431)' : 'unter dem Richtwert von etwa 10 %'],
            ['Mietantritt', fdl(start)], ['Frist für das Gesuch (30 Tage)', 'spätestens ' + fdl(dl)],
            ['Kanton', s.cname + (s.formKind === 'full' ? ' (Formularpflicht)' : s.formKind === 'part' ? ' (Formularpflicht teilweise)' : ' (keine Formularpflicht)')]],
          notes: ['Das Gesetz nennt keine Prozentzahl. Das Bundesgericht verwendet etwa 10 % als Richtwert für «erheblich». Über den Erfolg entscheidet die Schlichtungsbehörde oder das Gericht im Einzelfall.',
            'Was die Herabsetzung am Ende ausmacht, legt das Verfahren fest. Mietklar nennt dafür keinen Betrag.']
        };
      }
      return {
        title: 'Berechnungsübersicht: Referenzzins-Senkung',
        rows: [['Dein Nettomietzins heute', chf(s.rent) + ' pro Monat'], ['Mietzins gilt seit', MON[s.since.m - 1] + ' ' + s.since.y],
          ['Referenzzins damals', pc(s.base, 2) + (s.baseSource === 'vertrag' ? ' (laut deinem Vertrag)' : ' (aus dem BWO-Verlauf)')],
          ['Referenzzins heute', s.cur.label + ' (seit ' + s.cur.since + ')'], ['Unterschied', s.steps + ' Schritte zu 0,25 Prozentpunkten'],
          ['Senkung nach Rechenpraxis', pc(s.red * 100, 2) + ' = ' + chf(s.gross) + ' pro Monat'],
          ['Gegenrechnung Teuerung (Schätzung)', '– ' + chf(s.teu) + ' pro Monat'], ['Gegenrechnung Kosten (Schätzung)', '– ' + chf(s.kos) + ' pro Monat'],
          ['Geschätzt nach Gegenrechnung', chf(s.net) + ' pro Monat, ' + chf(s.net * 12) + ' pro Jahr'],
          ['Was der Brief verlangt', 'volle Senkung auf ' + chf(s.rent - s.gross) + ' pro Monat']],
        scen: [['Vermieter rechnet nichts gegen', s.gross], ['Unsere Schätzung (Kostenpauschale ' + pc(s.kp, 2) + ' pro Jahr)', s.net], ['Strenge Gegenrechnung (Kostenpauschale 0,50 % pro Jahr)', s.strict]],
        notes: ['Formel: Senkung = 1 − 1 / (1 + 3 % × Schritte). Teuerung: 40 % der Steigerung des Landesindex seit ' + MON[s.since.m - 1] + ' ' + s.since.y + ', vereinfacht mit Jahresmitteln.',
          'Der Vermieter kann weitere Gründe vorbringen, etwa Quartierüblichkeit oder Rendite. Die Beträge sind Schätzungen, keine Zusage.']
      };
    }

    function checklist(s) {
      if (s.mode === 'neu') {
        const dl = iso2d(s.deadline);
        return [
          ['Gesuch prüfen', 'Stimmen Namen, Adressen, Beträge und das Datum des Mietantritts?'],
          ['Formular der Behörde prüfen', 'Viele Schlichtungsbehörden bieten ein eigenes Formular an. Schau auf der Website deiner Behörde nach. Du kannst dieses Gesuch auch als Grundlage dafür nutzen.'],
          ['Unterschreiben und Beilagen dazulegen', 'Kopie des Mietvertrags' + (s.formKind !== 'none' ? ' und, falls du es erhalten hast, das amtliche Formular zum Anfangsmietzins.' : '.')],
          ['Rechtzeitig einreichen', 'Spätestens am ' + fdl(dl) + ' muss das Gesuch bei der Schlichtungsbehörde sein (30 Tage ab Mietantritt). Am besten per Einschreiben und mit einigen Tagen Reserve.'],
          ['Kopie behalten', 'Gesuch, Beilagen und Einschreibebeleg aufbewahren.'],
          ['Miete weiter voll bezahlen', 'Bis zu einem Entscheid zahlst du den vereinbarten Mietzins.'],
          ['Hilfe holen, wenn nötig', 'Der Mieterverband oder die Schlichtungsbehörde beraten dich. Das Schlichtungsverfahren ist gerichtskostenfrei (Art. 113 ZPO).']];
      }
      const sb = iso2d(s.sendBy);
      return [
        ['Brief prüfen', 'Stimmen Namen, Adressen, Mietobjekt und Betrag?'],
        ['Unterschreiben', 'Von Hand unterschreiben. Stehen mehrere Personen im Mietvertrag, frag beim Mieterverband nach, ob alle unterschreiben sollen.'],
        ['Per Einschreiben senden', s.terminOpen && sb ? 'Der Brief muss spätestens am ' + fdl(sb) + ' beim Vermieter eintreffen (vor Beginn der Kündigungsfrist zum Termin vom ' + fdl(iso2d(s.termin)) + '). Plane einige Tage Reserve für die Post ein.' : 'Den nächsten Kündigungstermin und die Kündigungsfrist findest du im Mietvertrag. Der Brief muss vor Beginn der Kündigungsfrist beim Vermieter eintreffen.'],
        ['Kopie behalten', 'Brief und Einschreibebeleg aufbewahren.'],
        ['30 Tage auf Antwort warten', 'Der Vermieter hat 30 Tage Zeit, schriftlich Stellung zu nehmen.'],
        ['Bei Ablehnung: Schlichtungsbehörde', 'Lehnt er ab, stimmt er nur teilweise zu oder antwortet er nicht, kannst du innert 30 Tagen die Schlichtungsbehörde anrufen (Art. 270a Abs. 2 OR). Das Verfahren ist gerichtskostenfrei (Art. 113 ZPO).'],
        ['Miete weiter voll bezahlen', 'Die Senkung gilt erst ab dem Kündigungstermin. Bis dahin zahlst du den bisherigen Mietzins.']];
    }

    /* ----- PDF ----- */
    function pdf(s) {
      const D = PDF.Doc({ title: s.mode === 'neu' ? 'Mietklar Gesuch Anfangsmietzins' : 'Mietklar Begehren Mietzinssenkung' });
      const L = 25, Wd = 160, ink2 = [0.27, 0.34, 0.33], lake = [0.17, 0.45, 0.47];
      /* Seite 1 ist der Brief an den Empfänger: bewusst ohne Mietklar-Fusszeile. Seiten 2 und 3 sind für dich. */
      const foot = (n) => { if (n === 1) return; D.line(L, 282, L + Wd, 282); D.text('Mietklar · Bestellung ' + s.order + ' · Beiblatt ' + (n - 1) + ' von 2 (nicht versenden)', L, 287, { size: 8, color: ink2 }); D.text('Information und Vorlage, keine Rechtsberatung. Stand ' + s.stand, L, 291, { size: 8, color: ink2 }); };
      /* Seite 1: Brief */
      const b = letter(s); D.page();
      let sy = 20; b.sender.forEach(t => { sy = D.para(t, L, sy, 85, { size: 9.5, lead: 1.37 }); });
      D.text('Einschreiben', 118, Math.max(45, sy + 4), { size: 8.5, bold: true });
      let ry = Math.max(51, sy + 10); b.recipient.forEach(t => { ry = D.para(t, 118, ry, 67, { size: 10.5, lead: 1.35 }); });
      let y = Math.max(82, ry + 8); if (b.copy) { y = D.para(b.copy[0], L, y, Wd, { size: 9, color: ink2 }) + 2; }
      D.text(b.place, L, y + 4); y += 16;
      b.subject.forEach((t, i) => { y = D.para(t, L, y, Wd, { size: 11, bold: i === 0, lead: 1.39 }); }); y += 6;
      b.body.forEach((p, i) => { y = D.para(p, L, y, Wd, { size: 10.5 }) + (i === b.body.length - 1 ? 0 : 3.2); });
      y += 18; D.line(L, y, L + 70, y, { color: [0.4, 0.45, 0.45] }); D.text(v(s, 'name', 'Name') + ' (Unterschrift)', L, y + 4.6, { size: 9, color: ink2 });
      if (b.enclosures) D.para(b.enclosures, L, y + 14, Wd, { size: 9, color: ink2 });
      foot(1);
      /* Seite 2: Berechnung */
      const o = overview(s); D.page(); D.text(o.title, L, 24, { size: 16, bold: true }); D.text('Grundlage für deinen Brief. Behalte diese Seite für dich, sie gehört nicht in den Versand.', L, 31, { size: 9.5, color: ink2 });
      y = 42; o.rows.forEach(([k, val], i) => { const h = Math.max(D.lines(k, 10, 70, true), D.lines(val, 10, 86)) * 4.8 + 3.4; if (i % 2 === 0) D.rect(L, y - 4.6, Wd, h, { fill: [0.95, 0.96, 0.95] }); D.para(k, L + 2, y, 70, { size: 10, bold: true }); D.para(val, L + 72, y, 86, { size: 10 }); y += h; });
      if (o.scen) {
        y += 6; D.text('So wirkt die Gegenrechnung', L, y, { size: 12, bold: true }); y += 7;
        const mx = Math.max(o.scen[0][1], 1);
        o.scen.forEach(([k, val]) => { D.text(k, L, y, { size: 9.5 }); D.text(chf(val) + ' pro Monat', L + Wd, y, { size: 9.5, bold: true, align: 'right' }); D.rect(L, y + 1.6, Wd, 2.4, { fill: [0.9, 0.92, 0.91] }); D.rect(L, y + 1.6, Math.max(0.8, Wd * Math.max(0, val) / mx), 2.4, { fill: lake }); y += 10; });
      }
      y += 4; o.notes.forEach(t => { y = D.para(t, L, y, Wd, { size: 9, color: ink2 }) + 2; });
      y += 4; D.text('Quellen und Datenstand', L, y, { size: 12, bold: true }); y += 6;
      y = D.para('Rechtsgrundlagen und Zahlen: Stand ' + s.stand + (s.mode === 'bestand' ? '. Referenzzinssatz ' + s.cur.label + ' seit ' + s.cur.since + ', nächste Publikation am ' + s.cur.next + '.' : '.'), L, y, Wd, { size: 9 }) + 1.5;
      SOURCES[s.mode].forEach(([t, u]) => { y = D.para(t + ': ' + u, L, y, Wd, { size: 8.2, color: ink2 }) + 0.8; });
      foot(2);
      /* Seite 3: Checkliste */
      D.page(); D.text('Versand- und Fristencheckliste', L, 24, { size: 16, bold: true }); D.text('Hake ab, was erledigt ist.', L, 31, { size: 9.5, color: ink2 });
      y = 44; checklist(s).forEach(([t, d]) => { D.rect(L, y - 3.8, 4.6, 4.6, { stroke: [0.06, 0.17, 0.2], w: 0.9 }); D.text(t, L + 9, y, { size: 11, bold: true }); y = D.para(d, L + 9, y + 5.4, Wd - 9, { size: 9.8, color: ink2 }) + 5; });
      y += 4; D.para('Mietklar versendet nichts, vertritt niemanden und prüft deinen Einzelfall nicht. Fristen und Formvorschriften liegen in deiner Verantwortung. Bei Unsicherheit helfen der Mieterverband, die Schlichtungsbehörde oder eine Anwältin bzw. ein Anwalt.', L, y, Wd, { size: 9, color: ink2 });
      foot(3);
      return D.bytes();
    }
    return { letter, overview, checklist, missing, pdf, FIELDS, SOURCES };
  })();
  if (typeof module !== 'undefined') module.exports = Object.assign(module.exports || {}, { PDF, PAKET });
