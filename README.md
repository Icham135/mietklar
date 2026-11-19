# Mietklar (Arbeitstitel)

Mietzins-Check für Schweizer Mieterinnen und Mieter: kostenlos prüfen, ob der Mietzins sinken kann (Referenzzins) oder die Anfangsmiete anfechtbar ist. Wenn es sich lohnt: Brief-Paket als PDF (Brief, Berechnung, Checkliste).

## Starten
```
python3 server.py          # http://localhost:4360/ , Zahlung im Sandbox-Modus (nichts wird belastet)
```
Ohne Server (Datei direkt öffnen) funktioniert der Check, die Zahlung ist dann deaktiviert.

## Ändern
- Preis, Zahlungsmodus (`sandbox` / `off`): `config.json`, danach `python3 tools/build.py`
- Inhalte: `src/body.html`, Logik: `src/ui.js`, Rechenkern: `src/calc.js`, PDF: `src/pdf.js`, `src/paket.js`
- Seite bauen: `python3 tools/build.py` (erzeugt `index.html` und die Rechtsseiten)

## Testen
```
node tests/calc.test.js && node tests/deadline.test.js && node tests/round2.test.js && node tests/paket.test.js && node tests/server.test.js
```
Browser-Tests brauchen `playwright-core` bzw. `puppeteer-core` (Pfad per Umgebungsvariable), siehe `tests/README.md`.

## Dokumente
- `docs/testbericht-kaufstrecke.md`: Testergebnisse und Lücken
- `docs/kaufweg.md`: Kaufweg an einem Beispiel mit Bildern
- `docs/entscheidungen-gruender.md`: was du entscheiden musst
- `docs/launch-blocker.md`: was vor dem ersten Verkauf fehlt
- `docs/einheitsoekonomie.md`, `docs/nachfrage-test.md`, `docs/metriken.md`: Wirtschaftlichkeit und Messung

Daten: `data/` (Bestellungen ohne Personendaten, Messereignisse) entsteht beim ersten Start.
