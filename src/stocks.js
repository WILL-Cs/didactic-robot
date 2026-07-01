import US_TICKERS from "./us-tickers.json";

// Liste curée prioritaire : noms courts et lisibles + valeurs européennes
// (absentes du répertoire US). Ces entrées passent devant en cas de doublon.
// { s: symbole/ticker, n: nom, e: place }
const CURATED = [
  // ── US Tech / IA ──
  { s: "AAPL", n: "Apple", e: "NASDAQ" },
  { s: "MSFT", n: "Microsoft", e: "NASDAQ" },
  { s: "GOOGL", n: "Alphabet (Google) A", e: "NASDAQ" },
  { s: "GOOG", n: "Alphabet (Google) C", e: "NASDAQ" },
  { s: "AMZN", n: "Amazon", e: "NASDAQ" },
  { s: "META", n: "Meta Platforms", e: "NASDAQ" },
  { s: "NVDA", n: "NVIDIA", e: "NASDAQ" },
  { s: "TSLA", n: "Tesla", e: "NASDAQ" },
  { s: "AVGO", n: "Broadcom", e: "NASDAQ" },
  { s: "ORCL", n: "Oracle", e: "NYSE" },
  { s: "CRM", n: "Salesforce", e: "NYSE" },
  { s: "ADBE", n: "Adobe", e: "NASDAQ" },
  { s: "AMD", n: "Advanced Micro Devices", e: "NASDAQ" },
  { s: "INTC", n: "Intel", e: "NASDAQ" },
  { s: "CSCO", n: "Cisco Systems", e: "NASDAQ" },
  { s: "QCOM", n: "Qualcomm", e: "NASDAQ" },
  { s: "TXN", n: "Texas Instruments", e: "NASDAQ" },
  { s: "IBM", n: "IBM", e: "NYSE" },
  { s: "NOW", n: "ServiceNow", e: "NYSE" },
  { s: "INTU", n: "Intuit", e: "NASDAQ" },
  { s: "AMAT", n: "Applied Materials", e: "NASDAQ" },
  { s: "MU", n: "Micron Technology", e: "NASDAQ" },
  { s: "LRCX", n: "Lam Research", e: "NASDAQ" },
  { s: "KLAC", n: "KLA Corporation", e: "NASDAQ" },
  { s: "PYPL", n: "PayPal", e: "NASDAQ" },
  { s: "NFLX", n: "Netflix", e: "NASDAQ" },
  { s: "UBER", n: "Uber Technologies", e: "NYSE" },
  { s: "ABNB", n: "Airbnb", e: "NASDAQ" },
  { s: "SHOP", n: "Shopify", e: "NYSE" },
  { s: "SQ", n: "Block (Square)", e: "NYSE" },
  // ── US IA / cloud / cybersécurité (growth) ──
  { s: "PLTR", n: "Palantir Technologies", e: "NYSE" },
  { s: "SNOW", n: "Snowflake", e: "NYSE" },
  { s: "DDOG", n: "Datadog", e: "NASDAQ" },
  { s: "CRWD", n: "CrowdStrike", e: "NASDAQ" },
  { s: "NET", n: "Cloudflare", e: "NYSE" },
  { s: "MDB", n: "MongoDB", e: "NASDAQ" },
  { s: "PANW", n: "Palo Alto Networks", e: "NASDAQ" },
  { s: "ZS", n: "Zscaler", e: "NASDAQ" },
  { s: "SMCI", n: "Super Micro Computer", e: "NASDAQ" },
  { s: "ARM", n: "Arm Holdings", e: "NASDAQ" },
  { s: "MRVL", n: "Marvell Technology", e: "NASDAQ" },
  { s: "ANET", n: "Arista Networks", e: "NYSE" },
  // ── US finance ──
  { s: "BRK.B", n: "Berkshire Hathaway B", e: "NYSE" },
  { s: "JPM", n: "JPMorgan Chase", e: "NYSE" },
  { s: "V", n: "Visa", e: "NYSE" },
  { s: "MA", n: "Mastercard", e: "NYSE" },
  { s: "BAC", n: "Bank of America", e: "NYSE" },
  { s: "WFC", n: "Wells Fargo", e: "NYSE" },
  { s: "GS", n: "Goldman Sachs", e: "NYSE" },
  { s: "MS", n: "Morgan Stanley", e: "NYSE" },
  { s: "BLK", n: "BlackRock", e: "NYSE" },
  { s: "AXP", n: "American Express", e: "NYSE" },
  // ── US santé ──
  { s: "UNH", n: "UnitedHealth Group", e: "NYSE" },
  { s: "JNJ", n: "Johnson & Johnson", e: "NYSE" },
  { s: "LLY", n: "Eli Lilly", e: "NYSE" },
  { s: "PFE", n: "Pfizer", e: "NYSE" },
  { s: "MRK", n: "Merck", e: "NYSE" },
  { s: "ABBV", n: "AbbVie", e: "NYSE" },
  { s: "TMO", n: "Thermo Fisher Scientific", e: "NYSE" },
  { s: "ABT", n: "Abbott Laboratories", e: "NYSE" },
  { s: "NVO", n: "Novo Nordisk", e: "NYSE" },
  // ── US conso ──
  { s: "KO", n: "Coca-Cola", e: "NYSE" },
  { s: "PEP", n: "PepsiCo", e: "NASDAQ" },
  { s: "PG", n: "Procter & Gamble", e: "NYSE" },
  { s: "COST", n: "Costco Wholesale", e: "NASDAQ" },
  { s: "WMT", n: "Walmart", e: "NYSE" },
  { s: "HD", n: "Home Depot", e: "NYSE" },
  { s: "MCD", n: "McDonald's", e: "NYSE" },
  { s: "NKE", n: "Nike", e: "NYSE" },
  { s: "SBUX", n: "Starbucks", e: "NASDAQ" },
  { s: "DIS", n: "Walt Disney", e: "NYSE" },
  { s: "CMCSA", n: "Comcast", e: "NASDAQ" },
  // ── US industrie / énergie ──
  { s: "XOM", n: "Exxon Mobil", e: "NYSE" },
  { s: "CVX", n: "Chevron", e: "NYSE" },
  { s: "COP", n: "ConocoPhillips", e: "NYSE" },
  { s: "CAT", n: "Caterpillar", e: "NYSE" },
  { s: "BA", n: "Boeing", e: "NYSE" },
  { s: "GE", n: "GE Aerospace", e: "NYSE" },
  { s: "HON", n: "Honeywell", e: "NASDAQ" },
  { s: "UPS", n: "United Parcel Service", e: "NYSE" },
  { s: "LMT", n: "Lockheed Martin", e: "NYSE" },
  { s: "RTX", n: "RTX (Raytheon)", e: "NYSE" },
  { s: "DE", n: "Deere & Company", e: "NYSE" },
  { s: "MMM", n: "3M", e: "NYSE" },
  // ── US énergie électrique / utilities (dont VST) ──
  { s: "VST", n: "Vistra Corp", e: "NYSE" },
  { s: "NRG", n: "NRG Energy", e: "NYSE" },
  { s: "CEG", n: "Constellation Energy", e: "NASDAQ" },
  { s: "NEE", n: "NextEra Energy", e: "NYSE" },
  { s: "DUK", n: "Duke Energy", e: "NYSE" },
  { s: "SO", n: "Southern Company", e: "NYSE" },
  { s: "D", n: "Dominion Energy", e: "NYSE" },
  { s: "AEP", n: "American Electric Power", e: "NASDAQ" },
  // ── EV / auto ──
  { s: "F", n: "Ford Motor", e: "NYSE" },
  { s: "GM", n: "General Motors", e: "NYSE" },
  { s: "RIVN", n: "Rivian Automotive", e: "NASDAQ" },
  { s: "LCID", n: "Lucid Group", e: "NASDAQ" },
  { s: "NIO", n: "NIO", e: "NYSE" },
  // ── Proxies crypto ──
  { s: "COIN", n: "Coinbase Global", e: "NASDAQ" },
  { s: "MSTR", n: "MicroStrategy (Strategy)", e: "NASDAQ" },
  { s: "MARA", n: "Marathon Digital", e: "NASDAQ" },
  { s: "RIOT", n: "Riot Platforms", e: "NASDAQ" },
  { s: "HOOD", n: "Robinhood Markets", e: "NASDAQ" },
  // ── ETF ──
  { s: "SPY", n: "SPDR S&P 500 ETF", e: "NYSE" },
  { s: "QQQ", n: "Invesco QQQ (Nasdaq 100)", e: "NASDAQ" },
  { s: "VOO", n: "Vanguard S&P 500 ETF", e: "NYSE" },
  { s: "VTI", n: "Vanguard Total Market ETF", e: "NYSE" },
  { s: "IWM", n: "iShares Russell 2000 ETF", e: "NYSE" },
  { s: "DIA", n: "SPDR Dow Jones ETF", e: "NYSE" },
  { s: "ARKK", n: "ARK Innovation ETF", e: "NYSE" },
  // ── Semi / tech international ──
  { s: "TSM", n: "Taiwan Semiconductor (ADR)", e: "NYSE" },
  { s: "ASML", n: "ASML Holding (ADR)", e: "NASDAQ" },
  { s: "SAP", n: "SAP (ADR)", e: "NYSE" },
  // ── France / CAC 40 ──
  { s: "MC.PA", n: "LVMH", e: "Euronext Paris" },
  { s: "OR.PA", n: "L'Oréal", e: "Euronext Paris" },
  { s: "RMS.PA", n: "Hermès International", e: "Euronext Paris" },
  { s: "TTE.PA", n: "TotalEnergies", e: "Euronext Paris" },
  { s: "SAN.PA", n: "Sanofi", e: "Euronext Paris" },
  { s: "AIR.PA", n: "Airbus", e: "Euronext Paris" },
  { s: "SU.PA", n: "Schneider Electric", e: "Euronext Paris" },
  { s: "AI.PA", n: "Air Liquide", e: "Euronext Paris" },
  { s: "BNP.PA", n: "BNP Paribas", e: "Euronext Paris" },
  { s: "DG.PA", n: "Vinci", e: "Euronext Paris" },
  { s: "SAF.PA", n: "Safran", e: "Euronext Paris" },
  { s: "EL.PA", n: "EssilorLuxottica", e: "Euronext Paris" },
  { s: "KER.PA", n: "Kering", e: "Euronext Paris" },
  { s: "CAP.PA", n: "Capgemini", e: "Euronext Paris" },
  { s: "STLAP.PA", n: "Stellantis", e: "Euronext Paris" },
  { s: "GLE.PA", n: "Société Générale", e: "Euronext Paris" },
  { s: "ACA.PA", n: "Crédit Agricole", e: "Euronext Paris" },
  { s: "ENGI.PA", n: "Engie", e: "Euronext Paris" },
  { s: "DSY.PA", n: "Dassault Systèmes", e: "Euronext Paris" },
  { s: "ORA.PA", n: "Orange", e: "Euronext Paris" },
  // ── Allemagne / autres EU ──
  { s: "SIE.DE", n: "Siemens", e: "Xetra" },
  { s: "SAP.DE", n: "SAP", e: "Xetra" },
  { s: "VOW3.DE", n: "Volkswagen", e: "Xetra" },
  { s: "MBG.DE", n: "Mercedes-Benz Group", e: "Xetra" },
  { s: "BMW.DE", n: "BMW", e: "Xetra" },
  { s: "ALV.DE", n: "Allianz", e: "Xetra" },
  { s: "ASML.AS", n: "ASML Holding", e: "Euronext Amsterdam" },
  { s: "NESN.SW", n: "Nestlé", e: "SIX Swiss" },
  { s: "NOVN.SW", n: "Novartis", e: "SIX Swiss" },
  { s: "SHEL.L", n: "Shell", e: "London" },
  { s: "AZN.L", n: "AstraZeneca", e: "London" },
  { s: "HSBA.L", n: "HSBC Holdings", e: "London" },
];

// Fusion : liste cur\u00e9e d'abord (noms propres + Europe), puis tout le r\u00e9pertoire
// US (~6700 titres), en \u00e9vitant les doublons de symbole.
const _seen = new Set(CURATED.map((x) => x.s.toUpperCase()));
export const STOCKS = [
  ...CURATED,
  ...US_TICKERS.filter((x) => !_seen.has(x.s.toUpperCase())),
];

const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Recherche locale : matche par ticker ou par nom, avec un classement par pertinence.
export function searchStocks(query, limit = 8) {
  const q = norm(String(query || "").trim());
  if (!q) return [];
  const scored = [];
  for (const it of STOCKS) {
    const s = norm(it.s);
    const n = norm(it.n);
    let score = -1;
    if (s === q) score = 100;
    else if (s.startsWith(q)) score = 90;
    else if (n.startsWith(q)) score = 80;
    else if (s.includes(q)) score = 60;
    else if (n.includes(q)) score = 50;
    if (score >= 0) scored.push({ ...it, score });
  }
  scored.sort((a, b) => b.score - a.score || a.s.length - b.s.length);
  return scored.slice(0, limit);
}
