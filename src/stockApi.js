// Accès optionnel à l'API Finnhub (recherche mondiale + cours en direct).
// La clé est fournie par l'utilisateur (finnhub.io/register, gratuit) et stockée
// en local. Sans clé, l'app se rabat sur la recherche locale hors-ligne.
const BASE = "https://finnhub.io/api/v1";

// Recherche de symboles dans le monde entier.
export async function searchSymbols(query, apiKey) {
  const q = String(query || "").trim();
  if (!q || !apiKey) return [];
  const r = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}&token=${encodeURIComponent(apiKey)}`);
  if (!r.ok) throw new Error(`search HTTP ${r.status}`);
  const data = await r.json();
  return (data.result || [])
    // On garde les symboles "simples" (évite les codes exotiques peu utiles).
    .filter((x) => x.symbol && !x.symbol.includes("."))
    .slice(0, 12)
    .map((x) => ({ s: x.symbol, n: x.description || x.symbol, e: x.type || "", api: true }));
}

// Recommandations analystes agrégées (gratuit chez Finnhub) : pour chaque
// période mensuelle, nombre d'analystes en strongBuy/buy/hold/sell/strongSell.
// Renvoie les 2 périodes les plus récentes (dernière + précédente pour la tendance).
export async function fetchRecommendations(symbol, apiKey) {
  const s = String(symbol || "").trim();
  if (!s || !apiKey) return null;
  const r = await fetch(`${BASE}/stock/recommendation?symbol=${encodeURIComponent(s)}&token=${encodeURIComponent(apiKey)}`);
  if (!r.ok) throw new Error(`reco HTTP ${r.status}`);
  const d = await r.json();
  if (!Array.isArray(d) || d.length === 0) return null;
  d.sort((a, b) => (a.period < b.period ? 1 : -1));
  return d.slice(0, 2);
}

// Cours actuel d'un symbole (champ "c" = current price chez Finnhub).
export async function fetchQuote(symbol, apiKey) {
  const s = String(symbol || "").trim();
  if (!s || !apiKey) return null;
  const r = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(s)}&token=${encodeURIComponent(apiKey)}`);
  if (!r.ok) throw new Error(`quote HTTP ${r.status}`);
  const d = await r.json();
  return d && typeof d.c === "number" && d.c > 0 ? d.c : null;
}
