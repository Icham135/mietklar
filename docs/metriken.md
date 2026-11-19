# Messung: vom Besuch bis zum Download

Datensparsam und ohne Cookies. Der Server speichert pro Ereignis nur **Name, feste Kategorie und Datum**. Keine Beträge, keine Vertragsdaten, keine Adressen, keine IP-Adresse (der Server protokolliert keine IP-Adressen). Der Server nimmt nur Ereignisse aus einer festen Liste an, alles andere lehnt er ab (getestet in `tests/server.test.js`).

## Trichter

| Schritt | Ereignis | Kategorie (fest) | Ausgelöst, wenn |
|---|---|---|---|
| 1 Besuch | `landing_view` | – | Seite geladen |
| 2 Check gestartet | `check_start` | `bestand` / `neu` | Wahl des Ablaufs (auch über die Hero-Links) |
| 3 Check abgeschlossen | `check_complete` | `anspruch`, `gedeckt`, `sonderform`, `kein_anspruch`, `unklar`, `angabe_fehlt`, `auffaellig`, `eher_schwierig`, `frist_vorbei` | Ergebnis angezeigt |
| 4 Vorschau | `preview_view` | `bestand` / `neu` | Vorschau des Brief-Pakets geöffnet |
| 5 Zahlung gestartet | `checkout_start` | `bestand` / `neu` | «Weiter zur Zahlung» mit vollständigen Angaben |
| 6 Kauf | `purchase_success` | `bestand` / `neu` | Rückkehr mit bezahltem Status (einmal pro Bestellung) |
| 7 Download | `pdf_download` | `bestand` / `neu` | erstes PDF erzeugt |

Zusätzlich: `purchase_failed`, `purchase_cancelled`, `pdf_redownload`.

## Auswertung

- Live: `GET /api/funnel` liefert Zählungen und Übergangsraten pro Schritt.
- Rohdaten: `data/events.jsonl` (eine Zeile pro Ereignis: `{"n":"check_complete","c":"anspruch","d":"2026-11-19"}`).
- Die Kategorie bei `check_complete` zeigt, wie viele Personen überhaupt ein Angebot bekommen (`anspruch` bei Bestand, `auffaellig` bei Neu). Das ist der Nenner für die Kaufrate bei Personen mit Angebot.

## Die vier Zahlen, die zählen
1. **Check-Abschlussrate** = `check_complete` / `landing_view` (Ziel im Test: ≥ 35 %)
2. **Angebotsquote** = (`anspruch` + `auffaellig`) / `check_complete`
3. **Kaufrate pro Besuch** = `purchase_success` / `landing_view` (Break-even CHF 39 bei CPC 1.50: 4,28 %)
4. **Download-Quote** = `pdf_download` / `purchase_success` (Ziel: 100 %, sonst ist etwas kaputt)

## Was nicht gemessen wird
Keine Wiedererkennung von Personen, keine Sitzungen, kein Herkunftskanal. Für die Kanal-Zuordnung im Werbetest reicht ein eigener Link pro Kampagne mit getrennter Auswertung nach Datum, oder eine spätere Erweiterung um eine feste Kampagnen-Kategorie (nach Datenschutz-Prüfung).
