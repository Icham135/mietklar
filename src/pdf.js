  /* =========================================================
     Mini-PDF: erzeugt druckfertige A4-PDFs direkt im Browser.
     Keine Bibliothek, keine Übertragung. Schriften: PDF-Standardschriften
     Helvetica und Helvetica-Bold (WinAnsi), daher keine Einbettung nötig.
     ========================================================= */
  const PDF = (function () {
    const MM = 72 / 25.4, PW = 595.28, PH = 841.89;
    /* Zeichenbreiten Helvetica / Helvetica-Bold (1/1000 em), ASCII 32..126 */
    const WR = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
    const WB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
    /* Unicode -> WinAnsi (CP1252) für die Zeichen, die wir brauchen */
    const MAP = { 0x2019: 0x92, 0x2018: 0x91, 0x201C: 0x93, 0x201D: 0x94, 0x201E: 0x84, 0x2013: 0x96, 0x2014: 0x97, 0x2022: 0x95, 0x2026: 0x85, 0x20AC: 0x80, 0x2212: 0x2D, 0x00A0: 0x20, 0x2009: 0x20, 0x202F: 0x20 };
    const BASE = { 'ä': 'a', 'ö': 'o', 'ü': 'u', 'Ä': 'A', 'Ö': 'O', 'Ü': 'U', 'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'â': 'a', 'ç': 'c', 'ô': 'o', 'î': 'i', 'ï': 'i', 'É': 'E', 'È': 'E', 'À': 'A', 'ß': 'B' };
    /* Zeichen ausserhalb von WinAnsi: ohne Akzent schreiben (č -> c, Ł -> L), sonst weglassen (z. B. Emoji) */
    const XL = { 'Ł': 'L', 'ł': 'l', 'Đ': 'D', 'đ': 'd', 'Ø': 'Ø', 'ı': 'i', 'Ħ': 'H', 'ħ': 'h', 'ŀ': 'l', 'Ŀ': 'L' };
    function translit(ch) {
      if (XL[ch]) return XL[ch];
      const b = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return /^[\x20-\x7e]+$/.test(b) ? b : '';
    }
    function unsupported(s) { const out = new Set(); for (const ch of String(s)) { const c = ch.codePointAt(0); if (!(MAP[c] !== undefined || c >= 32 && c <= 126 || c >= 160 && c <= 255 || c === 10 || c === 9)) out.add(ch); } return [...out]; }
    function enc(s) {
      let o = '';
      for (const ch of String(s)) {
        const c = ch.codePointAt(0);
        if (MAP[c] !== undefined) o += String.fromCharCode(MAP[c]);
        else if (c >= 32 && c <= 126 || c >= 160 && c <= 255) o += ch;
        else if (c === 10 || c === 9) o += ' ';
        else { const t = translit(ch); if (t) o += t; }
      }
      return o;
    }
    function cw(ch, bold) {
      const t = bold ? WB : WR, c = ch.charCodeAt(0);
      if (c >= 32 && c <= 126) return t[c - 32];
      if (BASE[ch]) return cw(BASE[ch], bold);
      if (c === 0xAB || c === 0xBB) return 556;
      if (c === 0x96) return 556; if (c === 0x97) return 1000; if (c === 0x92 || c === 0x91) return bold ? 278 : 222;
      return 556;
    }
    const width = (s, size, bold) => { let w = 0; for (const ch of enc(s)) w += cw(ch, bold); return w * size / 1000; };
    const esc = s => enc(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    function wrap(s, size, maxW, bold) {
      const out = []; String(s).split('\n').forEach(par => {
        let line = ''; par.split(/ +/).forEach(word0 => {
          /* Ein einzelnes Wort, das breiter ist als die Zeile, wird hart getrennt */
          const parts = []; let w = word0;
          while (width(w, size, bold) > maxW && w.length > 1) { let k = w.length - 1; while (k > 1 && width(w.slice(0, k), size, bold) > maxW) k--; parts.push(w.slice(0, k)); w = w.slice(k); }
          parts.push(w);
          parts.forEach((word, pi) => {
          if (pi > 0) { out.push(line); line = ''; }
          const t = line ? line + ' ' + word : word;
          if (width(t, size, bold) <= maxW || !line) line = t; else { out.push(line); line = word; }
          });
        });
        out.push(line);
      });
      return out;
    }
    function Doc(meta) {
      const pages = []; let cur = null;
      const d = {
        W: PW / MM, H: PH / MM,
        page() { cur = []; pages.push(cur); return d; },
        /* Koordinaten in mm, Ursprung oben links; y = Grundlinie */
        text(s, x, y, o) { o = o || {}; const sz = o.size || 10.5; const f = o.bold ? 'F2' : 'F1'; const c = o.color || [0.06, 0.13, 0.15];
          let xx = x * MM; if (o.align === 'right') xx -= width(s, sz, o.bold); if (o.align === 'center') xx -= width(s, sz, o.bold) / 2;
          cur.push(`${c.join(' ')} rg BT /${f} ${sz} Tf ${xx.toFixed(2)} ${(PH - y * MM).toFixed(2)} Td (${esc(s)}) Tj ET`); return d; },
        para(s, x, y, w, o) { o = o || {}; const sz = o.size || 10.5, lead = (o.lead || 1.42) * sz / MM;
          wrap(s, sz, w * MM, o.bold).forEach((ln, i) => d.text(ln, x, y + i * lead, o)); return y + wrap(s, sz, w * MM, o.bold).length * lead; },
        lines(s, size, w, bold) { return wrap(s, size, w * MM, bold).length; },
        line(x1, y1, x2, y2, o) { o = o || {}; cur.push(`${(o.color || [0.75, 0.78, 0.78]).join(' ')} RG ${o.w || 0.6} w ${(x1 * MM).toFixed(2)} ${(PH - y1 * MM).toFixed(2)} m ${(x2 * MM).toFixed(2)} ${(PH - y2 * MM).toFixed(2)} l S`); return d; },
        rect(x, y, w, h, o) { o = o || {}; const op = o.fill ? `${o.fill.join(' ')} rg` : ''; const st = o.stroke ? `${o.stroke.join(' ')} RG ${o.w || 0.6} w` : '';
          cur.push(`${op} ${st} ${(x * MM).toFixed(2)} ${(PH - (y + h) * MM).toFixed(2)} ${(w * MM).toFixed(2)} ${(h * MM).toFixed(2)} re ${o.fill && o.stroke ? 'B' : o.fill ? 'f' : 'S'}`); return d; },
        pageCount: () => pages.length,
        bytes() {
          const objs = []; const add = s => { objs.push(s); return objs.length; };
          const catalog = add(''), pagesId = add(''), f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
          const kids = pages.map(ops => { const content = ops.join('\n'); const cid = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
            return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cid} 0 R >>`); });
          objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
          objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
          const info = add(`<< /Title (${esc(meta && meta.title || 'Mietklar')}) /Producer (Mietklar) /Creator (Mietklar im Browser) >>`);
          let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offs = [];
          objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
          const xref = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
          out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
          const b = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255; return b;
        }
      };
      return d;
    }
    return { Doc, width, wrap, enc, unsupported };
  })();
