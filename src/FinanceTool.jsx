import { useState, useEffect, useRef } from "react";
import { searchStocks } from "./stocks";
import { searchSymbols, fetchQuote, fetchRecommendations } from "./stockApi";

// ─── PREFILLED DATA ───────────────────────────────────────────────────────────
// Ce bloc est réécrit par Claude à chaque nouveau ticker demandé dans le chat.
const PREFILLED_TICKER = "VST";
const PREFILLED_MODE = "invest";
const PREFILLED_PROFILE = "cyclical";
const PREFILLED_CURRENT_PRICE = "173";
const PREFILLED_VALUES_INVEST = {
  rsi: "45", vsMA50: "-5", vsMA200: "8", momentum: "-12",
  peVsSector: "0", pegRatio: "0.41", fromATH: "-32",
  analystUpside: "20", ratingTrend: "0", newsFlow: "2",
  revenueGrowth: "43", marginTrend: "2", debtLevel: "0",
};
const PREFILLED_VALUES_GROWTH = {
  revenueGrowthYoY: "43", epsGrowthYoY: "211", forwardGrowthEst: "13",
  growthTrend: "2", guidanceRevision: "1", tamExpansion: "2",
  grossMargin: "", gMarginTrend: "1", cashPosition: "1",
  priceMomentum3m: "-8", analystRevisions: "0", insiderActivity: "-1",
  valuationStretch: "0", dilutionRisk: "1", concentrationRisk: "-1",
};
const PREFILLED_VALUES = PREFILLED_MODE === "growth" ? PREFILLED_VALUES_GROWTH : PREFILLED_VALUES_INVEST;
const PREFILLED_NOTE = "Vistra Corp (VST, NYSE) — 29 juin 2026. Producteur/distributeur d'électricité US (gaz, nucléaire, charbon, solaire, stockage), positionné sur la demande IA/data centers. Titre en repli de 12% sur 6 jours (-6,6Md$ de capitalisation) suite aux propositions PJM visant à plafonner les prix de l'électricité, malgré ventes d'initiés signalées. RSI neutre (45), résistance ~200$, support ~150$. Fondamentaux très solides : revenus T1 2026 +43%, retour à la profitabilité nette (980M$ vs perte un an plus tôt), PEG très attractif (0,41). Catalyseur majeur : coentreprise Helix Digital Infrastructure (10Md$) avec KKR/Nvidia/Kuwait Investment Authority pour l'infrastructure data centers IA. Consensus \"Strong Buy\" — target moyen pondéré ~207$. Risque réglementaire (PJM) à surveiller.";
const PREFILLED_ANALYSTS = [
  { id: 1, firm: "Morgan Stanley", rating: "Buy", target: "210", date: "2026-06-24", reputation: 5, outcome: "pending" },
  { id: 2, firm: "Seaport Research", rating: "Buy", target: "230", date: "2026-06-15", reputation: 3, outcome: "pending" },
  { id: 3, firm: "Bernstein (initiation)", rating: "Buy", target: "187", date: "2026-06-16", reputation: 4, outcome: "pending" },
  { id: 4, firm: "JPMorgan", rating: "Buy", target: "93", date: "2026-05-12", reputation: 5, outcome: "pending" },
];
const STORAGE_KEY = "finance-tool-v3";
const API_KEY_STORAGE = "finance-tool-finnhub-key";

// ─── COMPANY PROFILES ─────────────────────────────────────────────────────────
const PROFILES = {
  standard:     { label: "Standard",          weights: { technical:25, valuation:25, sentiment:25, fundamentals:25 }, tags: [],
    reminders: ["Résultats vs attentes du marché, pas seulement en absolu", "Rotation sectorielle en cours", "Sentiment de marché général (avidité/peur)"] },
  growth:       { label: "Croissance établie",weights: { technical:20, valuation:20, sentiment:20, fundamentals:40 }, tags: [],
    reminders: ["Taux d'intérêt — une hausse pénalise davantage les valeurs de croissance", "Concurrence directe et parts de marché", "Capacité à maintenir le rythme de croissance"] },
  unprofitable: { label: "Non-profitable",    weights: { technical:25, valuation:15, sentiment:25, fundamentals:35 }, tags: ["⚠️ Perte GAAP"],
    reminders: ["Taux d'intérêt — impact fort sur le coût du financement", "Risque de dilution via levées de capital", "Trésorerie disponible vs rythme de cash-burn"] },
  crypto_proxy: { label: "Proxy crypto/BTC",  weights: { technical:35, valuation:5,  sentiment:30, fundamentals:30 }, tags: ["⚠️ Proxy crypto", "⚠️ PER inutilisable"],
    reminders: ["Cours du Bitcoin/crypto sous-jacent — facteur dominant", "Régulation crypto (juridictions concernées)", "Niveau d'endettement lié aux achats de crypto"] },
  cyclical:     { label: "Valeur cyclique",   weights: { technical:30, valuation:35, sentiment:20, fundamentals:15 }, tags: ["⚠️ Cyclique"],
    reminders: ["Prix de la matière première / cycle économique sous-jacent", "Taux de change si activité exportatrice", "Coûts de production (énergie, main d'œuvre, intrants)"] },
  smallcap:     { label: "Small-cap growth",  weights: { technical:20, valuation:20, sentiment:25, fundamentals:35 }, tags: ["⚠️ Liquidité réduite"],
    reminders: ["Liquidité du titre — spreads larges possibles", "Dépendance à un produit/client unique", "Risque de dilution ou de financement à court terme"] },
};

const GENERAL_REMINDERS = [
  "Résultats financiers vs attentes (l'écart compte plus que le chiffre absolu)",
  "Guidance et prévisions de la direction",
  "Taux d'intérêt et politique des banques centrales",
  "Inflation, emploi, croissance du PIB",
  "Rotation sectorielle et performance des concurrents",
  "Sentiment de marché général (avidité vs peur)",
  "Niveaux techniques (supports/résistances) — effet autoréalisateur",
  "Flux des investisseurs institutionnels et ETF",
  "Événements géopolitiques (guerres, tensions commerciales, élections)",
  "Régulation spécifique au secteur",
  "Taux de change pour les entreprises multinationales/exportatrices",
  "Structure actionnariale et risque de dilution",
];

// ─── INVEST FIELDS ────────────────────────────────────────────────────────────
const INVEST_FIELDS = {
  technical:    { label: "Technique",          color: "#60a5fa", items: [
    { key: "rsi",          label: "RSI (14j)",                  hint: "30=survendu, 70=surachat",                             placeholder: "ex: 45" },
    { key: "vsMA50",       label: "Prix vs MM50 (%)",           hint: "Au-dessus (+) ou en-dessous (-) de la moyenne 50j",   placeholder: "ex: 3.5" },
    { key: "vsMA200",      label: "Prix vs MM200 (%)",          hint: "Au-dessus (+) ou en-dessous (-) de la moyenne 200j",  placeholder: "ex: -8" },
    { key: "momentum",     label: "Variation 1 mois (%)",       hint: "Tendance récente du cours",                            placeholder: "ex: 12" },
  ]},
  valuation:    { label: "Valorisation",       color: "#a78bfa", items: [
    { key: "peVsSector",   label: "PER vs secteur (%)",         hint: "Négatif = moins cher que le secteur. Mettre 0 si inutilisable.", placeholder: "ex: -15" },
    { key: "pegRatio",     label: "PEG ratio",                  hint: "<1=sous-évalué, >2=cher. Mettre 0 si non-profitable.", placeholder: "ex: 1.2" },
    { key: "fromATH",      label: "Distance au + haut 52s (%)", hint: "Toujours négatif. -30 = 30% sous son plus haut",       placeholder: "ex: -25" },
  ]},
  sentiment:    { label: "Sentiment",          color: "#34d399", items: [
    { key: "analystUpside",label: "Upside analystes (%)",       hint: "Potentiel de hausse selon consensus",                  placeholder: "ex: 18" },
    { key: "ratingTrend",  label: "Tendance des notes (-2/+2)", hint: "-2=dégradations, 0=stable, +2=upgrades",              placeholder: "ex: 1" },
    { key: "newsFlow",     label: "Flux d'actualités (-2/+2)",  hint: "-2=très négatif, 0=neutre, +2=très positif",          placeholder: "ex: 0" },
  ]},
  fundamentals: { label: "Qualité financière", color: "#f59e0b", items: [
    { key: "revenueGrowth",label: "Croissance revenus YoY (%)", hint: "Variation du CA sur 1 an",                            placeholder: "ex: 22" },
    { key: "marginTrend",  label: "Tendance des marges (-2/+2)",hint: "-2=marges qui s'effondrent, +2=améliorent",           placeholder: "ex: 1" },
    { key: "debtLevel",    label: "Endettement (-2/+2)",        hint: "-2=très endetté/risqué, +2=bilan très sain",          placeholder: "ex: 0" },
  ]},
};

// ─── GROWTH FIELDS ────────────────────────────────────────────────────────────
const GROWTH_FIELDS = {
  hypergrowth:  { label: "Hypercroissance",    color: "#f472b6", items: [
    { key: "revenueGrowthYoY",  label: "Croissance revenus YoY (%)",  hint: ">40% = hypercroissance",                        placeholder: "ex: 65" },
    { key: "epsGrowthYoY",      label: "Croissance BPA YoY (%)",      hint: "Vide si pas encore profitable",                 placeholder: "ex: 80" },
    { key: "forwardGrowthEst",  label: "Croissance estimée N+1 (%)",  hint: "Estimation consensus année prochaine",           placeholder: "ex: 45" },
  ]},
  acceleration: { label: "Accélération",       color: "#fb923c", items: [
    { key: "growthTrend",      label: "Tendance croissance (-2/+2)",  hint: "-2=ralentit, +2=accélère trimestre après trimestre", placeholder: "ex: 1" },
    { key: "guidanceRevision", label: "Révisions guidance (-2/+2)",   hint: "-2=abaissée, +2=relevée récemment",              placeholder: "ex: 1" },
    { key: "tamExpansion",     label: "Expansion marché (-2/+2)",     hint: "L'entreprise élargit-elle son marché adressable ?", placeholder: "ex: 1" },
  ]},
  quality:      { label: "Qualité",            color: "#34d399", items: [
    { key: "grossMargin",      label: "Marge brute (%)",              hint: ">60% = très scalable",                           placeholder: "ex: 70" },
    { key: "gMarginTrend",     label: "Tendance marges (-2/+2)",      hint: "-2=s'effondrent, +2=s'améliorent",              placeholder: "ex: 1" },
    { key: "cashPosition",     label: "Solidité financière (-2/+2)",  hint: "-2=cash-burn élevé, +2=bilan très solide",       placeholder: "ex: 1" },
  ]},
  momentum:     { label: "Momentum",           color: "#60a5fa", items: [
    { key: "priceMomentum3m",  label: "Variation 3 mois (%)",         hint: "Tendance du cours sur 3 mois",                  placeholder: "ex: 35" },
    { key: "analystRevisions", label: "Révisions analystes (-2/+2)",  hint: "-2=dégradations, +2=upgrades",                  placeholder: "ex: 1" },
    { key: "insiderActivity",  label: "Activité initiés (-2/+2)",     hint: "-2=ventes massives, +2=achats significatifs",    placeholder: "ex: 0" },
  ]},
  risks:        { label: "Risques",            color: "#f87171", items: [
    { key: "valuationStretch", label: "Tension valorisation (-2/+2)", hint: "-2=valorisation très tendue, +2=marge de sécurité", placeholder: "ex: 0" },
    { key: "dilutionRisk",     label: "Risque dilution (-2/+2)",      hint: "-2=levées fréquentes/probables, +2=pas de besoin", placeholder: "ex: 0" },
    { key: "concentrationRisk",label: "Dépendance produit (-2/+2)",   hint: "-2=très dépendant d'un segment, +2=diversifié", placeholder: "ex: 0" },
  ]},
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// [FIX #5] RSI neutre (50) retourne maintenant exactement 50, pas 60
function normalizeInvest(key, v) {
  switch (key) {
    case "rsi":
      if (v <= 30) return clamp(80 + (30 - v) * 1.0, 0, 100);
      if (v <= 50) return 50 + (50 - v) * 1.5;
      if (v <= 70) return 50 - (v - 50) * 1.5;
      return Math.max(0, 20 - (v - 70) * 2);
    case "vsMA50": case "vsMA200": return clamp(50 + v * 1.2, 0, 100);
    case "momentum":      return clamp(50 + v * 1.5, 0, 100);
    case "peVsSector":    return clamp(50 - v * 0.8, 0, 100);
    case "pegRatio":
      if (v <= 0) return 50;
      if (v <= 1) return 85 - v * 10;
      if (v <= 2) return 75 - (v - 1) * 35;
      return Math.max(0, 40 - (v - 2) * 15);
    case "fromATH":       return clamp(50 - v * 0.6, 0, 100);
    case "analystUpside": return clamp(50 + v * 1.5, 0, 100);
    case "ratingTrend": case "newsFlow": case "marginTrend": case "debtLevel":
      return clamp(50 + v * 25, 0, 100);
    case "revenueGrowth": return clamp(50 + v * 1.2, 0, 100);
    default: return 50;
  }
}

function normalizeGrowth(key, v) {
  switch (key) {
    case "revenueGrowthYoY": return clamp(30 + v * 0.9, 0, 100);
    case "epsGrowthYoY":     return clamp(50 + v * 0.6, 0, 100);
    case "forwardGrowthEst": return clamp(35 + v * 1.0, 0, 100);
    case "grossMargin":      return clamp(v * 1.1, 0, 100);
    case "priceMomentum3m":  return clamp(50 + v * 1.0, 0, 100);
    case "growthTrend": case "guidanceRevision": case "tamExpansion":
    case "gMarginTrend": case "cashPosition": case "analystRevisions":
    case "insiderActivity": case "valuationStretch": case "dilutionRisk":
    case "concentrationRisk":
      return clamp(50 + v * 25, 0, 100);
    default: return 50;
  }
}

function parseVal(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function computeScores(fields, values, normFn, weights) {
  const catScores = {}, catConfidence = {};
  let weighted = 0, used = 0;
  for (const [k, cat] of Object.entries(fields)) {
    const subs = cat.items.map(i => { const n = parseVal(values[i.key]); return n !== null ? normFn(i.key, n) : null; }).filter(s => s !== null);
    catScores[k] = subs.length ? subs.reduce((a, b) => a + b, 0) / subs.length : null;
    catConfidence[k] = subs.length / cat.items.length;
    if (catScores[k] !== null) {
      const effectiveWeight = (weights[k] || 25) * (0.5 + 0.5 * catConfidence[k]);
      weighted += catScores[k] * effectiveWeight;
      used += effectiveWeight;
    }
  }
  return { catScores, catConfidence, final: used > 0 ? weighted / used : null };
}

function computeSensitivity(fields, values, normFn, weights) {
  const base = computeScores(fields, values, normFn, weights).final;
  if (base === null) return null;
  let topField = null, topDelta = 0;
  for (const [, cat] of Object.entries(fields)) {
    for (const item of cat.items) {
      const raw = parseVal(values[item.key]);
      if (raw === null) continue;
      const perturbed = { ...values, [item.key]: "" };
      const perturbedScore = computeScores(fields, perturbed, normFn, weights).final;
      if (perturbedScore === null) continue;
      const delta = Math.abs(base - perturbedScore);
      if (delta > topDelta) { topDelta = delta; topField = item.label; }
    }
  }
  return topField ? { field: topField, impact: Math.round(topDelta) } : null;
}

function computeScoreRange(fields, values, normFn, weights, marginPct = 0.15) {
  const base = computeScores(fields, values, normFn, weights).final;
  if (base === null) return null;
  const buildShifted = (direction) => {
    const shifted = { ...values };
    for (const cat of Object.values(fields)) {
      for (const item of cat.items) {
        const raw = parseVal(values[item.key]);
        if (raw === null) continue;
        const isSmallScale = Math.abs(raw) <= 5 && item.key.match(/Trend|Revision|Activity|Risk|Stretch|Expansion|Position/i);
        const delta = isSmallScale ? 0.5 * direction : Math.abs(raw) * marginPct * direction || 2 * direction;
        shifted[item.key] = String(raw + delta);
      }
    }
    return shifted;
  };
  const optimistic  = computeScores(fields, buildShifted(1),  normFn, weights).final;
  const pessimistic = computeScores(fields, buildShifted(-1), normFn, weights).final;
  return {
    low:  Math.round(Math.min(optimistic, pessimistic)),
    base: Math.round(base),
    high: Math.round(Math.max(optimistic, pessimistic)),
  };
}

function detectContradictions(fields, values, normFn, mode) {
  const contradictions = [];
  const v = (k) => parseVal(values[k]);
  if (mode === "invest") {
    if (v("rsi") !== null && v("revenueGrowth") !== null && v("rsi") >= 65 && v("revenueGrowth") < 5)
      contradictions.push("RSI en surachat alors que la croissance des revenus est faible — le marché pourrait anticiper plus que ce que montrent les chiffres.");
    if (v("momentum") !== null && v("revenueGrowth") !== null && v("momentum") <= -15 && v("revenueGrowth") >= 20)
      contradictions.push("Le cours baisse fortement alors que les revenus croissent vite — décalage entre fondamentaux et perception du marché.");
    if (v("analystUpside") !== null && v("ratingTrend") !== null && v("analystUpside") >= 30 && v("ratingTrend") <= -1)
      contradictions.push("Fort upside théorique annoncé mais les notes des analystes se dégradent — vérifier si le target est à jour.");
    if (v("debtLevel") !== null && v("revenueGrowth") !== null && v("debtLevel") <= -1 && v("revenueGrowth") >= 30)
      contradictions.push("Forte croissance mais endettement signalé comme préoccupant — la croissance est-elle financée de façon soutenable ?");
  } else {
    if (v("growthTrend") !== null && v("priceMomentum3m") !== null && v("growthTrend") >= 1 && v("priceMomentum3m") <= -15)
      contradictions.push("La croissance s'accélère mais le cours recule depuis 3 mois — le marché doute ou n'a pas encore intégré l'information.");
    if (v("valuationStretch") !== null && v("revenueGrowthYoY") !== null && v("valuationStretch") <= -1 && v("revenueGrowthYoY") < 15)
      contradictions.push("Valorisation déjà tendue alors que la croissance n'est que modérée — peu de marge d'erreur.");
    if (v("insiderActivity") !== null && v("analystRevisions") !== null && v("insiderActivity") <= -1 && v("analystRevisions") >= 1)
      contradictions.push("Les analystes deviennent optimistes alors que des initiés vendent — signaux contradictoires entre interne et externe.");
  }
  return contradictions;
}

function autoRiskTags(values, mode) {
  const tags = [];
  const v = (k) => parseVal(values[k]);
  if (mode === "invest") {
    if (v("rsi") !== null && v("rsi") > 70) tags.push("⚠️ RSI surachat");
    if (v("peVsSector") !== null && v("peVsSector") > 30) tags.push("⚠️ Valorisation tendue");
    if (v("pegRatio") !== null && v("pegRatio") > 2.5) tags.push("⚠️ PEG élevé");
    if (v("debtLevel") !== null && v("debtLevel") <= -1) tags.push("⚠️ Endettement élevé");
    if (v("revenueGrowth") !== null && v("revenueGrowth") < 0) tags.push("⚠️ CA en baisse");
    if (v("fromATH") !== null && v("fromATH") <= -50) tags.push("⚠️ -50% vs plus haut");
    if (v("analystUpside") !== null && v("analystUpside") > 80) tags.push("⚠️ Upside analystes très élevé — vérifier");
  } else {
    if (v("valuationStretch") !== null && v("valuationStretch") <= -1) tags.push("⚠️ Valorisation tendue");
    if (v("dilutionRisk") !== null && v("dilutionRisk") <= -1) tags.push("⚠️ Risque de dilution");
    if (v("epsGrowthYoY") === null) tags.push("ℹ️ Pas encore profitable");
    if (v("growthTrend") !== null && v("growthTrend") <= -1) tags.push("⚠️ Croissance ralentit");
  }
  return tags;
}

function investVerdict(s) {
  if (s >= 70) return { label: "Investir maintenant", color: "#34d399", bg: "rgba(52,211,153,.12)" };
  if (s >= 55) return { label: "Plutôt favorable",    color: "#a3e635", bg: "rgba(163,230,53,.1)" };
  if (s >= 45) return { label: "Neutre",              color: "#fbbf24", bg: "rgba(251,191,36,.1)" };
  if (s >= 30) return { label: "Plutôt attendre",     color: "#fb923c", bg: "rgba(251,146,60,.1)" };
  return              { label: "Attendre",             color: "#f87171", bg: "rgba(248,113,113,.1)" };
}

function growthVerdict(s) {
  if (s >= 75) return { label: "Fort potentiel détecté", color: "#34d399", bg: "rgba(52,211,153,.12)" };
  if (s >= 60) return { label: "Potentiel intéressant",  color: "#a3e635", bg: "rgba(163,230,53,.1)" };
  if (s >= 45) return { label: "Profil mitigé",          color: "#fbbf24", bg: "rgba(251,191,36,.1)" };
  if (s >= 30) return { label: "Signaux faibles",        color: "#fb923c", bg: "rgba(251,146,60,.1)" };
  return              { label: "Peu convaincant",         color: "#f87171", bg: "rgba(248,113,113,.1)" };
}

// ─── RADAR CHART ──────────────────────────────────────────────────────────────
function RadarChart({ catScores, fields, size = 180 }) {
  const keys = Object.keys(fields);
  const n = keys.length;
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, pct) => { const a = angle(i), rr = r * (pct / 100); return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  const colors = Object.values(fields).map(f => f.color);
  const scores = keys.map(k => catScores[k] ?? 0);
  const polyPoints = scores.map((s, i) => pt(i, s).join(",")).join(" ");
  const fillColor = scores.some(s => s >= 70) ? "#34d399" : scores.some(s => s >= 55) ? "#a3e635" : "#fbbf24";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[25, 50, 75, 100].map(lvl => (
        <polygon key={lvl} points={keys.map((_, i) => pt(i, lvl).join(",")).join(" ")} fill="none" stroke="#1e2533" strokeWidth="1" />
      ))}
      {keys.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#1e2533" strokeWidth="1" />; })}
      <polygon points={polyPoints} fill={fillColor} fillOpacity="0.15" stroke={fillColor} strokeWidth="2" />
      {scores.map((s, i) => { const [x, y] = pt(i, s); return <circle key={i} cx={x} cy={y} r="3" fill={colors[i]} />; })}
      {keys.map((k, i) => { const [x, y] = pt(i, 115); return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={colors[i]} fontSize="8.5" fontWeight="700">{fields[k].label.split(" ")[0]}</text>; })}
    </svg>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FinanceTool() {
  const [mode, setMode]           = useState(PREFILLED_MODE);
  const [tab, setTab]             = useState("analyse");
  const [ticker, setTicker]       = useState(PREFILLED_TICKER);
  const [values, setValues]       = useState(PREFILLED_VALUES);
  const [profile, setProfile]     = useState(PREFILLED_PROFILE);
  const [weights, setWeights]     = useState(PROFILES[PREFILLED_PROFILE].weights);
  const [showWeights, setShowWeights] = useState(false);
  const [showExplain, setShowExplain] = useState(true);
  const [history, setHistory]     = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState(""); // [NEW #3]
  const [compareIds, setCompareIds]   = useState([]);
  const [compareMode, setCompareMode] = useState(PREFILLED_MODE);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [saveToast, setSaveToast] = useState(false); // [NEW #8]
  const [checkedFactors, setCheckedFactors] = useState([]);
  const [showChecklist, setShowChecklist]   = useState(false);
  const [analystRatings, setAnalystRatings] = useState(PREFILLED_ANALYSTS);
  const [showAnalysts, setShowAnalysts]     = useState(true);
  const [newAnalyst, setNewAnalyst] = useState({ firm: "", rating: "Buy", target: "", date: "", reputation: "3" });
  const [importFeedback, setImportFeedback] = useState("");
  // [NEW #1] Note libre par analyse
  const [analysisNote, setAnalysisNote] = useState(PREFILLED_NOTE);
  // [NEW #2] Prix actuel pour calcul upside automatique
  const [currentPrice, setCurrentPrice] = useState(PREFILLED_CURRENT_PRICE);
  // [NEW] Moteur de recherche d'actions (local + API optionnelle)
  const [results, setResults]     = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [apiKey, setApiKey]       = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  // [NEW] Consensus analystes en direct (Finnhub recommendation trends)
  const [liveRecs, setLiveRecs] = useState(null);
  const [liveRecsLoading, setLiveRecsLoading] = useState(false);
  const [liveRecsError, setLiveRecsError] = useState("");
  const searchTimer = useRef(null);

  const storage = {
    get: async (key) => {
      try { return window.storage ? window.storage.get(key) : (v => v ? { value: v } : null)(localStorage.getItem(key)); }
      catch { return null; }
    },
    set: async (key, value) => {
      try { window.storage ? window.storage.set(key, value) : localStorage.setItem(key, value); }
      catch {}
    },
  };

  useEffect(() => {
    (async () => {
      try { const r = await storage.get(STORAGE_KEY); if (r?.value) setHistory(JSON.parse(r.value)); }
      catch {}
    })();
    try { const k = localStorage.getItem(API_KEY_STORAGE); if (k) setApiKey(k); } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fields    = mode === "invest" ? INVEST_FIELDS : GROWTH_FIELDS;
  const normFn    = mode === "invest" ? normalizeInvest : normalizeGrowth;
  const verdictFn = mode === "invest" ? investVerdict : growthVerdict;
  const { catScores, catConfidence, final: finalScore } = computeScores(fields, values, normFn, weights);
  const verdict    = finalScore !== null ? verdictFn(finalScore) : null;
  const autoTags   = autoRiskTags(values, mode);
  const allTags    = [...new Set([...(PROFILES[profile]?.tags || []), ...autoTags])];
  const filledCount = Object.keys(fields).reduce((s, k) => s + fields[k].items.filter(i => values[i.key] !== "" && values[i.key] !== undefined).length, 0);
  const totalFields = Object.keys(fields).reduce((s, k) => s + fields[k].items.length, 0);
  const sensitivity    = finalScore !== null ? computeSensitivity(fields, values, normFn, weights) : null;
  const scoreRange     = finalScore !== null ? computeScoreRange(fields, values, normFn, weights) : null;
  const contradictions = detectContradictions(fields, values, normFn, mode);

  // [NEW #6] Somme des poids pour feedback visuel
  const weightSum = Object.values(weights).reduce((s, v) => s + (v || 0), 0);

  const setVal = (key, v) => setValues(p => ({ ...p, [key]: v }));

  // [NEW] Recherche : local instantané + API mondiale (debouncée) si clé fournie.
  const onTickerChange = (v) => {
    setTicker(v.toUpperCase());
    const local = searchStocks(v, 8);
    setResults(local);
    setShowResults(v.trim().length > 0);
    if (apiKey && v.trim().length >= 2) {
      clearTimeout(searchTimer.current);
      setSearching(true);
      searchTimer.current = setTimeout(async () => {
        try {
          const remote = await searchSymbols(v, apiKey);
          const seen = new Set(local.map(r => r.s));
          setResults([...local, ...remote.filter(r => !seen.has(r.s))].slice(0, 12));
        } catch { /* réseau/clé invalide : on garde le local */ }
        setSearching(false);
      }, 350);
    } else {
      setSearching(false);
    }
  };

  const selectStock = async (item) => {
    setTicker(item.s.toUpperCase());
    setShowResults(false);
    setResults([]);
    if (apiKey) {
      setPriceLoading(true);
      try { const price = await fetchQuote(item.s, apiKey); if (price) setCurrentPrice(String(price)); }
      catch { /* ignore */ }
      setPriceLoading(false);
      loadLiveRecs(item.s);
    }
  };

  const refreshPrice = async () => {
    if (!apiKey || !ticker.trim()) return;
    setPriceLoading(true);
    try { const price = await fetchQuote(ticker.trim(), apiKey); if (price) setCurrentPrice(String(price)); }
    catch { /* ignore */ }
    setPriceLoading(false);
  };

  // [NEW] Récupère les recommandations analystes en direct (agrégées).
  const loadLiveRecs = async (symbol) => {
    const sym = String(symbol || ticker).trim();
    if (!apiKey || !sym) return;
    setLiveRecsLoading(true); setLiveRecsError("");
    try {
      const recs = await fetchRecommendations(sym, apiKey);
      setLiveRecs(recs);
      if (!recs) setLiveRecsError("Aucune donnée analyste disponible pour ce titre.");
    } catch { setLiveRecsError("Impossible de récupérer les avis (clé invalide ou réseau)."); }
    setLiveRecsLoading(false);
  };

  const saveApiKey = (k) => {
    setApiKey(k);
    try { k ? localStorage.setItem(API_KEY_STORAGE, k) : localStorage.removeItem(API_KEY_STORAGE); }
    catch { /* ignore */ }
  };

  const applyProfile = (p) => { setProfile(p); setWeights(PROFILES[p].weights); };

  // [NEW #6] Normaliser les poids à 100
  const normalizeWeights = () => {
    const total = Object.values(weights).reduce((s, v) => s + (v || 0), 0);
    if (total === 0) return;
    const keys = Object.keys(weights);
    let remaining = 100;
    const normalized = {};
    keys.forEach((k, i) => {
      if (i === keys.length - 1) { normalized[k] = remaining; }
      else { normalized[k] = Math.round((weights[k] / total) * 100); remaining -= normalized[k]; }
    });
    setWeights(normalized);
  };

  const saveEntry = () => {
    if (finalScore === null) return;
    const entry = {
      id: Date.now(),
      ticker: ticker.trim().toUpperCase() || "—",
      score: Math.round(finalScore),
      verdict: verdict.label,
      date: new Date().toLocaleDateString("fr-FR"),
      values: { ...values },
      mode, profile,
      checkedFactors: [...checkedFactors],
      analystRatings: [...analystRatings],
      analysisNote,   // [NEW #1]
      currentPrice,   // [NEW #2]
    };
    const updated = [entry, ...history].slice(0, 40);
    setHistory(updated);
    storage.set(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    // [NEW #8] Toast de confirmation
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const deleteEntry = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    storage.set(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const loadEntry = (e) => {
    setTicker(e.ticker); setValues(e.values || {}); setMode(e.mode || "invest");
    setProfile(e.profile || "standard"); setWeights(PROFILES[e.profile || "standard"].weights);
    setCheckedFactors(e.checkedFactors || []);
    setAnalystRatings(e.analystRatings || []);
    setAnalysisNote(e.analysisNote || "");   // [NEW #1]
    setCurrentPrice(e.currentPrice || "");   // [NEW #2]
    setTab("analyse"); setShowHistory(false);
  };

  const resetForm = () => {
    const hasData = ticker || Object.keys(values).some(k => values[k] !== "") || analystRatings.length > 0 || checkedFactors.length > 0 || analysisNote;
    if (hasData && !window.confirm("Réinitialiser efface le ticker, les valeurs, la note, les avis d'analystes et la checklist. Continuer ?")) return;
    setTicker(""); setValues({}); setCheckedFactors([]); setAnalystRatings([]);
    setAnalysisNote(""); setCurrentPrice(""); // [NEW #1 #2]
  };

  const toggleFactor = (f) => setCheckedFactors(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);

  const addAnalystRating = () => {
    if (!newAnalyst.firm.trim()) return;
    const entry = { id: Date.now(), firm: newAnalyst.firm.trim(), rating: newAnalyst.rating, target: newAnalyst.target, date: newAnalyst.date || new Date().toISOString().slice(0, 10), reputation: parseInt(newAnalyst.reputation) || 3, outcome: "pending" };
    setAnalystRatings(p => [entry, ...p].sort((a, b) => new Date(b.date) - new Date(a.date)));
    setNewAnalyst({ firm: "", rating: "Buy", target: "", date: "", reputation: "3" });
  };

  const removeAnalystRating = (id) => setAnalystRatings(p => p.filter(a => a.id !== id));
  const setRatingOutcome = (id, outcome) => setAnalystRatings(p => p.map(a => a.id === id ? { ...a, outcome } : a));

  const firmAccuracy = (firmName) => {
    const name = firmName.toLowerCase();
    let hits = 0, misses = 0;
    for (const h of history) for (const a of (h.analystRatings || [])) {
      if (a.firm.toLowerCase() === name) { if (a.outcome === "hit") hits++; else if (a.outcome === "missed") misses++; }
    }
    for (const a of analystRatings) {
      if (a.firm.toLowerCase() === name) { if (a.outcome === "hit") hits++; else if (a.outcome === "missed") misses++; }
    }
    const total = hits + misses;
    return total > 0 ? { rate: hits / total, total } : null;
  };

  const ratingScoreMap = { "Strong Buy": 2, "Buy": 1, "Hold": 0, "Sell": -1, "Strong Sell": -2 };
  function clampNum(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // [FIX #7] Décote temporelle : un rating vieux de 6+ mois pèse moins
  const computeReliability = (rating, allRatings) => {
    const groupAvg = allRatings.reduce((s, a) => s + (ratingScoreMap[a.rating] ?? 0), 0) / Math.max(allRatings.length, 1);
    const deviation = Math.abs((ratingScoreMap[rating.rating] ?? 0) - groupAvg);
    const consensusFactor = clampNum(1 - deviation / 4, 0.3, 1);
    const reputationFactor = (rating.reputation || 3) / 5;
    const acc = firmAccuracy(rating.firm);
    const accuracyFactor = acc ? clampNum(acc.rate, 0.1, 1) : 0.5;
    const accuracyConfidence = acc ? clampNum(acc.total / 5, 0.2, 1) : 0;
    const daysOld = (Date.now() - new Date(rating.date).getTime()) / 86400000;
    const ageFactor = daysOld <= 30 ? 1.0 : daysOld <= 90 ? 0.85 : daysOld <= 180 ? 0.70 : daysOld <= 365 ? 0.55 : 0.35;
    const raw = (reputationFactor * 0.20 + consensusFactor * 0.30 + (accuracyFactor * accuracyConfidence + 0.5 * (1 - accuracyConfidence)) * 0.50) * ageFactor;
    return clampNum(Math.round(raw * 100), 10, 100);
  };

  const analystConsensus = (() => {
    if (analystRatings.length === 0) return null;
    const avgScore = analystRatings.reduce((s, a) => s + (ratingScoreMap[a.rating] ?? 0), 0) / analystRatings.length;
    const targets = analystRatings.map(a => parseFloat(a.target)).filter(t => !isNaN(t));
    const avgTarget = targets.length ? targets.reduce((a, b) => a + b, 0) / targets.length : null;
    const sorted = [...analystRatings].sort((a, b) => new Date(a.date) - new Date(b.date));
    let trend = 0;
    if (sorted.length >= 3) {
      const recentAvg = sorted.slice(-Math.ceil(sorted.length / 2)).reduce((s, a) => s + (ratingScoreMap[a.rating] ?? 0), 0) / Math.ceil(sorted.length / 2);
      const olderAvg  = sorted.slice(0, Math.floor(sorted.length / 2)).reduce((s, a) => s + (ratingScoreMap[a.rating] ?? 0), 0) / Math.max(Math.floor(sorted.length / 2), 1);
      trend = recentAvg - olderAvg;
    }
    const label = avgScore >= 1.5 ? "Strong Buy" : avgScore >= 0.5 ? "Buy" : avgScore >= -0.5 ? "Hold" : avgScore >= -1.5 ? "Sell" : "Strong Sell";
    const weightedTargets = analystRatings.filter(a => !isNaN(parseFloat(a.target)));
    let weightedAvgTarget = avgTarget;
    if (weightedTargets.length) {
      let wsum = 0, wtot = 0;
      for (const a of weightedTargets) { const w = computeReliability(a, analystRatings); wsum += parseFloat(a.target) * w; wtot += w; }
      weightedAvgTarget = wtot > 0 ? wsum / wtot : avgTarget;
    }
    return { avgScore, avgTarget, weightedAvgTarget, trend, label, count: analystRatings.length };
  })();

  // [NEW #2] Upside implicite calculé à partir du prix actuel
  const cpNum = parseVal(currentPrice);
  const impliedUpside = cpNum && analystConsensus?.weightedAvgTarget
    ? ((analystConsensus.weightedAvgTarget - cpNum) / cpNum * 100).toFixed(1)
    : null;

  // [NEW] Consensus dérivé des recommandations analystes en direct.
  const recConsensus = (() => {
    if (!liveRecs || !liveRecs[0]) return null;
    const c = liveRecs[0];
    const total = c.strongBuy + c.buy + c.hold + c.sell + c.strongSell;
    if (!total) return null;
    const score = (2 * c.strongBuy + c.buy - c.sell - 2 * c.strongSell) / total;
    const label = score >= 1.2 ? "Strong Buy" : score >= 0.4 ? "Buy" : score >= -0.4 ? "Hold" : score >= -1.2 ? "Sell" : "Strong Sell";
    let trend = 0;
    if (liveRecs[1]) {
      const p = liveRecs[1];
      const pt = p.strongBuy + p.buy + p.hold + p.sell + p.strongSell;
      if (pt) trend = score - (2 * p.strongBuy + p.buy - p.sell - 2 * p.strongSell) / pt;
    }
    return { c, total, score, label, trend, period: c.period };
  })();

  const toggleCompare = (id) => setCompareIds(p => p.includes(id) ? p.filter(x => x !== id) : p.length < 4 ? [...p, id] : p);

  const exportText = () => {
    const lines = [`ANALYSE — ${ticker || "—"} [${mode === "invest" ? "Invest" : "Croissance"}]`, new Date().toLocaleDateString("fr-FR"), ""];
    if (analysisNote) lines.push(`NOTE : ${analysisNote}`, "");
    lines.push(`SCORE : ${Math.round(finalScore ?? 0)}/100 — ${verdict?.label || "—"}`, `Profil : ${PROFILES[profile]?.label || "—"}`, "");
    for (const [k, cat] of Object.entries(fields)) {
      const cs = catScores[k];
      lines.push(`${cat.label.toUpperCase()} — score ${cs !== null ? Math.round(cs) : "—"}`);
      for (const item of cat.items) { const v = values[item.key]; if (v !== "" && v !== undefined) lines.push(`  - ${item.label} : ${v}`); }
      lines.push("");
    }
    lines.push("---", "Analyse générée avec l'aide de Claude. Ceci n'est pas un conseil financier.");
    return lines.join("\n");
  };

  const copyExport = async () => {
    try { await navigator.clipboard.writeText(exportText()); setCopyFeedback("Copié !"); }
    catch { setCopyFeedback("Impossible de copier"); }
    setTimeout(() => setCopyFeedback(""), 2500);
  };

  const downloadExport = () => {
    const blob = new Blob([exportText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `analyse-${(ticker || "action").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // [NEW #4] Export carte SVG partageable
  const downloadShareCard = () => {
    if (finalScore === null) return;
    const W = 420;
    const catEntries = Object.entries(fields).map(([k, cat]) => ({
      label: cat.label, score: catScores[k] !== null ? Math.round(catScores[k]) : 0, color: cat.color,
    }));
    const barX = 140, barW = 160, barH = 7, barY0 = 188;
    const vColor = verdict?.color || "#f8fafc";
    const H = barY0 + catEntries.length * 22 + 48;
    const catBars = catEntries.map((c, i) => {
      const y = barY0 + i * 22;
      const w = Math.round((c.score / 100) * barW);
      return `<text x="${barX - 8}" y="${y + 6}" text-anchor="end" font-family="Inter,system-ui,sans-serif" font-size="10" fill="${c.color}" font-weight="700">${c.label.substring(0, 14)}</text>
<rect x="${barX}" y="${y - 1}" width="${barW}" height="${barH}" rx="3" fill="#1a1f2e"/>
<rect x="${barX}" y="${y - 1}" width="${w}" height="${barH}" rx="3" fill="${c.color}" opacity="0.85"/>
<text x="${barX + barW + 8}" y="${y + 6}" font-family="Inter,system-ui,sans-serif" font-size="10" fill="#cbd5e1" font-weight="700">${c.score}</text>`;
    }).join("\n");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#090b10" rx="14"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="#1a1f2e" stroke-width="1.5" rx="13"/>
  <text x="20" y="30" font-family="Inter,system-ui,sans-serif" font-size="10" fill="#475569" font-weight="700" letter-spacing="1">ANALYSE FINANCIÈRE</text>
  <text x="${W - 20}" y="30" font-family="Inter,system-ui,sans-serif" font-size="10" fill="#475569" text-anchor="end">${new Date().toLocaleDateString("fr-FR")}</text>
  <text x="${W / 2}" y="72" font-family="Inter,system-ui,sans-serif" font-size="26" fill="#f8fafc" font-weight="800" text-anchor="middle" letter-spacing="-0.5">${ticker || "—"}</text>
  <text x="${W / 2}" y="90" font-family="Inter,system-ui,sans-serif" font-size="11" fill="#64748b" text-anchor="middle">${mode === "invest" ? "Invest / Timing" : "Croissance"} · ${PROFILES[profile]?.label || ""}</text>
  <text x="${W / 2}" y="148" font-family="Inter,system-ui,sans-serif" font-size="58" fill="${vColor}" font-weight="800" text-anchor="middle" letter-spacing="-2">${Math.round(finalScore)}</text>
  <text x="${W / 2}" y="168" font-family="Inter,system-ui,sans-serif" font-size="13" fill="${vColor}" font-weight="700" text-anchor="middle">${verdict?.label || ""}</text>
  ${catBars}
  <line x1="20" y1="${H - 26}" x2="${W - 20}" y2="${H - 26}" stroke="#1a1f2e" stroke-width="1"/>
  <text x="${W / 2}" y="${H - 10}" font-family="Inter,system-ui,sans-serif" font-size="9" fill="#334155" text-anchor="middle">Pas un conseil financier · Analyse indicative</text>
</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `carte-${(ticker || "action").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.svg` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const downloadFullBackup = () => {
    const payload = { exportedAt: new Date().toISOString(), version: 1, history };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `finance-tool-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const importBackupFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const incoming = Array.isArray(parsed) ? parsed : parsed.history;
        if (!Array.isArray(incoming)) throw new Error("format invalide");
        const merged = [...incoming, ...history.filter(h => !incoming.some(i => i.id === h.id))];
        const sorted = merged.sort((a, b) => b.id - a.id).slice(0, 200);
        setHistory(sorted);
        storage.set(STORAGE_KEY, JSON.stringify(sorted)).catch(() => {});
        setImportFeedback(`${incoming.length} analyses importées.`);
      } catch { setImportFeedback("Fichier invalide — vérifie que c'est bien un export de cet outil."); }
      setTimeout(() => setImportFeedback(""), 4000);
    };
    reader.readAsText(file);
  };

  // ─── STYLES ───────────────────────────────────────────────────────────────
  const C = { bg: "#090b10", card: "#111520", border: "#1a1f2e", text: "#e2e8f0", muted: "#64748b", dim: "#334155" };
  const S = {
    root: { background: C.bg, minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", color: C.text, padding: "16px 14px 80px" },
    wrap: { maxWidth: 740, margin: "0 auto" },
    title: { fontSize: 20, fontWeight: 800, color: "#f8fafc", letterSpacing: "-.5px" },
    sub:   { fontSize: 11.5, color: C.muted, marginTop: 2 },
    modeRow: { display: "flex", gap: 8, margin: "14px 0 12px" },
    modeBtn: (a) => ({ flex: 1, padding: "9px 0", borderRadius: 9, border: `1.5px solid ${a ? "#3b82f6" : "#1e2533"}`, background: a ? "rgba(59,130,246,.12)" : "transparent", color: a ? "#60a5fa" : C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer" }),
    tabBar: { display: "flex", gap: 6, background: "#0e1117", borderRadius: 10, padding: 4, marginBottom: 16 },
    tab: (a) => ({ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: a ? "#1e2533" : "transparent", color: a ? C.text : C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }),
    // [NEW #2] Ligne ticker + prix actuel côte à côte
    tickerRow: { display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" },
    searchWrap: { position: "relative", flex: 1 },
    tickerInput: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: "#f8fafc", padding: "11px 14px", fontSize: 15, fontWeight: 700, width: "100%", boxSizing: "border-box", outline: "none", letterSpacing: 1 },
    dropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0e1117", border: `1px solid ${C.border}`, borderRadius: 10, maxHeight: 280, overflowY: "auto", zIndex: 800, boxShadow: "0 10px 30px rgba(0,0,0,.5)" },
    resultItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${C.border}` },
    resultSym: { fontSize: 12.5, fontWeight: 800, color: "#f8fafc", letterSpacing: 0.5 },
    resultName: { fontSize: 11, color: "#94a3b8", marginLeft: 6 },
    resultExch: { fontSize: 9.5, fontWeight: 700, color: C.muted, flexShrink: 0, whiteSpace: "nowrap" },
    resultLive: { fontSize: 9, fontWeight: 800, color: "#34d399", background: "rgba(52,211,153,.12)", borderRadius: 4, padding: "1px 5px", marginLeft: 5 },
    searchingRow: { padding: "8px 12px", fontSize: 11, color: C.muted, fontStyle: "italic" },
    priceWrap: { display: "flex", flexDirection: "column", gap: 2 },
    priceLabelRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4 },
    priceLabel: { fontSize: 9.5, color: C.muted, fontWeight: 700, letterSpacing: 0.5, textAlign: "center" },
    priceRefresh: { background: "transparent", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1 },
    priceInput: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: "#f8fafc", padding: "11px 10px", fontSize: 14, fontWeight: 700, width: 90, outline: "none", textAlign: "center", boxSizing: "border-box" },
    apiKeyToggle: { background: "none", border: "none", color: C.dim, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0, marginBottom: 10 },
    apiKeyBox: { background: "rgba(96,165,250,.04)", border: `1px dashed ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 },
    apiKeyHint: { fontSize: 10.5, color: "#475569", marginBottom: 8, lineHeight: 1.5 },
    apiKeyInput: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: "#f8fafc", padding: "8px 10px", fontSize: 12, flex: 1, outline: "none", minWidth: 0 },
    apiKeyClear: { background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "8px 12px", fontSize: 11.5, cursor: "pointer", flexShrink: 0 },
    liveCard: { background: "rgba(52,211,153,.05)", border: "1px solid rgba(52,211,153,.18)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 },
    liveHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    liveTitle: { fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: "#34d399", textTransform: "uppercase" },
    liveRefresh: { background: "transparent", border: `1px solid ${C.border}`, color: "#94a3b8", borderRadius: 7, padding: "3px 9px", fontSize: 10.5, fontWeight: 600, cursor: "pointer" },
    liveBar: { display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 8 },
    liveSeg: (color, pct) => ({ width: `${pct}%`, background: color }),
    liveLegend: { display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 10.5, color: "#94a3b8" },
    liveLegendItem: { display: "flex", alignItems: "center", gap: 5 },
    liveDot: (color) => ({ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }),
    liveMeta: { fontSize: 10, color: "#475569", marginTop: 8 },
    liveBtn: { background: "#131720", border: `1px solid ${C.border}`, color: "#94a3b8", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 12 },
    // [NEW #1] Note éditable
    noteTextarea: { background: "rgba(96,165,250,.04)", border: "1px solid rgba(96,165,250,.12)", borderRadius: 8, color: "#94a3b8", padding: "8px 12px", fontSize: 11, width: "100%", boxSizing: "border-box", outline: "none", resize: "vertical", minHeight: 54, fontFamily: "'Inter',system-ui,sans-serif", lineHeight: 1.5, marginBottom: 12 },
    profileRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 },
    profileBtn: (a) => ({ padding: "5px 11px", borderRadius: 7, border: `1px solid ${a ? "#6366f1" : "#1e2533"}`, background: a ? "rgba(99,102,241,.12)" : "transparent", color: a ? "#a5b4fc" : C.muted, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }),
    tagsRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 },
    tag: { fontSize: 11, fontWeight: 700, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.2)", color: "#fca5a5", borderRadius: 6, padding: "2px 8px" },
    progressBar: { height: 3, background: "#0e1117", borderRadius: 2, overflow: "hidden", marginBottom: 4 },
    progressFill: (pct) => ({ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#3b82f6,#a78bfa)", transition: "width .3s" }),
    explainToggle: { display: "flex", justifyContent: "flex-end", marginBottom: 14 },
    explainBtn: { background: "none", border: "none", color: C.dim, fontSize: 11, cursor: "pointer", textDecoration: "underline" },
    resultRow: { display: "flex", gap: 12, marginBottom: 16, alignItems: "center" },
    resultCard: (v) => ({ flex: 1, background: v ? v.bg : C.card, border: `1px solid ${v ? v.color : C.border}`, borderRadius: 14, padding: "16px", textAlign: "center" }),
    score: (c) => ({ fontSize: 42, fontWeight: 800, color: c || "#f8fafc", letterSpacing: "-1px", lineHeight: 1 }),
    vLabel: (c) => ({ fontSize: 14, fontWeight: 700, color: c || C.muted, marginTop: 4 }),
    vmeta: { fontSize: 11, color: C.muted, marginTop: 6 },
    radarWrap: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
    catBlock: { marginBottom: 18 },
    catHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    catLabel: (c) => ({ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, color: c, textTransform: "uppercase" }),
    catScore: (c) => ({ fontSize: 12.5, fontWeight: 700, color: c }),
    fieldCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 13px", marginBottom: 8 },
    fLabel: { fontSize: 12.5, fontWeight: 600, color: "#cbd5e1" },
    fHint:  { fontSize: 10.5, color: "#475569" },
    fInput: { background: "transparent", border: "none", color: "#f8fafc", fontSize: 14, fontWeight: 700, width: "100%", outline: "none", marginTop: 3 },
    fExplain: { fontSize: 10.5, color: "#7c8aab", marginTop: 3, fontStyle: "italic" },
    btnRow: { display: "flex", gap: 8, marginBottom: 10 },
    btn:  { flex: 1, background: "#131720", border: `1px solid ${C.border}`, color: "#94a3b8", borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    btnP: { flex: 1, background: "#3b82f6", border: "none", color: "#fff", borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    exportRow: { display: "flex", gap: 8, marginBottom: 6 },
    exportBtn: { flex: 1, background: "#0e1117", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" },
    copyFb: { fontSize: 11.5, color: "#34d399", textAlign: "center", marginBottom: 10 },
    collapse: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "10px 0", borderTop: `1px solid ${C.border}` },
    colTitle: { fontSize: 12.5, fontWeight: 700, color: "#94a3b8" },
    wRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
    wLabel: { fontSize: 12, color: "#cbd5e1", width: 120, flexShrink: 0 },
    wVal:   { fontSize: 12, fontWeight: 700, color: "#f8fafc", width: 32, textAlign: "right" },
    // [NEW #6] badge somme des poids
    weightSumBadge: (ok) => ({ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 7, background: ok ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)", color: ok ? "#34d399" : "#f87171", border: `1px solid ${ok ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)"}` }),
    normalizeBtn: { background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer" },
    histSearchInput: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: "#f8fafc", padding: "7px 11px", fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", marginBottom: 10 },
    histItem: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 13px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7, cursor: "pointer" },
    histTicker: { fontSize: 13.5, fontWeight: 700, color: "#f8fafc" },
    histMeta:   { fontSize: 10.5, color: C.muted, marginTop: 1 },
    histScore: (c) => ({ fontSize: 15, fontWeight: 800, color: c }),
    staleBadge: { fontSize: 9.5, fontWeight: 700, color: "#fb923c", background: "rgba(251,146,60,.1)", borderRadius: 5, padding: "1px 6px", marginLeft: 6 },
    backupBox: { background: "rgba(96,165,250,.04)", border: `1px dashed ${C.border}`, borderRadius: 10, padding: "12px 14px", marginTop: 12 },
    backupTitle: { fontSize: 11.5, fontWeight: 700, color: "#94a3b8", marginBottom: 4 },
    backupHint: { fontSize: 10.5, color: "#475569", marginBottom: 10, lineHeight: 1.5 },
    exportBtnLabel: { flex: 1, background: "#0e1117", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 },
    rmBtn: { background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 15, padding: "0 0 0 10px" },
    empty: { fontSize: 12, color: "#475569", textAlign: "center", padding: "24px 0" },
    compareTable: { width: "100%", borderCollapse: "collapse", marginBottom: 16 },
    th: { fontSize: 11, color: C.muted, textAlign: "left", padding: "5px 7px", borderBottom: `1px solid ${C.border}`, fontWeight: 700 },
    td: { fontSize: 12, color: "#cbd5e1", padding: "7px 7px", borderBottom: `1px solid #0e1117` },
    sparkWrap: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 14px 8px", marginBottom: 14 },
    sparkTitle: { fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 8 },
    checkbox: (on) => ({ width: 17, height: 17, borderRadius: 5, border: `1.5px solid ${on ? "#3b82f6" : "#334155"}`, background: on ? "#3b82f6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", cursor: "pointer", flexShrink: 0, marginRight: 10 }),
    rangeCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 },
    rangeTitle: { fontSize: 11, color: C.muted, marginBottom: 10 },
    rangeBarTrack: { position: "relative", height: 8, background: "#1a1f2e", borderRadius: 4 },
    rangeBarFill: (low, high) => ({ position: "absolute", left: `${low}%`, width: `${Math.max(high - low, 2)}%`, height: "100%", background: "linear-gradient(90deg,#fb923c,#34d399)", borderRadius: 4, opacity: 0.55 }),
    rangeBarPoint: (base) => ({ position: "absolute", left: `${base}%`, top: -3, width: 3, height: 14, background: "#f8fafc", borderRadius: 2, transform: "translateX(-1.5px)" }),
    rangeLabels: { display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.muted, marginTop: 8 },
    insightCard: { display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(167,139,250,.07)", border: "1px solid rgba(167,139,250,.18)", borderRadius: 10, padding: "10px 14px", fontSize: 11.5, color: "#cbd5e1", marginBottom: 14, lineHeight: 1.5 },
    insightIcon: { fontSize: 14, flexShrink: 0 },
    contradictionBox: { background: "rgba(251,146,60,.06)", border: "1px solid rgba(251,146,60,.18)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 },
    contradictionTitle: { fontSize: 11.5, fontWeight: 700, color: "#fb923c", marginBottom: 8 },
    contradictionItem: { fontSize: 11.5, color: "#cbd5e1", marginBottom: 6, lineHeight: 1.5, paddingLeft: 10, borderLeft: "2px solid rgba(251,146,60,.3)" },
    confidenceDot: { color: "#fb923c", fontSize: 8, marginLeft: 6, verticalAlign: "middle" },
    checklistRow: { display: "flex", alignItems: "center", padding: "7px 2px", cursor: "pointer" },
    checklistLabel: { fontSize: 12.5, color: "#cbd5e1" },
    checklistSectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#475569", textTransform: "uppercase", margin: "10px 0 4px" },
    glossaryItem: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 },
    glossaryTerm: { fontSize: 13, fontWeight: 700, color: "#f8fafc", marginBottom: 3 },
    glossaryDef: { fontSize: 12, color: "#a8b8c8", lineHeight: 1.5 },
    glossaryCat: { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "#60a5fa", textTransform: "uppercase", marginTop: 18, marginBottom: 10 },
    consensusCard: { background: "rgba(96,165,250,.06)", border: "1px solid rgba(96,165,250,.15)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 },
    consensusRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    consensusLabel: { fontSize: 11.5, color: C.muted },
    consensusValue: (label) => ({ fontWeight: 800, fontSize: 13, color: label.includes("Strong Buy") ? "#34d399" : label === "Buy" ? "#a3e635" : label === "Hold" ? "#fbbf24" : label === "Sell" ? "#fb923c" : "#f87171" }),
    consensusHint: { fontSize: 10.5, color: "#475569", marginTop: 6 },
    analystRow: { display: "flex", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: "9px 9px 0 0", padding: "9px 12px", gap: 8 },
    analystFirm: { fontSize: 12.5, fontWeight: 700, color: "#e2e8f0" },
    analystMeta: { fontSize: 10.5, color: C.muted, marginTop: 1 },
    analystBadge: (rating) => ({ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, flexShrink: 0, background: rating.includes("Strong Buy") ? "rgba(52,211,153,.15)" : rating === "Buy" ? "rgba(163,230,53,.12)" : rating === "Hold" ? "rgba(251,191,36,.12)" : rating === "Sell" ? "rgba(251,146,60,.12)" : "rgba(248,113,113,.12)", color: rating.includes("Strong Buy") ? "#34d399" : rating === "Buy" ? "#a3e635" : rating === "Hold" ? "#fbbf24" : rating === "Sell" ? "#fb923c" : "#f87171" }),
    addAnalystForm: { background: "#0e1117", border: `1px dashed ${C.border}`, borderRadius: 10, padding: "12px", marginTop: 10 },
    addAnalystInput: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: "#f8fafc", padding: "8px 10px", fontSize: 12.5, width: "100%", boxSizing: "border-box", outline: "none" },
    addAnalystInputSmall: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: "#f8fafc", padding: "8px 10px", fontSize: 12, flex: 1, outline: "none", minWidth: 0 },
    addAnalystSelect: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: "#f8fafc", padding: "8px 6px", fontSize: 12, flex: 1, outline: "none" },
    addAnalystBtn: { width: "100%", marginTop: 8, background: "#3b82f6", border: "none", color: "#fff", borderRadius: 8, padding: "9px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
    repLabel: { fontSize: 10.5, color: C.muted, marginBottom: 4 },
    reliabilityBadge: (val) => ({ fontSize: 10.5, fontWeight: 800, padding: "3px 7px", borderRadius: 6, flexShrink: 0, minWidth: 28, textAlign: "center", background: val >= 70 ? "rgba(52,211,153,.12)" : val >= 45 ? "rgba(251,191,36,.12)" : "rgba(248,113,113,.12)", color: val >= 70 ? "#34d399" : val >= 45 ? "#fbbf24" : "#f87171" }),
    analystRowWrap: { marginBottom: 8, border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 9px 9px" },
    accuracyHint: { color: "#7c8aab" },
    outcomeRow: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", flexWrap: "wrap" },
    outcomeLabel: { fontSize: 10, color: "#475569", marginRight: 2 },
    outcomeBtn: (active, type) => ({ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, cursor: "pointer", border: "1px solid", borderColor: active ? (type === "hit" ? "#34d399" : type === "missed" ? "#f87171" : "#475569") : "#1e2533", background: active ? (type === "hit" ? "rgba(52,211,153,.12)" : type === "missed" ? "rgba(248,113,113,.12)" : "rgba(71,85,105,.12)") : "transparent", color: active ? (type === "hit" ? "#34d399" : type === "missed" ? "#f87171" : "#94a3b8") : "#475569" }),
    // [NEW #8] Toast
    toast: { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#34d399", color: "#052e16", padding: "10px 22px", borderRadius: 10, fontWeight: 700, fontSize: 13, zIndex: 1000, pointerEvents: "none", boxShadow: "0 4px 20px rgba(52,211,153,.25)" },
    // [NEW #9] Empty evolution
    evolEmptyWrap: { textAlign: "center", padding: "40px 20px" },
    evolEmptyIcon: { fontSize: 40, marginBottom: 12 },
    evolEmptyTitle: { fontSize: 14, fontWeight: 700, color: "#94a3b8", marginBottom: 6 },
    evolEmptyDesc: { fontSize: 12, color: "#475569", lineHeight: 1.6 },
    // Upside badge
    upsideBadge: (positive) => ({ fontSize: 12, fontWeight: 800, padding: "2px 10px", borderRadius: 7, background: positive ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)", color: positive ? "#34d399" : "#f87171", border: `1px solid ${positive ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)"}` }),
  };

  const fieldExplain = (key, rawVal) => {
    const v = parseVal(rawVal);
    if (v === null) return null;
    const invest = {
      rsi: v <= 30 ? "Survendu, rebond possible" : v <= 50 ? "Zone basse-neutre" : v <= 70 ? "Zone haute-neutre" : "Surachat, risque de correction",
      vsMA50: v > 5 ? "Au-dessus MM50, tendance haussière" : v >= 0 ? "Légèrement au-dessus" : "En dessous MM50",
      vsMA200: v > 5 ? "Au-dessus MM200, tendance long terme haussière" : v >= 0 ? "Légèrement au-dessus" : "En dessous MM200, tendance baissière",
      momentum: v > 10 ? "Forte hausse récente" : v >= 0 ? "Stable à légèrement haussier" : "Repli récent",
      peVsSector: v < -15 ? "Nettement moins cher que le secteur" : v <= 15 ? "Proche du secteur" : "Plus cher que le secteur",
      pegRatio: v <= 0 ? "Non applicable (mettre 0 si non-profitable)" : v <= 1 ? "Sous-évalué vs croissance" : v <= 2 ? "Raisonnable" : "Cher par rapport à la croissance",
      fromATH: v > -10 ? "Proche de son plus haut" : v > -30 ? "Correction modérée" : "Forte décote depuis le plus haut",
      analystUpside: v > 20 ? "Fort potentiel selon analystes" : v >= 0 ? "Potentiel modeste" : "Déjà au-dessus du consensus",
      ratingTrend: v >= 1 ? "Notes en amélioration" : v <= -1 ? "Notes dégradées" : "Stable",
      newsFlow: v >= 1 ? "Actualité récente favorable" : v <= -1 ? "Actualité défavorable" : "Neutre",
      revenueGrowth: v > 20 ? "Forte croissance" : v >= 0 ? "Croissance modeste" : "CA en baisse",
      marginTrend: v >= 1 ? "Marges en amélioration" : v <= -1 ? "Marges sous pression" : "Stables",
      debtLevel: v >= 1 ? "Bilan sain" : v <= -1 ? "Endettement préoccupant" : "Normal",
    };
    const growth = {
      revenueGrowthYoY: v >= 60 ? "Hypercroissance exceptionnelle" : v >= 30 ? "Forte croissance" : v >= 10 ? "Modérée" : "Faible ou négative",
      epsGrowthYoY: v >= 50 ? "Très forte progression" : v >= 0 ? "En croissance" : "En baisse",
      forwardGrowthEst: v >= 40 ? "Anticipations très ambitieuses" : v >= 15 ? "Solide" : "Modeste",
      growthTrend: v >= 1 ? "Croissance qui accélère" : v <= -1 ? "Ralentit — signal d'alerte" : "Stable",
      guidanceRevision: v >= 1 ? "Guidance relevée, direction confiante" : v <= -1 ? "Guidance abaissée" : "Inchangée",
      tamExpansion: v >= 1 ? "Marché adressable en expansion" : v <= -1 ? "Se contracte" : "Stable",
      grossMargin: v >= 65 ? "Modèle très scalable" : v >= 40 ? "Correcte" : "Faible",
      gMarginTrend: v >= 1 ? "S'améliorent avec l'échelle" : v <= -1 ? "Sous pression" : "Stables",
      cashPosition: v >= 1 ? "Bilan solide" : v <= -1 ? "Dépendant du financement externe" : "Normal",
      priceMomentum3m: v >= 30 ? "Fort engouement du marché" : v >= 0 ? "Tendance positive modérée" : "Marché sceptique",
      analystRevisions: v >= 1 ? "Analystes plus optimistes" : v <= -1 ? "Analystes plus prudents" : "Stables",
      insiderActivity: v >= 1 ? "Insiders achètent — bon signal" : v <= -1 ? "Ventes d'insiders" : "Neutre",
      valuationStretch: v >= 1 ? "Marge de sécurité sur la valorisation" : v <= -1 ? "Valorisation tendue" : "Ni tendue ni généreuse",
      dilutionRisk: v >= 1 ? "Peu de risque de dilution" : v <= -1 ? "Risque de dilution à surveiller" : "Modéré",
      concentrationRisk: v >= 1 ? "Revenus diversifiés" : v <= -1 ? "Forte dépendance" : "Moyenne",
    };
    return (mode === "invest" ? invest : growth)[key] || null;
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap'); input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;} input[type=number]{-moz-appearance:textfield;} .stock-result:hover{background:#161b28;} .stock-result:last-child{border-bottom:none;}`}</style>

      {/* [NEW #8] Toast confirmation enregistrement */}
      {saveToast && <div style={S.toast}>✓ Analyse enregistrée</div>}

      <div style={S.wrap}>
        {/* HEADER */}
        <div style={S.title}>Analyse Financière</div>
        <div style={S.sub}>Investir ou attendre · Potentiel de croissance</div>

        {/* MODE SWITCH */}
        <div style={S.modeRow}>
          <button style={S.modeBtn(mode === "invest")} onClick={() => { setMode("invest"); if (ticker === PREFILLED_TICKER) setValues(PREFILLED_VALUES_INVEST); }}>⏱ Invest / Timing</button>
          <button style={S.modeBtn(mode === "growth")} onClick={() => { setMode("growth"); if (ticker === PREFILLED_TICKER) setValues(PREFILLED_VALUES_GROWTH); }}>📈 Croissance</button>
        </div>

        {/* TABS */}
        <div style={S.tabBar}>
          <button style={S.tab(tab === "analyse")}   onClick={() => setTab("analyse")}>Analyse</button>
          <button style={S.tab(tab === "evolution")} onClick={() => setTab("evolution")}>Évolution</button>
          <button style={S.tab(tab === "compare")}   onClick={() => setTab("compare")}>Comparer</button>
          <button style={S.tab(tab === "glossaire")} onClick={() => setTab("glossaire")}>Glossaire</button>
        </div>

        {/* ── ANALYSE TAB ── */}
        {tab === "analyse" && (<>
          {/* [NEW] Recherche d'actions + prix actuel sur la même ligne */}
          <div style={S.tickerRow}>
            <div style={S.searchWrap}>
              <input
                style={S.tickerInput}
                placeholder="Rechercher une action (nom ou ticker)…"
                value={ticker}
                onChange={e => onTickerChange(e.target.value)}
                onFocus={() => { if (ticker.trim()) { setResults(searchStocks(ticker, 8)); setShowResults(true); } }}
                onBlur={() => setTimeout(() => setShowResults(false), 150)}
              />
              {showResults && (results.length > 0 || searching) && (
                <div style={S.dropdown}>
                  {results.map(r => (
                    <div key={r.s + (r.e || "")} className="stock-result" style={S.resultItem} onMouseDown={() => selectStock(r)}>
                      <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={S.resultSym}>{r.s}</span>
                        <span style={S.resultName}>{r.n}</span>
                      </div>
                      <span style={S.resultExch}>{r.e}{r.api && <span style={S.resultLive}>live</span>}</span>
                    </div>
                  ))}
                  {searching && <div style={S.searchingRow}>Recherche mondiale…</div>}
                </div>
              )}
            </div>
            <div style={S.priceWrap}>
              <div style={S.priceLabelRow}>
                <span style={S.priceLabel}>COURS ACTUEL</span>
                {apiKey && ticker.trim() && (
                  <button style={S.priceRefresh} onClick={refreshPrice} title="Rafraîchir le cours en direct">{priceLoading ? "…" : "↻"}</button>
                )}
              </div>
              <input type="number" style={S.priceInput} placeholder="ex: 173" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} />
            </div>
          </div>

          {/* [NEW] Activation recherche mondiale + cours en direct (clé API optionnelle) */}
          <button style={S.apiKeyToggle} onClick={() => setShowApiKey(v => !v)}>
            {apiKey ? "🔑 Recherche mondiale + cours en direct activés" : "🌐 Activer la recherche mondiale + cours en direct (optionnel)"}
          </button>
          {showApiKey && (
            <div style={S.apiKeyBox}>
              <div style={S.apiKeyHint}>
                Colle une clé API <strong>Finnhub</strong> gratuite (crée-la en 2 min sur finnhub.io/register).
                Elle est stockée uniquement sur ton appareil. La recherche locale fonctionne sans clé, hors-ligne.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input style={S.apiKeyInput} type="password" placeholder="Clé API Finnhub" value={apiKey} onChange={e => saveApiKey(e.target.value.trim())} />
                {apiKey && <button style={S.apiKeyClear} onClick={() => saveApiKey("")}>Effacer</button>}
              </div>
            </div>
          )}

          {/* [NEW #1] Note libre et éditable */}
          <textarea
            style={S.noteTextarea}
            placeholder="Note libre — contexte, catalyseurs, risques… (optionnel)"
            value={analysisNote}
            onChange={e => setAnalysisNote(e.target.value)}
            rows={3}
          />

          {/* PROFILES */}
          <div style={S.profileRow}>
            {Object.entries(PROFILES).map(([k, p]) => (
              <button key={k} style={S.profileBtn(profile === k)} onClick={() => applyProfile(k)}>{p.label}</button>
            ))}
          </div>

          {/* AUTO RISK TAGS */}
          {allTags.length > 0 && (
            <div style={S.tagsRow}>{allTags.map(t => <span key={t} style={S.tag}>{t}</span>)}</div>
          )}

          {/* ANALYST RATINGS TRACKER */}
          <div style={S.collapse} onClick={() => setShowAnalysts(v => !v)}>
            <span style={S.colTitle}>Avis d&apos;analystes détaillés ({analystRatings.length})</span>
            <span style={{ color: C.dim }}>{showAnalysts ? "−" : "+"}</span>
          </div>
          {showAnalysts && (
            <div style={{ padding: "10px 0 16px" }}>
              {/* [NEW] Consensus analystes EN DIRECT (Finnhub, gratuit) */}
              {apiKey ? (
                recConsensus ? (
                  <div style={S.liveCard}>
                    <div style={S.liveHead}>
                      <span style={S.liveTitle}>● Consensus analystes en direct</span>
                      <button style={S.liveRefresh} onClick={() => loadLiveRecs()}>{liveRecsLoading ? "…" : "↻ Actualiser"}</button>
                    </div>
                    <div style={S.consensusRow}>
                      <span style={S.consensusLabel}>Recommandation ({recConsensus.total} analystes)</span>
                      <span style={S.consensusValue(recConsensus.label)}>{recConsensus.label}</span>
                    </div>
                    {(() => {
                      const c = recConsensus.c, t = recConsensus.total;
                      const segs = [
                        ["Strong Buy", c.strongBuy, "#34d399"],
                        ["Buy", c.buy, "#a3e635"],
                        ["Hold", c.hold, "#fbbf24"],
                        ["Sell", c.sell, "#fb923c"],
                        ["Strong Sell", c.strongSell, "#f87171"],
                      ];
                      return (<>
                        <div style={{ ...S.liveBar, marginTop: 8 }}>
                          {segs.map(([l, v, col]) => v > 0 && <div key={l} style={S.liveSeg(col, (v / t) * 100)} title={`${l}: ${v}`} />)}
                        </div>
                        <div style={S.liveLegend}>
                          {segs.map(([l, v, col]) => (
                            <span key={l} style={S.liveLegendItem}><span style={S.liveDot(col)} />{l} <strong style={{ color: "#cbd5e1" }}>{v}</strong></span>
                          ))}
                        </div>
                      </>);
                    })()}
                    <div style={S.consensusRow} >
                      <span style={{ ...S.consensusLabel, marginTop: 8 }}>Tendance vs mois précédent</span>
                      <span style={{ fontWeight: 700, marginTop: 8, color: recConsensus.trend > 0.1 ? "#34d399" : recConsensus.trend < -0.1 ? "#f87171" : "#94a3b8" }}>
                        {recConsensus.trend > 0.1 ? "↗ s'améliore" : recConsensus.trend < -0.1 ? "↘ se dégrade" : "→ stable"}
                      </span>
                    </div>
                    <div style={S.liveMeta}>Source Finnhub · période {recConsensus.period} · mis à jour à la demande</div>
                  </div>
                ) : (
                  <button style={S.liveBtn} onClick={() => loadLiveRecs()}>
                    {liveRecsLoading ? "Chargement des avis analystes…" : liveRecsError || `📡 Charger les avis analystes en direct pour ${ticker || "ce titre"}`}
                  </button>
                )
              ) : null}

              {analystConsensus && (
                <div style={S.consensusCard}>
                  <div style={S.consensusRow}>
                    <span style={S.consensusLabel}>Consensus calculé</span>
                    <span style={S.consensusValue(analystConsensus.label)}>{analystConsensus.label}</span>
                  </div>
                  {analystConsensus.weightedAvgTarget !== null && (
                    <div style={S.consensusRow}>
                      <span style={S.consensusLabel}>Target pondéré fiabilité</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, color: "#f8fafc" }}>{analystConsensus.weightedAvgTarget.toFixed(2)}</span>
                        {/* [NEW #2] Upside calculé automatiquement */}
                        {impliedUpside !== null && (
                          <span style={S.upsideBadge(parseFloat(impliedUpside) >= 0)}>
                            {parseFloat(impliedUpside) >= 0 ? "+" : ""}{impliedUpside}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {/* [NEW #2] Upside individuel par analyste si prix actuel connu */}
                  {cpNum && analystRatings.some(a => parseFloat(a.target)) && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>Upside par rapport au cours actuel ({currentPrice})</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {analystRatings.filter(a => parseFloat(a.target)).map(a => {
                          const up = ((parseFloat(a.target) - cpNum) / cpNum * 100).toFixed(0);
                          return (
                            <span key={a.id} style={{ ...S.upsideBadge(parseFloat(up) >= 0), fontSize: 10 }}>
                              {a.firm.split(" ")[0]} {parseFloat(up) >= 0 ? "+" : ""}{up}%
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div style={S.consensusRow}>
                    <span style={S.consensusLabel}>Tendance des révisions</span>
                    <span style={{ fontWeight: 700, color: analystConsensus.trend > 0.3 ? "#34d399" : analystConsensus.trend < -0.3 ? "#f87171" : "#94a3b8" }}>
                      {analystConsensus.trend > 0.3 ? "↗ s'améliore" : analystConsensus.trend < -0.3 ? "↘ se dégrade" : "→ stable"}
                    </span>
                  </div>
                  <div style={S.consensusHint}>Basé sur {analystConsensus.count} avis · La fiabilité intègre réputation, cohérence et ancienneté du rating.</div>
                </div>
              )}

              {analystRatings.map(a => {
                const reliability = computeReliability(a, analystRatings);
                const acc = firmAccuracy(a.firm);
                const daysOld = Math.round((Date.now() - new Date(a.date).getTime()) / 86400000);
                return (
                  <div key={a.id} style={S.analystRowWrap}>
                    <div style={S.analystRow}>
                      <div style={{ flex: 1 }}>
                        <div style={S.analystFirm}>{a.firm}</div>
                        <div style={S.analystMeta}>
                          {a.date} {a.target && `· target ${a.target}`}
                          {daysOld > 90 && <span style={{ color: "#fb923c" }}> · {daysOld}j</span>}
                          {acc && <span style={S.accuracyHint}> · historique : {Math.round(acc.rate * 100)}% ({acc.total} cas)</span>}
                        </div>
                      </div>
                      <span style={S.reliabilityBadge(reliability)} title="Fiabilité (réputation + cohérence + âge + historique réel)">{reliability}</span>
                      <span style={S.analystBadge(a.rating)}>{a.rating}</span>
                      <button style={S.rmBtn} onClick={() => removeAnalystRating(a.id)}>✕</button>
                    </div>
                    <div style={S.outcomeRow}>
                      <span style={S.outcomeLabel}>Résultat réel :</span>
                      {["pending", "hit", "missed"].map(o => (
                        <button key={o} style={S.outcomeBtn(a.outcome === o, o)} onClick={() => setRatingOutcome(a.id, o)}>
                          {o === "pending" ? "En attente" : o === "hit" ? "✓ Target atteint" : "✕ Manqué"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div style={S.addAnalystForm}>
                <input style={S.addAnalystInput} placeholder="Firme (ex: Morgan Stanley)" value={newAnalyst.firm} onChange={e => setNewAnalyst(p => ({ ...p, firm: e.target.value }))} />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <select style={S.addAnalystSelect} value={newAnalyst.rating} onChange={e => setNewAnalyst(p => ({ ...p, rating: e.target.value }))}>
                    <option>Strong Buy</option><option>Buy</option><option>Hold</option><option>Sell</option><option>Strong Sell</option>
                  </select>
                  <input style={S.addAnalystInputSmall} type="number" placeholder="Target" value={newAnalyst.target} onChange={e => setNewAnalyst(p => ({ ...p, target: e.target.value }))} />
                  <input style={S.addAnalystInputSmall} type="date" value={newAnalyst.date} onChange={e => setNewAnalyst(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div style={{ marginTop: 6 }}>
                  <div style={S.repLabel}>Réputation de la firme (1 = peu fiable, 5 = référence)</div>
                  <select style={S.addAnalystSelect} value={newAnalyst.reputation} onChange={e => setNewAnalyst(p => ({ ...p, reputation: e.target.value }))}>
                    <option value="1">1 — Peu connue</option>
                    <option value="2">2 — Moyenne</option>
                    <option value="3">3 — Correcte</option>
                    <option value="4">4 — Bonne réputation</option>
                    <option value="5">5 — Référence du secteur</option>
                  </select>
                </div>
                <button style={S.addAnalystBtn} onClick={addAnalystRating}>+ Ajouter cet avis</button>
              </div>
            </div>
          )}

          {/* EXTERNAL FACTORS CHECKLIST */}
          <div style={S.collapse} onClick={() => setShowChecklist(v => !v)}>
            <span style={S.colTitle}>Facteurs externes vérifiés ({checkedFactors.length}/{(PROFILES[profile]?.reminders?.length || 0) + GENERAL_REMINDERS.length})</span>
            <span style={{ color: C.dim }}>{showChecklist ? "−" : "+"}</span>
          </div>
          {showChecklist && (
            <div style={{ padding: "10px 0 16px" }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Coche les facteurs externes que tu as pris en compte.</div>
              {PROFILES[profile]?.reminders?.length > 0 && (<>
                <div style={S.checklistSectionLabel}>Spécifique au profil « {PROFILES[profile].label} »</div>
                {PROFILES[profile].reminders.map((f, i) => {
                  const on = checkedFactors.includes(f);
                  return (
                    <div key={`p-${i}`} style={S.checklistRow} onClick={() => toggleFactor(f)}>
                      <div style={S.checkbox(on)}>{on ? "✓" : ""}</div>
                      <span style={S.checklistLabel}>{f}</span>
                    </div>
                  );
                })}
                <div style={S.checklistSectionLabel}>Facteurs généraux</div>
              </>)}
              {GENERAL_REMINDERS.map((f, i) => {
                const on = checkedFactors.includes(f);
                return (
                  <div key={i} style={S.checklistRow} onClick={() => toggleFactor(f)}>
                    <div style={S.checkbox(on)}>{on ? "✓" : ""}</div>
                    <span style={S.checklistLabel}>{f}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* PROGRESS */}
          <div style={S.progressBar}><div style={S.progressFill((filledCount / totalFields) * 100)} /></div>
          <div style={S.explainToggle}>
            <button style={S.explainBtn} onClick={() => setShowExplain(v => !v)}>
              {showExplain ? "Masquer les explications" : "Afficher les explications"}
            </button>
          </div>

          {/* RESULT + RADAR */}
          {finalScore !== null && (
            <div style={S.resultRow}>
              <div style={S.resultCard(verdict)}>
                <div style={S.score(verdict.color)}>{Math.round(finalScore)}</div>
                <div style={S.vLabel(verdict.color)}>{verdict.label}</div>
                <div style={S.vmeta}>{filledCount}/{totalFields} signaux</div>
              </div>
              <div style={S.radarWrap}>
                <RadarChart catScores={catScores} fields={fields} size={160} />
              </div>
            </div>
          )}

          {/* SCORE RANGE */}
          {scoreRange && (
            <div style={S.rangeCard}>
              <div style={S.rangeTitle}>Fourchette estimée (±15% d&apos;incertitude sur les signaux)</div>
              <div style={{ padding: "4px 0" }}>
                <div style={S.rangeBarTrack}>
                  <div style={S.rangeBarFill(scoreRange.low, scoreRange.high)} />
                  <div style={S.rangeBarPoint(scoreRange.base)} />
                </div>
              </div>
              <div style={S.rangeLabels}>
                <span>{scoreRange.low} pessimiste</span>
                <span style={{ fontWeight: 800, color: "#f8fafc" }}>{scoreRange.base}</span>
                <span>{scoreRange.high} optimiste</span>
              </div>
            </div>
          )}

          {/* SENSITIVITY */}
          {sensitivity && (
            <div style={S.insightCard}>
              <span style={S.insightIcon}>🎯</span>
              <span><strong>{sensitivity.field}</strong> est le signal le plus influent sur ce score (impact ≈ {sensitivity.impact} pts). Vérifie en priorité que cette donnée est fiable.</span>
            </div>
          )}

          {/* CONTRADICTIONS */}
          {contradictions.length > 0 && (
            <div style={S.contradictionBox}>
              <div style={S.contradictionTitle}>⚡ Signaux contradictoires détectés</div>
              {contradictions.map((c, i) => <div key={i} style={S.contradictionItem}>{c}</div>)}
            </div>
          )}

          {/* FIELDS */}
          {Object.entries(fields).map(([catKey, cat]) => (
            <div key={catKey} style={S.catBlock}>
              <div style={S.catHead}>
                <span style={S.catLabel(cat.color)}>
                  {cat.label}
                  {catConfidence[catKey] !== undefined && catConfidence[catKey] > 0 && catConfidence[catKey] < 1 && (
                    <span style={S.confidenceDot} title="Catégorie partiellement renseignée">●</span>
                  )}
                </span>
                <span style={S.catScore(cat.color)}>{catScores[catKey] !== null ? Math.round(catScores[catKey]) : "—"}</span>
              </div>
              {cat.items.map(item => (
                <div key={item.key} style={S.fieldCard}>
                  <div style={S.fLabel}>{item.label}</div>
                  <div style={S.fHint}>{item.hint}</div>
                  <input type="number" style={S.fInput} placeholder={item.placeholder}
                    value={values[item.key] ?? ""} onChange={e => setVal(item.key, e.target.value)} />
                  {showExplain && fieldExplain(item.key, values[item.key]) && (
                    <div style={S.fExplain}>{fieldExplain(item.key, values[item.key])}</div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* BUTTONS */}
          <div style={S.btnRow}>
            <button style={S.btn} onClick={resetForm}>Réinitialiser</button>
            <button style={S.btnP} onClick={saveEntry} disabled={finalScore === null}>Enregistrer</button>
          </div>
          {finalScore !== null && (<>
            {/* [NEW #4] Export carte SVG ajouté */}
            <div style={S.exportRow}>
              <button style={S.exportBtn} onClick={copyExport}>📋 Copier</button>
              <button style={S.exportBtn} onClick={downloadExport}>⬇️ .txt</button>
              <button style={S.exportBtn} onClick={downloadShareCard}>🖼 Carte</button>
            </div>
            {copyFeedback && <div style={S.copyFb}>{copyFeedback}</div>}
          </>)}

          {/* [NEW #6] WEIGHTS avec somme et bouton normaliser */}
          <div style={S.collapse} onClick={() => setShowWeights(v => !v)}>
            <span style={S.colTitle}>Pondérations ({PROFILES[profile]?.label})</span>
            <span style={{ color: C.dim }}>{showWeights ? "−" : "+"}</span>
          </div>
          {showWeights && (
            <div style={{ padding: "10px 0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={S.weightSumBadge(weightSum === 100)}>Σ = {weightSum}%</span>
                {weightSum !== 100 && (
                  <button style={S.normalizeBtn} onClick={normalizeWeights}>Normaliser à 100%</button>
                )}
                {weightSum !== 100 && <span style={{ fontSize: 10.5, color: "#475569" }}>La somme doit faire 100 pour un score cohérent.</span>}
              </div>
              {Object.entries(fields).map(([k, cat]) => (
                <div key={k} style={S.wRow}>
                  <span style={{ ...S.wLabel, color: cat.color }}>{cat.label}</span>
                  <input type="range" min="0" max="100" value={weights[k] || 0}
                    onChange={e => setWeights(p => ({ ...p, [k]: parseInt(e.target.value) || 0 }))} style={{ flex: 1 }} />
                  <span style={S.wVal}>{weights[k] || 0}%</span>
                </div>
              ))}
            </div>
          )}

          {/* HISTORY */}
          <div style={S.collapse} onClick={() => setShowHistory(v => !v)}>
            <span style={S.colTitle}>Historique ({history.length})</span>
            <span style={{ color: C.dim }}>{showHistory ? "−" : "+"}</span>
          </div>
          {showHistory && (
            <div style={{ padding: "10px 0 4px" }}>
              {history.length === 0 ? <div style={S.empty}>Aucune analyse enregistrée.</div> : (<>
                {/* [NEW #3] Recherche dans l'historique */}
                <input
                  style={S.histSearchInput}
                  placeholder="Rechercher un ticker…"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value.toUpperCase())}
                />
                {(() => {
                  const filtered = history.filter(h => !historySearch || h.ticker.includes(historySearch));
                  if (filtered.length === 0) return <div style={S.empty}>Aucun résultat pour « {historySearch} ».</div>;
                  return filtered.map(h => {
                    const v = (h.mode === "growth" ? growthVerdict : investVerdict)(h.score);
                    const daysOld = Math.floor((Date.now() - h.id) / 86400000);
                    const isStale = daysOld >= 30;
                    return (
                      <div key={h.id} style={S.histItem} onClick={() => loadEntry(h)}>
                        <div>
                          <div style={S.histTicker}>
                            {h.ticker} <span style={{ fontSize: 10, color: C.muted, fontWeight: 400 }}>{h.mode === "growth" ? "Croissance" : "Invest"}</span>
                            {isStale && <span style={S.staleBadge} title={`Dernière analyse il y a ${daysOld} jours`}>⏱ {daysOld}j</span>}
                          </div>
                          <div style={S.histMeta}>{h.date} · {h.verdict}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={S.histScore(v.color)}>{h.score}</span>
                          <button style={S.rmBtn} onClick={e => { e.stopPropagation(); deleteEntry(h.id); }}>✕</button>
                        </div>
                      </div>
                    );
                  });
                })()}

                <div style={S.backupBox}>
                  <div style={S.backupTitle}>Sauvegarde complète</div>
                  <div style={S.backupHint}>Exporte tout ton historique dans un fichier JSON réimportable.</div>
                  <div style={S.exportRow}>
                    <button style={S.exportBtn} onClick={downloadFullBackup}>⬇️ Exporter tout (.json)</button>
                    <label style={S.exportBtnLabel}>
                      📂 Importer
                      <input type="file" accept=".json" style={{ display: "none" }}
                        onChange={e => { if (e.target.files[0]) importBackupFile(e.target.files[0]); e.target.value = ""; }} />
                    </label>
                  </div>
                  {importFeedback && <div style={S.copyFb}>{importFeedback}</div>}
                </div>
              </>)}
            </div>
          )}
        </>)}

        {/* ── EVOLUTION TAB ── */}
        {tab === "evolution" && (
          history.length === 0
            /* [NEW #9] Placeholder engageant */
            ? (
              <div style={S.evolEmptyWrap}>
                <div style={S.evolEmptyIcon}>📈</div>
                <div style={S.evolEmptyTitle}>Pas encore de données d&apos;évolution</div>
                <div style={S.evolEmptyDesc}>
                  Enregistre ta première analyse dans l&apos;onglet <strong>Analyse</strong>.<br />
                  Chaque fois que tu enregistres la même action, l&apos;outil trace ici<br />
                  l&apos;évolution du score dans le temps.
                </div>
              </div>
            )
            : Object.entries(
              history.reduce((acc, h) => { (acc[h.ticker + "-" + h.mode] = acc[h.ticker + "-" + h.mode] || []).push(h); return acc; }, {})
            ).map(([k, entries]) => {
              const sorted = [...entries].sort((a, b) => a.id - b.id);
              const scores = sorted.map(e => e.score);
              const W = 280, H2 = 60, p = 6;
              const pts = scores.map((s, i) => `${p + (i / Math.max(scores.length - 1, 1)) * (W - p * 2)},${H2 - p - ((s) / 100) * (H2 - p * 2)}`).join(" ");
              const tc = scores[scores.length - 1] >= scores[0] ? "#34d399" : "#f87171";
              return (
                <div key={k} style={S.sparkWrap}>
                  <div style={S.sparkTitle}>{sorted[0].ticker} [{sorted[0].mode === "growth" ? "Croissance" : "Invest"}] — {sorted.length} analyse{sorted.length > 1 ? "s" : ""}</div>
                  <svg width="100%" height={H2} viewBox={`0 0 ${W} ${H2}`} preserveAspectRatio="none">
                    <polyline points={pts} fill="none" stroke={tc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {scores.map((s, i) => {
                      const x = p + (i / Math.max(scores.length - 1, 1)) * (W - p * 2);
                      const y = H2 - p - (s / 100) * (H2 - p * 2);
                      return <circle key={i} cx={x} cy={y} r="3" fill={tc} />;
                    })}
                  </svg>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginTop: 4 }}>
                    <span>{sorted[0].date}</span>
                    <span style={{ color: tc, fontWeight: 700 }}>{scores[scores.length - 1]}</span>
                    <span>{sorted[sorted.length - 1].date}</span>
                  </div>
                </div>
              );
            })
        )}

        {/* ── COMPARE TAB ── */}
        {tab === "compare" && (
          history.length === 0 ? <div style={S.empty}>Enregistre des analyses pour les comparer.</div> : (<>
            <div style={S.modeRow}>
              <button style={S.modeBtn(compareMode === "invest")} onClick={() => { setCompareMode("invest"); setCompareIds([]); }}>⏱ Invest / Timing</button>
              <button style={S.modeBtn(compareMode === "growth")} onClick={() => { setCompareMode("growth"); setCompareIds([]); }}>📈 Croissance</button>
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12 }}>Sélectionne jusqu&apos;à 4 analyses à comparer.</div>
            {(() => {
              const filtered = history.filter(h => (h.mode || "invest") === compareMode);
              if (filtered.length === 0) return <div style={S.empty}>Aucune analyse {compareMode === "growth" ? "de croissance" : "d'investissement"} enregistrée.</div>;
              const compareFields = compareMode === "growth" ? GROWTH_FIELDS : INVEST_FIELDS;
              return (<>
                {filtered.map(h => {
                  const on = compareIds.includes(h.id);
                  const v = (h.mode === "growth" ? growthVerdict : investVerdict)(h.score);
                  return (
                    <div key={h.id} style={S.histItem} onClick={() => toggleCompare(h.id)}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={S.checkbox(on)}>{on ? "✓" : ""}</div>
                        <div>
                          <div style={S.histTicker}>{h.ticker}</div>
                          <div style={S.histMeta}>{h.date} · profil {PROFILES[h.profile]?.label || "Standard"}</div>
                        </div>
                      </div>
                      <span style={S.histScore(v.color)}>{h.score}</span>
                    </div>
                  );
                })}
                {compareIds.length > 1 && (
                  <table style={S.compareTable}>
                    <thead>
                      <tr>
                        <th style={S.th}>Signal</th>
                        {compareIds.map(id => { const h = history.find(x => x.id === id); return <th key={id} style={S.th}>{h?.ticker}</th>; })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ ...S.td, fontWeight: 700 }}>Score final</td>
                        {compareIds.map(id => { const h = history.find(x => x.id === id); const v = (h.mode === "growth" ? growthVerdict : investVerdict)(h.score); return <td key={id} style={{ ...S.td, fontWeight: 800, color: v.color }}>{h.score}</td>; })}
                      </tr>
                      <tr>
                        <td style={S.td}>Verdict</td>
                        {compareIds.map(id => { const h = history.find(x => x.id === id); return <td key={id} style={S.td}>{h.verdict}</td>; })}
                      </tr>
                      {Object.entries(compareFields).flatMap(([, cat]) =>
                        cat.items.map(item => (
                          <tr key={item.key}>
                            <td style={S.td}>{item.label}</td>
                            {compareIds.map(id => {
                              const h = history.find(x => x.id === id);
                              const val = h?.values?.[item.key];
                              return <td key={id} style={S.td}>{val !== undefined && val !== "" ? val : <span style={{ color: C.dim }}>—</span>}</td>;
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </>);
            })()}
          </>)
        )}

        {/* ── GLOSSAIRE TAB ── */}
        {tab === "glossaire" && (
          <div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 16 }}>Aide-mémoire des facteurs qui influencent le cours d&apos;une action.</div>
            {[
              ["Facteurs propres à l'entreprise", [
                ["Résultats vs attentes", "Ce qui fait bouger le cours n'est pas le chiffre absolu mais l'écart avec ce que le marché anticipait."],
                ["Guidance", "Les prévisions communiquées par la direction pour les prochains trimestres."],
                ["Endettement", "Plus une entreprise est endettée, plus elle est sensible aux taux d'intérêt et aux chocs de trésorerie."],
                ["Changements de direction", "Démissions, scandales, ou nouvelles nominations peuvent influencer la confiance du marché."],
              ]],
              ["Facteurs de marché / sectoriels", [
                ["Rotation sectorielle", "Les flux de capitaux qui basculent d'un secteur à un autre selon le cycle économique."],
                ["Performance des concurrents", "Un effet de contagion positif ou négatif peut s'appliquer à tout un secteur."],
                ["Régulation sectorielle", "Nouvelles lois, taxes ou normes spécifiques à une industrie."],
              ]],
              ["Facteurs macroéconomiques", [
                ["Taux d'intérêt", "Les hausses pénalisent surtout les valeurs de croissance et les entreprises très endettées."],
                ["Inflation", "Affecte les coûts de production et le pouvoir d'achat, donc la demande."],
                ["Politique des banques centrales", "Resserrement ou assouplissement monétaire, impact sur la liquidité globale des marchés."],
                ["Taux de change", "Impact direct sur les entreprises exportatrices ou multinationales."],
              ]],
              ["Facteurs psychologiques / techniques", [
                ["Sentiment de marché", "Le climat général d'avidité ou de peur, souvent mesuré par des indices dédiés."],
                ["Niveaux techniques", "Supports et résistances, moyennes mobiles — beaucoup d'investisseurs réagissent aux mêmes niveaux, créant un effet autoréalisateur."],
                ["Flux institutionnels", "Mouvements des gros investisseurs et des ETF, qui peuvent amplifier une tendance."],
              ]],
              ["Facteurs géopolitiques / événementiels", [
                ["Géopolitique", "Guerres, tensions commerciales, sanctions internationales."],
                ["Élections et politique fiscale", "Changements de gouvernement ou de fiscalité pouvant affecter certains secteurs."],
                ["Événements exceptionnels", "Catastrophes naturelles, pandémies, chocs d'offre soudains."],
              ]],
              ["Facteurs spécifiques à certains profils", [
                ["Lien à une matière première", "Pour les valeurs minières/énergétiques, le cours suit souvent le prix du sous-jacent (or, pétrole, etc.)."],
                ["Proxy crypto", "Certaines actions suivent le cours d'une cryptomonnaie plus que leurs propres résultats."],
                ["Risque de dilution", "Émission de nouvelles actions qui réduit la part de chaque actionnaire existant."],
              ]],
            ].map(([section, items]) => (
              <div key={section}>
                <div style={S.glossaryCat}>{section}</div>
                {items.map(([t, d]) => (
                  <div key={t} style={S.glossaryItem}>
                    <div style={S.glossaryTerm}>{t}</div>
                    <div style={S.glossaryDef}>{d}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
