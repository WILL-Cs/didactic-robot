import { useState, useEffect } from "react";

// ─── PREFILLED DATA ───────────────────────────────────────────────────────────
// Ce bloc est réécrit par Claude à chaque nouveau ticker demandé dans le chat.
// Une fois que tu changes le ticker dans l'outil, ces valeurs ne s'appliquent plus —
// elles ne servent qu'au premier chargement pour le ticker pré-rempli.
const PREFILLED_TICKER = "VST";
const PREFILLED_MODE = "invest"; // "invest" or "growth"
const PREFILLED_PROFILE = "cyclical";
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
const PREFILLED_NOTE = "Vistra Corp (VST, NYSE) — 29 juin 2026. Producteur/distributeur d'électricité US (gaz, nucléaire, charbon, solaire, stockage), positionné sur la demande IA/data centers. Titre en repli de 12% sur 6 jours (-6,6Md$ de capitalisation) suite aux propositions PJM visant à plafonner les prix de l'électricité, malgré ventes d'initiés signalées. RSI neutre (45), résistance ~200$, support ~150$. Fondamentaux très solides : revenus T1 2026 +43%, retour à la profitabilité nette (980M$ vs perte un an plus tôt), PEG très attractif (0,41). Catalyseur majeur : coentreprise Helix Digital Infrastructure (10Md$) avec KKR/Nvidia/Kuwait Investment Authority pour l'infrastructure data centers IA. Consensus \"Strong Buy\" — ⚠️ le target moyen a bougé de 193$ à 207,22$ ces derniers jours suite aux relèvements Morgan Stanley/JPMorgan post-résultats T1 ; les targets individuels vont de 187$ (Bernstein, init.) à 230$ (Seaport Research). Risque réglementaire (PJM) à surveiller en complément.";
const PREFILLED_ANALYSTS = [
  { id: 1, firm: "Morgan Stanley", rating: "Buy", target: "210", date: "2026-06-24", reputation: 5, outcome: "pending" },
  { id: 2, firm: "Seaport Research", rating: "Buy", target: "230", date: "2026-06-15", reputation: 3, outcome: "pending" },
  { id: 3, firm: "Bernstein (initiation)", rating: "Buy", target: "187", date: "2026-06-16", reputation: 4, outcome: "pending" },
  { id: 4, firm: "JPMorgan", rating: "Buy", target: "93", date: "2026-05-12", reputation: 5, outcome: "pending" },
];
const STORAGE_KEY = "finance-tool-v3";

// ─── COMPANY PROFILES ────────────────────────────────────────────────────────
const PROFILES = {
  standard:      { label: "Standard",            weights: { technical:25, valuation:25, sentiment:25, fundamentals:25 }, tags: [],
    reminders: ["Résultats vs attentes du marché, pas seulement en absolu", "Rotation sectorielle en cours", "Sentiment de marché général (avidité/peur)"] },
  growth:        { label: "Croissance établie",  weights: { technical:20, valuation:20, sentiment:20, fundamentals:40 }, tags: [],
    reminders: ["Taux d'intérêt — une hausse pénalise davantage les valeurs de croissance", "Concurrence directe et parts de marché", "Capacité à maintenir le rythme de croissance"] },
  unprofitable:  { label: "Non-profitable",      weights: { technical:25, valuation:15, sentiment:25, fundamentals:35 }, tags: ["⚠️ Perte GAAP"],
    reminders: ["Taux d'intérêt — impact fort sur le coût du financement", "Risque de dilution via levées de capital", "Trésorerie disponible vs rythme de cash-burn"] },
  crypto_proxy:  { label: "Proxy crypto/BTC",    weights: { technical:35, valuation:5,  sentiment:30, fundamentals:30 }, tags: ["⚠️ Proxy crypto", "⚠️ PER inutilisable"],
    reminders: ["Cours du Bitcoin/crypto sous-jacent — facteur dominant", "Régulation crypto (juridictions concernées)", "Niveau d'endettement lié aux achats de crypto"] },
  cyclical:      { label: "Valeur cyclique",     weights: { technical:30, valuation:35, sentiment:20, fundamentals:15 }, tags: ["⚠️ Cyclique"],
    reminders: ["Prix de la matière première / cycle économique sous-jacent", "Taux de change si activité exportatrice", "Coûts de production (énergie, main d'œuvre, intrants)"] },
  smallcap:      { label: "Small-cap growth",    weights: { technical:20, valuation:20, sentiment:25, fundamentals:35 }, tags: ["⚠️ Liquidité réduite"],
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
  technical:    { label: "Technique",         color: "#60a5fa", items: [
    { key: "rsi",         label: "RSI (14j)",                 hint: "30=survendu, 70=surachat",                              placeholder: "ex: 45" },
    { key: "vsMA50",      label: "Prix vs MM50 (%)",          hint: "Au-dessus (+) ou en-dessous (-) de la moyenne 50j",    placeholder: "ex: 3.5" },
    { key: "vsMA200",     label: "Prix vs MM200 (%)",         hint: "Au-dessus (+) ou en-dessous (-) de la moyenne 200j",   placeholder: "ex: -8" },
    { key: "momentum",    label: "Variation 1 mois (%)",      hint: "Tendance récente du cours",                             placeholder: "ex: 12" },
  ]},
  valuation:    { label: "Valorisation",      color: "#a78bfa", items: [
    { key: "peVsSector",  label: "PER vs secteur (%)",        hint: "Négatif = moins cher que le secteur. Mettre 0 si inutilisable.", placeholder: "ex: -15" },
    { key: "pegRatio",    label: "PEG ratio",                 hint: "<1=sous-évalué, >2=cher. Mettre 0 si non-profitable.",  placeholder: "ex: 1.2" },
    { key: "fromATH",     label: "Distance au + haut 52s (%)",hint: "Toujours négatif. -30 = 30% sous son plus haut",        placeholder: "ex: -25" },
  ]},
  sentiment:    { label: "Sentiment",         color: "#34d399", items: [
    { key: "analystUpside",label: "Upside analystes (%)",     hint: "Potentiel de hausse selon consensus",                   placeholder: "ex: 18" },
    { key: "ratingTrend", label: "Tendance des notes (-2/+2)",hint: "-2=dégradations, 0=stable, +2=upgrades",               placeholder: "ex: 1" },
    { key: "newsFlow",    label: "Flux d'actualités (-2/+2)", hint: "-2=très négatif, 0=neutre, +2=très positif",           placeholder: "ex: 0" },
  ]},
  fundamentals: { label: "Qualité financière",color: "#f59e0b", items: [
    { key: "revenueGrowth",label: "Croissance revenus YoY (%)",hint: "Variation du CA sur 1 an",                            placeholder: "ex: 22" },
    { key: "marginTrend", label: "Tendance des marges (-2/+2)",hint: "-2=marges qui s'effondrent, +2=améliorent",           placeholder: "ex: 1" },
    { key: "debtLevel",   label: "Endettement (-2/+2)",       hint: "-2=très endetté/risqué, +2=bilan très sain",           placeholder: "ex: 0" },
  ]},
};

// ─── GROWTH FIELDS ────────────────────────────────────────────────────────────
const GROWTH_FIELDS = {
  hypergrowth:  { label: "Hypercroissance",   color: "#f472b6", items: [
    { key: "revenueGrowthYoY", label: "Croissance revenus YoY (%)", hint: ">40% = hypercroissance",                         placeholder: "ex: 65" },
    { key: "epsGrowthYoY",     label: "Croissance BPA YoY (%)",     hint: "Vide si pas encore profitable",                  placeholder: "ex: 80" },
    { key: "forwardGrowthEst", label: "Croissance estimée N+1 (%)", hint: "Estimation consensus année prochaine",            placeholder: "ex: 45" },
  ]},
  acceleration: { label: "Accélération",      color: "#fb923c", items: [
    { key: "growthTrend",     label: "Tendance croissance (-2/+2)", hint: "-2=ralentit, +2=accélère trimestre après trimestre", placeholder: "ex: 1" },
    { key: "guidanceRevision",label: "Révisions guidance (-2/+2)", hint: "-2=abaissée, +2=relevée récemment",               placeholder: "ex: 1" },
    { key: "tamExpansion",    label: "Expansion marché (-2/+2)",   hint: "L'entreprise élargit-elle son marché adressable ?", placeholder: "ex: 1" },
  ]},
  quality:      { label: "Qualité",           color: "#34d399", items: [
    { key: "grossMargin",     label: "Marge brute (%)",            hint: ">60% = très scalable",                             placeholder: "ex: 70" },
    { key: "gMarginTrend",    label: "Tendance marges (-2/+2)",    hint: "-2=s'effondrent, +2=s'améliorent",                placeholder: "ex: 1" },
    { key: "cashPosition",    label: "Solidité financière (-2/+2)",hint: "-2=cash-burn élevé, +2=bilan très solide",         placeholder: "ex: 1" },
  ]},
  momentum:     { label: "Momentum",          color: "#60a5fa", items: [
    { key: "priceMomentum3m", label: "Variation 3 mois (%)",       hint: "Tendance du cours sur 3 mois",                    placeholder: "ex: 35" },
    { key: "analystRevisions",label: "Révisions analystes (-2/+2)",hint: "-2=dégradations, +2=upgrades",                    placeholder: "ex: 1" },
    { key: "insiderActivity", label: "Activité initiés (-2/+2)",   hint: "-2=ventes massives, +2=achats significatifs",     placeholder: "ex: 0" },
  ]},
  risks:        { label: "Risques",           color: "#f87171", items: [
    { key: "valuationStretch",label: "Tension valorisation (-2/+2)",hint: "-2=valorisation très tendue, +2=marge de sécurité", placeholder: "ex: 0" },
    { key: "dilutionRisk",    label: "Risque dilution (-2/+2)",    hint: "-2=levées fréquentes/probables, +2=pas de besoin", placeholder: "ex: 0" },
    { key: "concentrationRisk",label:"Dépendance produit (-2/+2)", hint: "-2=très dépendant d'un segment, +2=diversifié",   placeholder: "ex: 0" },
  ]},
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function normalizeInvest(key, v) {
  switch (key) {
    case "rsi":
      if (v <= 30) return 70 + (30 - v);
      if (v <= 50) return 60 + (50 - v) * 0.8;
      if (v <= 70) return 60 - (v - 50) * 1.5;
      return Math.max(0, 30 - (v - 70) * 2);
    case "vsMA50": case "vsMA200": return clamp(50 + v * 1.2, 0, 100);
    case "momentum":     return clamp(50 + v * 1.5, 0, 100);
    case "peVsSector":   return clamp(50 - v * 0.8, 0, 100);
    case "pegRatio":
      if (v <= 0) return 50;
      if (v <= 1) return 85 - v * 10;
      if (v <= 2) return 75 - (v - 1) * 35;
      return Math.max(0, 40 - (v - 2) * 15);
    case "fromATH":      return clamp(50 - v * 0.6, 0, 100);
    case "analystUpside":return clamp(50 + v * 1.5, 0, 100);
    case "ratingTrend": case "newsFlow": case "marginTrend": case "debtLevel":
      return clamp(50 + v * 25, 0, 100);
    case "revenueGrowth":return clamp(50 + v * 1.2, 0, 100);
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
  const catScores = {};
  const catConfidence = {};
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

  const optimistic = computeScores(fields, buildShifted(1), normFn, weights).final;
  const pessimistic = computeScores(fields, buildShifted(-1), normFn, weights).final;
  return {
    low: Math.round(Math.min(optimistic, pessimistic)),
    base: Math.round(base),
    high: Math.round(Math.max(optimistic, pessimistic)),
  };
}

function detectContradictions(fields, values, normFn, mode) {
  const contradictions = [];
  const v = (k) => parseVal(values[k]);

  if (mode === "invest") {
    if (v("rsi") !== null && v("revenueGrowth") !== null) {
      if (v("rsi") >= 65 && v("revenueGrowth") < 5) contradictions.push("RSI en surachat alors que la croissance des revenus est faible — le marché pourrait anticiper plus que ce que montrent les chiffres.");
    }
    if (v("momentum") !== null && v("revenueGrowth") !== null) {
      if (v("momentum") <= -15 && v("revenueGrowth") >= 20) contradictions.push("Le cours baisse fortement alors que les revenus croissent vite — décalage entre fondamentaux et perception du marché.");
    }
    if (v("analystUpside") !== null && v("ratingTrend") !== null) {
      if (v("analystUpside") >= 30 && v("ratingTrend") <= -1) contradictions.push("Fort upside théorique annoncé mais les notes des analystes se dégradent — vérifier si le target est à jour.");
    }
    if (v("debtLevel") !== null && v("revenueGrowth") !== null) {
      if (v("debtLevel") <= -1 && v("revenueGrowth") >= 30) contradictions.push("Forte croissance mais endettement signalé comme préoccupant — la croissance est-elle financée de façon soutenable ?");
    }
  } else {
    if (v("growthTrend") !== null && v("priceMomentum3m") !== null) {
      if (v("growthTrend") >= 1 && v("priceMomentum3m") <= -15) contradictions.push("La croissance s'accélère mais le cours recule depuis 3 mois — le marché doute ou n'a pas encore intégré l'information.");
    }
    if (v("valuationStretch") !== null && v("revenueGrowthYoY") !== null) {
      if (v("valuationStretch") <= -1 && v("revenueGrowthYoY") < 15) contradictions.push("Valorisation déjà tendue alors que la croissance n'est que modérée — peu de marge d'erreur.");
    }
    if (v("insiderActivity") !== null && v("analystRevisions") !== null) {
      if (v("insiderActivity") <= -1 && v("analystRevisions") >= 1) contradictions.push("Les analystes deviennent optimistes alors que des initiés vendent — signaux contradictoires entre interne et externe.");
    }
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

// ─── RADAR CHART ─────────────────────────────────────────────────────────────
function RadarChart({ catScores, fields, size = 180 }) {
  const keys = Object.keys(fields);
  const n = keys.length;
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, pct) => {
    const a = angle(i), rr = r * (pct / 100);
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  const gridLevels = [25, 50, 75, 100];
  const colors = Object.values(fields).map(f => f.color);
  const scores = keys.map(k => catScores[k] ?? 0);
  const polyPoints = scores.map((s, i) => pt(i, s).join(",")).join(" ");
  const fillColor = scores.some(s => s >= 70) ? "#34d399" : scores.some(s => s >= 55) ? "#a3e635" : "#fbbf24";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map(lvl => {
        const pts = keys.map((_, i) => pt(i, lvl).join(",")).join(" ");
        return <polygon key={lvl} points={pts} fill="none" stroke="#1e2533" strokeWidth="1" />;
      })}
      {keys.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#1e2533" strokeWidth="1" />;
      })}
      <polygon points={polyPoints} fill={fillColor} fillOpacity="0.15" stroke={fillColor} strokeWidth="2" />
      {scores.map((s, i) => {
        const [x, y] = pt(i, s);
        return <circle key={i} cx={x} cy={y} r="3" fill={colors[i]} />;
      })}
      {keys.map((k, i) => {
        const [x, y] = pt(i, 115);
        const label = fields[k].label.split(" ")[0];
        return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={colors[i]} fontSize="8.5" fontWeight="700">{label}</text>;
      })}
    </svg>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function FinanceTool() {
  const [mode, setMode]         = useState(PREFILLED_MODE);
  const [tab, setTab]           = useState("analyse");
  const [ticker, setTicker]     = useState(PREFILLED_TICKER);
  const [values, setValues]     = useState(PREFILLED_VALUES);
  const [profile, setProfile]   = useState(PREFILLED_PROFILE);
  const [weights, setWeights]   = useState(PROFILES[PREFILLED_PROFILE].weights);
  const [showWeights, setShowWeights] = useState(false);
  const [showExplain, setShowExplain] = useState(true);
  const [history, setHistory]   = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [compareIds, setCompareIds]   = useState([]);
  const [compareMode, setCompareMode] = useState(PREFILLED_MODE);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [checkedFactors, setCheckedFactors] = useState([]);
  const [showChecklist, setShowChecklist] = useState(false);
  const [analystRatings, setAnalystRatings] = useState(ticker === PREFILLED_TICKER ? PREFILLED_ANALYSTS : []);
  const [showAnalysts, setShowAnalysts] = useState(true);
  const [newAnalyst, setNewAnalyst] = useState({ firm: "", rating: "Buy", target: "", date: "", reputation: "3" });
  const [importFeedback, setImportFeedback] = useState("");

  // Fallback storage using localStorage when window.storage is not available
  const storage = {
    get: async (key) => {
      try {
        if (window.storage) return window.storage.get(key);
        const val = localStorage.getItem(key);
        return val ? { value: val } : null;
      } catch { return null; }
    },
    set: async (key, value) => {
      try {
        if (window.storage) return window.storage.set(key, value);
        localStorage.setItem(key, value);
      } catch {}
    },
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(STORAGE_KEY);
        if (r?.value) setHistory(JSON.parse(r.value));
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fields    = mode === "invest" ? INVEST_FIELDS : GROWTH_FIELDS;
  const normFn    = mode === "invest" ? normalizeInvest : normalizeGrowth;
  const verdictFn = mode === "invest" ? investVerdict : growthVerdict;
  const { catScores, catConfidence, final: finalScore } = computeScores(fields, values, normFn, weights);
  const verdict   = finalScore !== null ? verdictFn(finalScore) : null;
  const autoTags  = autoRiskTags(values, mode);
  const profileTags = PROFILES[profile]?.tags || [];
  const allTags   = [...new Set([...profileTags, ...autoTags])];
  const filledCount = Object.keys(fields).reduce((s, k) => s + fields[k].items.filter(i => values[i.key] !== "" && values[i.key] !== undefined).length, 0);
  const totalFields = Object.keys(fields).reduce((s, k) => s + fields[k].items.length, 0);
  const sensitivity = finalScore !== null ? computeSensitivity(fields, values, normFn, weights) : null;
  const scoreRange  = finalScore !== null ? computeScoreRange(fields, values, normFn, weights) : null;
  const contradictions = detectContradictions(fields, values, normFn, mode);

  const setVal = (key, v) => setValues(p => ({ ...p, [key]: v }));

  const applyProfile = (p) => {
    setProfile(p);
    setWeights(PROFILES[p].weights);
  };

  const saveEntry = () => {
    if (finalScore === null) return;
    const entry = { id: Date.now(), ticker: ticker.trim().toUpperCase() || "—", score: Math.round(finalScore), verdict: verdict.label, date: new Date().toLocaleDateString("fr-FR"), values: { ...values }, mode, profile, checkedFactors: [...checkedFactors], analystRatings: [...analystRatings] };
    const updated = [entry, ...history].slice(0, 40);
    setHistory(updated);
    storage.set(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
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
    setTab("analyse"); setShowHistory(false);
  };

  const resetForm = () => {
    const hasData = ticker || Object.keys(values).some(k=>values[k]!=="") || analystRatings.length > 0 || checkedFactors.length > 0;
    if (hasData && !window.confirm("Réinitialiser efface le ticker, les valeurs saisies, les avis d'analystes et la checklist pour cette analyse. Continuer ?")) return;
    setTicker(""); setValues({}); setCheckedFactors([]); setAnalystRatings([]);
  };

  const toggleFactor = (f) => setCheckedFactors(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);

  const addAnalystRating = () => {
    if (!newAnalyst.firm.trim()) return;
    const entry = { id: Date.now(), firm: newAnalyst.firm.trim(), rating: newAnalyst.rating, target: newAnalyst.target, date: newAnalyst.date || new Date().toISOString().slice(0,10), reputation: parseInt(newAnalyst.reputation) || 3, outcome: "pending" };
    setAnalystRatings(p => [entry, ...p].sort((a,b) => new Date(b.date) - new Date(a.date)));
    setNewAnalyst({ firm: "", rating: "Buy", target: "", date: "", reputation: "3" });
  };

  const removeAnalystRating = (id) => setAnalystRatings(p => p.filter(a => a.id !== id));

  const setRatingOutcome = (id, outcome) => setAnalystRatings(p => p.map(a => a.id === id ? { ...a, outcome } : a));

  const firmAccuracy = (firmName) => {
    const name = firmName.toLowerCase();
    let hits = 0, misses = 0;
    for (const h of history) {
      for (const a of (h.analystRatings || [])) {
        if (a.firm.toLowerCase() === name) {
          if (a.outcome === "hit") hits++;
          else if (a.outcome === "missed") misses++;
        }
      }
    }
    for (const a of analystRatings) {
      if (a.firm.toLowerCase() === name) {
        if (a.outcome === "hit") hits++;
        else if (a.outcome === "missed") misses++;
      }
    }
    const total = hits + misses;
    return total > 0 ? { rate: hits / total, total } : null;
  };

  const ratingScoreMap = { "Strong Buy": 2, "Buy": 1, "Hold": 0, "Sell": -1, "Strong Sell": -2 };
  function clampNum(v, a, b) { return Math.max(a, Math.min(b, v)); }
  const computeReliability = (rating, allRatings) => {
    const groupAvg = allRatings.reduce((s,a)=>s+(ratingScoreMap[a.rating]??0),0) / Math.max(allRatings.length,1);
    const ratingScore = ratingScoreMap[rating.rating] ?? 0;
    const deviation = Math.abs(ratingScore - groupAvg);
    const consensusFactor = clampNum(1 - deviation / 4, 0.3, 1);
    const reputationFactor = (rating.reputation || 3) / 5;
    const acc = firmAccuracy(rating.firm);
    const accuracyFactor = acc ? clampNum(acc.rate, 0.1, 1) : 0.5;
    const accuracyConfidence = acc ? clampNum(acc.total / 5, 0.2, 1) : 0;
    const raw = reputationFactor * 0.20 + consensusFactor * 0.30 + (accuracyFactor * accuracyConfidence + 0.5 * (1 - accuracyConfidence)) * 0.50;
    return clampNum(Math.round(raw * 100), 10, 100);
  };

  const analystConsensus = (() => {
    if (analystRatings.length === 0) return null;
    const score = ratingScoreMap;
    const avgScore = analystRatings.reduce((s,a) => s + (score[a.rating] ?? 0), 0) / analystRatings.length;
    const targets = analystRatings.map(a => parseFloat(a.target)).filter(t => !isNaN(t));
    const avgTarget = targets.length ? targets.reduce((a,b)=>a+b,0) / targets.length : null;
    const sorted = [...analystRatings].sort((a,b) => new Date(a.date) - new Date(b.date));
    let trend = 0;
    if (sorted.length >= 3) {
      const recentAvg = sorted.slice(-Math.ceil(sorted.length/2)).reduce((s,a)=>s+(score[a.rating]??0),0) / Math.ceil(sorted.length/2);
      const olderAvg = sorted.slice(0, Math.floor(sorted.length/2)).reduce((s,a)=>s+(score[a.rating]??0),0) / Math.max(Math.floor(sorted.length/2),1);
      trend = recentAvg - olderAvg;
    }
    const label = avgScore >= 1.5 ? "Strong Buy" : avgScore >= 0.5 ? "Buy" : avgScore >= -0.5 ? "Hold" : avgScore >= -1.5 ? "Sell" : "Strong Sell";
    const weightedTargets = analystRatings.filter(a => !isNaN(parseFloat(a.target)));
    let weightedAvgTarget = avgTarget;
    if (weightedTargets.length) {
      let wsum = 0, wtot = 0;
      for (const a of weightedTargets) {
        const w = computeReliability(a, analystRatings);
        wsum += parseFloat(a.target) * w;
        wtot += w;
      }
      weightedAvgTarget = wtot > 0 ? wsum / wtot : avgTarget;
    }
    return { avgScore, avgTarget, weightedAvgTarget, trend, label, count: analystRatings.length };
  })();

  const toggleCompare = (id) => setCompareIds(p => p.includes(id) ? p.filter(x => x !== id) : p.length < 4 ? [...p, id] : p);

  const exportText = () => {
    const lines = [`ANALYSE — ${ticker || "—"} [${mode === "invest" ? "Invest" : "Croissance"}]`, new Date().toLocaleDateString("fr-FR"), "", `SCORE : ${Math.round(finalScore ?? 0)}/100 — ${verdict?.label || "—"}`, `Profil : ${PROFILES[profile]?.label || "—"}`, ""];
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
    const a = Object.assign(document.createElement("a"), { href: url, download: `analyse-${(ticker||"action").toLowerCase()}-${new Date().toISOString().slice(0,10)}.txt` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const downloadFullBackup = () => {
    const payload = { exportedAt: new Date().toISOString(), version: 1, history };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `finance-tool-backup-${new Date().toISOString().slice(0,10)}.json` });
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
        const sorted = merged.sort((a,b) => b.id - a.id).slice(0, 200);
        setHistory(sorted);
        storage.set(STORAGE_KEY, JSON.stringify(sorted)).catch(() => {});
        setImportFeedback(`${incoming.length} analyses importées.`);
      } catch {
        setImportFeedback("Fichier invalide — vérifie que c'est bien un export de cet outil.");
      }
      setTimeout(() => setImportFeedback(""), 4000);
    };
    reader.readAsText(file);
  };

  // ─── STYLES ───────────────────────────────────────────────────────────────
  const C = { bg: "#090b10", card: "#111520", border: "#1a1f2e", text: "#e2e8f0", muted: "#64748b", dim: "#334155" };
  const S = {
    root: { background: C.bg, minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", color: C.text, padding: "16px 14px 60px" },
    wrap: { maxWidth: 740, margin: "0 auto" },
    title: { fontSize: 20, fontWeight: 800, color: "#f8fafc", letterSpacing: "-.5px" },
    sub:   { fontSize: 11.5, color: C.muted, marginTop: 2 },
    modeRow: { display: "flex", gap: 8, margin: "14px 0 12px" },
    modeBtn: (a) => ({ flex:1, padding: "9px 0", borderRadius: 9, border: `1.5px solid ${a?"#3b82f6":"#1e2533"}`, background: a?"rgba(59,130,246,.12)":"transparent", color: a?"#60a5fa":C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer" }),
    tabBar: { display: "flex", gap: 6, background: "#0e1117", borderRadius: 10, padding: 4, marginBottom: 16 },
    tab: (a) => ({ flex:1, padding:"7px 0", borderRadius:8, border:"none", background:a?"#1e2533":"transparent", color:a?C.text:C.muted, fontSize:12, fontWeight:700, cursor:"pointer" }),
    tickerInput: { background: C.card, border: `1px solid ${C.border}`, borderRadius:10, color:"#f8fafc", padding:"11px 14px", fontSize:15, fontWeight:700, width:"100%", boxSizing:"border-box", outline:"none", letterSpacing:1, marginBottom: 10 },
    note: { fontSize: 11, color: "#7c8aab", background: "rgba(96,165,250,.06)", border: "1px solid rgba(96,165,250,.12)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 },
    profileRow: { display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 },
    profileBtn: (a) => ({ padding:"5px 11px", borderRadius:7, border:`1px solid ${a?"#6366f1":"#1e2533"}`, background:a?"rgba(99,102,241,.12)":"transparent", color:a?"#a5b4fc":C.muted, fontSize:11.5, fontWeight:600, cursor:"pointer" }),
    tagsRow: { display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 },
    tag: { fontSize:11, fontWeight:700, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.2)", color:"#fca5a5", borderRadius:6, padding:"2px 8px" },
    progressBar: { height:3, background:"#0e1117", borderRadius:2, overflow:"hidden", marginBottom:4 },
    progressFill: (pct) => ({ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#3b82f6,#a78bfa)", transition:"width .3s" }),
    explainToggle: { display:"flex", justifyContent:"flex-end", marginBottom:14 },
    explainBtn: { background:"none", border:"none", color:C.dim, fontSize:11, cursor:"pointer", textDecoration:"underline" },
    resultRow: { display:"flex", gap:12, marginBottom:16, alignItems:"center" },
    resultCard: (v) => ({ flex:1, background:v?v.bg:C.card, border:`1px solid ${v?v.color:C.border}`, borderRadius:14, padding:"16px", textAlign:"center" }),
    score: (c) => ({ fontSize:42, fontWeight:800, color:c||"#f8fafc", letterSpacing:"-1px", lineHeight:1 }),
    vLabel:(c) => ({ fontSize:14, fontWeight:700, color:c||C.muted, marginTop:4 }),
    vmeta: { fontSize:11, color:C.muted, marginTop:6 },
    radarWrap: { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"12px", display:"flex", alignItems:"center", justifyContent:"center" },
    catBlock: { marginBottom:18 },
    catHead: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 },
    catLabel: (c) => ({ fontSize:11.5, fontWeight:800, letterSpacing:1.5, color:c, textTransform:"uppercase" }),
    catScore: (c) => ({ fontSize:12.5, fontWeight:700, color:c }),
    fieldCard: { background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 13px", marginBottom:8 },
    fLabel: { fontSize:12.5, fontWeight:600, color:"#cbd5e1" },
    fHint:  { fontSize:10.5, color:"#475569" },
    fInput: { background:"transparent", border:"none", color:"#f8fafc", fontSize:14, fontWeight:700, width:"100%", outline:"none", marginTop:3 },
    fExplain:{ fontSize:10.5, color:"#7c8aab", marginTop:3, fontStyle:"italic" },
    btnRow: { display:"flex", gap:8, marginBottom:10 },
    btn:    { flex:1, background:"#131720", border:`1px solid ${C.border}`, color:"#94a3b8", borderRadius:9, padding:"10px 0", fontSize:13, fontWeight:600, cursor:"pointer" },
    btnP:   { flex:1, background:"#3b82f6", border:"none", color:"#fff", borderRadius:9, padding:"10px 0", fontSize:13, fontWeight:700, cursor:"pointer" },
    exportRow: { display:"flex", gap:8, marginBottom:6 },
    exportBtn: { flex:1, background:"#0e1117", border:`1px solid ${C.border}`, color:C.muted, borderRadius:9, padding:"9px 0", fontSize:12, fontWeight:600, cursor:"pointer" },
    copyFb: { fontSize:11.5, color:"#34d399", textAlign:"center", marginBottom:10 },
    collapse: { display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", padding:"10px 0", borderTop:`1px solid ${C.border}` },
    colTitle: { fontSize:12.5, fontWeight:700, color:"#94a3b8" },
    wRow: { display:"flex", alignItems:"center", gap:10, marginBottom:8 },
    wLabel:{ fontSize:12, color:"#cbd5e1", width:120, flexShrink:0 },
    wVal:  { fontSize:12, fontWeight:700, color:"#f8fafc", width:32, textAlign:"right" },
    histItem: { background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 13px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7, cursor:"pointer" },
    histTicker: { fontSize:13.5, fontWeight:700, color:"#f8fafc" },
    histMeta:   { fontSize:10.5, color:C.muted, marginTop:1 },
    histScore: (c) => ({ fontSize:15, fontWeight:800, color:c }),
    staleBadge: { fontSize:9.5, fontWeight:700, color:"#fb923c", background:"rgba(251,146,60,.1)", borderRadius:5, padding:"1px 6px", marginLeft:6 },
    backupBox: { background:"rgba(96,165,250,.04)", border:`1px dashed ${C.border}`, borderRadius:10, padding:"12px 14px", marginTop:12 },
    backupTitle: { fontSize:11.5, fontWeight:700, color:"#94a3b8", marginBottom:4 },
    backupHint: { fontSize:10.5, color:"#475569", marginBottom:10, lineHeight:1.5 },
    exportBtnLabel: { flex:1, background:"#0e1117", border:`1px solid ${C.border}`, color:C.muted, borderRadius:9, padding:"9px 0", fontSize:12, fontWeight:600, cursor:"pointer", textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:4 },
    rmBtn: { background:"transparent", border:"none", color:C.dim, cursor:"pointer", fontSize:15, padding:"0 0 0 10px" },
    empty: { fontSize:12, color:"#475569", textAlign:"center", padding:"24px 0" },
    compareTable: { width:"100%", borderCollapse:"collapse", marginBottom:16 },
    th: { fontSize:11, color:C.muted, textAlign:"left", padding:"5px 7px", borderBottom:`1px solid ${C.border}`, fontWeight:700 },
    td: { fontSize:12, color:"#cbd5e1", padding:"7px 7px", borderBottom:`1px solid #0e1117` },
    sparkWrap: { background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 14px 8px", marginBottom:14 },
    sparkTitle: { fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:8 },
    checkbox: (on) => ({ width:17, height:17, borderRadius:5, border:`1.5px solid ${on?"#3b82f6":"#334155"}`, background:on?"#3b82f6":"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", cursor:"pointer", flexShrink:0, marginRight:10 }),
    rangeCard: { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:14 },
    rangeTitle: { fontSize:11, color:C.muted, marginBottom:10 },
    rangeBarWrap: { padding:"4px 0" },
    rangeBarTrack: { position:"relative", height:8, background:"#1a1f2e", borderRadius:4 },
    rangeBarFill: (low, high) => ({ position:"absolute", left:`${low}%`, width:`${Math.max(high-low,2)}%`, height:"100%", background:"linear-gradient(90deg,#fb923c,#34d399)", borderRadius:4, opacity:0.55 }),
    rangeBarPoint: (base) => ({ position:"absolute", left:`${base}%`, top:-3, width:3, height:14, background:"#f8fafc", borderRadius:2, transform:"translateX(-1.5px)" }),
    rangeLabels: { display:"flex", justifyContent:"space-between", fontSize:10.5, color:C.muted, marginTop:8 },
    insightCard: { display:"flex", gap:10, alignItems:"flex-start", background:"rgba(167,139,250,.07)", border:"1px solid rgba(167,139,250,.18)", borderRadius:10, padding:"10px 14px", fontSize:11.5, color:"#cbd5e1", marginBottom:14, lineHeight:1.5 },
    insightIcon: { fontSize:14, flexShrink:0 },
    contradictionBox: { background:"rgba(251,146,60,.06)", border:"1px solid rgba(251,146,60,.18)", borderRadius:10, padding:"12px 14px", marginBottom:16 },
    contradictionTitle: { fontSize:11.5, fontWeight:700, color:"#fb923c", marginBottom:8 },
    contradictionItem: { fontSize:11.5, color:"#cbd5e1", marginBottom:6, lineHeight:1.5, paddingLeft:10, borderLeft:"2px solid rgba(251,146,60,.3)" },
    confidenceDot: { color:"#fb923c", fontSize:8, marginLeft:6, verticalAlign:"middle" },
    checklistRow: { display:"flex", alignItems:"center", padding:"7px 2px", cursor:"pointer" },
    checklistLabel: { fontSize:12.5, color:"#cbd5e1" },
    checklistSectionLabel: { fontSize:10, fontWeight:700, letterSpacing:1, color:"#475569", textTransform:"uppercase", margin:"10px 0 4px" },
    glossaryItem: { background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", marginBottom:8 },
    glossaryTerm: { fontSize:13, fontWeight:700, color:"#f8fafc", marginBottom:3 },
    glossaryDef: { fontSize:12, color:"#a8b8c8", lineHeight:1.5 },
    glossaryCat: { fontSize:11, fontWeight:800, letterSpacing:1.5, color:"#60a5fa", textTransform:"uppercase", marginTop:18, marginBottom:10 },
    consensusCard: { background:"rgba(96,165,250,.06)", border:"1px solid rgba(96,165,250,.15)", borderRadius:10, padding:"12px 14px", marginBottom:12 },
    consensusRow: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 },
    consensusLabel: { fontSize:11.5, color:C.muted },
    consensusValue: (label) => ({ fontWeight:800, fontSize:13, color: label.includes("Strong Buy")?"#34d399": label==="Buy"?"#a3e635": label==="Hold"?"#fbbf24": label==="Sell"?"#fb923c":"#f87171" }),
    consensusHint: { fontSize:10.5, color:"#475569", marginTop:6 },
    analystRow: { display:"flex", alignItems:"center", background:C.card, border:`1px solid ${C.border}`, borderRadius:"9px 9px 0 0", padding:"9px 12px", gap:8 },
    analystFirm: { fontSize:12.5, fontWeight:700, color:"#e2e8f0" },
    analystMeta: { fontSize:10.5, color:C.muted, marginTop:1 },
    analystBadge: (rating) => ({ fontSize:10.5, fontWeight:700, padding:"3px 8px", borderRadius:6, flexShrink:0,
      background: rating.includes("Strong Buy")?"rgba(52,211,153,.15)": rating==="Buy"?"rgba(163,230,53,.12)": rating==="Hold"?"rgba(251,191,36,.12)": rating==="Sell"?"rgba(251,146,60,.12)":"rgba(248,113,113,.12)",
      color: rating.includes("Strong Buy")?"#34d399": rating==="Buy"?"#a3e635": rating==="Hold"?"#fbbf24": rating==="Sell"?"#fb923c":"#f87171" }),
    addAnalystForm: { background:"#0e1117", border:`1px dashed ${C.border}`, borderRadius:10, padding:"12px", marginTop:10 },
    addAnalystInput: { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:"#f8fafc", padding:"8px 10px", fontSize:12.5, width:"100%", boxSizing:"border-box", outline:"none" },
    addAnalystInputSmall: { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:"#f8fafc", padding:"8px 10px", fontSize:12, flex:1, outline:"none", minWidth:0 },
    addAnalystSelect: { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:"#f8fafc", padding:"8px 6px", fontSize:12, flex:1, outline:"none" },
    addAnalystBtn: { width:"100%", marginTop:8, background:"#3b82f6", border:"none", color:"#fff", borderRadius:8, padding:"9px 0", fontSize:12.5, fontWeight:700, cursor:"pointer" },
    repLabel: { fontSize:10.5, color:C.muted, marginBottom:4 },
    reliabilityBadge: (val) => ({ fontSize:10.5, fontWeight:800, padding:"3px 7px", borderRadius:6, flexShrink:0, minWidth:28, textAlign:"center",
      background: val>=70?"rgba(52,211,153,.12)": val>=45?"rgba(251,191,36,.12)":"rgba(248,113,113,.12)",
      color: val>=70?"#34d399": val>=45?"#fbbf24":"#f87171" }),
    analystRowWrap: { marginBottom:8, border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 9px 9px" },
    accuracyHint: { color:"#7c8aab" },
    outcomeRow: { display:"flex", alignItems:"center", gap:6, padding:"6px 12px", flexWrap:"wrap" },
    outcomeLabel: { fontSize:10, color:"#475569", marginRight:2 },
    outcomeBtn: (active, type) => ({
      fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:6, cursor:"pointer", border:"1px solid",
      borderColor: active ? (type==="hit"?"#34d399":type==="missed"?"#f87171":"#475569") : "#1e2533",
      background: active ? (type==="hit"?"rgba(52,211,153,.12)":type==="missed"?"rgba(248,113,113,.12)":"rgba(71,85,105,.12)") : "transparent",
      color: active ? (type==="hit"?"#34d399":type==="missed"?"#f87171":"#94a3b8") : "#475569",
    }),
  };

  const fieldExplain = (key, rawVal) => {
    const v = parseVal(rawVal);
    if (v === null) return null;
    const invest = {
      rsi: v<=30?"Survendu, rebond possible":v<=50?"Zone basse-neutre":v<=70?"Zone haute-neutre":"Surachat, risque de correction",
      vsMA50: v>5?"Au-dessus MM50, tendance haussière":v>=0?"Légèrement au-dessus":"En dessous MM50",
      vsMA200: v>5?"Au-dessus MM200, tendance long terme haussière":v>=0?"Légèrement au-dessus":"En dessous MM200, tendance baissière",
      momentum: v>10?"Forte hausse récente":v>=0?"Stable à légèrement haussier":"Repli récent",
      peVsSector: v<-15?"Nettement moins cher que le secteur":v<=15?"Proche du secteur":"Plus cher que le secteur",
      pegRatio: v<=0?"Non applicable (mettre 0 si non-profitable)":v<=1?"Sous-évalué vs croissance":v<=2?"Raisonnable":"Cher par rapport à la croissance",
      fromATH: v>-10?"Proche de son plus haut":v>-30?"Correction modérée":"Forte décote depuis le plus haut",
      analystUpside: v>20?"Fort potentiel selon analystes":v>=0?"Potentiel modeste":"Déjà au-dessus du consensus",
      ratingTrend: v>=1?"Notes en amélioration":v<=-1?"Notes dégradées":"Stable",
      newsFlow: v>=1?"Actualité récente favorable":v<=-1?"Actualité défavorable":"Neutre",
      revenueGrowth: v>20?"Forte croissance":v>=0?"Croissance modeste":"CA en baisse",
      marginTrend: v>=1?"Marges en amélioration":v<=-1?"Marges sous pression":"Stables",
      debtLevel: v>=1?"Bilan sain":v<=-1?"Endettement préoccupant":"Normal",
    };
    const growth = {
      revenueGrowthYoY: v>=60?"Hypercroissance exceptionnelle":v>=30?"Forte croissance":v>=10?"Modérée":"Faible ou négative",
      epsGrowthYoY: v>=50?"Très forte progression":v>=0?"En croissance":"En baisse",
      forwardGrowthEst: v>=40?"Anticipations très ambitieuses":v>=15?"Solide":"Modeste",
      growthTrend: v>=1?"Croissance qui accélère":v<=-1?"Ralentit — signal d'alerte":"Stable",
      guidanceRevision: v>=1?"Guidance relevée, direction confiante":v<=-1?"Guidance abaissée":"Inchangée",
      tamExpansion: v>=1?"Marché adressable en expansion":v<=-1?"Se contracte":"Stable",
      grossMargin: v>=65?"Modèle très scalable":v>=40?"Correcte":"Faible",
      gMarginTrend: v>=1?"S'améliorent avec l'échelle":v<=-1?"Sous pression":"Stables",
      cashPosition: v>=1?"Bilan solide":v<=-1?"Dépendant du financement externe":"Normal",
      priceMomentum3m: v>=30?"Fort engouement du marché":v>=0?"Tendance positive modérée":"Marché sceptique",
      analystRevisions: v>=1?"Analystes plus optimistes":v<=-1?"Analystes plus prudents":"Stables",
      insiderActivity: v>=1?"Insiders achètent — bon signal":v<=-1?"Ventes d'insiders":"Neutre",
      valuationStretch: v>=1?"Marge de sécurité sur la valorisation":v<=-1?"Valorisation tendue":"Ni tendue ni généreuse",
      dilutionRisk: v>=1?"Peu de risque de dilution":v<=-1?"Risque de dilution à surveiller":"Modéré",
      concentrationRisk: v>=1?"Revenus diversifiés":v<=-1?"Forte dépendance":"Moyenne",
    };
    return (mode==="invest"?invest:growth)[key] || null;
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');`}</style>
      <div style={S.wrap}>

        {/* HEADER */}
        <div style={S.title}>Analyse Financière</div>
        <div style={S.sub}>Investir ou attendre · Potentiel de croissance</div>

        {/* MODE SWITCH */}
        <div style={S.modeRow}>
          <button style={S.modeBtn(mode==="invest")} onClick={()=>{
            setMode("invest");
            if (ticker === PREFILLED_TICKER) setValues(PREFILLED_VALUES_INVEST);
          }}>⏱ Invest / Timing</button>
          <button style={S.modeBtn(mode==="growth")} onClick={()=>{
            setMode("growth");
            if (ticker === PREFILLED_TICKER) setValues(PREFILLED_VALUES_GROWTH);
          }}>📈 Croissance</button>
        </div>

        {/* TABS */}
        <div style={S.tabBar}>
          <button style={S.tab(tab==="analyse")}  onClick={()=>setTab("analyse")}>Analyse</button>
          <button style={S.tab(tab==="evolution")} onClick={()=>setTab("evolution")}>Évolution</button>
          <button style={S.tab(tab==="compare")}  onClick={()=>setTab("compare")}>Comparer</button>
          <button style={S.tab(tab==="glossaire")} onClick={()=>setTab("glossaire")}>Glossaire</button>
        </div>

        {/* ── ANALYSE TAB ── */}
        {tab === "analyse" && (<>
          <input style={S.tickerInput} placeholder="TICKER" value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} />

          {PREFILLED_NOTE && ticker === PREFILLED_TICKER && (
            <div style={S.note}>{PREFILLED_NOTE}</div>
          )}

          {/* PROFILES */}
          <div style={S.profileRow}>
            {Object.entries(PROFILES).map(([k,p]) => (
              <button key={k} style={S.profileBtn(profile===k)} onClick={()=>applyProfile(k)}>{p.label}</button>
            ))}
          </div>

          {/* AUTO RISK TAGS */}
          {allTags.length > 0 && (
            <div style={S.tagsRow}>
              {allTags.map(t => <span key={t} style={S.tag}>{t}</span>)}
            </div>
          )}

          {/* ANALYST RATINGS TRACKER */}
          <div style={S.collapse} onClick={()=>setShowAnalysts(v=>!v)}>
            <span style={S.colTitle}>Avis d&apos;analystes détaillés ({analystRatings.length})</span>
            <span style={{color:C.dim}}>{showAnalysts?"−":"+"}</span>
          </div>
          {showAnalysts && (
            <div style={{padding:"10px 0 16px"}}>
              {analystConsensus && (
                <div style={S.consensusCard}>
                  <div style={S.consensusRow}>
                    <span style={S.consensusLabel}>Consensus calculé</span>
                    <span style={S.consensusValue(analystConsensus.label)}>{analystConsensus.label}</span>
                  </div>
                  {analystConsensus.avgTarget !== null && (
                    <div style={S.consensusRow}>
                      <span style={S.consensusLabel}>Target moyen (pondéré fiabilité)</span>
                      <span style={{fontWeight:700,color:"#f8fafc"}}>{analystConsensus.weightedAvgTarget.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={S.consensusRow}>
                    <span style={S.consensusLabel}>Tendance des révisions</span>
                    <span style={{fontWeight:700,color: analystConsensus.trend>0.3?"#34d399":analystConsensus.trend<-0.3?"#f87171":"#94a3b8"}}>
                      {analystConsensus.trend>0.3?"↗ s'améliore":analystConsensus.trend<-0.3?"↘ se dégrade":"→ stable"}
                    </span>
                  </div>
                  <div style={S.consensusHint}>Basé sur {analystConsensus.count} avis individuels saisis ci-dessous.</div>
                </div>
              )}

              {analystRatings.map(a => {
                const reliability = computeReliability(a, analystRatings);
                const acc = firmAccuracy(a.firm);
                return (
                  <div key={a.id} style={S.analystRowWrap}>
                    <div style={S.analystRow}>
                      <div style={{flex:1}}>
                        <div style={S.analystFirm}>{a.firm}</div>
                        <div style={S.analystMeta}>
                          {a.date} {a.target && `· target ${a.target}`}
                          {acc && <span style={S.accuracyHint}> · historique réel : {Math.round(acc.rate*100)}% ({acc.total} cas résolus)</span>}
                        </div>
                      </div>
                      <span style={S.reliabilityBadge(reliability)} title="Indice de fiabilité (réputation + cohérence + historique réel)">{reliability}</span>
                      <span style={S.analystBadge(a.rating)}>{a.rating}</span>
                      <button style={S.rmBtn} onClick={()=>removeAnalystRating(a.id)}>✕</button>
                    </div>
                    <div style={S.outcomeRow}>
                      <span style={S.outcomeLabel}>Résultat réel :</span>
                      {["pending","hit","missed"].map(o => (
                        <button key={o} style={S.outcomeBtn(a.outcome===o, o)} onClick={()=>setRatingOutcome(a.id, o)}>
                          {o==="pending"?"En attente":o==="hit"?"✓ Target atteint":"✕ Manqué"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div style={S.addAnalystForm}>
                <input style={S.addAnalystInput} placeholder="Firme (ex: Morgan Stanley)" value={newAnalyst.firm}
                  onChange={e=>setNewAnalyst(p=>({...p, firm:e.target.value}))} />
                <div style={{display:"flex",gap:6,marginTop:6}}>
                  <select style={S.addAnalystSelect} value={newAnalyst.rating}
                    onChange={e=>setNewAnalyst(p=>({...p, rating:e.target.value}))}>
                    <option>Strong Buy</option><option>Buy</option><option>Hold</option><option>Sell</option><option>Strong Sell</option>
                  </select>
                  <input style={S.addAnalystInputSmall} type="number" placeholder="Target" value={newAnalyst.target}
                    onChange={e=>setNewAnalyst(p=>({...p, target:e.target.value}))} />
                  <input style={S.addAnalystInputSmall} type="date" value={newAnalyst.date}
                    onChange={e=>setNewAnalyst(p=>({...p, date:e.target.value}))} />
                </div>
                <div style={{marginTop:6}}>
                  <div style={S.repLabel}>Réputation de la firme (1 = peu fiable, 5 = très réputée)</div>
                  <select style={S.addAnalystSelect} value={newAnalyst.reputation}
                    onChange={e=>setNewAnalyst(p=>({...p, reputation:e.target.value}))}>
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
          <div style={S.collapse} onClick={()=>setShowChecklist(v=>!v)}>
            <span style={S.colTitle}>Facteurs externes vérifiés ({checkedFactors.length}/{(PROFILES[profile]?.reminders?.length||0) + GENERAL_REMINDERS.length})</span>
            <span style={{color:C.dim}}>{showChecklist?"−":"+"}</span>
          </div>
          {showChecklist && (
            <div style={{padding:"10px 0 16px"}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Coche les facteurs externes que tu as pris en compte pour cette analyse.</div>
              {PROFILES[profile]?.reminders?.length > 0 && (
                <>
                  <div style={S.checklistSectionLabel}>Spécifique au profil « {PROFILES[profile].label} »</div>
                  {PROFILES[profile].reminders.map((f,i) => {
                    const on = checkedFactors.includes(f);
                    return (
                      <div key={`p-${i}`} style={S.checklistRow} onClick={()=>toggleFactor(f)}>
                        <div style={S.checkbox(on)}>{on?"✓":""}</div>
                        <span style={S.checklistLabel}>{f}</span>
                      </div>
                    );
                  })}
                  <div style={S.checklistSectionLabel}>Facteurs généraux</div>
                </>
              )}
              {GENERAL_REMINDERS.map((f,i) => {
                const on = checkedFactors.includes(f);
                return (
                  <div key={i} style={S.checklistRow} onClick={()=>toggleFactor(f)}>
                    <div style={S.checkbox(on)}>{on?"✓":""}</div>
                    <span style={S.checklistLabel}>{f}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* PROGRESS */}
          <div style={S.progressBar}><div style={S.progressFill((filledCount/totalFields)*100)}/></div>
          <div style={S.explainToggle}>
            <button style={S.explainBtn} onClick={()=>setShowExplain(v=>!v)}>
              {showExplain?"Masquer les explications":"Afficher les explications"}
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
              <div style={S.rangeBarWrap}>
                <div style={S.rangeBarTrack}>
                  <div style={S.rangeBarFill(scoreRange.low, scoreRange.high)} />
                  <div style={S.rangeBarPoint(scoreRange.base)} />
                </div>
              </div>
              <div style={S.rangeLabels}>
                <span>{scoreRange.low} pessimiste</span>
                <span style={{fontWeight:800,color:"#f8fafc"}}>{scoreRange.base}</span>
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
              {contradictions.map((c, i) => (
                <div key={i} style={S.contradictionItem}>{c}</div>
              ))}
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
                <span style={S.catScore(cat.color)}>{catScores[catKey]!==null?Math.round(catScores[catKey]):"—"}</span>
              </div>
              {cat.items.map(item => (
                <div key={item.key} style={S.fieldCard}>
                  <div style={S.fLabel}>{item.label}</div>
                  <div style={S.fHint}>{item.hint}</div>
                  <input type="number" style={S.fInput} placeholder={item.placeholder}
                    value={values[item.key]??""} onChange={e=>setVal(item.key, e.target.value)} />
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
            <button style={S.btnP} onClick={saveEntry} disabled={finalScore===null}>Enregistrer</button>
          </div>
          {finalScore !== null && (<>
            <div style={S.exportRow}>
              <button style={S.exportBtn} onClick={copyExport}>📋 Copier</button>
              <button style={S.exportBtn} onClick={downloadExport}>⬇️ .txt</button>
            </div>
            {copyFeedback && <div style={S.copyFb}>{copyFeedback}</div>}
          </>)}

          {/* WEIGHTS */}
          <div style={S.collapse} onClick={()=>setShowWeights(v=>!v)}>
            <span style={S.colTitle}>Pondérations ({PROFILES[profile]?.label})</span>
            <span style={{color:C.dim}}>{showWeights?"−":"+"}</span>
          </div>
          {showWeights && (
            <div style={{padding:"10px 0 4px"}}>
              {Object.entries(fields).map(([k,cat])=>(
                <div key={k} style={S.wRow}>
                  <span style={{...S.wLabel,color:cat.color}}>{cat.label}</span>
                  <input type="range" min="0" max="100" value={weights[k]||0}
                    onChange={e=>setWeights(p=>({...p,[k]:parseInt(e.target.value)||0}))} style={{flex:1}}/>
                  <span style={S.wVal}>{weights[k]||0}%</span>
                </div>
              ))}
            </div>
          )}

          {/* HISTORY */}
          <div style={S.collapse} onClick={()=>setShowHistory(v=>!v)}>
            <span style={S.colTitle}>Historique ({history.length})</span>
            <span style={{color:C.dim}}>{showHistory?"−":"+"}</span>
          </div>
          {showHistory && (
            <div style={{padding:"10px 0 4px"}}>
              {history.length===0 ? <div style={S.empty}>Aucune analyse enregistrée.</div> : (
                <>
                  <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Touche une ligne pour recharger.</div>
                  {history.map(h=>{
                    const v=(h.mode==="growth"?growthVerdict:investVerdict)(h.score);
                    const daysOld = Math.floor((Date.now() - h.id) / 86400000);
                    const isStale = daysOld >= 30;
                    return (
                      <div key={h.id} style={S.histItem} onClick={()=>loadEntry(h)}>
                        <div>
                          <div style={S.histTicker}>
                            {h.ticker} <span style={{fontSize:10,color:C.muted,fontWeight:400}}>{h.mode==="growth"?"Croissance":"Invest"}</span>
                            {isStale && <span style={S.staleBadge} title={`Dernière analyse il y a ${daysOld} jours`}>⏱ {daysOld}j</span>}
                          </div>
                          <div style={S.histMeta}>{h.date} · {h.verdict}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center"}}>
                          <span style={S.histScore(v.color)}>{h.score}</span>
                          <button style={S.rmBtn} onClick={e=>{e.stopPropagation();deleteEntry(h.id);}}>✕</button>
                        </div>
                      </div>
                    );
                  })}

                  <div style={S.backupBox}>
                    <div style={S.backupTitle}>Sauvegarde complète</div>
                    <div style={S.backupHint}>Exporte tout ton historique dans un fichier que tu peux garder ou réimporter plus tard (changement d&apos;appareil, vidage du cache, etc.).</div>
                    <div style={S.exportRow}>
                      <button style={S.exportBtn} onClick={downloadFullBackup}>⬇️ Exporter tout (.json)</button>
                      <label style={S.exportBtnLabel}>
                        📂 Importer
                        <input type="file" accept=".json" style={{display:"none"}}
                          onChange={e=>{ if (e.target.files[0]) importBackupFile(e.target.files[0]); e.target.value=""; }} />
                      </label>
                    </div>
                    {importFeedback && <div style={S.copyFb}>{importFeedback}</div>}
                  </div>
                </>
              )}
            </div>
          )}
        </>)}

        {/* ── EVOLUTION TAB ── */}
        {tab==="evolution" && (
          history.length===0 ? <div style={S.empty}>Enregistre des analyses pour voir leur évolution ici.</div> : (
            Object.entries(
              history.reduce((acc,h)=>{(acc[h.ticker+"-"+h.mode]=acc[h.ticker+"-"+h.mode]||[]).push(h);return acc;},{})
            ).map(([k,entries])=>{
              const sorted=[...entries].sort((a,b)=>a.id-b.id);
              const scores=sorted.map(e=>e.score);
              const w=280,h2=60,p=6,min=0,max=100;
              const pts=scores.map((s,i)=>`${p+(i/Math.max(scores.length-1,1))*(w-p*2)},${h2-p-((s-min)/(max-min))*(h2-p*2)}`).join(" ");
              const tc=(scores[scores.length-1]>=scores[0])?"#34d399":"#f87171";
              const label=`${sorted[0].ticker} [${sorted[0].mode==="growth"?"Croissance":"Invest"}]`;
              return (
                <div key={k} style={S.sparkWrap}>
                  <div style={S.sparkTitle}>{label} — {sorted.length} analyse{sorted.length>1?"s":""}</div>
                  <svg width="100%" height={h2} viewBox={`0 0 ${w} ${h2}`} preserveAspectRatio="none">
                    <polyline points={pts} fill="none" stroke={tc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginTop:4}}>
                    <span>{sorted[0].date}</span>
                    <span style={{color:tc,fontWeight:700}}>{scores[scores.length-1]}</span>
                    <span>{sorted[sorted.length-1].date}</span>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* ── COMPARE TAB ── */}
        {tab==="compare" && (
          history.length===0 ? <div style={S.empty}>Enregistre des analyses pour les comparer.</div> : (<>
            <div style={S.modeRow}>
              <button style={S.modeBtn(compareMode==="invest")} onClick={()=>{setCompareMode("invest");setCompareIds([]);}}>⏱ Invest / Timing</button>
              <button style={S.modeBtn(compareMode==="growth")} onClick={()=>{setCompareMode("growth");setCompareIds([]);}}>📈 Croissance</button>
            </div>
            <div style={{fontSize:11.5,color:C.muted,marginBottom:12}}>Sélectionne jusqu&apos;à 4 analyses {compareMode==="growth"?"de croissance":"d'investissement"} à comparer.</div>
            {(() => {
              const filtered = history.filter(h => (h.mode || "invest") === compareMode);
              if (filtered.length === 0) {
                return <div style={S.empty}>Aucune analyse {compareMode==="growth"?"de croissance":"d'investissement"} enregistrée encore.</div>;
              }
              const compareFields = compareMode === "growth" ? GROWTH_FIELDS : INVEST_FIELDS;
              return (<>
                {filtered.map(h=>{
                  const on=compareIds.includes(h.id);
                  const v=(h.mode==="growth"?growthVerdict:investVerdict)(h.score);
                  return (
                    <div key={h.id} style={{...S.histItem}} onClick={()=>toggleCompare(h.id)}>
                      <div style={{display:"flex",alignItems:"center"}}>
                        <div style={S.checkbox(on)}>{on?"✓":""}</div>
                        <div>
                          <div style={S.histTicker}>{h.ticker}</div>
                          <div style={S.histMeta}>{h.date} · profil {PROFILES[h.profile]?.label || "Standard"}</div>
                        </div>
                      </div>
                      <span style={S.histScore(v.color)}>{h.score}</span>
                    </div>
                  );
                })}
                {compareIds.length>1 && (
                  <table style={S.compareTable}>
                    <thead>
                      <tr>
                        <th style={S.th}>Signal</th>
                        {compareIds.map(id=>{const h=history.find(x=>x.id===id);return <th key={id} style={S.th}>{h?.ticker}</th>;})}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{...S.td,fontWeight:700}}>Score final</td>
                        {compareIds.map(id=>{const h=history.find(x=>x.id===id);const v=(h.mode==="growth"?growthVerdict:investVerdict)(h.score);return <td key={id} style={{...S.td,fontWeight:800,color:v.color}}>{h.score}</td>;})}
                      </tr>
                      <tr>
                        <td style={S.td}>Verdict</td>
                        {compareIds.map(id=>{const h=history.find(x=>x.id===id);return <td key={id} style={S.td}>{h.verdict}</td>;})}
                      </tr>
                      {Object.entries(compareFields).flatMap(([, cat]) =>
                        cat.items.map(item => (
                          <tr key={item.key}>
                            <td style={S.td}>{item.label}</td>
                            {compareIds.map(id=>{
                              const h=history.find(x=>x.id===id);
                              const val=h?.values?.[item.key];
                              return <td key={id} style={S.td}>{val !== undefined && val !== "" ? val : <span style={{color:C.dim}}>—</span>}</td>;
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
        {tab==="glossaire" && (
          <div>
            <div style={{fontSize:11.5,color:C.muted,marginBottom:16}}>Aide-mémoire des facteurs qui influencent le cours d&apos;une action, indépendamment d&apos;un ticker précis.</div>

            <div style={S.glossaryCat}>Facteurs propres à l&apos;entreprise</div>
            {[
              ["Résultats vs attentes","Ce qui fait bouger le cours n'est pas le chiffre absolu mais l'écart avec ce que le marché anticipait."],
              ["Guidance","Les prévisions communiquées par la direction pour les prochains trimestres."],
              ["Endettement","Plus une entreprise est endettée, plus elle est sensible aux taux d'intérêt et aux chocs de trésorerie."],
              ["Changements de direction","Démissions, scandales, ou nouvelles nominations peuvent influencer la confiance du marché."],
            ].map(([t,d])=>(
              <div key={t} style={S.glossaryItem}><div style={S.glossaryTerm}>{t}</div><div style={S.glossaryDef}>{d}</div></div>
            ))}

            <div style={S.glossaryCat}>Facteurs de marché / sectoriels</div>
            {[
              ["Rotation sectorielle","Les flux de capitaux qui basculent d'un secteur à un autre selon le cycle économique."],
              ["Performance des concurrents","Un effet de contagion positif ou négatif peut s'appliquer à tout un secteur."],
              ["Régulation sectorielle","Nouvelles lois, taxes ou normes spécifiques à une industrie."],
            ].map(([t,d])=>(
              <div key={t} style={S.glossaryItem}><div style={S.glossaryTerm}>{t}</div><div style={S.glossaryDef}>{d}</div></div>
            ))}

            <div style={S.glossaryCat}>Facteurs macroéconomiques</div>
            {[
              ["Taux d'intérêt","Les hausses pénalisent surtout les valeurs de croissance et les entreprises très endettées."],
              ["Inflation","Affecte les coûts de production et le pouvoir d'achat, donc la demande."],
              ["Politique des banques centrales","Resserrement ou assouplissement monétaire, impact sur la liquidité globale des marchés."],
              ["Taux de change","Impact direct sur les entreprises exportatrices ou multinationales."],
            ].map(([t,d])=>(
              <div key={t} style={S.glossaryItem}><div style={S.glossaryTerm}>{t}</div><div style={S.glossaryDef}>{d}</div></div>
            ))}

            <div style={S.glossaryCat}>Facteurs psychologiques / techniques</div>
            {[
              ["Sentiment de marché","Le climat général d'avidité ou de peur, souvent mesuré par des indices dédiés."],
              ["Niveaux techniques","Supports et résistances, moyennes mobiles — beaucoup d'investisseurs réagissent aux mêmes niveaux, créant un effet autoréalisateur."],
              ["Flux institutionnels","Mouvements des gros investisseurs et des ETF, qui peuvent amplifier une tendance."],
            ].map(([t,d])=>(
              <div key={t} style={S.glossaryItem}><div style={S.glossaryTerm}>{t}</div><div style={S.glossaryDef}>{d}</div></div>
            ))}

            <div style={S.glossaryCat}>Facteurs géopolitiques / événementiels</div>
            {[
              ["Géopolitique","Guerres, tensions commerciales, sanctions internationales."],
              ["Élections et politique fiscale","Changements de gouvernement ou de fiscalité pouvant affecter certains secteurs."],
              ["Événements exceptionnels","Catastrophes naturelles, pandémies, chocs d'offre soudains."],
            ].map(([t,d])=>(
              <div key={t} style={S.glossaryItem}><div style={S.glossaryTerm}>{t}</div><div style={S.glossaryDef}>{d}</div></div>
            ))}

            <div style={S.glossaryCat}>Facteurs spécifiques à certains profils</div>
            {[
              ["Lien à une matière première","Pour les valeurs minières/énergétiques, le cours suit souvent le prix du sous-jacent (or, pétrole, etc.)."],
              ["Proxy crypto","Certaines actions (ex: trésoreries Bitcoin) suivent le cours d'une cryptomonnaie plus que leurs propres résultats."],
              ["Risque de dilution","Émission de nouvelles actions qui réduit la part de chaque actionnaire existant."],
            ].map(([t,d])=>(
              <div key={t} style={S.glossaryItem}><div style={S.glossaryTerm}>{t}</div><div style={S.glossaryDef}>{d}</div></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
