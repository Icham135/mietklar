# Der Kaufweg an einem Beispiel

**Anna** wohnt in Zürich. Netto-Miete CHF 2’100, Mietzins seit Januar 2024, nächster Kündigungstermin 31.3.2027, Kündigungsfrist 3 Monate. Alle Bilder: Handy, 375 x 812, erzeugt mit `tools/kaufweg.js`.

| # | Schritt | Was Anna sieht | Bild |
|---|---|---|---|
| 1 | Startseite | Für wen (Mieterinnen und Mieter in der Schweiz), was gratis ist (Anspruch, Betrag, Frist) und was kostet (Brief-Paket CHF 39, nur wenn es sich lohnt). Knopf «Mietzins kostenlos prüfen», darunter direkt «Ich wohne schon dort» / «Ich bin neu eingezogen» | `kaufweg/1-startseite.png` |
| 2 | Check (3 Fragen) | Miete, «gilt seit», Kündigungstermin | – |
| 3 | Ergebnis | **CHF 92 pro Monat** nach Gegenrechnung, **CHF 1’104 pro Jahr**, ohne Gegenrechnung CHF 119. Drei Balken: Vermieter rechnet nichts gegen / Schätzung / strenge Gegenrechnung (CHF 77). 42 Tage bis zum Brief (Eingang spätestens 31.12.2026). Ihre Angaben mit «ändern», Datenstand und Links zu BWO, OR und VMWG | `kaufweg/2-ergebnis.png` |
| 4 | Angebot | «Nächster Schritt: Brief-Paket für CHF 39». Erscheint nur, weil die Entlastung im ersten Jahr den Preis übersteigt | `kaufweg/3-angebot.png` |
| 5 | Vorschau | Lieferumfang (3 A4-Seiten: Brief, Berechnung, Checkliste), Felder für Absender, Vermieter und Mietobjekt, der Brief live mit ihren Angaben, Seite 2 und 3 aufklappbar | `kaufweg/4-vorschau-lieferumfang.png`, `kaufweg/5-vorschau-brief.png` |
| 6 | Preis und Daten | CHF 39.00, Endpreis, einmalig. Was an den Zahlungsanbieter geht: nur Bestellnummer, Betrag, Produktname. Hinweis auf lokale Speicherung. «Testbetrieb: nichts wird belastet» | `kaufweg/6-preis-und-daten.png` |
| 7 | Zahlung (Sandbox) | Gehostete Testzahlungsseite: Betrag, Bestellnummer, «Mit Testkarte bezahlen», «Fehlschlagen lassen», «Abbrechen» | `kaufweg/7-zahlung-sandbox.png` |
| 8 | Bestätigung | «Zahlung erfolgreich. Dein Brief-Paket ist bereit.» Bestellnummer, Betrag, Downloads 0 von 20, «PDF herunterladen», «Angaben auf diesem Gerät löschen» | `kaufweg/8-bezahlt.png` |
| 9 | PDF | Seite 1: Brief an die Immo Verwaltung AG, Herabsetzung um 5,66 % auf CHF 1’981 auf den 31. März 2027, ohne Mietklar-Logo. Seite 2: Berechnung mit Quellen. Seite 3: Checkliste mit «spätestens am 31. Dezember 2026» | `kaufweg/beispiel-brief-paket.pdf`, `kaufweg/9-pdf-seite-1.png` bis `-3.png` |

**Abweichungen, die ebenfalls getestet sind:** Zahlung fehlgeschlagen → «nichts belastet», erneut versuchen. Abbruch → zurück zur Vorschau mit allen Angaben. Seite neu laden → Bestätigung erscheint wieder, zweiter Download inhaltsgleich, Zähler «2 von 20».

## Selbst ausprobieren

```
python3 server.py
```
Dann `http://localhost:4360/` öffnen. Die Zahlung ist simuliert, es wird nichts belastet.
