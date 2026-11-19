# E2E-Protokoll (webkit, iPhone-13-Emulation)

Datum: 2026-11-19T15:43:19.543Z  ·  Server: lokaler Sandbox-Server  ·  Browser: 26.6


## Durchlauf 1: Bestandsmieterin mit plausibler Senkung, bis zum PDF

Ziel: Anna (Netto-Miete CHF 2’100, Mietzins seit Januar 2024, Termin 31.3.2027) kauft das Brief-Paket und öffnet das richtige PDF.

- [D1 Senkung bis PDF] Startseite geladen
- [D1 Senkung bis PDF] OK: Startseite nennt Zielgruppe
- [D1 Senkung bis PDF] OK: Startseite nennt Gratis-Teil
- [D1 Senkung bis PDF] OK: Startseite nennt Preis des Bezahlteils
- [D1 Senkung bis PDF] OK: Haupt-CTA «Mietzins kostenlos prüfen»
- [D1 Senkung bis PDF] OK: Kein horizontales Scrollen (375 px)
- [D1 Senkung bis PDF] axe (Startseite): keine Verstösse in den geprüften Regeln
- [D1 Senkung bis PDF] «Ich wohne schon dort» geklickt
- [D1 Senkung bis PDF] OK: Direkt im Bestandsablauf (Miete-Frage)
- [D1 Senkung bis PDF] OK: Leere Miete: Fehlermeldung
- [D1 Senkung bis PDF] OK: Fehlerfeld fokussiert und markiert
- [D1 Senkung bis PDF] OK: Fokus auf neuer Frage
- [D1 Senkung bis PDF] Angaben: 2100, Januar 2024, Termin 31.3.2027, Frist 3 Monate
- [D1 Senkung bis PDF] OK: Ergebnis zeigt Betrag pro Monat
- [D1 Senkung bis PDF] OK: Ergebnis zeigt Betrag pro Jahr
- [D1 Senkung bis PDF] OK: Ergebnis zeigt Gegenrechnung (3 Szenarien)
- [D1 Senkung bis PDF] OK: Ergebnis zeigt Angaben mit «ändern»
- [D1 Senkung bis PDF] OK: Ergebnis zeigt Datenstand und Primärquelle
- [D1 Senkung bis PDF] OK: Ergebnis zeigt Frist
- [D1 Senkung bis PDF] OK: Kaufangebot sichtbar
- [D1 Senkung bis PDF] axe (Ergebnis): keine Verstösse in den geprüften Regeln
- [D1 Senkung bis PDF] «Vorschau ansehen» geklickt
- [D1 Senkung bis PDF] OK: Vorschau: Lieferumfang genannt
- [D1 Senkung bis PDF] OK: Vorschau: vollständiger Preis
- [D1 Senkung bis PDF] OK: Vorschau: Daten an Zahlungsanbieter genannt
- [D1 Senkung bis PDF] OK: Vorschau: Seite 2 und 3 einsehbar
- [D1 Senkung bis PDF] OK: Kauf ohne Angaben: Hinweis auf fehlende Felder
- [D1 Senkung bis PDF] Absender, Vermieter, Mietobjekt ausgefüllt
- [D1 Senkung bis PDF] OK: Vorschau ohne Platzhalter
- [D1 Senkung bis PDF] axe (Vorschau): keine Verstösse in den geprüften Regeln
- [D1 Senkung bis PDF] Zur Testzahlung weitergeleitet
- [D1 Senkung bis PDF] OK: Zahlungsseite: Betrag
- [D1 Senkung bis PDF] Zahlung schlägt fehl (Test)
- [D1 Senkung bis PDF] OK: Fehlgeschlagene Zahlung: klare Meldung
- [D1 Senkung bis PDF] Erneut zur Zahlung
- [D1 Senkung bis PDF] Mit Testkarte bezahlt
- [D1 Senkung bis PDF] OK: Erfolg: Paket bereit
- [D1 Senkung bis PDF] PDF heruntergeladen: Mietklar-Brief-SnP-48_B.pdf (12003 Bytes)
- [D1 Senkung bis PDF] OK: PDF: gültige Datei
- [D1 Senkung bis PDF] OK: PDF: 3 Seiten
- [D1 Senkung bis PDF] OK: PDF: richtiger Name
- [D1 Senkung bis PDF] OK: PDF: richtige Miete und Senkung (2’100 auf 1’981)
- [D1 Senkung bis PDF] OK: PDF: richtiger Termin
- [D1 Senkung bis PDF] OK: PDF: keine Platzhalter
- [D1 Senkung bis PDF] OK: PDF: richtige Bestellnummer
- [D1 Senkung bis PDF] Seite neu geladen
- [D1 Senkung bis PDF] OK: Neuladen: erneuter Download gleicher Inhalt
- [D1 Senkung bis PDF] OK: Neuladen: Zähler 2 von 20

### Zusatz: Zahlungsabbruch

- [D1b Abbruch] OK: Abbruch: klare Meldung
- [D1b Abbruch] OK: Abbruch: zurück zur Vorschau mit allen Angaben
- [D1b Abbruch] OK: Abbruch: Brief ohne Termin sagt «nächstmöglichen»

## Durchlauf 2: Personen ohne plausiblen Anspruch, bis zu einem verständlichen Abschluss

Ziel a: Bestandsmieter mit Mietzins seit März 2021 (Referenzzins 1,25 %). Ziel b: Neumieterin mit 5 % Erhöhung.

- [D2 kein Anspruch] OK: a) klares «Kein Anspruch»
- [D2 kein Anspruch] OK: a) Begründung mit Satz damals und heute
- [D2 kein Anspruch] OK: a) kein Kaufaufruf
- [D2 kein Anspruch] OK: a) Abschluss ohne Kosten erklärt
- [D2 kein Anspruch] axe (Kein Anspruch): keine Verstösse in den geprüften Regeln
- [D2 kein Anspruch] OK: b) Direkt im Neumieter-Ablauf (Kanton)
- [D2 kein Anspruch] OK: b) Einordnung unter 10 %
- [D2 kein Anspruch] OK: b) kein Kaufaufruf, mit Begründung
- [D2 kein Anspruch] OK: b) Mehrkosten pro Jahr genannt

## Durchlauf 3: Personen mit unvollständigen Angaben, bis zum passenden nächsten Schritt

Ziel a: Bestandsmieter kennt das Datum der letzten Mietzinsfestlegung nicht. Ziel b: Neumieter kennt den Vormietzins nicht.

- [D3 Angaben fehlen] OK: a) nennt fehlende Angabe
- [D3 Angaben fehlen] OK: a) sagt, wo man sie findet
- [D3 Angaben fehlen] OK: a) Spanne je nach Basis
- [D3 Angaben fehlen] OK: a) Anfrage-Text zum Kopieren
- [D3 Angaben fehlen] OK: a) kein Kaufaufruf
- [D3 Angaben fehlen] axe (Angabe fehlt): keine Verstösse in den geprüften Regeln
- [D3 Angaben fehlen] OK: a) «Datum eingeben» führt zur Frage
- [D3 Angaben fehlen] OK: b) Vormietzins-Feld deaktiviert
- [D3 Angaben fehlen] OK: b) nennt fehlenden Vormietzins
- [D3 Angaben fehlen] OK: b) Frist läuft trotzdem, mit Datum
- [D3 Angaben fehlen] OK: b) nächster Schritt: Vormietzins verlangen (Art. 256a OR)
- [D3 Angaben fehlen] OK: b) Formularkanton-Hinweis
- [D3 Angaben fehlen] OK: b) kein Kaufaufruf

## Tastaturbedienung (Bestand, ohne Maus)

- [Tastatur] OK: Enter auf Auswahl startet Ablauf
- [Tastatur] OK: Enter im Feld sendet Formular
- [Tastatur] OK: Tab-Reihenfolge Jahr -> Satz-Auswahl
- [Tastatur] OK: Kantonskarte: Pfeiltaste bewegt Fokus

## Netzwerkzugriffe über alle Durchläufe

- [Netzwerk] Angefragte Hosts: localhost:5068
- [Netzwerk] OK: Nur eigener Server angefragt
- [Netzwerk] OK: Keine Miete/Adresse/Name in POST-Anfragen
- [Netzwerk] POST-Ziele: /api/event, /api/checkout, /api/sandbox/<id>/failed, /api/sandbox/<id>/paid, /api/order/<id>/download, /api/sandbox/<id>/cancelled
- [Netzwerk] OK: Keine JS-Fehler
- [Netzwerk] Trichter nach den Durchläufen: landing_view=11, check_start=7, check_complete=6, preview_view=3, checkout_start=2, purchase_success=1, pdf_download=1
- [Netzwerk] OK: Messung: Kauf und Download gezählt

## Ergebnis: 65 von 65 Prüfungen bestanden

