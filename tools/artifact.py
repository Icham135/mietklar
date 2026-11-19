#!/usr/bin/env python3
"""Erzeugt dist-artifact/ aus index.html: eine Fassung ohne eigenen Dokumentrahmen,
für das Teilen als privater Link (ohne Zahlungsserver, Kauf ist dort deaktiviert).
Aufruf: python3 tools/build.py && python3 tools/artifact.py"""
import os, re, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'dist-artifact')
src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
head = src[src.index('<head>') + 6:src.index('</head>')]
body = src[src.index('<body>') + 6:src.rindex('</body>')]
head = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', '', head)
head = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\s*', '', head)   # der Link bringt seine eigene Richtlinie mit
head = re.sub(r'<title>[^<]*</title>', '<title>Mietklar</title>', head)
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(head + '\n' + body + '\n')
for f in ('impressum.html', 'datenschutz.html', 'bedingungen.html'):
    shutil.copy(os.path.join(ROOT, f), os.path.join(OUT, f))
if os.path.exists(os.path.join(OUT, 'vendor')): shutil.rmtree(os.path.join(OUT, 'vendor'))
shutil.copytree(os.path.join(ROOT, 'vendor'), os.path.join(OUT, 'vendor'))
print('dist-artifact bereit')
