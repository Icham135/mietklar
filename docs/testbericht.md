# Testbericht (Stand 19.11.2026)

## Automatische Tests (Node 24, ohne Fremdpakete)
| Suite | Befehl | Ergebnis |
|---|---|---|
| Rechenkern gegen unabhängiges Python-Orakel | `node tests/calc.test.js` | 408 Tests (1502 Einzelfälle), 408 bestanden |
| Fristen und Datumsparser (von Hand gerechnet) | `node tests/deadline.test.js` | 39 Tests, 39 bestanden (auch mit `TZ=UTC`) |

Gefundene und behobene Fehler im Rechenkern: Frist über Winterzeitumstellung einen Tag zu früh (Millisekunden-Rechnung), ungültige Kalendertage (30.2.) wurden still verschoben, nicht numerische Mieten ergaben NaN, Fristberechnung lief bei Terminen ohne Monatsende in den Folgemonat über (jetzt vorsichtig, früherer Tag).

## Manuelle Browser-Tests (Browser-Fenster der App, Chromium-basiert)
Wizard Bestand und Neumieter vollständig, Fehlermeldungen, Zurück-Navigation im Wizard, Browser-Zurück, Brief-Vorschau, XSS-Versuch in Briefschreibfeldern (als Text dargestellt), .ics-Inhalt geprüft, Kantonskarte, Zeitmaschine, Hero-Link mit leerem Feld, Satzwechsel-Monat, Rundungskonsistenz, Handy-Grösse 390 px ohne seitliches Scrollen, Kontraste gerechnet (alle Textpaare ≥ 4,5:1).

## Red-Team-Review (unabhängiger Agent)
Befunde nach Schweregrad: 2 kritisch (Platzhalter in Rechtsseiten, Aussage «vor dem Livegang juristisch geprüft»), 7 hoch, 12 mittel, mehrere niedrig. Behoben im Code und in den Texten: Hero-Link mit CHF 1 Miete, Satzwechsel-Monate, Rundungssummen, veraltete Hero-Zahlen, Fristen-Überlauf, vorbelegtes Mietantrittsdatum, Netto/Brutto-Hinweis zum Brief, zu enge Neumieter-Aussagen, Mieterverband-Vergleich entschärft, «Gratis»-Formulierung, «nichts gesendet» präzisiert, Browser-Zurück und History, aria-live-Dauerfeuer, Slider-Beschriftung, Kontraste, Fokusring, Tap-Ziele, Kantonskarte auf dem Handy, ICS (Oktett-Faltung, TRANSP, Alarm), spellcheck in Briefzeilen. Nicht im Code lösbar: siehe `docs/launch-blocker.md`.

## Nicht ausgeführt
Lighthouse, Playwright, Firefox, Safari/iOS (inkl. .ics-Import), VoiceOver/NVDA, echter Offline-Modus, 200-%-Zoom, 320-px-Breite im echten Gerät, drei volle Durchläufe mit Protokoll. Deshalb sind Lighthouse ≥ 95 und WCAG 2.2 AA **nicht belegt**. Gemessen im Browser-Fenster: Ladezeit lokal rund 110 ms, kein Layout-Sprung, keine langen Tasks.

## Runde 2 (19.11.2026)

**Tests:** `tests/round2.test.js` (346 Tests, Zufall mit festem Seed, Randdaten, DST) laufen identisch in UTC, Europe/Zurich, America/Los_Angeles und Pacific/Auckland. Zusammen mit 408 + 39 Tests: 793 grün. Erster Lauf: 8 Fehlschläge (NaN/Infinity/String-Monat/ungültiges Datum/unendliche Frist). Alle in `src/calc.js` gehärtet.

**Red-Team Runde 2:** 25 Befunde (keiner kritisch, 3 hoch). Behoben: 1 (Brief nennt verpassten Termin), 2 (falsche Dringlichkeit: Kasten nur noch bei Frist ≤ 45 Tage), 3 (Sonderformen grau, kein Brief), 5 (keine vorgewählte Begründung, «werde übernehmen» bei Zukunft), 6 (.ics ohne abgelaufene Frist), 7 (Zahl neutral bei verpasster Frist), 8 (Netto-Labels), 9 (Browser-Zurück/Vorwärts über Modi), 10 (Brief/Erinnerung-Texte), 12 (Zahlen im HTML), 13 (75 %: Bezugsgrösse genannt), 19 (Rundung 10 %), 20 (Singular, Prozentpunkte), 22 (Hero-Beispiel Juli 2023), 24 (Versprechen abgeschwächt).

**Noch offen (Feinschliff):** 4 (Mietverträge vor 9/2008 nur mit Satzwahl bis 3,5 %), 11 (SRI/Selbst-Hosting, siehe Launch-Blocker 4), 14–18 (Barrierefreiheit: Toast-Live-Region, Kartenfokus, aria-invalid, Hero-Fieldset, Slider-valuetext), 21 (Zins-Alarm nach 1.12.), 23 (Preis/Satz fest in FAQ), 25 (HTTP-Header, JSON-LD-Kategorie).

**Browser-Stichprobe:** Staffelmiete zeigt graue Zahl ohne Brief-Button; Zurück/Vorwärts über Modi ohne Fehler; Neumieter-Brief ohne vorgewählte Begründung (Platzhalter).

**Runde 2, Nachtrag (Feinschliff behoben):** 4 (vor 9/2008: ehrliche Absage statt Sackgasse), 14 (Toast-Live-Region fest im DOM), 15 (Karte: geografische DOM-Reihenfolge, ein Tab-Stopp, Pfeiltasten, Name beginnt mit Kürzel), 16 (aria-invalid, aria-describedby, Fokus auf Fehlerfeld), 17 (Hero: Gruppe «Mietzins gilt seit»), 18 (Slider aria-valuetext), 21 (Zins-Alarm-Block nach 1.12. komplett ersetzt), 23 (Preis und Satz in FAQ/JSON-LD aus CONFIG/CUR beim Build), 25 teilweise (Kategorie UtilitiesApplication). Weiter offen: 11 und 25-Header (beim Hosting: SRI, frame-ancestors, X-Content-Type-Options). Tests nach den Änderungen: 408 + 39 + 346 grün; Browser-Stichprobe ohne Konsolenfehler.
