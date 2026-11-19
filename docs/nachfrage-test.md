# Nachfrage-Test (Vorschlag, braucht deine Freigabe)

**Nichts davon ist gestartet.** Werbung, externe Ausgaben und Produktivzahlungen brauchen deine Freigabe. Erfolgskriterien sind vorab festgelegt, damit das Ergebnis nicht nachträglich schöngerechnet wird.

## Stufe A: Absicht messen, ohne echte Zahlung (vor der Anbieter-Freigabe)

| Punkt | Festlegung |
|---|---|
| Ziel | Messen, wie viele Besucher den Check abschliessen und «Weiter zur Zahlung» klicken |
| Budget | **höchstens CHF 300**, Meta Ads, 7 Tage, Tageslimit CHF 45 |
| Zielgruppe | Deutschschweiz, 25 bis 55 Jahre, Interesse Wohnen/Miete. Keine Ansprache finanzieller Verhältnisse in der Anzeige |
| Anzeige | «Mietzins kostenlos prüfen: Referenzzins 1,25 %. Ergebnis in einer Minute, ohne Konto.» Kein «Gratis-Brief» |
| Seite | Server mit `"payment_provider": "off"` in `config.json`: Messung läuft, «Weiter zur Zahlung» zeigt ehrlich «Bezahlung hier nicht verfügbar». Die Sandbox darf echten Besuchern **nicht** gezeigt werden |
| Messung | `landing_view` → `check_complete` → `preview_view` → `checkout_start` (siehe `docs/metriken.md`) |
| Erwartete Menge | etwa 200 Besuche bei CPC 1.50 |

**Erfolgskriterien Stufe A (vorab festgelegt):**
- Weiter, wenn `check_complete` ≥ 35 % der Besuche **und** `checkout_start` ≥ 6 % der Besuche.
- Anpassen und wiederholen, wenn `checkout_start` zwischen 3 und 6 % liegt (Text, Preis, Anzeige).
- Stopp für bezahlte Werbung, wenn `checkout_start` unter 3 % liegt. Dann nur organisch weiter.

Warum 6 %: Break-even bei CHF 39 und CPC 1.50 liegt bei 4,28 % Kaufrate. Zwischen Klick auf «Zahlung» und bezahltem Kauf geht erfahrungsgemäss ein Teil verloren (Annahme: 30 %). 6 % Absicht entspricht etwa 4,2 % Käufen.

## Stufe B: echte Käufe (nach Freigabe von Anbieter, Preis, Impressum und juristischer Prüfung)

| Punkt | Festlegung |
|---|---|
| Budget | **höchstens CHF 500**, 10 Tage |
| Preis | eine Variante pro Durchlauf (zuerst CHF 39), nicht parallel |
| Messung | zusätzlich `purchase_success`, `pdf_download`, Rückerstattungen |

**Erfolgskriterien Stufe B:**
- Skalieren, wenn Käufe ≥ 6 % der Besuche (deutlich über Break-even 4,28 %).
- Weiter testen (Preis CHF 49, Text), wenn 3 bis 6 %.
- Stopp für bezahlte Werbung, wenn unter 3 %.

## Grenzen dieses Tests
- 200 bis 330 Besuche ergeben grobe Werte. Bei 4 % Kaufrate liegt das 95-%-Intervall etwa zwischen 2 und 7 %. Das reicht für «weiter oder stopp», nicht für Feintuning.
- Stufe A misst Absicht, nicht Zahlungsbereitschaft. Erst Stufe B zeigt, ob Leute wirklich zahlen.
- Der Referenzzins-Termin (Publikation am 1.12.2026) beeinflusst die Nachfrage stark. Test nicht über den Termin hinweg laufen lassen, oder die Zeit davor und danach getrennt auswerten.
