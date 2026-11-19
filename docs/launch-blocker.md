# Launch-Blocker (vor dem ersten echten Verkauf)

Stand 19.11.2026. Erledigt seit der letzten Runde: Schrift und Skripte selbst gehostet, Kaufstrecke technisch geschlossen (Sandbox), Lighthouse, Firefox und WebKit geprüft, Platzhalter aus Bedingungen und Datenschutz entfernt.

| # | Blocker | Warum | Wer |
|---|---|---|---|
| 1 | **Betreiberangaben** im Impressum (Name, Adresse, E-Mail, UID) | Pflicht nach UWG, Zahlungsanbieter und Meta verlangen sie | Gründer |
| 2 | **Juristische Freigabe** von Rechenlogik, Briefvorlagen, Bedingungen und Datenschutzerklärung | Nicht erfolgt. Die Seite behauptet das auch nirgends | Mietrechtsanwalt oder -anwältin |
| 3 | **Echter Zahlungsanbieter**: Freigabe von Preis und Anbieter, Zugangsdaten, Adapter in `server.py` mit Webhook-Prüfung | Heute nur Sandbox | Gründer, dann Entwicklung |
| 4 | **Hosting** mit HTTPS, gzip, Sicherheits-Headern (wie `server.py`) und dauerhaftem Speicher für `data/` | Lokal getestet, nicht deployt | Gründer |
| 5 | Name und Marke prüfen (Domain, Zefix, Swissreg), «(Arbeitstitel)» entfernen | Mögliche Namenskollision | Gründer |
| 6 | Referenzzins nach der BWO-Publikation vom 1.12.2026 nachführen (`CUR`, `REF` in `src/calc.js`; `stand`, `nextPubISO` in `src/ui.js`) | Sonst falscher Stand im Ergebnis und im PDF | Gründer |
| 7 | BWO-Formularpflicht-Liste gegen das aktuelle Verzeichnis prüfen | Bestimmt die Aussage zur Nichtigkeit | Gründer |
| 8 | Screenreader-Test (VoiceOver, NVDA) und Test auf echtem iPhone (PDF-Download, .ics) | Nicht ausgeführt, siehe Testbericht | QA |
| 9 | og:image, canonical, og:url | Teilen-Vorschau, SEO | Gründer |
| 10 | Anzeigentexte prüfen: keine Ansprache finanzieller Verhältnisse, kein «gratis Brief» | Konto-Sperrrisiko bei Meta | Gründer |

## Bewusst offen
- Teuerung mit Jahresmitteln (Näherung). Ab 2027 `INF` in `src/calc.js` pflegen.
- «Heute» wird beim Laden bestimmt. Bleibt die Seite über Mitternacht offen, veralten Fristen um einen Tag.
- PDF-Erzeugung im Browser: kein harter Kopierschutz (Entscheid 3 in der Entscheidungsliste).
