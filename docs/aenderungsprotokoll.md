# Änderungsprotokoll v1 → v2

**Neu**
- Geführter Wizard statt Tabs (Funnel-Weiche «schon dort / gerade eingezogen», eine Frage pro Bildschirm, Zurück, Fortschritt, Fehlermeldungen, Fokusführung).
- Ergebnis-Screen mit Zahl, Frist-Uhr, Netto-Waage (Senkung vs. Gegenrechnung), Warte-Hinweis, ehrlichem «Kein Anspruch».
- Live-Briefvorschau mit Wasserzeichen für Bestandsmieter (Art. 270a OR) und Neumieter (Art. 270 OR), Druckstil für PDF, Fake-Door für den bezahlten Export.
- Kalenderdatei (.ics) lokal erzeugt, Erinnerungen 7 und 2 Tage vorher.
- Referenzzins-Zeitmaschine (Regler über den Verlauf), Kantonskarte (Kachel-Karte mit Formularpflicht), Zins-Alarm-Karte mit Countdown, ehrlicher Vergleich Allein / Mietklar / Mieterverband, Teilen-Funktion ohne Eingabedaten.
- Verlustbild-Abschnitt (ZKB-Schätzungen mit Quelle), Trust-Leiste mit Textquellen.
- 14 FAQ-Einträge mit Schema.org-FAQPage, WebApplication, Organization. Open-Graph-/Twitter-Meta, CSP, Referrer-Policy.
- Rechtsseiten als klar gekennzeichnete Entwürfe, Skip-Link, noscript-Hinweis.
- Cookielose Ereigniszählung (lokal), `CONFIG` für alle Gründer-Entscheidungen.
- Globus-Bibliotheken (d3, topojson) werden erst geladen, wenn die Story in Sichtweite kommt.

**Korrigiert (Fehler aus den Tests)**
- Frist-Datum war über die Winterzeitumstellung um einen Tag zu früh (Millisekunden-Rechnung). Jetzt Kalendertage.
- Ungültige Kalenderdaten (30.2., 31.11.) wurden still verschoben. Jetzt als ungültig abgelehnt.
- Negative oder nicht numerische Mieten führen nicht mehr zu NaN, sondern zu 0.
- Verwaiste CSS-Regeln der Warteliste entfernt, toter Button «Ansehen» ersetzt.
- Rechenkern in `src/calc.js` ausgelagert, per Node testbar.

**Bekannte Grenzen**
- Brief-Export und Bezahlung sind nicht aktiv (Fake-Door).
- Teuerung (Jahresmittel) und Kostenpauschale sind Näherungen.
- Externe Schrift und Skripte (Google Fonts, cdnjs, jsDelivr) sind noch nicht selbst gehostet.

## Nachtrag nach Fakten- und Red-Team-Prüfung (19.11.2026)
- Kostenpauschale Standard von 0,5 % auf 0,25 % pro Jahr gesenkt (Zürcher Schlichtungsbehörden), Regler 0 bis 1 %, Texte erklären, dass es keinen amtlichen Richtwert gibt.
- Die 3-%-Regel wird als Rechenpraxis erklärt (das Gesetz nennt sie für Erhöhungen). 10 %-Schwelle als Bundesgerichts-Richtwert, Vermutung der Missbräuchlichkeit erst bei deutlich mehr.
- Frist bei Nichtantwort des Vermieters: 30 plus 30 Tage (Art. 270a OR).
- Referenzzins-Basis: In Monaten mit Satzwechsel muss der Satz laut Vertrag gewählt werden.
- Beträge werden konsistent gerundet, Brief fordert die volle Senkung und die Seite sagt es.
- Mieterverband-Vergleich entschärft, Quellenlinks bei Zahlen, «Gratis» präzisiert, «geplant» statt «Testpreis», kein vorbelegtes Mietantrittsdatum.
- Barrierefreiheit und Mobil: aria-live entfernt, Screenreader-Werte, Kontraste, Fokusring, Tap-Ziele, Kantonskarte.
- Launch-Blocker in `docs/launch-blocker.md`.

## 19.11.2026 – Runde 2
- calc.js gehärtet (Zahlen erzwingen, Endlichkeit, Obergrenze).
- ui.js: Brief-Termin nur bei offener Frist; Dringlichkeitskasten nur bei Frist ≤ 45 Tage; Sonderformen ohne Brief; keine vorgewählte Begründung; .ics nur offene Fristen; popstate-Guard; Netto-Labels; Rundung 10 %-Schwelle; Singular.
- body.html/build.py: Texte «Briefvorschau», «einschätzen», 75 %-Bezugsgrösse, Erinnerung gratis, echte Zahlen im HTML.

## 19.11.2026 – Runde 3: Kaufstrecke
- Startseite: Zielgruppe, Gratis-Teil und Preis im Hero, Einstieg «Mietzins kostenlos prüfen», Direktlinks je Ablauf.
- Ergebnis: Monat und Jahr, drei Gegenrechnungs-Szenarien, «Deine Angaben» mit «ändern», Datenstand und Primärquellen. Kaufangebot nur bei plausiblem Vorteil (Entlastung im ersten Jahr > Preis).
- Unvollständige Angaben: «Ich weiss es nicht genau» (Bestand) und «Vormietzins unbekannt» (Neu) mit Fundort und Anfrage-Text.
- Brief-Paket: PDF (Brief, Berechnung, Checkliste) im Browser erzeugt, Vorschau = Lieferung, Lieferumfang, Preis, Datenhinweis.
- server.py: Sandbox-Zahlung (Erfolg, Fehler, Abbruch), Download-Freigabe, erneuter Download, Messung ohne Personendaten, Modus «off», gzip, Sicherheits-Header.
- Schrift, d3, topojson, Weltkarte selbst gehostet (vendor/). Keine Drittanbieter-Anfragen mehr.
- Datenschutz und Bedingungen ohne Platzhalter neu geschrieben (juristisch ungeprüft). Impressum bleibt Platzhalter (Launch-Blocker).

## Runde 4 (19.11.2026): Design, Texte, Funktionsfehler

Drei Prüfungen parallel (Design, Bedienung und Texte, Funktion). Umgesetzt:

- **Seite halbiert:** auf dem Handy 12'900 statt 22'300 px. Der Check steht direkt unter dem Hero. Gestrichen wurden der zweite Zahlenblock, die Zeitleiste, drei von sechs Einwänden, sieben von fünfzehn FAQ und das Formular «Zins-Alarm» (es bleibt der Kalender-Termin). Die Story ist kürzer.
- **Hero:** zwei Zeilen Titel, ein Satz, ein Knopf. Der Schnell-Check ist auf dem Handy ausgeblendet, weil er den Wizard doppelte.
- **Ruhigere Gestaltung:** kleinere Abschnittsüberschriften ohne Farbakzent und weniger Etiketten. Dazu ein gestalteter Regler, neutrale Badges, ein lesbares Wasserzeichen und mobil einspaltige Felder.
- **Ergebnis:** oben Betrag, Jahresbetrag, Frist und ein Angebot. Rechenweg und Szenarien liegen unter «So haben wir gerechnet». Die Verlust-Box ist gestrichen.
- **Begriffe:** Der Referenzzins wird in Alltagssprache erklärt. Der Schrittzähler zeigt «Frage x von 4».
- **Nach dem Kauf:** drei Schritte mit Versanddatum und Kalender-Knopf.
- **Funktionsfehler:**
  - Dezimal-Komma «950,50» wurde in Chromium zu 95'050.
  - Browser-Zurück übersprang einen Schritt.
  - Zurück von der Zahlung löschte die Angaben.
  - Doppelklick zählte zwei Downloads.
  - Messung zählte bei Zurück und Vor doppelt.
  - 320 px scrollte seitlich.
  - Lange Wörter liefen in Vorschau und PDF über den Rand.
  - Zeichen wie č, ł oder Emoji wurden im PDF zu «?». Jetzt erscheinen sie ohne Akzent, mit Hinweis in der Vorschau.
  - Mietantritt und Kündigungstermin weit in der Zukunft werden abgewiesen.
- **Server:** Statt einer Sperrliste gilt jetzt eine Positivliste. Vorher waren mit `/vendor/../data/…` oder `/Data/orders.json` interne Dateien und Bestellnummern abrufbar. Jetzt gibt es eine HTML-404-Seite, `/api/funnel` ist nur lokal oder mit `MK_ADMIN_KEY` abrufbar, und eine negative Content-Length wird abgewiesen.
- **Neue Tests:** `tests/regress-r4.js` mit 15 Prüfungen je Engine, `server.test.js` mit 90 statt 78 Prüfungen, `paket.test.js` mit 149 statt 146.
- **Offen:** Ein bezahlter Download lässt sich mit einer bekannten Bestellnummer für andere Angaben wiederholen, weil die Angaben bewusst nicht an den Server gehen (Entscheid 3). Zwei gleichzeitige Tabs überschreiben die zuletzt gemerkte Bestellung. Als Datei geöffnet (`file://`) fehlen Schrift und Weltkarte.

## Runde 5 (19.11.2026)
- Öffentliche Vorschau: https://icham135.github.io/mietklar/ (GitHub Pages, ohne Zahlungsserver, Kauf dort deaktiviert). `noindex` gesetzt, bis Impressum und juristische Freigabe stehen; danach in `tools/build.py` entfernen.
- «Brief-Paket» heisst jetzt «Mietklar Dossier». Angebotskarte, Preiskarte und Kaufbereich wirken hochwertiger (dunkler Verlauf, Apricot-Akzent). PDF-Seite 3 heisst «Fristenplan: Versand und Antwort».
