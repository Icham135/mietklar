# Tests fuer src/calc.js

Ausfuehren (nur Node >= 18 und Python 3, keine Pakete):

    node tests/calc.test.js            # Standard-Zeitzone Europe/Zurich
    TZ=UTC node tests/calc.test.js     # andere Zeitzone (Zeitumstellungs-Faelle sind nur fuer Zurich aussagekraeftig)

Exit-Code 0 = alles bestanden, 1 = mindestens ein Fehlschlag.

## Aufbau
- `oracle.py`: unabhaengige Referenzimplementierung nur aus der Spezifikation (Monatsindex, Log-Summe,
  Datums-Ordinalzahlen) plus alle Testfaelle. `python3 tests/oracle.py` gibt sie als JSON aus
  (`-o datei` schreibt in eine Datei). Erwartete Werte stammen nur von hier.
- `calc.test.js`: Mini-Runner. Ruft das Orakel per child_process auf und vergleicht mit `src/calc.js`.
  `now` wird immer explizit als lokales Date uebergeben, nie die Systemzeit (ausser im Robustheitstest
  "ohne now", der nur auf Absturz prueft).
- Gleitkomma-Vergleich mit Toleranz 1e-9 (absolut + relativ).
- Grosse Raster (alle Monate 2008-09..2026-11) sind je Gruppe ein Test.
- Fehleingaben (NaN, undefined, Text, ...) pruefen nur "kein Absturz"; das beobachtete Verhalten wird am
  Ende ausgegeben (nicht spezifiziert, kein Soll).
- `calcRef` liefert kein `cum`-Feld; `cumInflation` wird separat getestet. `deadline` wird als lokaler
  Kalendertag verglichen.

## Kaufstrecke (Runde 3)
    node tests/paket.test.js       # PDF und Brief-Paket
    node tests/server.test.js      # Server, Sandbox-Zahlung, Messung (startet eigenen Server)
    PLAYWRIGHT_CORE=/pfad/playwright-core node tests/e2e.js chromium /pfad/axe.min.js
    PLAYWRIGHT_CORE=/pfad/playwright-core node tests/e2e.js webkit /pfad/axe.min.js
    PUPPETEER_CORE=/pfad/puppeteer-core node tests/e2e-firefox.js
    LH_DIR=/ordner/mit/lighthouse CHROME=/pfad/chrome node tests/lighthouse.mjs
Die Browser-Tests schreiben Protokolle nach docs/testlauf-e2e-*.md und docs/lighthouse.json.
