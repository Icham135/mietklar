/* Lighthouse-Messung (User Flow): Startseite (Navigation), Wizard und Ergebnisseite (Snapshot).
   Aufruf: LH_DIR=/pfad/mit/node_modules CHROME=/pfad/zu/chrome node tests/lighthouse.mjs
   Bedingungen: Lighthouse-Standard «mobile»: Moto-G-Power-Emulation (412 x 823), simuliertes langsames 4G (150 ms RTT, 1,6 Mbit/s), 4-fache CPU-Drosselung.
   Snapshots messen nur Barrierefreiheit, Best Practices und SEO (keine Ladeleistung). */
import { createRequire } from 'module'; import { spawn } from 'child_process'; import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath } from 'url';
const req = createRequire(path.join(process.env.LH_DIR, 'x.js'));
const { startFlow } = await import(req.resolve('lighthouse'));
const puppeteer = req('puppeteer-core');
const R = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mk-lh-')), PORT = 5600 + Math.floor(Math.random() * 200), BASE = 'http://localhost:' + PORT;
const srv = spawn('python3', [path.join(R, 'server.py')], { env: Object.assign({}, process.env, { MK_DATA: DATA, MK_PORT: String(PORT), MK_QUIET: '1' }) });
for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/api/config'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const flow = await startFlow(page, { name: 'Mietklar Kaufweg' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await flow.navigate(BASE + '/index.html', { name: 'Startseite' });
await page.click('[data-start=bestand]'); await sleep(400);
await flow.snapshot({ name: 'Wizard (erste Frage)' });
await page.type('#wRent', '2100'); await page.click('#wBody form button[type=submit]'); await sleep(300);
await page.select('#wM', '1'); await page.select('#wY', '2024'); await page.click('#wBody form button[type=submit]'); await sleep(300);
await page.$eval('#wTerm', e => { e.value = '2027-03-31'; }); await page.click('#wBody form button[type=submit]'); await sleep(1500);
await flow.snapshot({ name: 'Ergebnisseite' });
const result = await flow.createFlowResult();
await browser.close(); srv.kill(); fs.rmSync(DATA, { recursive: true, force: true });
if (process.env.LH_RAW) fs.writeFileSync(process.env.LH_RAW, JSON.stringify(result.steps[0].lhr));
const out = [];
for (const st of result.steps) {
  const c = st.lhr.categories, sc = k => c[k] ? Math.round(c[k].score * 100) : '–';
  const fails = Object.values(st.lhr.audits).filter(a => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'notApplicable').map(a => a.id + (a.displayValue ? ' (' + a.displayValue + ')' : ''));
  const m = st.lhr.audits;
  out.push({ name: st.name, mode: st.lhr.gatherMode, perf: sc('performance'), a11y: sc('accessibility'), bp: sc('best-practices'), seo: sc('seo'),
    lcp: m['largest-contentful-paint'] && m['largest-contentful-paint'].displayValue, cls: m['cumulative-layout-shift'] && m['cumulative-layout-shift'].displayValue, tbt: m['total-blocking-time'] && m['total-blocking-time'].displayValue, fcp: m['first-contentful-paint'] && m['first-contentful-paint'].displayValue, fails });
}
fs.writeFileSync(path.join(R, 'docs', 'lighthouse.json'), JSON.stringify({ date: new Date().toISOString(), lighthouse: result.steps[0].lhr.lighthouseVersion, ua: result.steps[0].lhr.environment.hostUserAgent, form: result.steps[0].lhr.configSettings.formFactor, throttling: result.steps[0].lhr.configSettings.throttling, steps: out }, null, 1));
console.log(JSON.stringify(out, null, 1));
