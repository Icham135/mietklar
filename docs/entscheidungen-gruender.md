# Entscheidungsliste (Stand 19.11.2026)

Kurz: Was du entscheiden musst, was der Code heute tut und wo du es änderst.

| # | Entscheidung | Heute im Code | Wo ändern |
|---|---|---|---|
| 1 | **Preis** (29 / 39 / 49) | CHF 39 als Testpreis, eine Stelle | `config.json` → `price_chf`, danach `python3 tools/build.py` |
| 2 | **Zahlungsanbieter** (z. B. Stripe, Payrexx, Datatrans; TWINT ja/nein) | `sandbox` (Testzahlung) oder `off` (Zahlung aus, Messung an) | `config.json` → `payment_provider`. Echter Anbieter: Adapter in `server.py` bauen, braucht deine Freigabe und Zugangsdaten |
| 3 | **Schutz des PDFs**: im Browser erzeugen (Datenschutz) oder auf dem Server (härterer Kopierschutz, aber Miete und Adresse gehen an den Server) | im Browser | Architekturentscheid, vor Livegang |
| 4 | **Betreiberangaben** (Name, Adresse, E-Mail, UID) | Platzhalter im Impressum | `tools/build.py` → `legal('impressum.html' …)` |
| 5 | **Juristische Freigabe** von Rechenlogik, Briefen, Bedingungen und Datenschutz | nicht erfolgt | Mietrechtsanwalt oder -anwältin |
| 6 | **Rückerstattung** über den technischen Fall hinaus (z. B. «Geld zurück, wenn …») | nur technischer Fall genannt | `tools/build.py` → Bedingungen |
| 7 | **Angebotsschwelle**: Paket nur, wenn geschätzte Entlastung im ersten Jahr > Preis | aktiv | `src/ui.js` → `worth` |
| 8 | **Werbetest** freigeben (Budget, Zeitraum) | nichts gestartet | `docs/nachfrage-test.md` |
| 9 | **Name und Marke** | «Mietklar», Arbeitstitel, ungeprüft | überall |
| 10 | **Sprachen** | nur Deutsch | später |
