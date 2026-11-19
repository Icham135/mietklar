#!/usr/bin/env python3
"""Unabhaengiges Orakel fuer src/calc.js (nur aus der Spezifikation gebaut).

Aufruf: python3 tests/oracle.py            -> JSON auf stdout
        python3 tests/oracle.py -o datei   -> JSON in Datei
Bewusst anders aufgebaut als der JS-Code: Monatsindex statt Datumsobjekte,
Logarithmen-Summe statt Produkt, Datums-Ordinalzahlen statt Millisekunden.
"""
import bisect, datetime, json, math, re, sys

# --- Spezifikationsdaten ---------------------------------------------------
HIST = [((2008, 9), 3.5), ((2009, 6), 3.25), ((2009, 9), 3.0), ((2010, 12), 2.75),
        ((2011, 12), 2.5), ((2012, 6), 2.25), ((2013, 9), 2.0), ((2015, 6), 1.75),
        ((2017, 6), 1.5), ((2020, 3), 1.25), ((2023, 6), 1.5), ((2023, 12), 1.75),
        ((2025, 3), 1.5), ((2025, 9), 1.25)]
CUR_RATE = 1.25
INFL = {2008: 2.4, 2009: -0.5, 2010: 0.7, 2011: 0.2, 2012: -0.7, 2013: -0.2, 2014: 0.0,
        2015: -1.1, 2016: -0.4, 2017: 0.5, 2018: 0.9, 2019: 0.4, 2020: -0.7, 2021: 0.6,
        2022: 2.8, 2023: 2.1, 2024: 1.1, 2025: 0.2, 2026: 0.3}
_KEYS = [y * 12 + (m - 1) for (y, m), _ in HIST]
_VALS = [v for _, v in HIST]


def mi(y, m):  # Monatsindex
    return y * 12 + (m - 1)


def ref_at(y, m):
    i = bisect.bisect_right(_KEYS, mi(y, m)) - 1
    return None if i < 0 else _VALS[i]


def steps_for(base):
    return max(0, int(math.floor((base - 1.25) / 0.25 + 0.5)))


def reduction(n):
    return 0.0 if n <= 0 else 1.0 - 1.0 / (1.0 + 0.03 * n)


def infl_of_year(y):
    return INFL.get(y, INFL[2026]) if y >= 2026 else INFL[y] if y in INFL else INFL[2008]


def cum_infl(y, m, now):
    ny, nm = now[0], now[1]
    s = 0.0
    parts = []
    for k in range(mi(y, m) + 1, mi(ny, nm) + 1):
        yr = k // 12
        parts.append(math.log(1 + infl_of_year(yr) / 100.0) / 12.0)
    return math.exp(math.fsum(parts)) if parts else 1.0


def calc_ref(rent, y, m, kp, now):
    # Spezifikation v2: negative Mieten gelten als 0 (calc.js klemmt sie)
    rent = max(0.0, rent)
    base = ref_at(y, m)
    if base is None:
        return {"before": True}
    steps = steps_for(base)
    red = reduction(steps)
    cum = cum_infl(y, m, now)
    months = max(0, mi(now[0], now[1]) - mi(y, m))
    teu_pct = max(0.0, 0.4 * (cum - 1))
    kos_pct = max(0.0, kp * months / 12.0)
    gross = rent * red
    teu = rent * teu_pct if steps > 0 else 0.0
    kos = rent * kos_pct if steps > 0 else 0.0
    net = max(0.0, gross - teu - kos)
    return {"before": False, "base": base, "steps": steps, "red": red, "cum": cum,
            "months": months, "teuPct": teu_pct, "kosPct": kos_pct, "gross": gross,
            "teu": teu, "kos": kos, "net": net, "netYear": 12 * net}


def parse_iso(s):
    if not isinstance(s, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return None
    try:
        return datetime.date(int(s[:4]), int(s[5:7]), int(s[8:]))
    except ValueError:
        return None


def calc_init(old_r, new_r, start, now):
    pct = None if old_r <= 0 else (new_r - old_r) / old_r * 100
    d = parse_iso(start)
    if d is None:
        return {"pct": pct, "left": None, "deadline": None, "future": None}
    today = datetime.date(now[0], now[1], now[2])
    dl = d + datetime.timedelta(days=30)
    return {"pct": pct, "left": dl.toordinal() - today.toordinal(),
            "deadline": dl.isoformat(),
            "future": (d.toordinal() - today.toordinal()) if d > today else None}


# --- Testfaelle ---------------------------------------------------------------
NOW = [2026, 11, 18, 12, 0]
cases = []


def add(cid, fn, args, expected, group=None):
    cases.append({"id": cid, "fn": fn, "args": args, "expected": expected, "group": group})


# refAt: Wechselmonat, Monat davor, Monat danach
for (y, m), v in HIST:
    for dy, dm, tag in ((0, 0, "Wechselmonat"), (0, -1, "Vormonat"), (0, 1, "Folgemonat")):
        k = mi(y, m) + dm
        yy, mm = k // 12, k % 12 + 1
        add(f"refAt {yy}-{mm:02d} ({tag} von {y}-{m:02d})", "refAt", [yy, mm], ref_at(yy, mm))
for y, m in ((2008, 8), (2000, 1), (1990, 12), (2008, 1), (2030, 1), (2026, 12), (2027, 6), (2100, 1)):
    add(f"refAt {y}-{m:02d} Randfall", "refAt", [y, m], ref_at(y, m))

# stepsFor
for b in (3.5, 3.25, 3.0, 2.75, 2.5, 2.25, 2.0, 1.75, 1.5, 1.25, 1.0, 0.5, 0, 1.375, 1.3, 1.37, 1.12, 5.0):
    add(f"stepsFor({b})", "stepsFor", [b], steps_for(b))

# reduction n = -3..10, 15, 50
for n in list(range(-3, 11)) + [15, 50]:
    add(f"reduction({n})", "reduction", [n], reduction(n))

# cumInflation
for (y, m, now) in [(2008, 9, NOW), (2025, 9, NOW), (2026, 10, NOW), (2026, 11, NOW), (2026, 12, NOW),
                    (2023, 12, [2024, 1, 1, 0, 0]), (2023, 12, [2024, 2, 29, 12, 0]),
                    (2024, 2, [2024, 3, 1, 12, 0]), (2020, 3, [2021, 3, 31, 23, 59]),
                    (2009, 6, [2012, 12, 1, 0, 0]), (2030, 1, NOW),
                    (2008, 9, [2026, 1, 1, 0, 0]), (2008, 9, [2040, 6, 15, 12, 0]),
                    (2025, 12, [2026, 1, 1, 0, 0]), (2017, 6, [2017, 6, 30, 23, 59])]:
    add(f"cumInflation({y}-{m:02d} -> {now[0]}-{now[1]:02d})", "cumInflation", [y, m, now],
        cum_infl(y, m, now))

# calcRef gezielte Faelle
def cr(label, rent, y, m, kp, now=NOW):
    add(f"calcRef {label}: rent={rent} {y}-{m:02d} kp={kp} now={now[0]}-{now[1]:02d}-{now[2]:02d}",
        "calcRef", [rent, y, m, kp, now], calc_ref(rent, y, m, kp, now))

for rent in (0, 500, 1200, 2100, 3500, 8000, 1234.56, 999.99, 0.01, 2150.55):
    cr("Miete", rent, 2015, 6, 0.005)
for (y, m), _ in HIST:
    cr("Wechselmonat", 2100, y, m, 0.005)
    k = mi(y, m) - 1
    cr("Vormonat", 2100, k // 12, k % 12 + 1, 0.005)
for y, m in ((2008, 8), (2005, 1), (1999, 12), (2008, 1)):
    cr("vor 2008-09", 2100, y, m, 0.005)
for y, m in ((2026, 12), (2027, 1), (2030, 6), (2050, 1)):
    cr("Zukunft", 2100, y, m, 0.005)
cr("Zukunft Monat jetzt+1", 1200, 2026, 12, 0.005)
cr("Mietbeginn im aktuellen Monat", 1200, 2026, 11, 0.005)
for kp in (0, 0.005, 0.015, 0.05, 0.5):
    cr("kp", 2100, 2013, 9, kp)
    cr("kp aktuell", 2100, 2025, 9, kp)
for rent in (-1, -500, -2100):
    cr("negative Miete", rent, 2015, 6, 0.005)
    cr("negative Miete alt", rent, 2009, 6, 0.0)
for rent in (1e9, 1e12, 1e15):
    cr("riesige Miete", rent, 2013, 9, 0.005)
cr("riesig 1e300", 1e300, 2013, 9, 0.005)
# negative Teuerung (Deflationsjahre 2012-2016 usw.)
cr("Deflation", 2100, 2012, 1, 0.0, [2016, 12, 1, 0, 0])
cr("Deflation", 2100, 2015, 6, 0.0, [2016, 12, 31, 23, 59])
cr("Deflation", 3500, 2012, 6, 0.0, [2013, 12, 1, 0, 0])
cr("Deflation", 8000, 2013, 9, 0.0, [2016, 12, 1, 0, 0])
cr("Deflation", 1200, 2020, 3, 0.0, [2020, 12, 15, 0, 0])
cr("Deflation", 1200, 2009, 1, 0.0, [2009, 12, 1, 0, 0])
cr("Deflation", 1200, 2009, 6, 0.0, [2009, 12, 1, 0, 0])
cr("Deflation grosse Miete", 8000, 2012, 6, 0.0, [2012, 12, 31, 12, 0])
# Dezember -> Januar, Schaltjahr, Monatsgrenzen
cr("Dez->Jan", 2100, 2023, 12, 0.005, [2024, 1, 1, 0, 0])
cr("Dez->Jan", 2100, 2025, 12, 0.005, [2026, 1, 31, 23, 59])
cr("Dez->Jan", 2100, 2024, 12, 0.005, [2025, 1, 1, 0, 0])
cr("Dez->Jan Gleichstand", 2100, 2023, 12, 0.005, [2023, 12, 31, 23, 59])
cr("Schaltjahr 29.2.", 2100, 2020, 3, 0.005, [2024, 2, 29, 12, 0])
cr("Schaltjahr 1.3.", 2100, 2020, 3, 0.005, [2024, 3, 1, 0, 0])
cr("Schaltjahr 28.2. (2023)", 2100, 2020, 3, 0.005, [2023, 2, 28, 12, 0])
cr("Schaltjahr 2024 Monat Feb", 2100, 2024, 2, 0.005, [2024, 2, 29, 12, 0])
cr("Schaltjahr 2024 Mietbeginn Jan->Maerz", 2100, 2024, 1, 0.005, [2024, 3, 1, 0, 0])
cr("Monatsende 31.", 2100, 2023, 6, 0.005, [2026, 1, 31, 23, 59])
cr("Monatsanfang 1.", 2100, 2023, 6, 0.005, [2026, 2, 1, 0, 0])
cr("Monatsende 30.", 2100, 2023, 6, 0.005, [2026, 4, 30, 23, 59])
cr("Monatsanfang 1. (Mai)", 2100, 2023, 6, 0.005, [2026, 5, 1, 0, 0])
cr("Mietbeginn = now Monat Wechsel", 2100, 2025, 9, 0.005, [2025, 9, 30, 12, 0])
cr("Wechselmonat + 1 Monat", 2100, 2025, 9, 0.005, [2025, 10, 1, 0, 0])
cr("now = Wechselmonat 2023-06 (steigend)", 2100, 2023, 6, 0.005)
cr("steigender Satz 2023-12", 2100, 2023, 12, 0.005)
cr("Wechsel 2025-03 (Satz 1.5)", 2100, 2025, 3, 0.005)
cr("Schritt 10: Satz 3.75?? nicht in Verlauf -> 3.5 = 9 Schritte", 2100, 2008, 9, 0.0)
for y, m in ((2008, 9), (2009, 6), (2009, 9), (2010, 12), (2011, 12), (2012, 6), (2013, 9), (2015, 6),
             (2017, 6), (2020, 3), (2023, 6), (2023, 12), (2025, 3), (2025, 9)):
    cr("jeder Satz kp=0.015", 3500, y, m, 0.015)

# Raster: alle Monate 2008-09..2026-11 (eine Gruppe = ein Test)
for k in range(mi(2008, 9), mi(2026, 11) + 1):
    y, m = k // 12, k % 12 + 1
    for rent, kp in ((2100, 0.005), (1200.5, 0.0), (8000, 0.015)):
        add(f"grid {y}-{m:02d} rent={rent} kp={kp}", "calcRef", [rent, y, m, kp, NOW],
            calc_ref(rent, y, m, kp, NOW), group="Raster calcRef alle Monate 2008-09..2026-11")
# Raster mit anderen now-Werten
for nowx in ([2012, 3, 15, 12, 0], [2016, 7, 15, 12, 0], [2020, 12, 31, 23, 59], [2024, 2, 29, 0, 0]):
    for k in range(mi(2008, 9), mi(nowx[0], nowx[1]) + 2):
        y, m = k // 12, k % 12 + 1
        add(f"grid {y}-{m:02d} now={nowx}", "calcRef", [3500, y, m, 0.005, nowx],
            calc_ref(3500, y, m, 0.005, nowx), group="Raster calcRef verschiedene now")

# calcInit
def ci(label, old, new, start, now):
    add(f"calcInit {label}: old={old} new={new} start={start} now={now[0]}-{now[1]:02d}-{now[2]:02d} {now[3]:02d}:{now[4]:02d}",
        "calcInit", [old, new, start, now], calc_init(old, new, start, now))

N = [2026, 11, 18, 12, 0]
ci("Senkung -5%", 2000, 1900, "2026-11-01", N)
ci("0%", 2000, 2000, "2026-11-01", N)
ci("9.99%", 2000, 2199.8, "2026-11-01", N)
ci("10%", 2000, 2200, "2026-11-01", N)
ci("10.01%", 2000, 2200.2, "2026-11-01", N)
ci("50%", 2000, 3000, "2026-11-01", N)
ci("Dezimal", 1234.5, 1300.75, "2026-11-01", N)
ci("Vormiete 0", 0, 2000, "2026-11-01", N)
ci("Vormiete negativ", -100, 2000, "2026-11-01", N)
ci("Vormiete 0 neu 0", 0, 0, "2026-11-01", N)
ci("Mietantritt heute", 2000, 2100, "2026-11-18", N)
ci("Mietantritt heute 00:00", 2000, 2100, "2026-11-18", [2026, 11, 18, 0, 0])
ci("Mietantritt heute 23:59", 2000, 2100, "2026-11-18", [2026, 11, 18, 23, 59])
for d in (1, 15, 28, 29, 30, 31, 32, 45):
    s = datetime.date(2026, 11, 18) - datetime.timedelta(days=d)
    ci(f"Mietantritt vor {d} Tagen", 2000, 2100, s.isoformat(), N)
    ci(f"Mietantritt vor {d} Tagen (23:59)", 2000, 2100, s.isoformat(), [2026, 11, 18, 23, 59])
for d in (1, 2, 10, 30, 365):
    s = datetime.date(2026, 11, 18) + datetime.timedelta(days=d)
    ci(f"Mietantritt in {d} Tagen", 2000, 2100, s.isoformat(), N)
for bad in ("", "abc", "2026-13-01", "2026-00-10", "2026-02-30", "2026-11-31", "18.11.2026", "2026/11/18", None, "2026-1-5"):
    ci(f"ungueltiges Datum {bad!r}", 2000, 2100, bad, N)
ci("Schaltjahr Frist ueber Feb 2024", 2000, 2100, "2024-02-01", [2024, 2, 29, 12, 0])
ci("Frist ueber Jahreswechsel", 2000, 2100, "2026-12-15", [2026, 12, 31, 12, 0])
ci("Frist ueber Jahreswechsel 2", 2000, 2100, "2026-12-15", [2027, 1, 14, 12, 0])
ci("Frist Schaltjahr 2028-02-29", 2000, 2100, "2028-02-01", [2028, 2, 10, 9, 0])
# Zeitumstellung (Europe/Zurich): 2026-03-29 und 2026-10-25
for now in ([2026, 3, 29, 0, 30], [2026, 3, 29, 1, 59], [2026, 3, 29, 3, 0], [2026, 3, 29, 12, 0], [2026, 3, 29, 23, 30],
            [2026, 3, 28, 23, 30], [2026, 3, 30, 0, 30]):
    for start in ("2026-03-01", "2026-02-27", "2026-03-29", "2026-03-28", "2026-03-30", "2026-04-15", "2026-03-15"):
        ci("DST Fruehling", 2000, 2100, start, now)
for now in ([2026, 10, 25, 0, 30], [2026, 10, 25, 1, 59], [2026, 10, 25, 2, 30], [2026, 10, 25, 3, 0], [2026, 10, 25, 12, 0],
            [2026, 10, 25, 23, 30], [2026, 10, 24, 23, 30], [2026, 10, 26, 0, 30]):
    for start in ("2026-10-01", "2026-09-25", "2026-09-26", "2026-10-25", "2026-10-24", "2026-10-26", "2026-11-10", "2026-09-24"):
        ci("DST Herbst", 2000, 2100, start, now)

out = {"generated_for_now_default": NOW, "cases": cases}
if __name__ == "__main__":
    s = json.dumps(out, indent=0)
    if "-o" in sys.argv:
        open(sys.argv[sys.argv.index("-o") + 1], "w").write(s)
    else:
        print(s)
