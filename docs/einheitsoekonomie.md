# Einheitsökonomie: Welche Kaufrate braucht Werbung?

**Alle Zahlen sind Annahmen, keine Messwerte.** Erst echte Käufe zeigen, ob sie stimmen. Stand 19.11.2026.

## Annahmen

| Grösse | Annahme | Herkunft |
|---|---|---|
| Kosten pro Klick (CPC) | CHF 1.00 / 1.50 / 2.50 | Schätzung, Meta eher tiefer, Google-Suche eher höher. Nicht gemessen. |
| Zahlungsgebühr | 3 % + CHF 0.30 pro Zahlung | Grössenordnung gängiger Anbieter, Anbieter noch nicht gewählt |
| Rückerstattungsreserve | 5 % vom Preis | Annahme |
| Variable Kosten pro Bestellung | CHF 0.50 (Support, Hosting, Quittung) | Annahme |
| MWST | keine (unter CHF 100'000 Umsatz pro Jahr) | Annahme, mit Treuhand prüfen |
| Fixkosten | nicht eingerechnet (Hosting, Domain, Anwalt) | separat decken |

## Netto pro Verkauf und Break-even-Kaufrate

Kaufrate = Käufe geteilt durch Besuche aus der Werbung. Break-even heisst: Werbung, Zahlungsgebühr und variable Kosten sind gedeckt, sonst nichts.

| Preis | Gebühr | Reserve | Variabel | **Netto pro Verkauf** | Break-even bei CPC 1.00 | **bei CPC 1.50** | bei CPC 2.50 |
|---|---|---|---|---|---|---|---|
| CHF 29 | 1.17 | 1.45 | 0.50 | **CHF 25.88** | 3,86 % | **5,80 %** | 9,66 % |
| CHF 39 | 1.47 | 1.95 | 0.50 | **CHF 35.08** | 2,85 % | **4,28 %** | 7,13 % |
| CHF 49 | 1.77 | 2.45 | 0.50 | **CHF 44.28** | 2,26 % | **3,39 %** | 5,65 % |

Formel: Break-even-Kaufrate = CPC / Netto pro Verkauf.

## Was das für den Trichter heisst

Nicht jede Person bekommt ein Angebot: Das Paket erscheint nur, wenn der Check einen plausiblen Vorteil zeigt. Angenommen, 50 % der Besuche schliessen den Check ab und 35 % davon bekommen ein Angebot (die ZKB schätzt 41 bis 46 % mit Anspruch, nach Gegenrechnung und Preisschwelle weniger). Dann müssten bei CPC 1.50 so viele der Personen mit Angebot kaufen:

| Preis | nötige Kaufrate bei Personen mit Angebot |
|---|---|
| CHF 29 | 33 % |
| CHF 39 | 24 % |
| CHF 49 | 19 % |

**Lesart:** Bei CHF 39 und CPC 1.50 müsste rund jede vierte Person mit Angebot kaufen. Das ist hoch, aber nicht ausgeschlossen, weil diese Personen bereits einen konkreten Betrag sehen (im Beispiel CHF 1'104 pro Jahr). Ein höherer Preis senkt die nötige Rate. Ob Leute bei CHF 49 weniger kaufen, zeigt nur ein Test.

## Was daraus folgt

- Bezahlte Werbung ist ein Test, kein Geschäftsmodell, solange die Kaufrate unbekannt ist.
- CHF 3'000 Gewinn pro Monat bei CHF 39 brauchen rund 86 Verkäufe pro Monat ohne Werbekosten. Mit Werbung muss die Kaufrate deutlich über dem Break-even liegen.
- Organischer Verkehr (Suche nach «Referenzzins Senkung Brief», Medien, Weiterempfehlung) senkt den CPC gegen null und bleibt der wichtigste Hebel.

Den Nachfrage-Test mit Budgetgrenze beschreibt `docs/nachfrage-test.md`.
