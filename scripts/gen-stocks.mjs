// Génère src/us-tickers.json à partir des répertoires officiels de symboles US.
// Source : github.com/rreichel3/US-Stock-Symbols (NASDAQ + NYSE + AMEX).
// Lancer : node scripts/gen-stocks.mjs
import { readFileSync, writeFileSync } from "fs";

const SRC = process.env.STOCKS_SRC_DIR || "scripts/.stock-cache/";
const load = (f, ex) =>
  JSON.parse(readFileSync(SRC + f, "utf8")).map((x) => ({ s: x.symbol, n: x.name, e: ex }));

let all = [
  ...load("nasdaq_full_tickers.json", "NASDAQ"),
  ...load("nyse_full_tickers.json", "NYSE"),
  ...load("amex_full_tickers.json", "AMEX"),
];

const seen = new Set();
const out = [];
for (const x of all) {
  if (!x.s || !x.n) continue;
  const s = x.s.trim().toUpperCase();
  if (!/^[A-Z][A-Z.\-]{0,7}$/.test(s)) continue; // symboles propres uniquement
  if (seen.has(s)) continue;
  seen.add(s);
  const n = x.n.replace(/\s+/g, " ").trim();
  out.push({ s, n, e: x.e });
}
out.sort((a, b) => (a.s < b.s ? -1 : 1));

writeFileSync("src/us-tickers.json", JSON.stringify(out));
console.log(`✓ src/us-tickers.json — ${out.length} titres, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
