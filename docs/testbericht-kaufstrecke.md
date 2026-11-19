# Testbericht Kaufstrecke (Runde 3, 19.11.2026)

Alle Zahlen stammen aus dem letzten vollständigen Lauf auf dem finalen Stand (`index.html`, 212'880 Zeichen). Frühere Runden: `docs/testbericht.md`.

## 1. Automatische Tests

| Suite | Befehl | Ergebnis |
|---|---|---|
| Rechenkern gegen Python-Orakel | `node tests/calc.test.js` | 408 / 408 |
| Fristen von Hand gerechnet | `node tests/deadline.test.js` | 39 / 39 |
| Runde 2: Zufall, Randdaten, Zeitumstellung | `TZ=… node tests/round2.test.js` (UTC, Zürich, Los Angeles, Auckland) | je 346 / 346 |
| **Neu:** PDF und Brief-Paket | `node tests/paket.test.js` | 146 / 146 |
| **Neu:** Server, Kaufstrecke, Messung, Sicherheit | `node tests/server.test.js` | 78 / 78 |
| **Summe Unit und API** | | **1'017 / 1'017** (Runde 2 einfach gezählt) |

`paket.test.js` prüft u. a.: gültige PDF-Struktur (xref-Offsets, Stream-Längen, 3 A4-Seiten), Umlaute und Apostroph im PDF, keine Platzhalter im gekauften PDF, jeder Brief-Absatz der Vorschau steht im PDF, Pflichtfelder je Ablauf, Klammer- und Backslash-Injection in Namen, 40 Zufallsfälle.
`server.test.js` prüft u. a.: Preis kommt aus `config.json`, Download vor Zahlung gesperrt (402), Abbruch, Fehler, erneuter Versuch, «bezahlt» ist endgültig, Download nach Neuladen, Download-Limit (429), ungültige Bestellnummern, gesperrte Pfade (`/data`, `/src`, `server.py`), Sicherheits-Header, Server speichert keine Personendaten, Messung lehnt freie Werte und Beträge ab, Modus «Zahlung aus, Messung an».

## 2. Drei Durchläufe mit getrennten Zielen (mobil 375 x 812)

Protokolle mit jedem Schritt: `docs/testlauf-e2e-chromium.md`, `docs/testlauf-e2e-webkit.md`, `docs/testlauf-e2e-firefox.md`.

| Durchlauf | Ziel | Chromium 153 | WebKit 26.6 (iPhone-13-Emulation) | Firefox 160 |
|---|---|---|---|---|
| D1 | Bestand, plausible Senkung → Vorschau → Zahlung schlägt fehl → erneut → bezahlt → **richtiges PDF** → Neuladen → erneuter Download | bestanden | bestanden | bestanden (ohne Fehlversuch) |
| D1b | Zahlungsabbruch → zurück zur Vorschau, Angaben erhalten | bestanden | bestanden | nicht geprüft |
| D2 | a) Bestand ohne Anspruch, b) Neumieterin mit 5 % Erhöhung → klarer Abschluss **ohne Kaufaufruf** | bestanden | bestanden | a) bestanden |
| D3 | a) Datum unbekannt, b) Vormietzins unbekannt → fehlende Angabe, Fundort, nächster Schritt (Anfrage-Text), **kein Kaufaufruf** | bestanden | bestanden | nicht geprüft |
| Tastatur | Ablauf mit Enter und Tab, Fehlerfokus, Pfeiltasten auf der Kantonskarte | bestanden | bestanden | nicht geprüft |
| Prüfungen gesamt | | 65 / 65 | 65 / 65 | 14 / 14 |

Geprüft wird im PDF: Name «Anna Müller», Miete «2’100», neuer Mietzins «1’981», Termin «31. März 2027», Bestellnummer, 3 Seiten, keine Platzhalter. Nach dem Neuladen ist der zweite Download inhaltsgleich, der Zähler steht auf «2 von 20».

## 3. «Rechnung im Browser» gegen die Netzwerkzugriffe

Über alle Durchläufe in Chromium und WebKit aufgezeichnet:
- Angefragte Hosts: **nur der eigene Server**. Keine Google Fonts, kein cdnjs, kein jsDelivr mehr (Schrift, d3, topojson und Weltkarte liegen unter `vendor/`, Lizenzen OFL und ISC in `vendor/licenses/`).
- POST-Anfragen: nur `/api/event`, `/api/checkout`, `/api/sandbox/<id>/…`, `/api/order/<id>/download`.
- **In keiner POST-Anfrage stehen Miete, Name, Adresse oder Strasse** (automatisch geprüft).
- Der Server speichert pro Bestellung nur Nummer, Betrag, Ablauf (bestand/neu), Status, Downloads und Zeitpunkte.
- Das Versprechen stimmt damit für Rechnung und PDF. Einschränkung: Für den erneuten Download speichert der Browser die Angaben lokal (localStorage). Das steht vor der Zahlung auf der Seite und in der Datenschutzerklärung, und es gibt einen Lösch-Button.

## 4. Lighthouse (12.8.2, Chrome for Testing 153, lokal)

Bedingungen: Lighthouse-Standard «mobile», Moto-G-Power-Emulation, simuliertes langsames 4G (150 ms RTT, 1,6 Mbit/s), 4-fache CPU-Drosselung, lokaler Server mit gzip. Wizard und Ergebnisseite sind keine eigenen URLs und wurden als «Snapshot» im selben Ablauf gemessen. Snapshots haben keinen Leistungswert.

| Seite | Leistung | Barrierefreiheit | Best Practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Startseite (3 Läufe) | 100 / 100 / 100 | 100 | 100 | 100 | 1,4 s | 1,7 s | 0 ms | 0 |
| Wizard, erste Frage | – | 100 | 100 | 100 | | | | |
| Ergebnisseite | – | 100 | 100 | 100 | | | | |

Vorher (vor gzip und ohne Dauer-Animation auf dem Handy): Leistung 51, TBT 2'470 ms. Achtung: Gemessen auf localhost ohne echtes Netz. Auf dem echten Hoster entscheidet dessen Kompression und Standort.

## 5. Barrierefreiheit

| Prüfung | Ergebnis | Verbleibende Lücke |
|---|---|---|
| axe-core 4 (WCAG 2.0/2.1/2.2 A und AA) auf Startseite, Ergebnis, Vorschau, «Kein Anspruch», «Angabe fehlt» | 0 Verstösse in Chromium und WebKit (nach Fix: unterstrichene Quellen-Links, Kontrast «Rechenweg anzeigen») | Ein früherer Lauf meldete Kontrast bei Überschriften mitten in der Einblend-Animation. Das ist ein Messzeitpunkt-Effekt, kein Farbproblem |
| Tastatur | Ablauf ohne Maus möglich, Fokus springt auf neue Frage, Fehlerfeld bekommt Fokus und `aria-invalid` | Nur Bestand-Ablauf automatisch geprüft |
| Screenreader | **nicht geprüft** | VoiceOver oder NVDA wurde nicht ausgeführt. axe und Lighthouse ersetzen keinen Screenreader-Test |
| WCAG-Konformität | **nicht belegt** | Ein Lighthouse- oder axe-Wert belegt keine WCAG-Konformität |

## 6. Browser und Geräte

| Ziel | Stand | Lücke |
|---|---|---|
| Chromium | geprüft (E2E, Lighthouse) | – |
| Firefox 160 (installiert) | geprüft über WebDriver BiDi, Kauf bis PDF | Abbruch, D3 und Tastatur nur in Chromium/WebKit |
| Safari | **Engine** geprüft (Playwright-WebKit 26.6) | Das echte Safari wurde nicht gesteuert: `safaridriver` braucht eine Systemeinstellung, die ich nicht ändere |
| iOS | nur iPhone-13-**Emulation** in WebKit | Kein iOS-Simulator (Xcode fehlt), kein echtes Gerät. Download des PDFs und Import der .ics-Datei auf iOS ungeprüft |

## 7. Bekannte Grenzen der Kaufstrecke
- **Sandbox ist kein echter Anbieter.** Ablauf, Status und Rückleitung sind nachgebaut. Webhook-Signaturen, Quittungen, Rückerstattungen und TWINT laufen erst mit einem echten Anbieter.
- **Das PDF entsteht im Browser.** Der Server gibt den Download erst nach Zahlung frei, aber jemand mit Entwickler-Werkzeugen könnte den Code im Browser selbst ausführen. Ein harter Schutz ginge nur mit Erzeugung auf dem Server, und dann müssten Miete und Adressen an den Server. Bewusste Abwägung zugunsten des Datenschutzes, siehe Entscheidungsliste.
- Öffnet jemand den Bestätigungslink in einem anderen Browser, fehlen dort die Angaben. Die Seite sagt das und führt durch die erneute Eingabe ohne zweite Zahlung.
