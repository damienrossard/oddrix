import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { initializeApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail
} from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, collection,
  getDocs, query, orderBy, limit
} from "firebase/firestore";

// ── Configuration Firebase ────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCwj1YqRFNTGG9-MlHq3yvpoG1jo9xB15o",
  authDomain:        "oddrix.firebaseapp.com",
  projectId:         "oddrix",
  storageBucket:     "oddrix.firebasestorage.app",
  messagingSenderId: "408319053899",
  appId:             "1:408319053899:web:5b85f3a2864a6b69b2bdce",
  measurementId:     "G-MMJ4SG70EZ"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth        = getAuth(firebaseApp);
const db          = getFirestore(firebaseApp);

// ── Données de démonstration ──────────────────────────────────────────────
const DEMO_BETS = [
  { id:1,  date:"2024-01-05", sport:"Football",   bookmaker:"Betclic",  type:"Simple",  marche:"Résultat match", sousMarche:"Victoire domicile",      cote:1.85, mise:20,  resultat:"gagné",  gain:37,   live:false },
  { id:2,  date:"2024-01-08", sport:"Tennis",     bookmaker:"Unibet",   type:"Simple",  marche:"Tennis",         sousMarche:"Vainqueur du match",      cote:2.10, mise:15,  resultat:"perdu",  gain:-15,  live:false },
  { id:3,  date:"2024-01-12", sport:"Football",   bookmaker:"Betclic",  type:"Combiné", marche:"Buts",           sousMarche:"Plus de 2.5 buts",        cote:3.40, mise:10,  resultat:"gagné",  gain:34,   live:true  },
  { id:4,  date:"2024-01-15", sport:"Basketball", bookmaker:"Winamax",  type:"Simple",  marche:"Basketball",     sousMarche:"Handicap points",         cote:1.60, mise:25,  resultat:"gagné",  gain:40,   live:false },
  { id:5,  date:"2024-01-18", sport:"Football",   bookmaker:"Unibet",   type:"Simple",  marche:"Résultat match", sousMarche:"Double chance X2",        cote:2.50, mise:20,  resultat:"perdu",  gain:-20,  live:true  },
  { id:6,  date:"2024-01-22", sport:"Tennis",     bookmaker:"Betclic",  type:"Simple",  marche:"Tennis",         sousMarche:"Nombre de sets",          cote:1.75, mise:30,  resultat:"gagné",  gain:52.5, live:false },
  { id:7,  date:"2024-01-25", sport:"Football",   bookmaker:"Winamax",  type:"Combiné", marche:"Buteur",         sousMarche:"1er buteur",              cote:4.20, mise:10,  resultat:"perdu",  gain:-10,  live:false },
  { id:8,  date:"2024-02-01", sport:"MMA",        bookmaker:"Betclic",  type:"Simple",  marche:"Résultat match", sousMarche:"Victoire domicile",       cote:2.00, mise:20,  resultat:"gagné",  gain:40,   live:false },
  { id:9,  date:"2024-02-05", sport:"Football",   bookmaker:"Unibet",   type:"Simple",  marche:"Buts",           sousMarche:"Les deux équipes marquent",cote:1.90, mise:25,  resultat:"gagné",  gain:47.5, live:false },
  { id:10, date:"2024-02-10", sport:"Basketball", bookmaker:"Winamax",  type:"Combiné", marche:"Basketball",     sousMarche:"Total points +/−",        cote:2.80, mise:15,  resultat:"perdu",  gain:-15,  live:true  },
  { id:11, date:"2024-02-14", sport:"Tennis",     bookmaker:"Betclic",  type:"Simple",  marche:"Buteur",         sousMarche:"Buteur dans le match",    cote:3.00, mise:10,  resultat:"gagné",  gain:30,   live:false },
  { id:12, date:"2024-02-18", sport:"Football",   bookmaker:"Betclic",  type:"Simple",  marche:"Handicap",       sousMarche:"Handicap -1",             cote:1.70, mise:30,  resultat:"gagné",  gain:51,   live:false },
];

const BOOKMAKERS = ["Betclic","Unibet","Winamax","PMU","Bwin","Vbet","Parions Sport"];
const SPORTS     = ["Football","Tennis","Basketball","MMA","Rugby","Hockey","Volleyball","Baseball"];
const TYPES      = ["Simple","Combiné","Système"];

const PAYS_CHAMPIONNATS = {
  "France":       ["Ligue 1","Ligue 2","Coupe de France"],
  "Angleterre":   ["Premier League","Championship","FA Cup"],
  "Espagne":      ["La Liga","Segunda División","Copa del Rey"],
  "Allemagne":    ["Bundesliga","2. Bundesliga","DFB-Pokal"],
  "Italie":       ["Serie A","Serie B","Coppa Italia"],
  "Portugal":     ["Primeira Liga","Liga Portugal 2"],
  "Pays-Bas":     ["Eredivisie"],
  "Belgique":     ["Pro League"],
  "Europe":       ["Champions League","Europa League","Conference League"],
  "Monde":        ["Coupe du Monde","Nations League"],
  "USA":          ["NBA","NFL","MLB","MLS","NHL"],
  "Tennis":       ["Roland Garros","Wimbledon","US Open","Australian Open","ATP Masters"],
  "MMA":          ["UFC","Bellator"],
  "Autre":        ["Autre"],
};

const MARCHES = {
  "Résultat match":     ["Victoire domicile","Nul","Victoire extérieur","Double chance 1X","Double chance X2","Double chance 12"],
  "Buteur":             ["1er buteur","Dernier buteur","Buteur dans le match","Buteur à tout moment","Doublé","Triplé"],
  "Buts":               ["Plus de 0.5 buts","Plus de 1.5 buts","Plus de 2.5 buts","Plus de 3.5 buts","Moins de 2.5 buts","Moins de 3.5 buts","Les deux équipes marquent","Score exact"],
  "Mi-temps":           ["Vainqueur 1ère mi-temps","Plus de 0.5 buts MT","Plus de 1.5 buts MT","Score exact MT"],
  "Cartons/Corners":    ["Plus de 8.5 corners","Plus de 10.5 corners","Plus de 3.5 cartons","1ère équipe à avoir un carton"],
  "Handicap":           ["Handicap -1","Handicap -2","Handicap +1","Handicap +2","Handicap asiatique"],
  "Tennis":             ["Vainqueur du match","Nombre de sets","Plus de 22.5 jeux","Tie-break dans le match","Vainqueur 1er set"],
  "Basketball":         ["Vainqueur","Handicap points","Total points +/−","Vainqueur quart-temps"],
  "Autre":              ["Pari personnalisé"],
};

const COLORS = {
  green:  "#00e676",
  teal:   "#1de9b6",
  amber:  "#ffc107",
  red:    "#ef5350",
  blue:   "#42a5f5",
  purple: "#ab47bc",
  bg:     "#0d1117",
  card:   "#161b22",
  card2:  "#1c2431",
  border: "#30363d",
  text:   "#e6edf3",
  muted:  "#8b949e",
};

const PIE_COLORS = [COLORS.green, COLORS.teal, COLORS.amber, COLORS.blue, COLORS.purple, COLORS.red];

// ── Helpers ───────────────────────────────────────────────────────────────
function calcStats(bets) {
  const total = bets.length;
  const won   = bets.filter(b => b.resultat === "gagné").length;
  const totalMise  = bets.reduce((s,b) => s + b.mise, 0);
  const totalGain  = bets.reduce((s,b) => s + b.gain, 0);
  const benefice   = bets.reduce((s,b) => s + (b.resultat==="gagné" ? b.gain - b.mise : 0), 0);
  const roi        = totalMise > 0 ? ((totalGain - totalMise) / totalMise * 100) : 0;
  const coteMoy    = total > 0 ? bets.reduce((s,b)=>s+b.cote,0)/total : 0;
  return { total, won, totalMise, totalGain, benefice, roi, coteMoy,
           tauxReussite: total>0?(won/total*100):0 };
}

function bankrollEvolution(bets, start=500) {
  let bk = start;
  return [{ date:"Départ", bankroll: bk },
    ...bets.map(b => { bk += b.resultat==="gagné"? b.gain-b.mise : b.gain; return { date:b.date.slice(5), bankroll: parseFloat(bk.toFixed(2)) }; })];
}

function monthlyStats(bets) {
  const months = {};
  bets.forEach(b => {
    const m = b.date.slice(0,7);
    if (!months[m]) months[m] = [];
    months[m].push(b);
  });
  return Object.entries(months).sort().map(([m, bs]) => {
    const s = calcStats(bs);
    return { month: m, label: new Date(m+"-01").toLocaleDateString("fr-FR",{month:"short",year:"2-digit"}), ...s };
  });
}

function calcStreak(bets) {
  const sorted = [...bets].sort((a,b)=>b.date.localeCompare(a.date));
  let streak = 0, bestStreak = 0, cur = 0;
  for (const b of sorted) {
    if (b.resultat==="gagné") { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
  }
  // current streak from latest
  for (const b of sorted) {
    if (b.resultat==="gagné") streak++;
    else break;
  }
  return { streak, bestStreak };
}

// ── Composants UI ─────────────────────────────────────────────────────────
const Card = ({ children, className="" }) => (
  <div style={{ background: COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:16 }} className={className}>
    {children}
  </div>
);

const Badge = ({ children, color=COLORS.green }) => (
  <span style={{ background:`${color}22`, color, border:`1px solid ${color}44`, borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:600 }}>
    {children}
  </span>
);

const StatCard = ({ label, value, sub, icon, color=COLORS.green }) => (
  <Card>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div style={{ color:COLORS.muted, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>{label}</div>
      <span style={{ fontSize:20 }}>{icon}</span>
    </div>
    <div style={{ color, fontSize:28, fontWeight:800, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ color:COLORS.muted, fontSize:12, marginTop:6 }}>{sub}</div>}
  </Card>
);

const Btn = ({ children, onClick, active=false, style={} }) => (
  <button onClick={onClick} style={{
    background: active ? COLORS.green : "transparent",
    color: active ? COLORS.bg : COLORS.muted,
    border: `1px solid ${active ? COLORS.green : COLORS.border}`,
    borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600,
    cursor:"pointer", transition:"all .2s", ...style
  }}>{children}</button>
);

// ── ONGLET 0 : Tableau de bord ────────────────────────────────────────────
function Dashboard({ bets, onAddBet }) {
  const s = calcStats(bets);
  const bkData = bankrollEvolution(bets);
  const { streak, bestStreak } = calcStreak(bets);
  const monthly = monthlyStats(bets);
  const thisMonth = monthly[monthly.length-1];
  const lastMonth = monthly[monthly.length-2];

  const sportData = SPORTS.map(sp => {
    const sb = bets.filter(b=>b.sport===sp);
    const ss = calcStats(sb);
    return { name:sp, paris:sb.length, roi:parseFloat(ss.roi.toFixed(1)) };
  }).filter(d=>d.paris>0);

  const compDiff = thisMonth && lastMonth ? parseFloat((thisMonth.benefice - lastMonth.benefice).toFixed(2)) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <p style={{ color:COLORS.muted, fontSize:14 }}>Résumé de vos performances</p>

      {/* Hero card */}
      <div style={{ background:"linear-gradient(135deg,#0d2818,#0a3d20)", border:`1px solid ${COLORS.green}44`, borderRadius:16, padding:24 }}>
        <div style={{ color:COLORS.teal, fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:8 }}>💼 BÉNÉFICE TOTAL</div>
        <div style={{ color: s.benefice>=0?COLORS.green:COLORS.red, fontSize:48, fontWeight:900, lineHeight:1 }}>
          {s.benefice>=0?"+":""}{s.benefice.toFixed(2)} €
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center", marginTop:12 }}>
          <Badge color={COLORS.green}>📈 En progression</Badge>
          <span style={{ color:COLORS.muted, fontSize:13 }}>{s.total} paris enregistrés</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:20 }}>
          <div>
            <div style={{ color:COLORS.text, fontSize:24, fontWeight:800 }}>{s.tauxReussite.toFixed(1)}%</div>
            <div style={{ color:COLORS.muted, fontSize:12 }}>Réussite</div>
          </div>
          <div>
            <div style={{ color:COLORS.text, fontSize:24, fontWeight:800 }}>{s.totalMise} €</div>
            <div style={{ color:COLORS.muted, fontSize:12 }}>Total misé</div>
          </div>
        </div>
        <button onClick={onAddBet} style={{
          background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:10,
          padding:"12px 24px", fontSize:15, fontWeight:800, cursor:"pointer", marginTop:20, width:"100%"
        }}>↗ Nouveau pari</button>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div style={{ background:`linear-gradient(135deg,${COLORS.amber}18,${COLORS.amber}08)`, border:`1px solid ${COLORS.amber}44`, borderRadius:14, padding:16, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:36 }}>🔥</div>
          <div>
            <div style={{ color:COLORS.amber, fontWeight:900, fontSize:22 }}>{streak} victoire{streak>1?"s":""} de suite !</div>
            <div style={{ color:COLORS.muted, fontSize:12 }}>Record personnel : {bestStreak} 🏆</div>
          </div>
        </div>
      )}

      {/* Comparaison mois précédent */}
      {compDiff !== null && (
        <Card>
          <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📅 Ce mois vs mois dernier</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[
              { label:"Ce mois", val:`${thisMonth.benefice>=0?"+":""}${thisMonth.benefice.toFixed(0)}€`, color:thisMonth.benefice>=0?COLORS.green:COLORS.red },
              { label:"Mois dernier", val:`${lastMonth.benefice>=0?"+":""}${lastMonth.benefice.toFixed(0)}€`, color:COLORS.muted },
              { label:"Différence", val:`${compDiff>=0?"+":""}${compDiff}€`, color:compDiff>=0?COLORS.teal:COLORS.red },
            ].map((c,i)=>(
              <div key={i} style={{ background:COLORS.card2, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                <div style={{ color:c.color, fontWeight:800, fontSize:16 }}>{c.val}</div>
                <div style={{ color:COLORS.muted, fontSize:10, marginTop:3 }}>{c.label}</div>
              </div>
            ))}
          </div>
          {thisMonth && lastMonth && (
            <div style={{ marginTop:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:COLORS.muted, marginBottom:4 }}>
                <span>Taux réussite : {thisMonth.tauxReussite.toFixed(0)}% ce mois</span>
                <span>{lastMonth.tauxReussite.toFixed(0)}% le mois dernier</span>
              </div>
              <div style={{ background:COLORS.card2, borderRadius:4, height:6 }}>
                <div style={{ background:thisMonth.tauxReussite>=lastMonth.tauxReussite?COLORS.green:COLORS.amber, width:`${Math.min(100,thisMonth.tauxReussite)}%`, height:"100%", borderRadius:4 }}/>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Mini stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <StatCard label="ROI" value={`${s.roi.toFixed(1)}%`} sub="Retour sur investissement" icon="%" color={s.roi>=0?COLORS.green:COLORS.red}/>
        <StatCard label="Taux de réussite" value={`${s.tauxReussite.toFixed(1)}%`} sub={`${s.won} / ${s.total} paris`} icon="🎯" color={COLORS.teal}/>
        <StatCard label="Cote moyenne" value={s.coteMoy.toFixed(2)} sub="Sur tous vos paris" icon="📊" color={COLORS.amber}/>
        <StatCard label="🔥 Série actuelle" value={`${streak} W`} sub={`Record: ${bestStreak}`} icon="🏆" color={COLORS.amber}/>
      </div>

      {/* Gains par mois */}
      {monthly.length > 1 && (
        <Card>
          <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📊 Gains / Pertes par mois</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
              <XAxis dataKey="label" tick={{fill:COLORS.muted,fontSize:10}}/>
              <YAxis tick={{fill:COLORS.muted,fontSize:10}}/>
              <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}
                formatter={(v)=>[`${v>=0?"+":""}${v.toFixed(1)} €`,"Bénéfice"]}/>
              <Bar dataKey="benefice" radius={[4,4,0,0]}>
                {monthly.map((e,i)=><Cell key={i} fill={e.benefice>=0?COLORS.green:COLORS.red}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Bankroll chart */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📈 Évolution Bankroll</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={bkData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
            <XAxis dataKey="date" tick={{fill:COLORS.muted,fontSize:10}} />
            <YAxis tick={{fill:COLORS.muted,fontSize:10}} />
            <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
            <Line type="monotone" dataKey="bankroll" stroke={COLORS.green} strokeWidth={2.5} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ROI par sport */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>ROI par sport</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={sportData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
            <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:11}}/>
            <YAxis tick={{fill:COLORS.muted,fontSize:11}}/>
            <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
            <Bar dataKey="roi" radius={[4,4,0,0]}>
              {sportData.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.green:COLORS.red}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ── ONGLET 1 : Statistiques ───────────────────────────────────────────────
function Statistics({ bets }) {
  const now        = new Date();
  const thisYear   = now.getFullYear();
  const lastYear   = thisYear - 1;
  const thisMonth  = now.getMonth(); // 0-indexed
  const lastMonth  = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? lastYear : thisYear;

  const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  const MONTHS_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  // ── Modes de filtre
  const [mode, setMode] = useState("mois_en_cours"); 
  // mois_en_cours | mois_precedent | mois_choisi | annee_en_cours | annee_precedente | comparaison_mois | comparaison_annee
  const [selectedMonth, setSelectedMonth] = useState(thisMonth);

  // ── Filtres de paris selon le mode
  const filterBets = (m) => {
    switch(m) {
      case "mois_en_cours":
        return bets.filter(b => {
          const d = new Date(b.date);
          return d.getFullYear()===thisYear && d.getMonth()===thisMonth;
        });
      case "mois_precedent":
        return bets.filter(b => {
          const d = new Date(b.date);
          return d.getFullYear()===lastMonthYear && d.getMonth()===lastMonth;
        });
      case "mois_choisi":
        return bets.filter(b => {
          const d = new Date(b.date);
          return d.getFullYear()===thisYear && d.getMonth()===selectedMonth;
        });
      case "annee_en_cours":
        return bets.filter(b => new Date(b.date).getFullYear()===thisYear);
      case "annee_precedente":
        return bets.filter(b => new Date(b.date).getFullYear()===lastYear);
      default:
        return bets;
    }
  };

  const filteredBets = filterBets(mode);
  const s = calcStats(filteredBets);

  // Pour les comparaisons
  const betsThisMonth = filterBets("mois_en_cours");
  const betsLastMonth = filterBets("mois_precedent");
  const betsThisYear  = filterBets("annee_en_cours");
  const betsLastYear  = filterBets("annee_precedente");
  const sThisMonth    = calcStats(betsThisMonth);
  const sLastMonth    = calcStats(betsLastMonth);
  const sThisYear     = calcStats(betsThisYear);
  const sLastYear     = calcStats(betsLastYear);

  // Label de la période sélectionnée
  const periodLabel = () => {
    switch(mode) {
      case "mois_en_cours":    return `${MONTHS_FULL[thisMonth]} ${thisYear}`;
      case "mois_precedent":   return `${MONTHS_FULL[lastMonth]} ${lastMonthYear}`;
      case "mois_choisi":      return `${MONTHS_FULL[selectedMonth]} ${thisYear}`;
      case "annee_en_cours":   return `Année ${thisYear}`;
      case "annee_precedente": return `Année ${lastYear}`;
      case "comparaison_mois": return `Comparaison mensuelle`;
      case "comparaison_annee":return `Comparaison annuelle`;
      default: return "Toutes périodes";
    }
  };

  const isComparison = mode === "comparaison_mois" || mode === "comparaison_annee";

  // ── Données graphiques pour la période filtrée
  const sportData = SPORTS.map(sp => {
    const sb = filteredBets.filter(b=>b.sport===sp);
    return { name:sp, roi:parseFloat(calcStats(sb).roi.toFixed(1)), paris:sb.length };
  }).filter(d=>d.paris>0);

  const bookData = BOOKMAKERS.map(bk => {
    const bb = filteredBets.filter(b=>b.bookmaker===bk);
    return { name:bk, roi:parseFloat(calcStats(bb).roi.toFixed(1)), paris:bb.length };
  }).filter(d=>d.paris>0);

  const typeData = TYPES.map(t => {
    const tb = filteredBets.filter(b=>b.type===t);
    return { name:t, roi:parseFloat(calcStats(tb).roi.toFixed(1)), paris:tb.length };
  }).filter(d=>d.paris>0);

  const coteRanges = [
    { label:"<1.5",  min:0,   max:1.5  },
    { label:"1.5-2", min:1.5, max:2    },
    { label:"2-2.5", min:2,   max:2.5  },
    { label:"2.5-3", min:2.5, max:3    },
    { label:">3",    min:3,   max:999  },
  ].map(r => {
    const rb = filteredBets.filter(b=>b.cote>=r.min && b.cote<r.max);
    return { name:r.label, taux:parseFloat(calcStats(rb).tauxReussite.toFixed(1)), paris:rb.length };
  }).filter(d=>d.paris>0);

  const jours = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
  const jourData = jours.map((j,i) => {
    const jb = filteredBets.filter(b=>new Date(b.date).getDay()===i);
    return { name:j, roi:parseFloat(calcStats(jb).roi.toFixed(1)), paris:jb.length };
  });

  // Données comparaison mois
  const compMoisData = [
    { name:MONTHS[lastMonth], benefice:parseFloat(sLastMonth.benefice.toFixed(1)), roi:parseFloat(sLastMonth.roi.toFixed(1)), taux:parseFloat(sLastMonth.tauxReussite.toFixed(1)), paris:sLastMonth.total },
    { name:MONTHS[thisMonth], benefice:parseFloat(sThisMonth.benefice.toFixed(1)), roi:parseFloat(sThisMonth.roi.toFixed(1)), taux:parseFloat(sThisMonth.tauxReussite.toFixed(1)), paris:sThisMonth.total },
  ];

  // Données comparaison année
  const compAnneeData = [
    { name:`${lastYear}`, benefice:parseFloat(sLastYear.benefice.toFixed(1)), roi:parseFloat(sLastYear.roi.toFixed(1)), taux:parseFloat(sLastYear.tauxReussite.toFixed(1)), paris:sLastYear.total },
    { name:`${thisYear}`, benefice:parseFloat(sThisYear.benefice.toFixed(1)), roi:parseFloat(sThisYear.roi.toFixed(1)), taux:parseFloat(sThisYear.tauxReussite.toFixed(1)), paris:sThisYear.total },
  ];

  // Évolution mensuelle pour l'année en cours
  const monthlyEvol = MONTHS.map((m, i) => {
    const mb = betsThisYear.filter(b => new Date(b.date).getMonth()===i);
    const ms = calcStats(mb);
    return { name:m, benefice:parseFloat(ms.benefice.toFixed(1)), paris:mb.length };
  });

  const DiffBadge = ({ val, suffix="€" }) => (
    <span style={{
      background: val>=0?`${COLORS.green}22`:`${COLORS.red}22`,
      color: val>=0?COLORS.green:COLORS.red,
      border:`1px solid ${val>=0?COLORS.green:COLORS.red}44`,
      borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:700
    }}>
      {val>=0?"+":""}{val}{suffix}
    </span>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ── SÉLECTEUR DE PÉRIODE ── */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📅 Période analysée</div>

        {/* Ligne 1 : modes principaux */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
          {[
            { id:"mois_en_cours",    label:`${MONTHS[thisMonth]} ${thisYear}`,  icon:"📌" },
            { id:"mois_precedent",   label:`${MONTHS[lastMonth]} (préc.)`,      icon:"◀️" },
            { id:"annee_en_cours",   label:`Année ${thisYear}`,                  icon:"📆" },
            { id:"annee_precedente", label:`Année ${lastYear}`,                  icon:"🗓" },
          ].map(opt=>(
            <button key={opt.id} onClick={()=>setMode(opt.id)} style={{
              background: mode===opt.id?`${COLORS.green}22`:"transparent",
              border:`1.5px solid ${mode===opt.id?COLORS.green:COLORS.border}`,
              borderRadius:10, padding:"10px 8px", cursor:"pointer", textAlign:"center"
            }}>
              <div style={{ fontSize:16 }}>{opt.icon}</div>
              <div style={{ color:mode===opt.id?COLORS.green:COLORS.text, fontSize:11, fontWeight:600, marginTop:3 }}>{opt.label}</div>
            </button>
          ))}
        </div>

        {/* Ligne 2 : comparaisons */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
          {[
            { id:"comparaison_mois",  label:"Mois vs mois préc.", icon:"📊" },
            { id:"comparaison_annee", label:`${lastYear} vs ${thisYear}`,      icon:"📈" },
          ].map(opt=>(
            <button key={opt.id} onClick={()=>setMode(opt.id)} style={{
              background: mode===opt.id?`${COLORS.purple}22`:"transparent",
              border:`1.5px solid ${mode===opt.id?COLORS.purple:COLORS.border}`,
              borderRadius:10, padding:"10px 8px", cursor:"pointer", textAlign:"center"
            }}>
              <div style={{ fontSize:16 }}>{opt.icon}</div>
              <div style={{ color:mode===opt.id?COLORS.purple:COLORS.text, fontSize:11, fontWeight:600, marginTop:3 }}>{opt.label}</div>
            </button>
          ))}
        </div>

        {/* Sélecteur de mois spécifique */}
        <div style={{ marginTop:4 }}>
          <div style={{ color:COLORS.muted, fontSize:11, marginBottom:6 }}>Choisir un mois de {thisYear} :</div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {MONTHS.map((m,i)=>(
              <button key={i} onClick={()=>{setMode("mois_choisi"); setSelectedMonth(i);}} style={{
                background: mode==="mois_choisi"&&selectedMonth===i?`${COLORS.teal}22`:"transparent",
                border:`1px solid ${mode==="mois_choisi"&&selectedMonth===i?COLORS.teal:COLORS.border}`,
                borderRadius:6, padding:"4px 7px",
                color: mode==="mois_choisi"&&selectedMonth===i?COLORS.teal:COLORS.muted,
                fontSize:11, fontWeight:600, cursor:"pointer"
              }}>{m}</button>
            ))}
          </div>
        </div>

        {/* Label période active */}
        <div style={{ marginTop:10, padding:"8px 12px", background:COLORS.card2, borderRadius:8, display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:COLORS.muted, fontSize:12 }}>Période :</span>
          <span style={{ color:COLORS.green, fontWeight:700, fontSize:12 }}>{periodLabel()}</span>
        </div>
      </Card>

      {/* ══════════════════════════════════════
          VUE COMPARAISON MOIS
      ══════════════════════════════════════ */}
      {mode==="comparaison_mois" && (
        <>
          <Card>
            <div style={{ color:COLORS.text, fontWeight:700, marginBottom:14 }}>
              📊 {MONTHS_FULL[lastMonth]} → {MONTHS_FULL[thisMonth]}
            </div>
            {[
              { label:"Bénéfice", prev:sLastMonth.benefice, curr:sThisMonth.benefice, suffix:"€", fmt:(v)=>`${v>=0?"+":""}${v.toFixed(1)}€` },
              { label:"ROI",      prev:sLastMonth.roi,      curr:sThisMonth.roi,      suffix:"%", fmt:(v)=>`${v>=0?"+":""}${v.toFixed(1)}%` },
              { label:"Réussite", prev:sLastMonth.tauxReussite, curr:sThisMonth.tauxReussite, suffix:"%", fmt:(v)=>`${v.toFixed(1)}%` },
              { label:"Paris",    prev:sLastMonth.total,    curr:sThisMonth.total,    suffix:"", fmt:(v)=>`${v}` },
            ].map((row,i)=>{
              const diff = row.curr - row.prev;
              return (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10, alignItems:"center" }}>
                  <div style={{ color:COLORS.muted, fontSize:12 }}>{row.label}</div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:COLORS.muted, fontSize:10, marginBottom:2 }}>{MONTHS[lastMonth]}</div>
                    <div style={{ color:COLORS.text, fontWeight:700 }}>{row.fmt(row.prev)}</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:COLORS.muted, fontSize:10, marginBottom:2 }}>{MONTHS[thisMonth]}</div>
                    <div style={{ color:diff>=0?COLORS.green:COLORS.red, fontWeight:700 }}>{row.fmt(row.curr)}</div>
                  </div>
                </div>
              );
            })}
            {/* Flèche évolution globale */}
            <div style={{ marginTop:12, background:COLORS.card2, borderRadius:10, padding:12, textAlign:"center" }}>
              <div style={{ color:COLORS.muted, fontSize:11, marginBottom:4 }}>Évolution bénéfice</div>
              <div style={{ fontSize:24, fontWeight:900, color:sThisMonth.benefice-sLastMonth.benefice>=0?COLORS.green:COLORS.red }}>
                {sThisMonth.benefice-sLastMonth.benefice>=0?"▲":"▼"} {Math.abs(sThisMonth.benefice-sLastMonth.benefice).toFixed(1)} €
              </div>
            </div>
          </Card>

          {/* Graphique comparaison */}
          <Card>
            <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>Bénéfice comparé</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={compMoisData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:11}}/>
                <YAxis tick={{fill:COLORS.muted,fontSize:10}}/>
                <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
                <Bar dataKey="benefice" radius={[6,6,0,0]}>
                  {compMoisData.map((e,i)=><Cell key={i} fill={i===1?COLORS.green:COLORS.muted}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>ROI comparé</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={compMoisData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:11}}/>
                <YAxis tick={{fill:COLORS.muted,fontSize:10}}/>
                <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
                <Bar dataKey="roi" radius={[6,6,0,0]}>
                  {compMoisData.map((e,i)=><Cell key={i} fill={e.roi>=0?(i===1?COLORS.teal:COLORS.muted):COLORS.red}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════
          VUE COMPARAISON ANNÉE
      ══════════════════════════════════════ */}
      {mode==="comparaison_annee" && (
        <>
          <Card>
            <div style={{ color:COLORS.text, fontWeight:700, marginBottom:14 }}>
              📈 {lastYear} → {thisYear}
            </div>
            {[
              { label:"Bénéfice", prev:sLastYear.benefice, curr:sThisYear.benefice, fmt:(v)=>`${v>=0?"+":""}${v.toFixed(1)}€` },
              { label:"ROI",      prev:sLastYear.roi,      curr:sThisYear.roi,      fmt:(v)=>`${v>=0?"+":""}${v.toFixed(1)}%` },
              { label:"Réussite", prev:sLastYear.tauxReussite, curr:sThisYear.tauxReussite, fmt:(v)=>`${v.toFixed(1)}%` },
              { label:"Paris",    prev:sLastYear.total,    curr:sThisYear.total,    fmt:(v)=>`${v}` },
              { label:"Total misé", prev:sLastYear.totalMise, curr:sThisYear.totalMise, fmt:(v)=>`${v}€` },
            ].map((row,i)=>{
              const diff = row.curr - row.prev;
              return (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10, alignItems:"center" }}>
                  <div style={{ color:COLORS.muted, fontSize:12 }}>{row.label}</div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:COLORS.muted, fontSize:10, marginBottom:2 }}>{lastYear}</div>
                    <div style={{ color:COLORS.text, fontWeight:700, fontSize:13 }}>{row.fmt(row.prev)}</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:COLORS.muted, fontSize:10, marginBottom:2 }}>{thisYear}</div>
                    <div style={{ color:diff>=0?COLORS.green:COLORS.red, fontWeight:700, fontSize:13 }}>{row.fmt(row.curr)}</div>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop:12, background:COLORS.card2, borderRadius:10, padding:12, textAlign:"center" }}>
              <div style={{ color:COLORS.muted, fontSize:11, marginBottom:4 }}>Progression annuelle</div>
              <div style={{ fontSize:24, fontWeight:900, color:sThisYear.benefice-sLastYear.benefice>=0?COLORS.green:COLORS.red }}>
                {sThisYear.benefice-sLastYear.benefice>=0?"▲":"▼"} {Math.abs(sThisYear.benefice-sLastYear.benefice).toFixed(1)} €
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>Bénéfice {lastYear} vs {thisYear}</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={compAnneeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:12}}/>
                <YAxis tick={{fill:COLORS.muted,fontSize:10}}/>
                <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
                <Bar dataKey="benefice" radius={[6,6,0,0]}>
                  {compAnneeData.map((e,i)=><Cell key={i} fill={e.benefice>=0?(i===1?COLORS.green:COLORS.muted):COLORS.red}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Évolution mois par mois de l'année en cours */}
          <Card>
            <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📅 Mois par mois {thisYear}</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyEvol.filter(m=>m.paris>0)}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:10}}/>
                <YAxis tick={{fill:COLORS.muted,fontSize:10}}/>
                <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
                <Bar dataKey="benefice" radius={[4,4,0,0]}>
                  {monthlyEvol.filter(m=>m.paris>0).map((e,i)=><Cell key={i} fill={e.benefice>=0?COLORS.teal:COLORS.red}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════
          VUE STATS STANDARD (tous autres modes)
      ══════════════════════════════════════ */}
      {!isComparison && (
        <>
          {/* Mini stats période */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <StatCard label="PARIS" value={`${s.won}/${s.total}`} sub={`${s.tauxReussite.toFixed(1)}% réussite`} icon="✅" color={COLORS.green}/>
            <StatCard label="BÉNÉFICE" value={`${s.benefice>=0?"+":""}${s.benefice.toFixed(0)}€`} sub={`ROI: ${s.roi.toFixed(1)}%`} icon="💰" color={s.benefice>=0?COLORS.green:COLORS.red}/>
            <StatCard label="MISE TOTALE" value={`${s.totalMise}€`} sub={`Cote moy. ${s.coteMoy.toFixed(2)}`} icon="📊" color={COLORS.amber}/>
            <StatCard label="RÉUSSITE" value={`${s.tauxReussite.toFixed(1)}%`} sub={`${s.total} paris`} icon="🎯" color={COLORS.teal}/>
          </div>

          {/* Évolution mensuelle si vue annuelle */}
          {(mode==="annee_en_cours"||mode==="annee_precedente") && (
            <Card>
              <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>
                📅 Bénéfice mois par mois — {mode==="annee_en_cours"?thisYear:lastYear}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={(() => {
                  const yr = mode==="annee_en_cours"?thisYear:lastYear;
                  return MONTHS.map((m,i)=>{
                    const mb = filteredBets.filter(b=>new Date(b.date).getMonth()===i);
                    return { name:m, benefice:parseFloat(calcStats(mb).benefice.toFixed(1)), paris:mb.length };
                  }).filter(d=>d.paris>0);
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                  <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:10}}/>
                  <YAxis tick={{fill:COLORS.muted,fontSize:10}}/>
                  <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
                  <Bar dataKey="benefice" radius={[4,4,0,0]}>
                    {MONTHS.map((_,i)=><Cell key={i} fill={COLORS.teal}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* ROI par sport */}
          {sportData.length>0 && (
            <Card>
              <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🏆 ROI par sport</div>
              <ResponsiveContainer width="100%" height={Math.max(140,sportData.length*38)}>
                <BarChart data={sportData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                  <XAxis type="number" tick={{fill:COLORS.muted,fontSize:10}}/>
                  <YAxis type="category" dataKey="name" tick={{fill:COLORS.muted,fontSize:11}} width={75}/>
                  <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
                  <Bar dataKey="roi" radius={[0,6,6,0]}>
                    {sportData.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.green:COLORS.red}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Stats détaillées par bookmaker */}
          {bookData.length>0 && (
            <Card>
              <div style={{ color:COLORS.text, fontWeight:700, marginBottom:14 }}>🏦 Stats par bookmaker</div>
              {BOOKMAKERS.map((bk,i) => {
                const bb = filteredBets.filter(b=>b.bookmaker===bk);
                if (bb.length===0) return null;
                const bs = calcStats(bb);
                const won = bb.filter(b=>b.resultat==="gagné").length;
                return (
                  <div key={i} style={{ marginBottom:14, background:COLORS.card2, borderRadius:12, padding:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:COLORS.text }}>{bk}</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <span style={{ background:`${COLORS.teal}22`, color:COLORS.teal, border:`1px solid ${COLORS.teal}44`, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{bb.length} paris</span>
                        <span style={{ background:bs.benefice>=0?`${COLORS.green}22`:`${COLORS.red}22`, color:bs.benefice>=0?COLORS.green:COLORS.red, border:`1px solid ${bs.benefice>=0?COLORS.green:COLORS.red}44`, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{bs.benefice>=0?"+":""}{bs.benefice.toFixed(1)}€</span>
                      </div>
                    </div>
                    <div style={{ marginBottom:8 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ color:COLORS.muted, fontSize:11 }}>Taux de réussite</span>
                        <span style={{ color:COLORS.text, fontSize:11, fontWeight:700 }}>{won}/{bb.length} ({bs.tauxReussite.toFixed(1)}%)</span>
                      </div>
                      <div style={{ height:6, background:COLORS.border, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:3, width:`${bs.tauxReussite}%`, background:bs.tauxReussite>=50?`linear-gradient(90deg,${COLORS.teal},${COLORS.green})`:`linear-gradient(90deg,${COLORS.amber},${COLORS.red})`, transition:"width .5s ease" }}/>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ color:COLORS.muted, fontSize:10, marginBottom:2 }}>ROI</div>
                        <div style={{ color:bs.roi>=0?COLORS.green:COLORS.red, fontWeight:700, fontSize:13 }}>{bs.roi>=0?"+":""}{bs.roi.toFixed(1)}%</div>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ color:COLORS.muted, fontSize:10, marginBottom:2 }}>Misé</div>
                        <div style={{ color:COLORS.text, fontWeight:700, fontSize:13 }}>{bs.totalMise}€</div>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ color:COLORS.muted, fontSize:10, marginBottom:2 }}>Cote moy.</div>
                        <div style={{ color:COLORS.text, fontWeight:700, fontSize:13 }}>{bs.coteMoy.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
              {bookData.length > 1 && (
                <ResponsiveContainer width="100%" height={Math.max(120,bookData.length*36)}>
                  <BarChart data={bookData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                    <XAxis type="number" tick={{fill:COLORS.muted,fontSize:10}}/>
                    <YAxis type="category" dataKey="name" tick={{fill:COLORS.muted,fontSize:11}} width={75}/>
                    <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
                    <Bar dataKey="roi" radius={[0,6,6,0]}>
                      {bookData.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.teal:COLORS.red}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          )}

          {/* ROI par type */}
          {typeData.length>0 && (
            <Card>
              <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🎰 ROI par type</div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                  <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:11}}/>
                  <YAxis tick={{fill:COLORS.muted,fontSize:10}}/>
                  <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
                  <Bar dataKey="roi" radius={[4,4,0,0]}>
                    {typeData.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.amber:COLORS.red}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Réussite par cote */}
          {coteRanges.length>0 && (
            <Card>
              <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🎯 Réussite par cote</div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={coteRanges}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                  <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:11}}/>
                  <YAxis tick={{fill:COLORS.muted,fontSize:10}} domain={[0,100]}/>
                  <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
                  <Bar dataKey="taux" fill={COLORS.purple} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* ROI par pays */}
          {(() => {
            const paysData = Object.keys(PAYS_CHAMPIONNATS).map(p => {
              const pb = filteredBets.filter(b=>b.pays===p);
              const ps = calcStats(pb);
              return { name:p, roi:parseFloat(ps.roi.toFixed(1)), paris:pb.length, benefice:parseFloat(ps.benefice.toFixed(1)) };
            }).filter(d=>d.paris>0).sort((a,b)=>b.paris-a.paris);
            return paysData.length > 0 ? (
              <Card>
                <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🌍 ROI par pays</div>
                <ResponsiveContainer width="100%" height={Math.max(130,paysData.length*36)}>
                  <BarChart data={paysData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                    <XAxis type="number" tick={{fill:COLORS.muted,fontSize:10}}/>
                    <YAxis type="category" dataKey="name" tick={{fill:COLORS.muted,fontSize:11}} width={80}/>
                    <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}
                      formatter={(v,n,p)=>[`ROI: ${v}% · ${p.payload.paris} paris`,""]}/>
                    <Bar dataKey="roi" radius={[0,6,6,0]}>
                      {paysData.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.green:COLORS.red}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            ) : null;
          })()}

          {/* ROI par championnat */}
          {(() => {
            const champData = {};
            filteredBets.forEach(b => {
              if (!b.championnat) return;
              if (!champData[b.championnat]) champData[b.championnat] = [];
              champData[b.championnat].push(b);
            });
            const champArr = Object.entries(champData).map(([name, bets]) => {
              const cs = calcStats(bets);
              return { name, roi:parseFloat(cs.roi.toFixed(1)), paris:bets.length, benefice:parseFloat(cs.benefice.toFixed(1)) };
            }).sort((a,b)=>b.paris-a.paris).slice(0,10);
            return champArr.length > 0 ? (
              <Card>
                <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🏆 ROI par championnat</div>
                <ResponsiveContainer width="100%" height={Math.max(130,champArr.length*36)}>
                  <BarChart data={champArr} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                    <XAxis type="number" tick={{fill:COLORS.muted,fontSize:10}}/>
                    <YAxis type="category" dataKey="name" tick={{fill:COLORS.muted,fontSize:10}} width={110}/>
                    <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}
                      formatter={(v,n,p)=>[`ROI: ${v}% · ${p.payload.paris} paris`,""]}/>
                    <Bar dataKey="roi" radius={[0,6,6,0]}>
                      {champArr.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.amber:COLORS.red}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            ) : null;
          })()}

          {/* Top championnats — le plus joué */}
          {(() => {
            const champData = {};
            filteredBets.forEach(b => {
              const key = b.championnat || "Non renseigné";
              if (!champData[key]) champData[key] = { paris:0, gagnes:0, benefice:0 };
              champData[key].paris++;
              if (b.resultat==="gagné") champData[key].gagnes++;
              champData[key].benefice += b.gain || 0;
            });
            const top = Object.entries(champData)
              .map(([name, d]) => ({ name, ...d, taux: parseFloat((d.gagnes/d.paris*100).toFixed(1)), benefice: parseFloat(d.benefice.toFixed(1)) }))
              .sort((a,b)=>b.paris-a.paris).slice(0,8);
            return top.length > 0 ? (
              <Card>
                <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📊 Championnats — les plus joués</div>
                {top.map((c,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom: i<top.length-1?`1px solid ${COLORS.border}`:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:24, height:24, borderRadius:6, background:COLORS.card2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:COLORS.muted }}>
                        {i+1}
                      </div>
                      <div>
                        <div style={{ color:COLORS.text, fontSize:13, fontWeight:600 }}>{c.name}</div>
                        <div style={{ color:COLORS.muted, fontSize:11 }}>{c.paris} paris · {c.taux}% réussite</div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ color:c.benefice>=0?COLORS.green:COLORS.red, fontWeight:700, fontSize:13 }}>
                        {c.benefice>=0?"+":""}{c.benefice}€
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            ) : null;
          })()}

          <Card>
            <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📅 Performance par jour</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={jourData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
                <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:11}}/>
                <YAxis tick={{fill:COLORS.muted,fontSize:10}}/>
                <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
                <Bar dataKey="roi" radius={[4,4,0,0]}>
                  {jourData.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.blue:COLORS.red}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {filteredBets.length === 0 && (
            <Card>
              <div style={{ textAlign:"center", padding:"20px 0", color:COLORS.muted }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
                <div>Aucun pari sur cette période</div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── ONGLET 2 : Mes paris ──────────────────────────────────────────────────
function BetsList({ bets, onAdd, onDelete, onUpdate }) {
  const [filter, setFilter] = useState("tous");

  const filtered = filter==="tous" ? bets
    : filter==="gagné"||filter==="perdu"||filter==="en cours" ? bets.filter(b=>b.resultat===filter)
    : bets.filter(b=>b.sport===filter);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <button onClick={onAdd} style={{
        background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:10,
        padding:"14px", fontSize:15, fontWeight:800, cursor:"pointer", width:"100%"
      }}>+ Ajouter un pari</button>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {["tous","gagné","perdu","en cours"].map(f=>(
          <Btn key={f} active={filter===f} onClick={()=>setFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</Btn>
        ))}
      </div>

      {filtered.map(b => (
        <Card key={b.id}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                <Badge color={b.resultat==="gagné"?COLORS.green:b.resultat==="en cours"?COLORS.amber:COLORS.red}>{b.resultat==="gagné"?"✅ Gagné":b.resultat==="en cours"?"⏳ En cours":"❌ Perdu"}</Badge>
                {b.live && <Badge color={COLORS.amber}>⚡ Live</Badge>}
              </div>
              <div style={{ color:COLORS.text, fontWeight:700, fontSize:15 }}>{b.sport} · {b.bookmaker}</div>
              <div style={{ color:COLORS.muted, fontSize:12, marginTop:2 }}>{b.date} · {b.type} · Cote {b.cote}</div>
              {(b.marche||b.sousMarche) && (
                <div style={{ marginTop:5, display:"flex", gap:5, flexWrap:"wrap" }}>
                  {b.marche && <span style={{ background:`${COLORS.blue}18`, color:COLORS.blue, border:`1px solid ${COLORS.blue}33`, borderRadius:6, padding:"2px 7px", fontSize:11, fontWeight:600 }}>{b.marche}</span>}
                  {b.sousMarche && <span style={{ background:`${COLORS.purple}18`, color:COLORS.purple, border:`1px solid ${COLORS.purple}33`, borderRadius:6, padding:"2px 7px", fontSize:11, fontWeight:600 }}>{b.sousMarche}</span>}
                </div>
              )}
              <div style={{ color:COLORS.muted, fontSize:12, marginTop:4 }}>Mise: {b.mise} € · Gain: <span style={{color:b.gain>0?COLORS.green:COLORS.red}}>{b.gain>0?"+":""}{b.gain} €</span></div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
              {b.resultat==="en cours" && (
                <>
                  <button onClick={()=>onUpdate(b.id,"gagné")} style={{ background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, color:COLORS.green, borderRadius:6, padding:"4px 8px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>✅ Gagné</button>
                  <button onClick={()=>onUpdate(b.id,"perdu")} style={{ background:`${COLORS.red}22`, border:`1px solid ${COLORS.red}44`, color:COLORS.red, borderRadius:6, padding:"4px 8px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>❌ Perdu</button>
                </>
              )}
              {b.resultat!=="en cours" && (
                <button onClick={()=>onUpdate(b.id,"en cours")} style={{ background:`${COLORS.amber}15`, border:`1px solid ${COLORS.amber}33`, color:COLORS.amber, borderRadius:6, padding:"4px 8px", fontSize:10, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>✏️</button>
              )}
              <button onClick={()=>onDelete(b.id)} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:18, cursor:"pointer" }}>🗑</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── ONGLET 3 : Analyse ────────────────────────────────────────────────────
function Analysis({ bets }) {
  const s = calcStats(bets);
  const combineBets = bets.filter(b=>b.type==="Combiné");
  const simBets     = bets.filter(b=>b.type==="Simple");
  const sc = calcStats(combineBets);
  const ss = calcStats(simBets);

  const insights = [];
  if (sc.tauxReussite < ss.tauxReussite - 10) insights.push({ type:"warning", msg:`Tu perds plus sur les combinés (${sc.tauxReussite.toFixed(0)}% vs ${ss.tauxReussite.toFixed(0)}% en simple).` });
  if (s.tauxReussite > 60) insights.push({ type:"success", msg:`Excellent taux de réussite à ${s.tauxReussite.toFixed(1)}% ! Continue comme ça.` });
  if (s.roi < 0) insights.push({ type:"danger", msg:`Ton ROI est négatif (${s.roi.toFixed(1)}%). Révise ta stratégie de mise.` });
  const bestSport = SPORTS.map(sp=>({ sp, roi:calcStats(bets.filter(b=>b.sport===sp)).roi })).filter(x=>isFinite(x.roi)).sort((a,b)=>b.roi-a.roi)[0];
  if (bestSport) insights.push({ type:"info", msg:`Ton meilleur sport est le ${bestSport.sp} avec ${bestSport.roi.toFixed(1)}% de ROI.` });

  // Value bet simulation
  const valueBets = bets.filter(b=>b.cote>2.0 && b.resultat==="gagné");

  const radarData = SPORTS.map(sp=>{
    const rb = bets.filter(b=>b.sport===sp);
    return { sport:sp, taux:parseFloat(calcStats(rb).tauxReussite.toFixed(0)) };
  }).filter(d=>bets.some(b=>b.sport===d.sport));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🔍 Analyse de ton style</div>
        {insights.length===0 && <p style={{color:COLORS.muted, fontSize:13}}>Ajoutez plus de paris pour obtenir des analyses.</p>}
        {insights.map((ins,i)=>(
          <div key={i} style={{
            background:`${ins.type==="warning"?COLORS.amber:ins.type==="success"?COLORS.green:ins.type==="danger"?COLORS.red:COLORS.blue}18`,
            border:`1px solid ${ins.type==="warning"?COLORS.amber:ins.type==="success"?COLORS.green:ins.type==="danger"?COLORS.red:COLORS.blue}44`,
            borderRadius:8, padding:"10px 14px", marginBottom:8, color:COLORS.text, fontSize:13
          }}>
            {ins.type==="warning"?"⚠️":ins.type==="success"?"✅":ins.type==="danger"?"🚨":"💡"} {ins.msg}
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🕸 Performance par sport</div>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData}>
            <PolarGrid stroke={COLORS.border}/>
            <PolarAngleAxis dataKey="sport" tick={{fill:COLORS.muted, fontSize:11}}/>
            <Radar dataKey="taux" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.25}/>
            <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <StatCard label="Simple ROI" value={`${ss.roi.toFixed(1)}%`} sub={`${ss.total} paris`} icon="1️⃣" color={COLORS.blue}/>
        <StatCard label="Combiné ROI" value={`${sc.roi.toFixed(1)}%`} sub={`${sc.total} paris`} icon="🔗" color={COLORS.purple}/>
      </div>

      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:8 }}>💎 Value Bets (cote &gt; 2.0 gagnés)</div>
        <div style={{ color:COLORS.teal, fontSize:28, fontWeight:800 }}>{valueBets.length}</div>
        <div style={{ color:COLORS.muted, fontSize:13 }}>paris value gagnés sur {bets.filter(b=>b.cote>2.0).length} tentatives</div>
      </Card>

      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:8 }}>📋 Conseils stratégiques</div>
        {[
          "Limitez votre mise à 2-5% de votre bankroll par pari.",
          "Favorisez les cotes entre 1.7 et 2.2 pour un meilleur ROI.",
          "Évitez les combinés de plus de 3 sélections.",
          "Tenez un journal de vos raisonnements avant chaque pari.",
        ].map((c,i)=>(
          <div key={i} style={{ color:COLORS.muted, fontSize:13, padding:"6px 0", borderBottom:`1px solid ${COLORS.border}`, display:"flex", gap:8 }}>
            <span style={{color:COLORS.green}}>→</span> {c}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── ONGLET 4 : Profil & Bankroll ──────────────────────────────────────────
function Profile({ bets, user, onLogout, onSubscribe }) {
  const [bankroll, setBankroll] = useState(500);
  const [depot, setDepot] = useState("");
  const [cgvOpen, setCgvOpen]           = useState(false);
  const [editOpen, setEditOpen]         = useState(false);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [mlOpen, setMlOpen]             = useState(false);
  const [pcOpen, setPcOpen]             = useState(false);
  const [transactions, setTransactions] = useState([
    { type:"Dépôt", montant:500, date:"2024-01-01" },
  ]);

  const addTransaction = (type) => {
    const m = parseFloat(depot);
    if (!m) return;
    setTransactions(prev=>[...prev,{ type, montant:m, date:new Date().toISOString().slice(0,10) }]);
    setBankroll(prev => type==="Dépôt"? prev+m : prev-m);
    setDepot("");
  };

  const s = calcStats(bets);
  const trialDaysLeft = user ? Math.max(0, Math.ceil((new Date(user.trialEnd) - new Date()) / (1000*60*60*24))) : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Infos compte */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ color:COLORS.muted, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>MON COMPTE</div>
            <div style={{ fontWeight:800, fontSize:16 }}>👤 {user?.name}</div>
            <div style={{ color:COLORS.green, fontSize:13, marginTop:2 }}>@{user?.pseudo}</div>
            <div style={{ color:COLORS.muted, fontSize:12, marginTop:2 }}>📧 {user?.email}</div>
            {user?.birthDate && (
              <div style={{ color:COLORS.muted, fontSize:12, marginTop:2 }}>
                🎂 {new Date(user.birthDate).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })}
              </div>
            )}
            {user?.promoCode && (
              <div style={{ marginTop:6 }}>
                <span style={{ background:`${COLORS.amber}22`, color:COLORS.amber, border:`1px solid ${COLORS.amber}44`, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>
                  🎁 Code promo : {user.promoCode} — {user.promoLabel}
                </span>
              </div>
            )}
          </div>
          <div style={{ textAlign:"right" }}>
            {user?.isAdmin && <div style={{ background:`${COLORS.purple}22`, color:COLORS.purple, border:`1px solid ${COLORS.purple}44`, borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700 }}>👑 Admin</div>}
            {!user?.isAdmin && user?.subscribed && <div style={{ background:`${COLORS.green}18`, color:COLORS.green, border:`1px solid ${COLORS.green}33`, borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700 }}>✅ Premium</div>}
            {!user?.isAdmin && !user?.subscribed && <div style={{ background:`${COLORS.amber}22`, color:COLORS.amber, border:`1px solid ${COLORS.amber}44`, borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700 }}>⏳ Essai ({trialDaysLeft}j)</div>}
          </div>
        </div>
        {!user?.subscribed && !user?.isAdmin && (
          <button onClick={onSubscribe} style={{ background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:10, padding:"10px", fontWeight:800, fontSize:14, cursor:"pointer", width:"100%" }}>
            🚀 Passer à Premium — 4,99 €/mois
          </button>
        )}
        <button onClick={()=>setEditOpen(true)} style={{ background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.muted, borderRadius:10, padding:"10px", fontWeight:600, fontSize:13, cursor:"pointer", width:"100%", marginTop:10 }}>
          ✏️ Modifier mon profil
        </button>
      </Card>
      <Card>
        <div style={{ color:COLORS.teal, fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:8 }}>💰 BANKROLL ACTUELLE</div>
        <div style={{ color:COLORS.green, fontSize:40, fontWeight:900 }}>{bankroll.toFixed(2)} €</div>
        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          <input value={depot} onChange={e=>setDepot(e.target.value)} placeholder="Montant €"
            style={{ flex:1, background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 12px", color:COLORS.text, fontSize:14 }}/>
          <button onClick={()=>addTransaction("Dépôt")} style={{ background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:8, padding:"10px 14px", fontWeight:700, cursor:"pointer" }}>+</button>
          <button onClick={()=>addTransaction("Retrait")} style={{ background:COLORS.red, color:"#fff", border:"none", borderRadius:8, padding:"10px 14px", fontWeight:700, cursor:"pointer" }}>-</button>
        </div>
      </Card>

      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📜 Historique dépôts/retraits</div>
        {transactions.map((t,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${COLORS.border}` }}>
            <div>
              <Badge color={t.type==="Dépôt"?COLORS.green:COLORS.red}>{t.type}</Badge>
              <span style={{ color:COLORS.muted, fontSize:12, marginLeft:8 }}>{t.date}</span>
            </div>
            <div style={{ color:t.type==="Dépôt"?COLORS.green:COLORS.red, fontWeight:700 }}>
              {t.type==="Dépôt"?"+":"-"}{t.montant} €
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🎯 Objectifs</div>
        {[
          { label:"Bankroll cible", target:"1 000 €", progress: Math.min(100,(bankroll/1000)*100) },
          { label:"ROI positif", target:"> 0%", progress: s.roi>0?100:Math.max(0,50+s.roi) },
          { label:"Taux réussite", target:"> 55%", progress: Math.min(100,(s.tauxReussite/55)*100) },
        ].map((obj,i)=>(
          <div key={i} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ color:COLORS.text, fontSize:13 }}>{obj.label}</span>
              <span style={{ color:COLORS.muted, fontSize:12 }}>{obj.target}</span>
            </div>
            <div style={{ background:COLORS.card2, borderRadius:4, height:6 }}>
              <div style={{ background:obj.progress>=100?COLORS.green:COLORS.teal, width:`${obj.progress}%`, height:"100%", borderRadius:4, transition:"width 0.5s" }}/>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>⚙️ Limites de mise</div>
        {[
          { label:"Mise min.", value:"5 €" },
          { label:"Mise max.", value:"50 €" },
          { label:"Mise recommandée", value:`${(bankroll*0.03).toFixed(0)} € (3%)` },
        ].map((l,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${COLORS.border}` }}>
            <span style={{ color:COLORS.muted, fontSize:13 }}>{l.label}</span>
            <span style={{ color:COLORS.text, fontWeight:700 }}>{l.value}</span>
          </div>
        ))}
      </Card>

      {/* Section légale & documents */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📄 Documents légaux</div>
        {[
          { icon:"📋", label:"Conditions Générales de Vente", sub:"Version du 16 mai 2026", color:COLORS.green,  action:()=>setCgvOpen(true) },
          { icon:"🔒", label:"Politique de Confidentialité",   sub:"Conforme RGPD",          color:COLORS.purple, action:()=>setPcOpen(true) },
          { icon:"⚖️", label:"Mentions Légales",               sub:"Éditeur & hébergement",  color:COLORS.blue,   action:()=>setMlOpen(true) },
        ].map((doc,i)=>(
          <div key={i} onClick={doc.action} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom: i<2?`1px solid ${COLORS.border}`:"none", cursor:"pointer" }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:20 }}>{doc.icon}</span>
              <div>
                <div style={{ color:COLORS.text, fontSize:13, fontWeight:600 }}>{doc.label}</div>
                <div style={{ color:COLORS.muted, fontSize:11 }}>{doc.sub}</div>
              </div>
            </div>
            <span style={{ color:doc.color, fontSize:20, fontWeight:700 }}>›</span>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${COLORS.border}` }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span>📧</span>
            <div>
              <div style={{ color:COLORS.text, fontSize:13, fontWeight:600 }}>Support & assistance</div>
              <div style={{ color:COLORS.muted, fontSize:11 }}>support@oddrix.fr</div>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderTop:`1px solid ${COLORS.border}` }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span>🤝</span>
            <div>
              <div style={{ color:COLORS.text, fontSize:13, fontWeight:600 }}>Partenariat & contact</div>
              <div style={{ color:COLORS.muted, fontSize:11 }}>contact@oddrix.fr</div>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0" }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span>🏛</span>
            <div>
              <div style={{ color:COLORS.text, fontSize:13, fontWeight:600 }}>CNIL — Réclamation données</div>
              <div style={{ color:COLORS.muted, fontSize:11 }}>www.cnil.fr — 01 53 73 22 22</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Déconnexion */}
      <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.muted, borderRadius:12, padding:"13px", fontSize:14, fontWeight:600, cursor:"pointer", width:"100%" }}>
        🚪 Se déconnecter
      </button>

      {/* Suppression compte */}
      <button onClick={()=>setDeleteOpen(true)} style={{ background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red, borderRadius:12, padding:"13px", fontSize:13, fontWeight:600, cursor:"pointer", width:"100%" }}>
        🗑 Supprimer mon compte (RGPD)
      </button>

      <div style={{ color:COLORS.muted, fontSize:10, textAlign:"center", lineHeight:1.8, paddingBottom:8 }}>
        Oddrix · Damien Rossard · Nice (06)<br/>
        Jeu responsable — 18 ans minimum
      </div>

      {cgvOpen    && <CGVModal onClose={()=>setCgvOpen(false)}/>}
      {editOpen   && <EditProfileModal user={user} onSave={u=>{ /* user update handled in App */ }} onClose={()=>setEditOpen(false)}/>}
      {deleteOpen && <DeleteAccountModal user={user} onDeleted={onLogout} onClose={()=>setDeleteOpen(false)}/>}
      {mlOpen     && <MentionsLegalesModal onClose={()=>setMlOpen(false)}/>}
      {pcOpen     && <PolitiqueConfModal onClose={()=>setPcOpen(false)}/>}
    </div>
  );
}

// ── ONGLET 5 : Classement ─────────────────────────────────────────────────
function Leaderboard({ bets, user }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const snap = await getDocs(collection(db, "leaderboard"));
        const data = snap.docs.map(d => d.data()).filter(p => p.paris > 0);
        data.sort((a,b) => b.roi - a.roi);
        setPlayers(data);
      } catch(e) { console.error("Erreur classement:", e); }
      finally { setLoading(false); }
    };
    fetchLeaderboard();
  }, []);

  const fakeUsers = players;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, fontSize:16, marginBottom:4 }}>🏆 Classement Global</div>
        <div style={{ color:COLORS.muted, fontSize:12 }}>Les pseudos sont les seules données visibles — email confidentiel (RGPD)</div>
      </Card>

      {loading && (
        <Card><div style={{ color:COLORS.muted, fontSize:14, textAlign:"center", padding:"20px 0" }}>⏳ Chargement du classement...</div></Card>
      )}
      {!loading && players.length === 0 && (
        <Card><div style={{ color:COLORS.muted, fontSize:14, textAlign:"center", padding:"20px 0" }}>Aucun joueur dans le classement pour l'instant.</div></Card>
      )}
      {fakeUsers.map((u,i) => (
        <Card key={i} style={{ border: u.pseudo === user?.pseudo ? `1px solid ${COLORS.green}` : undefined }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              background: i===0?COLORS.amber:i===1?"#9e9e9e":i===2?"#cd7f32":COLORS.card2,
              color: i<3?COLORS.bg:COLORS.muted,
              width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:900, fontSize:14, flexShrink:0
            }}>#{i+1}</div>
            <div style={{ flex:1 }}>
              <div style={{ color: u.pseudo === user?.pseudo ?COLORS.green:COLORS.text, fontWeight:700, fontSize:14 }}>{u.pseudo === user?.pseudo ? "🎯 " + u.pseudo : u.pseudo}</div>
              <div style={{ color:COLORS.muted, fontSize:11 }}>{u.paris} paris · {u.wins} gagnés</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:u.roi>=0?COLORS.green:COLORS.red, fontWeight:800, fontSize:16 }}>{u.roi>0?"+":""}{u.roi}%</div>
              <div style={{ color:COLORS.muted, fontSize:11 }}>{u.profit>0?"+":""}{u.profit} €</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── ONGLET 6 : Aide & Contact ─────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "Dès votre inscription, vous bénéficiez de 7 jours d'accès complet à toutes les fonctionnalités Premium, sans carte bancaire requise. À l'issue de ces 7 jours, l'abonnement à 4,99 €/mois démarre automatiquement. Vous recevez un email de rappel 48h avant."
  },
  {
    q: "Comment annuler avant la fin de l'essai ?",
    a: "Rendez-vous dans l'onglet Profil → section Abonnement → Annuler. Vous pouvez aussi écrire à support@oddrix.fr avant la fin du 7e jour. Aucun prélèvement ne sera effectué si vous annulez dans ce délai."
  },
  {
    q: "Comment annuler mon abonnement payant ?",
    a: "Depuis votre espace Profil à tout moment, ou en écrivant à support@oddrix.fr. La résiliation prend effet à la fin de la période mensuelle en cours. Vous conservez l'accès jusqu'à la fin du mois payé."
  },
  {
    q: "Puis-je être remboursé ?",
    a: "Oui, conformément à la loi, vous disposez de 14 jours de droit de rétractation à compter de votre premier paiement. Passé ce délai, le mois en cours n'est pas remboursé. Contactez support@oddrix.fr pour toute demande."
  },
  {
    q: "Mes données sont-elles en sécurité ?",
    a: "Oui. Votre email et vos données financières ne sont jamais partagés. Seul votre pseudo est visible dans les classements. Vos données sont chiffrées et stockées conformément au RGPD. Vous pouvez demander leur suppression à tout moment."
  },
  {
    q: "Puis-je changer mon pseudo ?",
    a: "Non, le pseudo est définitif une fois choisi à l'inscription. Il garantit l'intégrité des classements. Vous pouvez en revanche modifier votre prénom, email et mot de passe depuis le Profil."
  },
  {
    q: "J'ai oublié mon mot de passe, que faire ?",
    a: "Sur l'écran de connexion, appuyez sur « Mot de passe oublié ? ». Entrez votre email, vous recevrez un lien de réinitialisation. Si vous ne recevez rien, vérifiez vos spams ou contactez support@oddrix.fr."
  },
  {
    q: "Comment supprimer mon compte ?",
    a: "Profil → tout en bas → « Supprimer mon compte ». Tapez SUPPRIMER pour confirmer. Toutes vos données sont effacées immédiatement et définitivement, conformément au RGPD."
  },
  {
    q: "Un code promo, comment ça fonctionne ?",
    a: "À l'inscription, entrez votre code promo dans le champ dédié et cliquez Vérifier. Si le code est valide, votre période d'essai est automatiquement prolongée (ex: 1 mois offert). Le code ne peut être utilisé qu'une fois par compte."
  },
  {
    q: "L'app fonctionne-t-elle sans internet ?",
    a: "Partiellement. Vos paris et données sauvegardés localement restent accessibles. Certaines fonctionnalités avancées (scanner IA, classements) nécessitent une connexion. Une version hors-ligne complète est prévue dans une prochaine mise à jour."
  },
  {
    q: "Comment fonctionne le scanner de tickets ?",
    a: "Dans le formulaire « Nouveau pari », appuyez sur 📸 Scanner. Prenez une photo de votre ticket de pari. L'IA lit automatiquement le sport, la cote, la mise et le marché. Vérifiez toujours les données extraites avant d'enregistrer."
  },
  {
    q: "Oddrix conseille-t-il sur quoi parier ?",
    a: "Non. Oddrix est un outil de suivi et d'analyse personnel. Il ne fournit aucun conseil de pari et ne garantit aucun résultat. Les paris sportifs comportent des risques de perte financière. Pariez de manière responsable."
  },
];

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom:`1px solid ${COLORS.border}` }}>
      <div onClick={onToggle} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", cursor:"pointer", gap:12 }}>
        <div style={{ color:COLORS.text, fontSize:13, fontWeight:600, lineHeight:1.4, flex:1 }}>{item.q}</div>
        <div style={{ color:COLORS.green, fontSize:20, fontWeight:700, flexShrink:0, transform: isOpen?"rotate(45deg)":"rotate(0)", transition:"transform .2s" }}>+</div>
      </div>
      {isOpen && (
        <div style={{ color:COLORS.muted, fontSize:13, lineHeight:1.7, paddingBottom:14 }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

function Help({ user }) {
  const [contactType, setContactType] = useState("bug");
  const [subject, setSubject]         = useState("");
  const [message, setMessage]         = useState("");
  const [priority, setPriority]       = useState("normale");
  const [sent, setSent]               = useState(false);
  const [sending, setSending]         = useState(false);
  const [error, setError]             = useState("");
  const [openFaq, setOpenFaq]         = useState(null);
  const [faqSearch, setFaqSearch]     = useState("");

  const filteredFaq = faqSearch.trim()
    ? FAQ_ITEMS.filter(f =>
        f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
        f.a.toLowerCase().includes(faqSearch.toLowerCase())
      )
    : FAQ_ITEMS;

  const contactTypes = [
    { id:"bug",       label:"🐛 Bug",       desc:"Quelque chose ne fonctionne pas" },
    { id:"evolution", label:"💡 Évolution",  desc:"Proposer une nouvelle fonctionnalité" },
    { id:"question",  label:"❓ Question",   desc:"Besoin d'aide ou d'information" },
    { id:"autre",     label:"📩 Autre",      desc:"Tout autre sujet" },
  ];

  const handleSend = async () => {
    if (!subject.trim()) { setError("Veuillez indiquer un objet."); return; }
    if (message.trim().length < 20) { setError("Merci de détailler votre message (20 caractères min.)."); return; }
    setError(""); setSending(true);

    // Sauvegarde locale du ticket (en prod → envoi à une API / EmailJS / Firebase)
    const tickets = JSON.parse(localStorage.getItem("sb_tickets")||"[]");
    // Routing email selon type de demande
    const destEmail = (contactType==="bug"||contactType==="evolution"||contactType==="question")
      ? "support@oddrix.fr"
      : "contact@oddrix.fr";
    tickets.push({
      id: Date.now(),
      type: contactType,
      subject: subject.trim(),
      message: message.trim(),
      priority,
      pseudo: user?.pseudo || "Anonyme",
      email: user?.email || "",
      destinataire: destEmail,
      date: new Date().toISOString(),
      status: "envoyé"
    });
    localStorage.setItem("sb_tickets", JSON.stringify(tickets));

    // Simulation délai envoi
    await new Promise(r=>setTimeout(r,1200));
    setSending(false);
    setSent(true);
  };

  const handleReset = () => {
    setSent(false); setSubject(""); setMessage(""); setError("");
    setContactType("bug"); setPriority("normale");
  };

  const inputStyle = {
    width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.border}`,
    borderRadius:10, padding:"13px 14px", color:COLORS.text, fontSize:14,
    fontFamily:"inherit", boxSizing:"border-box", outline:"none",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* FAQ */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:800, fontSize:16, marginBottom:4 }}>❓ Questions fréquentes</div>
        <div style={{ color:COLORS.muted, fontSize:12, marginBottom:14 }}>Trouvez rapidement une réponse</div>
        <input
          value={faqSearch}
          onChange={e=>{ setFaqSearch(e.target.value); setOpenFaq(null); }}
          placeholder="🔍  Rechercher une question..."
          style={{ width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"11px 14px", color:COLORS.text, fontSize:13, fontFamily:"inherit", boxSizing:"border-box", outline:"none", marginBottom:12 }}
        />
        {filteredFaq.length === 0 ? (
          <div style={{ textAlign:"center", padding:"20px 0", color:COLORS.muted, fontSize:13 }}>
            Aucun résultat — essayez d'autres mots clés ou contactez-nous ci-dessous.
          </div>
        ) : filteredFaq.map((item,i)=>(
          <FAQItem key={i} item={item} isOpen={openFaq===i} onToggle={()=>setOpenFaq(openFaq===i?null:i)}/>
        ))}
      </Card>

      {/* Formulaire de contact */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:800, fontSize:16, marginBottom:4 }}>📬 Nous contacter</div>
        <div style={{ color:COLORS.muted, fontSize:12, marginBottom:16 }}>Bug, suggestion, question — on vous répond sous 48h</div>

        {sent ? (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>✅</div>
            <div style={{ fontWeight:800, fontSize:17, marginBottom:8, color:COLORS.green }}>Message envoyé !</div>
            <div style={{ color:COLORS.muted, fontSize:13, lineHeight:1.6, marginBottom:20 }}>
              Merci pour votre retour {user?.pseudo ? `@${user.pseudo}` : ""} !<br/>
              Nous vous répondrons à <span style={{color:COLORS.text}}>{user?.email}</span><br/>
              sous 48 heures ouvrées.
            </div>
            <button onClick={handleReset} style={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, color:COLORS.muted, borderRadius:10, padding:"11px 24px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <>
            {/* Type de demande */}
            <div style={{ marginBottom:16 }}>
              <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:8, letterSpacing:.5 }}>TYPE DE DEMANDE</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {contactTypes.map(t=>(
                  <div key={t.id} onClick={()=>setContactType(t.id)} style={{
                    background: contactType===t.id ? `${COLORS.green}15` : COLORS.card2,
                    border:`1.5px solid ${contactType===t.id ? COLORS.green : COLORS.border}`,
                    borderRadius:10, padding:"10px 12px", cursor:"pointer", transition:"all .15s"
                  }}>
                    <div style={{ fontWeight:700, fontSize:13, color:contactType===t.id?COLORS.green:COLORS.text }}>{t.label}</div>
                    <div style={{ color:COLORS.muted, fontSize:10, marginTop:2 }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Priorité (uniquement pour bugs) */}
            {contactType==="bug" && (
              <div style={{ marginBottom:14 }}>
                <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6, letterSpacing:.5 }}>PRIORITÉ</label>
                <div style={{ display:"flex", gap:8 }}>
                  {[
                    { id:"basse",   label:"🟢 Basse",   color:COLORS.green },
                    { id:"normale", label:"🟡 Normale",  color:COLORS.amber },
                    { id:"haute",   label:"🔴 Haute",    color:COLORS.red },
                  ].map(p=>(
                    <button key={p.id} onClick={()=>setPriority(p.id)} style={{
                      flex:1, background: priority===p.id ? `${p.color}22` : "transparent",
                      border:`1.5px solid ${priority===p.id ? p.color : COLORS.border}`,
                      borderRadius:8, padding:"8px 4px", color:priority===p.id?p.color:COLORS.muted,
                      fontWeight:600, fontSize:12, cursor:"pointer"
                    }}>{p.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Objet */}
            <div style={{ marginBottom:14 }}>
              <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6, letterSpacing:.5 }}>OBJET</label>
              <input
                value={subject}
                onChange={e=>setSubject(e.target.value)}
                placeholder={
                  contactType==="bug"       ? "Ex: Le graphique bankroll ne s'affiche pas" :
                  contactType==="evolution" ? "Ex: Ajouter un filtre par date" :
                  contactType==="question"  ? "Ex: Comment annuler mon abonnement ?" :
                  "Objet de votre message"
                }
                style={inputStyle}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom:14 }}>
              <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6, letterSpacing:.5 }}>
                MESSAGE <span style={{ color:COLORS.muted, fontWeight:400 }}>({message.length}/500)</span>
              </label>
              <textarea
                value={message}
                onChange={e=>message.length<500?setMessage(e.target.value):null}
                placeholder={
                  contactType==="bug"       ? "Décrivez le problème, les étapes pour le reproduire, et ce que vous attendiez..." :
                  contactType==="evolution" ? "Décrivez votre idée, le besoin qu'elle couvre, comment vous l'imaginez..." :
                  "Votre message..."
                }
                rows={5}
                style={{ ...inputStyle, resize:"none", lineHeight:1.6 }}
              />
            </div>

            {/* Info auto-remplie */}
            <div style={{ background:COLORS.card2, borderRadius:8, padding:"10px 14px", marginBottom:14, display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:16 }}>👤</span>
              <div style={{ fontSize:12, color:COLORS.muted }}>
                Envoyé en tant que <span style={{color:COLORS.text, fontWeight:600}}>@{user?.pseudo || "Anonyme"}</span> — réponse à <span style={{color:COLORS.green, fontWeight:600}}>support@oddrix.fr</span>
              </div>
            </div>

            {error && (
              <div style={{ background:`${COLORS.red}18`, border:`1px solid ${COLORS.red}44`, borderRadius:8, padding:"10px", color:COLORS.red, fontSize:13, marginBottom:14 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleSend} disabled={sending} style={{
              background: sending ? COLORS.card2 : COLORS.green,
              color: sending ? COLORS.muted : COLORS.bg,
              border:"none", borderRadius:12, padding:"14px", fontSize:15,
              fontWeight:800, cursor:sending?"not-allowed":"pointer", width:"100%"
            }}>
              {sending ? "⏳ Envoi en cours..." : "📬 Envoyer le message"}
            </button>
          </>
        )}
      </Card>

      {/* Guide d'installation */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:800, fontSize:16, marginBottom:4 }}>📲 Installer l'application</div>
        <div style={{ color:COLORS.muted, fontSize:12, marginBottom:16 }}>Ajoutez Oddrix sur votre écran d'accueil</div>

        {/* iPhone */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ background:"#1a1a2e", border:"1px solid #333", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🍎</div>
            <div>
              <div style={{ color:COLORS.text, fontWeight:700, fontSize:14 }}>iPhone / iPad</div>
              <div style={{ color:COLORS.muted, fontSize:11 }}>Safari obligatoire</div>
            </div>
          </div>
          {[
            { n:1, t:"Ouvrez Safari", d:"Uniquement Safari — pas Chrome ni Firefox" },
            { n:2, t:"Allez sur oddrix.fr", d:"Tapez l'adresse dans la barre Safari" },
            { n:3, t:"Appuyez sur Partager ↑", d:"Le carré avec une flèche en bas de Safari" },
            { n:4, t:"Sur l'écran d'accueil", d:"Faites défiler le menu et appuyez dessus" },
            { n:5, t:"Appuyez sur Ajouter", d:"Confirmez le nom \"Oddrix\" puis validez" },
          ].map((s,i) => (
            <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"8px 0", borderBottom: i<4?`1px solid ${COLORS.border}`:"none" }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:`linear-gradient(135deg,${COLORS.green},${COLORS.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:COLORS.bg, flexShrink:0 }}>{s.n}</div>
              <div>
                <div style={{ color:COLORS.green, fontSize:13, fontWeight:600 }}>{s.t}</div>
                <div style={{ color:COLORS.green, fontSize:11, marginTop:2, opacity:0.75 }}>{s.d}</div>
              </div>
            </div>
          ))}
          <div style={{ background:`${COLORS.amber}15`, border:`1px solid ${COLORS.amber}33`, borderRadius:8, padding:"8px 12px", marginTop:10, fontSize:12, color:"#d4aa50" }}>
            💡 Sur iPhone, seul Safari permet d'installer l'app sur l'écran d'accueil
          </div>
        </div>

        {/* Android */}
        <div style={{ borderTop:`1px solid ${COLORS.border}`, paddingTop:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ background:"#051008", border:"1px solid #1a4020", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🤖</div>
            <div>
              <div style={{ color:COLORS.text, fontWeight:700, fontSize:14 }}>Android</div>
              <div style={{ color:COLORS.muted, fontSize:11 }}>Chrome, Samsung Internet...</div>
            </div>
          </div>
          {[
            { n:1, t:"Ouvrez Chrome", d:"Google Chrome sur votre Android" },
            { n:2, t:"Allez sur oddrix.fr", d:"Tapez l'adresse dans la barre" },
            { n:3, t:"Bannière ou menu ⋮", d:"Une bannière apparaît ou appuyez sur les 3 points" },
            { n:4, t:"Ajouter à l'écran d'accueil", d:"Appuyez sur cette option" },
            { n:5, t:"Confirmez", d:"Appuyez sur Ajouter ou Installer" },
          ].map((s,i) => (
            <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"8px 0", borderBottom: i<4?`1px solid ${COLORS.border}`:"none" }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:`linear-gradient(135deg,${COLORS.green},${COLORS.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:COLORS.bg, flexShrink:0 }}>{s.n}</div>
              <div>
                <div style={{ color:COLORS.green, fontSize:13, fontWeight:600 }}>{s.t}</div>
                <div style={{ color:COLORS.green, fontSize:11, marginTop:2, opacity:0.75 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ordinateur */}
        <div style={{ borderTop:`1px solid ${COLORS.border}`, paddingTop:16, marginTop:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ fontSize:24 }}>💻</div>
            <div>
              <div style={{ color:COLORS.text, fontWeight:700, fontSize:14 }}>Ordinateur</div>
              <div style={{ color:COLORS.muted, fontSize:11 }}>Tous les navigateurs</div>
            </div>
          </div>
          <div style={{ color:COLORS.muted, fontSize:13, lineHeight:1.6 }}>
            Ouvrez n'importe quel navigateur et tapez <span style={{color:COLORS.green, fontWeight:600}}>oddrix.fr</span> — l'application s'ouvre directement, aucune installation requise. Mettez la page en favori pour y accéder rapidement.
          </div>
        </div>
      </Card>

      {[
        { org:"Joueurs Info Service", tel:"09 74 75 13 13", desc:"Ligne nationale d'aide — 7j/7, gratuit", color:COLORS.green },
        { org:"SOS Joueurs",          tel:"01 53 24 00 60", desc:"Soutien pour joueurs et proches",         color:COLORS.teal },
        { org:"3114",                 tel:"3114",           desc:"Prévention suicide & addictions — 24h/24",color:COLORS.amber },
      ].map((h,i)=>(
        <Card key={i}>
          <div style={{ color:h.color, fontWeight:700, fontSize:15 }}>{h.org}</div>
          <div style={{ color:COLORS.text, fontSize:22, fontWeight:900, margin:"8px 0" }}>📞 {h.tel}</div>
          <div style={{ color:COLORS.muted, fontSize:13 }}>{h.desc}</div>
          <a href={`tel:${h.tel.replace(/\s/g,"")}`} style={{
            display:"block", marginTop:12, background:h.color, color:COLORS.bg,
            borderRadius:8, padding:"10px", textAlign:"center", fontWeight:700,
            textDecoration:"none", fontSize:14
          }}>Appeler maintenant</a>
        </Card>
      ))}

      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📋 Règles en France</div>
        {[
          "Âge légal : 18 ans minimum",
          "Auto-exclusion disponible sur tous les sites agréés ANJ",
          "Dépôt max conseillé : adapté à vos revenus",
          "Pauses recommandées après plusieurs pertes consécutives",
          "Gains > 1 500 € à déclarer aux impôts",
        ].map((r,i)=>(
          <div key={i} style={{ color:COLORS.muted, fontSize:13, padding:"6px 0", borderBottom:`1px solid ${COLORS.border}`, display:"flex", gap:8 }}>
            <span style={{color:COLORS.amber}}>ℹ️</span> {r}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Formulaire ajout pari ─────────────────────────────────────────────────
function AddBetModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    sport: "Football", bookmaker: "Betclic", type: "Simple",
    marche: "Résultat match", sousMarche: "Victoire domicile",
    pays: "France", championnat: "Ligue 1",
    cote: "", mise: "", resultat: "gagné", live: false
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const [showScan, setShowScan] = useState(false);

  // Quand le pays change, reset le championnat
  const handlePaysChange = (p) => {
    set("pays", p);
    set("championnat", PAYS_CHAMPIONNATS[p]?.[0] || "Autre");
  };

  const handleScanResult = (parsed) => {
    setForm(p=>({
      ...p,
      sport:      parsed.sport      || p.sport,
      bookmaker:  parsed.bookmaker  || p.bookmaker,
      type:       parsed.type       || p.type,
      marche:     parsed.marche     || p.marche,
      sousMarche: parsed.sousMarche || p.sousMarche,
      cote:       parsed.cote       || p.cote,
      mise:       parsed.mise       || p.mise,
      date:       parsed.date       || p.date,
    }));
  };

  const handleMarcheChange = (m) => {
    set("marche", m);
    set("sousMarche", MARCHES[m]?.[0] || "");
  };

  const handleSave = () => {
    const mise = parseFloat(form.mise), cote = parseFloat(form.cote);
    if (!mise||!cote) return;
    const gain = form.resultat==="gagné" ? parseFloat((mise*cote).toFixed(2)) : -mise;
    onSave({ ...form, mise, cote, gain, id: Date.now() });
    onClose();
  };

  const inp = (label, key, type="text", opts=null) => (
    <div style={{ marginBottom:12 }}>
      <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:4 }}>{label}</label>
      {opts ? (
        <select value={form[key]} onChange={e=>set(key,e.target.value)} style={{
          width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.border}`,
          borderRadius:8, padding:"10px 12px", color:COLORS.text, fontSize:14
        }}>
          {opts.map(o=><option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={e=>set(key,e.target.value)} style={{
          width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.border}`,
          borderRadius:8, padding:"10px 12px", color:COLORS.text, fontSize:14, boxSizing:"border-box"
        }}/>
      )}
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:100, display:"flex", alignItems:"flex-end" }}>
      <div style={{ background:COLORS.card, width:"100%", borderRadius:"20px 20px 0 0", padding:20, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ color:COLORS.text, fontWeight:800, fontSize:18 }}>Nouveau pari</div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setShowScan(true)} style={{ background:`${COLORS.teal}22`, border:`1px solid ${COLORS.teal}44`, color:COLORS.teal, borderRadius:8, padding:"7px 12px", fontSize:13, fontWeight:700, cursor:"pointer" }}>📸 Scanner</button>
            <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:24, cursor:"pointer" }}>✕</button>
          </div>
        </div>

        {inp("Date","date","date")}
        {inp("Sport","sport","text",SPORTS)}
        {inp("Bookmaker","bookmaker","text",BOOKMAKERS)}
        {inp("Type de pari","type","text",TYPES)}

        {/* Pays */}
        <div style={{ marginBottom:12 }}>
          <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:4 }}>🌍 Pays / Compétition</label>
          <select value={form.pays} onChange={e=>handlePaysChange(e.target.value)} style={{
            width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.border}`,
            borderRadius:8, padding:"10px 12px", color:COLORS.text, fontSize:14
          }}>
            {Object.keys(PAYS_CHAMPIONNATS).map(p=><option key={p}>{p}</option>)}
          </select>
        </div>

        {/* Championnat */}
        <div style={{ marginBottom:12 }}>
          <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:4 }}>🏆 Championnat / Ligue</label>
          <select value={form.championnat} onChange={e=>set("championnat",e.target.value)} style={{
            width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.amber}44`,
            borderRadius:8, padding:"10px 12px", color:COLORS.amber, fontSize:14, fontWeight:600
          }}>
            {(PAYS_CHAMPIONNATS[form.pays]||["Autre"]).map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Marché */}
        <div style={{ marginBottom:12 }}>
          <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:4 }}>Marché</label>
          <select value={form.marche} onChange={e=>handleMarcheChange(e.target.value)} style={{
            width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.border}`,
            borderRadius:8, padding:"10px 12px", color:COLORS.text, fontSize:14
          }}>
            {Object.keys(MARCHES).map(m=><option key={m}>{m}</option>)}
          </select>
        </div>

        {/* Sous-marché */}
        <div style={{ marginBottom:12 }}>
          <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:4 }}>Sélection</label>
          <select value={form.sousMarche} onChange={e=>set("sousMarche",e.target.value)} style={{
            width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.green}44`,
            borderRadius:8, padding:"10px 12px", color:COLORS.green, fontSize:14, fontWeight:600
          }}>
            {(MARCHES[form.marche]||[]).map(s=><option key={s}>{s}</option>)}
          </select>
        </div>

        {inp("Cote","cote","number")}
        {inp("Mise (€)","mise","number")}
        {inp("Résultat","resultat","text",["gagné","perdu","en cours"])}
        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
          <input type="checkbox" checked={form.live} onChange={e=>set("live",e.target.checked)} id="live"/>
          <label htmlFor="live" style={{ color:COLORS.muted, fontSize:14 }}>Paris en live</label>
        </div>
        <button onClick={handleSave} style={{
          background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:10,
          padding:"14px", fontSize:15, fontWeight:800, cursor:"pointer", width:"100%"
        }}>💾 Enregistrer</button>
      </div>
      {showScan && <ScanModal onResult={handleScanResult} onClose={()=>setShowScan(false)}/>}
    </div>
  );
}

// ── Logo SVG réutilisable ─────────────────────────────────────────────────
// ── Logo réel Oddrix ─────────────────────────────────────────────────────
const ODDRIX_LOGO = "data:image/webp;base64,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";
// BALL_IMG_REMOVED = "iVBORw0KGgoAAAANSUhEUgAAAHoAAACMCAIAAAA88Cq3AABrkklEQVR42o39d5glV3E+jlfVOR1umLw5SqtVzhKSQIABIUAkES2MbYyNMSY4EA04YJNxxsYGgw02DhiMTZYACYFyztrVrjbP5skzN3b3Oafq+8fp7tt3+Ty/5zfS7s7O3Ll77+nTdareet+38Lr/iJ0D55gZnAgKCuLCyfSdF33kF5/1tr/47i/O9B5gG/bb0p2n1vGwfVL1l9EZQtFa6VAHQaDXr12zYe2Go8eO//d/f7VWG3dsCYkIiRQRkdKIhEiCCIgIKAAAiACAIAIAAiAgIiII/k8QABFWSs8tLt12yw9vuOENiQFBEAHrOE1SALj3wXvf+qfvM1EQkjLOIgAiSmaWd+yVmsZ6CFEQTdU3P/ec2YNLiAAAIEJaJ0+c1Ec7oAlEAASKD8lfGQoI5l8CwPwhAoAg+beh+vXi2yDoHwEI5fPm/wQKCFkr1op1YB2wQedgcS59z5V/9OsvePfHv3bD09P39peClRleOkqLh4P2SZ11NEoQ6DAKo1oYhUHQ7XS3bdl65hnbgyAYHx0LAh2HUaADIo0AiORfhV9rgOJ38K83/wQBARGRwD8MAQQQkBD9tUAQJCAkQtSKojgCgOc/5/lf+shf6MRmbBWhf2vCIoBABETCHDRCVMTWYX5NgZ1AYhGKy1z+AQB+ncq1Lv8O5QuvrOPgciD6PwBFcLD4gw8EEARUm16qnEMWEEZBWGmZ373kvW974Z98+F/fsPPIbQHUVha4PaPbx8P+QsBJSBBFKorDuB5FzBKH4fXXvei8c8997Imnjhw7YXvt2eNHhE1ci+O4psOYSEu+r/zrITj1AwefYLlhBECYBZVqdTrHj0yfd+FFzrK/Jn4DKq3TJD33rHPO3rDlu7f8EGoh+Z3oOJ1fxFBjrAVgdNNENDXamW2rQPnrBiw8vayMAFWWVMr1RAQEyVd2aNV/7hUL+JWufg3KzVLevOVf1aaXknMiFgWw1cveduFvvusln/nr//mj23d8ra7j1hL35nV3LkiXQ7RxTdfjqFaP4igMldJbNmy47KILHn5sxw9uvv26l73sfe97rxF8csfuu+68a+eOx9sri1EY1OqNIIqRFCCwACLl6/Vzi15EFUTygQgUIqqg1WofP3Lk3AsudNbl+wwBAImQFLW7vfPOPmfdyPj3b785ajTEOmCXLq5IQBQHIjJ5znoJdH++qzSBCCJx6uRIS0se0/xrQURBAX8zlXddeRdidbMiDq075g/Ayk+IVK9R8RfRjpGdkMjCSva6s69/5/Pfd9M9N/3woc+N1MPlWdub18mCztqB5rhea47UmlEQIgAAjY+Ozs/Of/3hm172ylf867/964YtW2y/f945Z73supccO3b80ccef3zHzvsefPS0LZsuvviibWdsH59ao6KmCAgzIgqASPkekCjftgAAbDqtlcX52bm5+eV2Z3G5vWpiDABEGIlEWBgAFSJqRfU6rbTbb3ztLx06PP0X//3lickpdgIKMVAQKGCMJxvdVgog4gRAkAASQ4aBCFgQsXgV4je1D8Q02J8o1dCAeagWkMHNmN8KAgggMoiW/rlEAPM3q50VFFzsZM/f8Nx3PvdN07Ppl298T1ynzgr3l1WyFGVthS6s15qTY5NjjQYhJf10eaW186m9l11+1be/+7lLL7mgvbK0ODsXBIH0E0LcuGHt1u2vvf41r3t6z74H77/nxptuboQ/ueD8cy+67Ir1W7dTEPtIAYKo8jVmkyzMzR48sH/303t279l34ND0iRMnl5aXjbVaqQ+++51iMxUEzhjJdxojaFIYEDZHmq129/fe9rtPPP3ULTseGms0BREDBQREKqqFy0db/qYSvyCJRfahC8uzsDjo0J9pxV71K5ZHF5DB2mO+h7FylFZW398u/uTHwamqnYV+L9sen/3Wq181PnrxX37l4ycXTsRB0J6ldCly3UiBbtRGV4+vmpoYD7Q+fmLmsSeeiuKRP/3ox9/8pl92WTI/O6O01koBgFIKETPLpt2Kotq5555z7rnnzC8s3H37bXfefftd99x/9dXPvPzKZ6/ddBrpAGy6PDNz8OD+HTt3PfbEU0/tfnr68BFj7OjY6Pq1a07fsunMbacZJ53UfPVbP+r0sre/852ilLMWkYRFSASICMMoDK2zqfnEH3xk57vfssIpBQoAIOWgHhBg1stIU54/EHLfail2ogyFNoGhT7AaT6RcSamEckHI/xPg6k0gPtHKg1Tx5Yv/kmSx9qHrfvu5573g0MHaBz57nY6wu4SmFbtOJCZsxiNrJ9etnpzShI8/seuhx3Zed91L//avPn3G6VuWlpYRSSklIFREXFJKkVZKkVKACpUi0gDQ6XRv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s6+++pv/+79r1q752W23bzn99Pe/9z3tdsdY0+11jx49BgDr1q5tt9uKNCAQqaTXPbC0uLS8XJpsi5/CDUBEReZTuDMiiAj90z/87eTURJqm/W7vrz71iff+3rtmZ2cuuuj8T330I6smxq99wfPf++53o8A528/4p3/8+zCKRpqN8886a8eOp+67575bf3qry8yv/eqvPL376V/+1Tf98KYf+mFnPgX2gGCamO0X1H7jty84bVvDpKBUDgT6Q1drvXPX7s9/8Ut/9olPxmF0+mlbASk1mQ7DdevWLa+0vM1YY3T03PPPH5+YXFpaBITR0dEv/OPnvvWt//2tt7410Ork7Nze/ftGx8aIaN/+g6tWTUVRCIT/9uUv/eyWm0dGxn9w04+azcbcwsKNN970Bx94f5Imd919z+jISKCDZ131zCiM3vHOt5+29fSXvOTFiqheqzuAj37s45dfcuH27ae3Wu3HHn/yissum1q1ZnZm9hUvf9m2bduy1Bw9duyjn/r03//Tl1ZaK2EQOOdyeT5U6VNlt1h8nqBDhdYYRbT3wP5PfPIz//CPf3fjj25+4w2/+PgTO770L1/+xMf+9MDBg29805sB4KKLLlyYn1c6ODB99CMf+2Rci4VhbKyZJn0AbLW7f/LxTwPgqtWrjck8ocsZiCY6v/mxrVlzbuLa5H//GBeOAgW+M4thFILwtm2n/+7v/s61z39+u9Pau+9Alpk33nDD6179qjiK3/Crb2qttOJa/F//8dXR5sgDDzx40w9//IqXvkQAlpcW+/3+iZMnkDkMVBwE8zMzAHDJpRefOHkyTTPS4c233PrS61562x137Nm779prr4mi6Nvf/e7b3vobDz740PShaWvd1OTExRdfeOjQ9NbNW/bs23/5pZdt2bIly7LxsbHpQ4e++KUvf+yPPzTSbNx8y62/9ZZf/5+vffXQ4WMvfMHz3/+BDzprnvGMy2/96U/Wrl79ve/94KMf++To2KgvvEW8/VU5ULHsfgMiaH/KI8DIyMj3f3zza35629//7d9oRR/95KczY39y68+uvfaFP77p+/c/8NA3vvlNETHGbt2y5a7bf7pmzeq777r7N972js/94+f/5MMf+t63vrncav/TF//lezd+PwhCaywgE6GO8MHpXW3uTU3qxurGiX26FhASKlBhELLA6qnJl7/kxUsLC7//6U8fPnq0Htf+8fOf//f//FocR+1O99KLL5yZmfmzj3/qYx/5k4cefbTVao2NjWfGfuRjnzJZSkqvnpqcOX7sDz7wvi9+8Z9f/9pXX37ZJb/0pt9g5kDjP3/5K0/ufOpzn/3bb/zPN4Rlw4YNR44e/fEtP7npRzdv3rjRWnvJxRdtWL/2d9/7gYMHD8Zx7daf3HzttdceOXIks0xEX/vGNy67+MJer9/pdn/zt9/1lt/4tXXrNrzzd373lp/cetEF53/8U5/pdLpZkp6YmYviyFpXDHvITVax4myHUPgJ3/bj777rPR9eXFpSSs/NzV1w3jlf/fK//OzOuz7woQ+HYdBaaT3jskt/5Y1veNZVV46Ojr3ul9543Ytf9Es3vOHz//QlY8309OH7HnjANzbPOuP03/+937vq2c953evf0O50fAlLhO3OykWv5ef+sjr8ONz8V5o49DPjATHtd//qM58GpN96xzv9bbdq1dS/funzew4cfOyJnadt3Xr7z362bu2a9733vVc9+7mvftX1X/zCF15w7bXPftYz3//+9//CC19sMoviFhbmL7/04j//1MdXr1mbpekXvvilr3z1Py+7+MIP/cH7PvwnHztw8NBffObTjz3x2OzJmauf85y/+ZvPkqJ2u7118+Z169adPHliYmJi34FDhJSkydo1GwRca2VZKZ2kabfTBpB6veGcS9PUJ2xhGI+MjCyvLDtr/GtuNEbCKCoGCeQlug69w8nATdPLdbQA9LrdXq+nlYprtenp6fm52Xvuuy9JUq3VGWdsO3r8xHs+8KFt206/+cbvX3ThhUjUarf/51vfiqOoVqtvWL/+I3/0oVtvv/POu+6x7Pr9jnMO8zpQrIA4eOi/7dGHoLsQgolUNBgJ7izHtQhJA8Do6Ji1DgFXlpcvveD8Sy66aGxsYn5u7sknnnjgoYfHxsdu+uGP/v7vP7d9+5n3PfDgX3/275AZxTnn4jh++NHHr3/dG7Zv3z47M3dy5mSzObJj9963vP33oiiMa7UPfPCDSgfO2ltuvW18YtwY22yOTB85dnB6GgQOTh+ZnJwUkUAHJ2aOayJShEha61q9rpQKg5DZRXEMAH7qr3NupDni+9T5+BrObdgR0RoX+JKHh2d2e7y7Vmu87OUvs9bVarVv/t//ickmx0frtRopzZZ/5+1ve9nLXvrT2+84Y9u2XpI89MhjF5x/3rnnnH3PHT/TQUCIv/yrbz548OCf/tEHdVRrLy//+V/9zdLyUr1W895cwqKDAADm9lBjNAoiGnjuCxt2f/N3/wiItVodiYh4cWnpd9/7wTTLjDFKqTCKkiR9+NHHm81mps0nP/MZHYbC8tSupycmJjzIFcUxkUrT9IknntQ6mJiYEgRACnSASGEYBkHgAdgwjFg4CAJEHBsbI6WEnS+0nIBS1AhquTkOETKHYejxQiLlRaUCYKzF0rR3ULPlwHlmMiJVaDCGRpjkgsRH7rvbgST9ROnwt97xzuOHD3/h7//6v//vOzf/9HZCiILgl254/VXPvHJpcelrX//mw488+uyrn7lly5blpaVOp5Nk2Y6duzrt1vYztq1Zs+bgoenFpZWRkZHCpzOfU87CftDl0IwUDxj0ulEY15sN30np9Xomyzz6EddqYRAYY6IoEpHMZIoIkNi5IAgLQgZ6CwnfnfLOZB4C8JOqnLhTpiPmRvCVFM3PMueibZpL/4sSuiQK+NIXKozgIbdGYWMtIgXae7IOHHuQSsag4AUXXrSyvNTrdgDROWl32oqoOTIShXGSJcvLy1JYWgVhFEdRu90aMN502Gg2nXPdblfYhlE8OjJandRWLLnk/WBARgEWQBRmay0pFQQBF5SksgMALKjy8aOKCMB3X4aRzEKKm3c78+maWDZnS6uLst8/GO4mQ2zJfCgMS4FhDdnvSg7Nc8XXqDqiJ4cuiCjQERIppTxvECuD5v3H/wf4GnsJ8Y9c5QAAAABJRU5ErkJggg==";
const ODDRIX_LOGO_SMALL = "data:image/jpeg;base64,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";

function LogoSVG({ size=44 }) {
  return (
    <img
      src={size > 60 ? ODDRIX_LOGO : ODDRIX_LOGO_SMALL}
      alt="Oddrix"
      style={{
        width: size,
        height: size * 0.75,
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
}

// ── Splash Screen 3 phases ───────────────────────────────────────────────
// ── Splash Screen cinématique ────────────────────────────────────────────
function SplashScreen({ userName, isNew=false }) {
  const hour = new Date().getHours();
  const timeGreet = isNew
    ? `Bienvenue sur Oddrix${userName ? `, ${userName}` : ""} ! 🎉`
    : `${hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir"}${userName ? `, ${userName}` : ""} 👋`;

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"#0a0f0a",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      zIndex:9999, overflow:"hidden",
      animation:"splashFadeOut 11s ease forwards",
    }}>
      <style>{`
        /* Fondu entrée logo */
        @keyframes logoFadeIn {
          0%   { opacity:0; transform:scale(.92); }
          30%  { opacity:.3; }
          60%  { opacity:.8; transform:scale(1.02); }
          80%  { opacity:1; transform:scale(1); }
          100% { opacity:1; transform:scale(1); }
        }
        /* Léger flottement après apparition */
        @keyframes logoFloat {
          0%,100% { transform:scale(1) translateY(0px); }
          50%     { transform:scale(1) translateY(-6px); }
        }
        /* Texte fade in */
        @keyframes textFadeIn {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        /* Barre chargement */
        @keyframes barLoad { from{width:0} to{width:100%} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        /* Fondu sortie écran complet */
        @keyframes splashFadeOut {
          0%,78% { opacity:1; }
          95%    { opacity:0; }
          100%   { opacity:0; pointer-events:none; }
        }
        /* Particules */
        @keyframes spark {
          0%,100% { transform:translateY(0) scale(1); opacity:.3; }
          50%     { transform:translateY(-18px) scale(1.3); opacity:.7; }
        }
        /* Lueur logo */
        @keyframes logoGlow {
          0%,100% { filter:drop-shadow(0 0 20px rgba(0,230,118,.2)) drop-shadow(0 12px 30px rgba(0,0,0,.8)); }
          50%     { filter:drop-shadow(0 0 40px rgba(118,255,3,.35)) drop-shadow(0 12px 30px rgba(0,0,0,.8)); }
        }
      `}</style>

      {/* Particules discrètes */}
      {[...Array(8)].map((_,i)=>(
        <div key={i} style={{
          position:"absolute",
          width:2+(i%3), height:2+(i%3), borderRadius:"50%",
          background:["#00e676","#76ff03","#1de9b6"][i%3],
          left:`${8+i*11}%`, top:`${12+(i*17)%65}%`,
          animation:`spark ${2+i*0.4}s ${i*0.3}s ease-in-out infinite`,
        }}/>
      ))}

      {/* Logo — fondu lent sur 3 secondes */}
      <div style={{
        animation:"logoFadeIn 3s .3s ease forwards, logoFloat 3.5s 3.5s ease-in-out infinite, logoGlow 3s 3s ease-in-out infinite",
        opacity:0,
      }}>
        <img
          src={ODDRIX_LOGO}
          alt="Oddrix"
          style={{
            width:300, height:"auto",
            objectFit:"contain",
            display:"block",
          }}
        />
      </div>

      {/* Texte de bienvenue */}
      <div style={{
        textAlign:"center", marginTop:16,
        animation:"textFadeIn .8s 3.2s ease forwards", opacity:0
      }}>
        <div style={{
          color:"#8b949e", fontSize:14, fontWeight:600,
          letterSpacing:2, textTransform:"uppercase", marginBottom:6
        }}>
          {timeGreet}
        </div>
        <div style={{
          color:"#8b949e", fontSize:10,
          letterSpacing:3, textTransform:"uppercase"
        }}>
          Statistiques · Analyses · Performance
        </div>
      </div>

      {/* Barre de chargement */}
      <div style={{
        width:180, height:3, background:"#1a2a1a", borderRadius:2,
        marginTop:24, overflow:"hidden",
        animation:"fadeIn .3s 4s ease forwards", opacity:0
      }}>
        <div style={{
          height:"100%", borderRadius:2,
          background:"linear-gradient(90deg,#1de9b6,#76ff03,#1de9b6)",
          animation:"barLoad 5s 4.2s ease forwards", width:0
        }}/>
      </div>

      {/* oddrix.fr */}
      <div style={{
        position:"absolute", bottom:32,
        color:"#ffffff12", fontSize:10, letterSpacing:3, textTransform:"uppercase",
        animation:"fadeIn .4s 4.5s ease forwards", opacity:0
      }}>oddrix.fr</div>
    </div>
  );
}
// ── Onboarding (4 écrans) ─────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = [
    { emoji:"📊", title:"Suivez vos paris", desc:"Enregistrez chaque pari en quelques secondes — sport, marché, cote, mise, résultat. Tout est centralisé.", color:COLORS.green },
    { emoji:"📈", title:"Analysez vos stats", desc:"ROI, taux de réussite, bankroll, performance par sport et par bookmaker. Comprenez où vous gagnez vraiment.", color:COLORS.teal },
    { emoji:"🔥", title:"Progressez", desc:"Détectez vos points forts et faibles, suivez votre série de victoires et comparez-vous aux autres parieurs.", color:COLORS.amber },
    { emoji:"🏆", title:"Prêt à jouer !", desc:"7 jours d'essai gratuit. Aucun paiement maintenant. Annulable à tout moment depuis votre profil.", color:COLORS.purple },
  ];
  const s = steps[step];

  return (
    <div style={{ background:COLORS.bg, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, maxWidth:480, margin:"0 auto" }}>
      <LogoSVG size={60}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", gap:20, paddingTop:32 }}>
        <div style={{ fontSize:72, lineHeight:1 }}>{s.emoji}</div>
        <div style={{ fontWeight:900, fontSize:26, lineHeight:1.2 }}>{s.title}</div>
        <div style={{ color:COLORS.muted, fontSize:15, lineHeight:1.7, maxWidth:300 }}>{s.desc}</div>
      </div>

      {/* Indicateurs */}
      <div style={{ display:"flex", gap:8, margin:"32px 0 24px" }}>
        {steps.map((_,i)=>(
          <div key={i} style={{ width: i===step?24:8, height:8, borderRadius:4, background: i===step?s.color:COLORS.border, transition:"all .3s" }}/>
        ))}
      </div>

      <div style={{ display:"flex", gap:12, width:"100%" }}>
        {step > 0 && (
          <button onClick={()=>setStep(p=>p-1)} style={{ flex:1, background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.muted, borderRadius:12, padding:"14px", fontWeight:700, fontSize:15, cursor:"pointer" }}>← Retour</button>
        )}
        <button onClick={()=>step<steps.length-1?setStep(p=>p+1):onDone()} style={{ flex:2, background:s.color, color:COLORS.bg, border:"none", borderRadius:12, padding:"14px", fontWeight:800, fontSize:15, cursor:"pointer" }}>
          {step<steps.length-1 ? "Suivant →" : "🚀 Commencer !"}
        </button>
      </div>
      {step===0 && <button onClick={onDone} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:12, cursor:"pointer", marginTop:12 }}>Passer l'intro</button>}
    </div>
  );
}

// ── Mot de passe oublié ───────────────────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  const [email, setEmail]   = useState("");
  const [step, setStep]     = useState("form"); // form | sent
  const [error, setError]   = useState("");

  const handleSend = async () => {
    setError("");
    if (!email.includes("@")) { setError("Email invalide."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setStep("sent");
    } catch(e) {
      if (e.code === "auth/user-not-found") setError("Aucun compte avec cet email.");
      else setError("Erreur lors de l'envoi. Réessayez.");
    }
  };

  const inputStyle = { width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px", color:COLORS.text, fontSize:15, fontFamily:"inherit", boxSizing:"border-box" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:200, display:"flex", alignItems:"flex-end" }}>
      <div style={{ background:COLORS.card, width:"100%", borderRadius:"20px 20px 0 0", padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17 }}>🔑 Mot de passe oublié</div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:24, cursor:"pointer" }}>✕</button>
        </div>
        {step==="form" ? (<>
          <p style={{ color:COLORS.muted, fontSize:13, lineHeight:1.6, marginBottom:16 }}>Entrez votre email. Nous vous enverrons un lien de réinitialisation.</p>
          <div style={{ marginBottom:16 }}>
            <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" style={inputStyle}/>
          </div>
          {error && <div style={{ background:`${COLORS.red}18`, border:`1px solid ${COLORS.red}44`, borderRadius:8, padding:"10px", color:COLORS.red, fontSize:13, marginBottom:14 }}>⚠️ {error}</div>}
          <button onClick={handleSend} style={{ background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:12, padding:"14px", fontWeight:800, fontSize:15, cursor:"pointer", width:"100%" }}>
            Envoyer le lien →
          </button>
        </>) : (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>Email envoyé !</div>
            <div style={{ color:COLORS.muted, fontSize:13, lineHeight:1.6, marginBottom:20 }}>
              Vérifiez votre boîte mail et suivez les instructions pour réinitialiser votre mot de passe.<br/>
              <span style={{ color:COLORS.amber, fontSize:12 }}>(En phase de test : consultez la console développeur)</span>
            </div>
            <button onClick={onClose} style={{ background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:12, padding:"13px 24px", fontWeight:800, cursor:"pointer" }}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modifier profil ───────────────────────────────────────────────────────
function EditProfileModal({ user, onSave, onClose }) {
  const [name, setName]         = useState(user?.name||"");
  const [email, setEmail]       = useState(user?.email||"");
  const [oldPwd, setOldPwd]     = useState("");
  const [newPwd, setNewPwd]     = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const inputStyle = { width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"13px", color:COLORS.text, fontSize:14, fontFamily:"inherit", boxSizing:"border-box" };

  const handleSave = () => {
    setError(""); setSuccess("");
    if (!name.trim()) { setError("Le prénom ne peut pas être vide."); return; }
    if (!email.includes("@")) { setError("Email invalide."); return; }
    if (newPwd && newPwd.length < 6) { setError("Nouveau mot de passe : 6 caractères min."); return; }
    if (newPwd && oldPwd !== user.password) { setError("Ancien mot de passe incorrect."); return; }

    const users = JSON.parse(localStorage.getItem("sb_users")||"[]");
    const idx = users.findIndex(u=>u.id===user.id);
    if (email !== user.email && users.find(u=>u.email===email && u.id!==user.id)) { setError("Cet email est déjà utilisé."); return; }
    users[idx].name  = name.trim();
    users[idx].email = email;
    if (newPwd) users[idx].password = newPwd;
    localStorage.setItem("sb_users", JSON.stringify(users));
    setSuccess("Profil mis à jour ✅");
    setTimeout(()=>{ onSave(users[idx]); onClose(); }, 1000);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:200, display:"flex", alignItems:"flex-end" }}>
      <div style={{ background:COLORS.card, width:"100%", borderRadius:"20px 20px 0 0", padding:24, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17 }}>✏️ Modifier mon profil</div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:24, cursor:"pointer" }}>✕</button>
        </div>

        {/* Pseudo non modifiable */}
        <div style={{ marginBottom:14 }}>
          <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>PSEUDO (non modifiable)</label>
          <div style={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"13px", color:COLORS.muted, fontSize:14 }}>@{user?.pseudo}</div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>PRÉNOM</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>EMAIL</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle}/>
        </div>

        <div style={{ background:COLORS.card2, borderRadius:12, padding:14, marginBottom:14 }}>
          <div style={{ color:COLORS.text, fontWeight:600, fontSize:13, marginBottom:12 }}>🔒 Changer le mot de passe</div>
          <div style={{ marginBottom:10 }}>
            <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>ANCIEN MOT DE PASSE</label>
            <input type="password" value={oldPwd} onChange={e=>setOldPwd(e.target.value)} placeholder="Laisser vide pour ne pas changer" style={inputStyle}/>
          </div>
          <div>
            <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>NOUVEAU MOT DE PASSE</label>
            <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="6 caractères minimum" style={inputStyle}/>
          </div>
        </div>

        {error && <div style={{ background:`${COLORS.red}18`, border:`1px solid ${COLORS.red}44`, borderRadius:8, padding:"10px", color:COLORS.red, fontSize:13, marginBottom:14 }}>⚠️ {error}</div>}
        {success && <div style={{ background:`${COLORS.green}18`, border:`1px solid ${COLORS.green}44`, borderRadius:8, padding:"10px", color:COLORS.green, fontSize:13, marginBottom:14 }}>{success}</div>}

        <button onClick={handleSave} style={{ background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:12, padding:"14px", fontWeight:800, fontSize:15, cursor:"pointer", width:"100%" }}>
          💾 Enregistrer les modifications
        </button>
      </div>
    </div>
  );
}

// ── Supprimer compte ──────────────────────────────────────────────────────
function DeleteAccountModal({ user, onDeleted, onClose }) {
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");

  const handleDelete = async () => {
    if (confirm !== "SUPPRIMER") { setError('Tapez exactement "SUPPRIMER" pour confirmer.'); return; }
    try {
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.delete();
      await signOut(auth);
      onDeleted();
    } catch(e) {
      if (e.code === "auth/requires-recent-login") {
        setError("Pour des raisons de sécurité, reconnectez-vous avant de supprimer votre compte.");
      } else {
        setError("Erreur lors de la suppression. Réessayez.");
      }
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:300, display:"flex", alignItems:"center", padding:24 }}>
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.red}44`, borderRadius:20, padding:24, width:"100%" }}>
        <div style={{ fontSize:44, textAlign:"center", marginBottom:12 }}>⚠️</div>
        <div style={{ fontWeight:900, fontSize:18, textAlign:"center", marginBottom:8, color:COLORS.red }}>Supprimer mon compte</div>
        <p style={{ color:COLORS.muted, fontSize:13, textAlign:"center", lineHeight:1.6, marginBottom:20 }}>
          Cette action est <strong style={{color:COLORS.red}}>irréversible</strong>. Tous vos paris, statistiques et données seront définitivement supprimés conformément au RGPD.
        </p>
        <div style={{ marginBottom:16 }}>
          <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>Tapez SUPPRIMER pour confirmer</label>
          <input value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="SUPPRIMER" style={{ width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.red}44`, borderRadius:10, padding:"13px", color:COLORS.red, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", textAlign:"center", fontWeight:700, letterSpacing:2 }}/>
        </div>
        {error && <div style={{ background:`${COLORS.red}18`, border:`1px solid ${COLORS.red}44`, borderRadius:8, padding:"10px", color:COLORS.red, fontSize:13, marginBottom:14 }}>⚠️ {error}</div>}
        <button onClick={handleDelete} style={{ background:COLORS.red, color:"#fff", border:"none", borderRadius:12, padding:"14px", fontWeight:800, fontSize:15, cursor:"pointer", width:"100%", marginBottom:10 }}>
          🗑 Supprimer définitivement
        </button>
        <button onClick={onClose} style={{ background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.muted, borderRadius:12, padding:"12px", fontWeight:700, fontSize:14, cursor:"pointer", width:"100%" }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// ── Scanner de ticket (IA) ────────────────────────────────────────────────
function ScanModal({ onResult, onClose }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError]     = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(""); setLoading(true);

    // Aperçu
    const reader = new FileReader();
    reader.onload = r => setPreview(r.result);
    reader.readAsDataURL(file);

    // Conversion base64
    const b64Reader = new FileReader();
    b64Reader.onload = async (ev) => {
      const base64 = ev.result.split(",")[1];
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "x-api-key": "YOUR_ANTHROPIC_API_KEY",
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-allow-browser": "true"
          },
          body: JSON.stringify({
            model:"claude-sonnet-4-20250514",
            max_tokens:600,
            messages:[{
              role:"user",
              content:[
                { type:"image", source:{ type:"base64", media_type: file.type, data: base64 }},
                { type:"text", text:`Analyse ce ticket de pari sportif et extrait uniquement les informations du pari principal visible (pas les autres paris en arrière-plan). Réponds en JSON pur sans markdown :
{
  "sport": "nom du sport (Football, Tennis, Basketball, etc.)",
  "bookmaker": "nom du bookmaker (Betclic, Unibet, Winamax, PMU, Bwin, etc.)",
  "type": "Simple ou Combiné",
  "marche": "type de marché (Résultat match, Buts, Buteur, Mi-temps, etc.)",
  "sousMarche": "sélection précise (ex: Lyon gagne, Plus de 2.5 buts, etc.)",
  "cote": nombre décimal,
  "mise": nombre,
  "resultat": "gagné ou perdu ou en cours",
  "date": "YYYY-MM-DD"
}
Si une info est illisible, mets null. Réponds UNIQUEMENT avec le JSON brut.` }
              ]
            }]
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error?.message || `Erreur ${res.status}`);
        }

        const data = await res.json();
        const text = data.content?.map(c=>c.text||"").join("") || "";
        const clean = text.replace(/```json|```/g,"").trim();
        const parsed = JSON.parse(clean);
        onResult(parsed);
        onClose();
      } catch(err) {
        console.error("Scan error:", err);
        setError(`Impossible de lire le ticket : ${err.message || "image trop floue ou illisible"}`);
      } finally { setLoading(false); }
    };
    b64Reader.readAsDataURL(file);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:200, display:"flex", alignItems:"flex-end" }}>
      <div style={{ background:COLORS.card, width:"100%", borderRadius:"20px 20px 0 0", padding:24, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:17 }}>📸 Scanner un ticket</div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:24, cursor:"pointer" }}>✕</button>
        </div>

        {/* Instructions */}
        <div style={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:14, marginBottom:16, fontSize:13, lineHeight:1.7 }}>
          <div style={{ color:COLORS.text, fontWeight:700, marginBottom:6 }}>📋 Comment bien scanner :</div>
          <div style={{ color:COLORS.muted }}>
            📱 <strong style={{color:COLORS.text}}>Capture d'écran</strong> → cadrez sur <strong style={{color:COLORS.amber}}>un seul pari</strong> (recadrez si nécessaire pour n'avoir que le pari à enregistrer visible)<br/>
            📷 <strong style={{color:COLORS.text}}>Photo ticket papier</strong> → bonne lumière, image nette<br/>
            <span style={{color:COLORS.teal}}>✨ L'IA extrait automatiquement sport, cote, mise et marché</span>
          </div>
        </div>

        {preview && (
          <img src={preview} style={{ width:"100%", borderRadius:12, marginBottom:16, maxHeight:220, objectFit:"contain", background:"#000" }} alt="aperçu"/>
        )}

        {loading ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ fontSize:40, marginBottom:10, animation:"spin 1s linear infinite" }}>🔍</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            <div style={{ color:COLORS.green, fontWeight:700, fontSize:16 }}>Analyse en cours...</div>
            <div style={{ color:COLORS.muted, fontSize:12, marginTop:6 }}>L'IA lit votre ticket, merci de patienter</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <label style={{ display:"block", background:COLORS.green, color:COLORS.bg, borderRadius:12, padding:"14px", textAlign:"center", fontWeight:800, fontSize:15, cursor:"pointer" }}>
              📷 Prendre une photo
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display:"none" }}/>
            </label>
            <label style={{ display:"block", background:COLORS.card2, border:`1px solid ${COLORS.border}`, color:COLORS.text, borderRadius:12, padding:"14px", textAlign:"center", fontWeight:700, fontSize:15, cursor:"pointer" }}>
              🖼️ Choisir depuis la galerie
              <input type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }}/>
            </label>
          </div>
        )}

        {error && (
          <div style={{ background:`${COLORS.red}18`, border:`1px solid ${COLORS.red}44`, borderRadius:10, padding:"12px 14px", color:COLORS.red, fontSize:13, marginTop:14, lineHeight:1.5 }}>
            ⚠️ {error}
          </div>
        )}

        <p style={{ color:COLORS.muted, fontSize:11, textAlign:"center", marginTop:14, lineHeight:1.5 }}>
          💡 Vérifiez toujours les données extraites avant d'enregistrer
        </p>
      </div>
    </div>
  );
}

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(""); setLoading(true);

    // Aperçu
    const reader = new FileReader();
    reader.onload = r => setPreview(r.result);
    reader.readAsDataURL(file);

    // Conversion base64
    const b64Reader = new FileReader();
    b64Reader.onload = async (ev) => {
      const base64 = ev.result.split(",")[1];
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            model:"claude-sonnet-4-20250514",
            max_tokens:500,
            messages:[{
              role:"user",
              content:[
                { type:"image", source:{ type:"base64", media_type: file.type, data: base64 }},
                { type:"text",  text:`Tu es un assistant d'analyse de tickets de paris sportifs. Analyse cette image et extrait les informations suivantes en JSON pur sans markdown :
{
  "sport": "nom du sport",
  "bookmaker": "nom du bookmaker",
  "type": "Simple ou Combiné",
  "marche": "type de marché (Résultat match, Buts, Buteur, etc.)",
  "sousMarche": "sélection précise",
  "cote": nombre,
  "mise": nombre,
  "date": "YYYY-MM-DD"
}
Si tu ne peux pas lire une info, mets null. Réponds uniquement avec le JSON.` }
              ]
            }]
          })
        });
        const data = await res.json();
        const text = data.content?.map(c=>c.text||"").join("") || "";
        const clean = text.replace(/```json|```/g,"").trim();
        const parsed = JSON.parse(clean);
        onResult(parsed);
        onClose();
      } catch(err) {
        setError("Impossible de lire le ticket. Essayez une photo plus nette.");
      } finally { setLoading(false); }
    };
    b64Reader.readAsDataURL(file);
  };


// ── Modal CGV ─────────────────────────────────────────────────────────────
function CGVModal({ onClose }) {
  const articles = [
    { title:"PRÉAMBULE", content:[
      "Les présentes Conditions Générales de Vente (CGV) régissent l'accès et l'utilisation du service Oddrix, application de suivi et d'analyse de paris sportifs.",
      "Éditeur : Damien Rossard — Micro-entrepreneur — Nice (06), France — contact@oddrix.fr",
      "En s'inscrivant, l'utilisateur accepte sans réserve les présentes CGV."
    ]},
    { title:"ART. 1 — OBJET", content:[
      "Oddrix est un outil personnel de suivi de paris sportifs permettant d'enregistrer ses paris, consulter ses statistiques, analyser son ROI, gérer sa bankroll et participer à des classements anonymisés par pseudo.",
      "Oddrix ne constitue en aucun cas un service de conseil financier ni une invitation à parier."
    ]},
    { title:"ART. 2 — INSCRIPTION", content:[
      "L'accès requiert la création d'un compte avec : prénom, pseudo unique (visible publiquement), email (confidentiel), mot de passe (6 caractères min.).",
      "L'accès est strictement réservé aux personnes majeures (18 ans et plus)."
    ]},
    { title:"ART. 3 — ESSAI GRATUIT", content:[
      "Tout nouveau compte bénéficie de 7 jours d'accès Premium gratuit à compter de l'inscription.",
      "⚠️ Activation automatique : sauf annulation avant J+7, l'abonnement mensuel démarre automatiquement et le premier prélèvement est effectué. Un email de rappel est envoyé 48h avant.",
      "Pour ne pas être prélevé : annuler avant la fin du 7e jour depuis son espace personnel ou via support@oddrix.fr."
    ]},
    { title:"ART. 4 — ABONNEMENT & TARIFS", content:[
      "Tarif : 4,99 € TTC / mois après la période d'essai.",
      "Facturation mensuelle automatique via Stripe (certifié PCI-DSS). Résiliation possible à tout moment, effective en fin de période mensuelle.",
      "Toute modification tarifaire est notifiée 30 jours à l'avance par email."
    ]},
    { title:"ART. 5 — DROIT DE RÉTRACTATION", content:[
      "Conformément à l'art. L.221-18 du Code de la consommation, vous disposez de 14 jours calendaires à compter de la souscription pour vous rétracter sans justification.",
      "Pour exercer ce droit : support@oddrix.fr — Remboursement sous 14 jours."
    ]},
    { title:"ART. 6 — RGPD & DONNÉES PERSONNELLES", content:[
      "Données collectées : prénom, pseudo (seule donnée visible publiquement), email (strictement confidentiel), mot de passe sécurisé, données de paris.",
      "Finalité : gestion du compte, fourniture du service, communications de service uniquement.",
      "Droits : accès, rectification, effacement, portabilité, opposition — demande à support@oddrix.fr sous 30 jours.",
      "Conservation : durée de l'abonnement + 30 jours après résiliation."
    ]},
    { title:"ART. 7 — PROPRIÉTÉ INTELLECTUELLE", content:[
      "L'ensemble des éléments de Oddrix (logo, design, code, contenus) sont la propriété exclusive de Damien Rossard. Toute reproduction non autorisée est interdite."
    ]},
    { title:"ART. 8 — RESPONSABILITÉ", content:[
      "Oddrix est un outil de suivi personnel. Il est susceptible de proposer à l'avenir des pronostics de partenaires indépendants, fournis à titre informatif uniquement — pas de conseil financier, pas de garantie de résultat.",
      "Les paris sportifs comportent des risques de perte financière. L'utilisateur reste seul décisionnaire de ses mises.",
      "Aide jeu responsable : Joueurs Info Service 09 74 75 13 13 (7j/7, gratuit)"
    ]},
    { title:"ART. 9 — DROIT APPLICABLE", content:[
      "CGV soumises au droit français. Juridiction compétente : tribunaux de Nice (06).",
      "Médiation consommateur disponible gratuitement en cas de litige (art. L.612-1 C. conso)."
    ]},
    { title:"ART. 10 — INTERDICTION D'EXTRACTION AUTOMATISÉE", content:[
      "Il est strictement interdit d'utiliser tout système automatisé (bot, spider, scraper, ou tout autre procédé automatique) pour accéder à Oddrix, extraire, collecter ou reproduire tout ou partie des données, contenus, statistiques ou fonctionnalités de l'application sans autorisation écrite préalable de Damien Rossard.",
      "⚠️ Cette interdiction couvre notamment : l'extraction en masse de données, la création de comptes automatisés, le contournement des mécanismes de sécurité, et toute tentative de reproduction du service.",
      "Tout manquement à cette interdiction constitue une violation des présentes CGV et est susceptible d'engager la responsabilité civile et pénale de son auteur, notamment au titre de la loi pour la Confiance dans l'Économie Numérique (LCEN) et du Code de la Propriété Intellectuelle."
    ]},
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:200, display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ background:COLORS.card, borderBottom:`1px solid ${COLORS.border}`, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:16 }}>📄 Conditions Générales de Vente</div>
          <div style={{ color:COLORS.muted, fontSize:11, marginTop:2 }}>Oddrix — Damien Rossard — Nice (06)</div>
        </div>
        <button onClick={onClose} style={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, color:COLORS.text, borderRadius:8, padding:"8px 14px", fontWeight:700, fontSize:14, cursor:"pointer" }}>✕ Fermer</button>
      </div>

      {/* Contenu scrollable */}
      <div style={{ overflowY:"auto", flex:1, padding:"20px 16px 40px" }}>
        {articles.map((art, i) => (
          <div key={i} style={{ marginBottom:24 }}>
            <div style={{ color:COLORS.green, fontWeight:800, fontSize:13, letterSpacing:0.5, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${COLORS.border}` }}>
              {art.title}
            </div>
            {art.content.map((para, j) => (
              <p key={j} style={{ color: para.startsWith("⚠️") ? COLORS.amber : COLORS.text, fontSize:13, lineHeight:1.7, marginBottom:8 }}>
                {para}
              </p>
            ))}
          </div>
        ))}

        <div style={{ background:COLORS.card2, borderRadius:10, padding:"12px 16px", marginTop:10 }}>
          <div style={{ color:COLORS.muted, fontSize:11, textAlign:"center", lineHeight:1.8 }}>
            Version du 15 mai 2026<br/>
            Contact : contact@oddrix.fr
          </div>
        </div>

        <button onClick={onClose} style={{ background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:800, cursor:"pointer", width:"100%", marginTop:20 }}>
          ✓ J'ai lu et j'accepte les CGV
        </button>
      </div>
    </div>
  );
}

// ── Écran Connexion / Inscription ─────────────────────────────────────────
// Email admin — accès permanent gratuit
const ADMIN_EMAIL = "contact@oddrix.fr";

// ── Modal générique pour docs légaux ─────────────────────────────────────
function LegalModal({ title, subtitle, accentColor=COLORS.teal, sections, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.93)", zIndex:210, display:"flex", flexDirection:"column" }}>
      <div style={{ background:COLORS.card, borderBottom:`1px solid ${COLORS.border}`, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:16 }}>{title}</div>
          <div style={{ color:COLORS.muted, fontSize:11, marginTop:2 }}>{subtitle}</div>
        </div>
        <button onClick={onClose} style={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, color:COLORS.text, borderRadius:8, padding:"8px 14px", fontWeight:700, fontSize:14, cursor:"pointer" }}>✕ Fermer</button>
      </div>
      <div style={{ overflowY:"auto", flex:1, padding:"20px 16px 40px" }}>
        {sections.map((s,i)=>(
          <div key={i} style={{ marginBottom:22 }}>
            <div style={{ color:accentColor, fontWeight:800, fontSize:13, letterSpacing:0.5, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${COLORS.border}` }}>
              {s.title}
            </div>
            {s.content.map((para,j)=>(
              <p key={j} style={{ color:COLORS.text, fontSize:13, lineHeight:1.7, marginBottom:8 }}>{para}</p>
            ))}
            {s.bullets && s.bullets.map((b,j)=>(
              <div key={j} style={{ display:"flex", gap:8, padding:"4px 0", color:COLORS.muted, fontSize:13, lineHeight:1.5 }}>
                <span style={{color:accentColor, flexShrink:0}}>•</span>{b}
              </div>
            ))}
          </div>
        ))}
        <div style={{ background:COLORS.card2, borderRadius:10, padding:"12px 16px", marginTop:10, textAlign:"center" }}>
          <div style={{ color:COLORS.muted, fontSize:11, lineHeight:1.8 }}>
            Version du 16 mai 2026 — Oddrix<br/>Contact : contact@oddrix.fr
          </div>
        </div>
        <button onClick={onClose} style={{ background:accentColor, color:COLORS.bg, border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:800, cursor:"pointer", width:"100%", marginTop:20 }}>
          ✓ J'ai lu et compris
        </button>
      </div>
    </div>
  );
}

function MentionsLegalesModal({ onClose }) {
  const sections = [
    { title:"1. ÉDITEUR DU SERVICE", content:[
      "Damien Rossard — Micro-entrepreneur — Nice (06), France",
      "Email : contact@oddrix.fr — SIRET : [à compléter à l'immatriculation]",
      "Non assujetti à la TVA (franchise en base — art. 293 B du CGI)"
    ]},
    { title:"2. HÉBERGEMENT", content:[
      "Vercel Inc. — 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
      "Contact : privacy@vercel.com — vercel.com"
    ]},
    { title:"3. PROPRIÉTÉ INTELLECTUELLE", content:[
      "L'ensemble des éléments de Oddrix (nom, logo, code, design, contenus) sont la propriété exclusive de Damien Rossard, protégés par le droit français et international.",
      "Toute reproduction non autorisée est interdite et constitue une contrefaçon (art. L.335-2 et suivants du Code de la Propriété Intellectuelle)."
    ]},
    { title:"4. DONNÉES PERSONNELLES", content:[
      "Le traitement de vos données est décrit dans notre Politique de Confidentialité accessible dans l'application.",
      "Pour exercer vos droits RGPD : support@oddrix.fr"
    ]},
    { title:"5. COOKIES & STOCKAGE LOCAL", content:[
      "Oddrix utilise uniquement le stockage local (localStorage) à des fins techniques. Aucun cookie publicitaire, aucun traceur tiers."
    ]},
    { title:"6. RESPONSABILITÉ", content:[
      "Les informations de Oddrix sont fournies à titre indicatif et ne constituent pas des conseils financiers. Damien Rossard ne peut être tenu responsable des pertes financières liées aux paris sportifs."
    ]},
    { title:"7. DROIT APPLICABLE", content:[
      "Droit français — Tribunaux compétents de Nice (06) — Contact : contact@oddrix.fr"
    ]},
    { title:"8. INTERDICTION D'EXTRACTION AUTOMATISÉE", content:[
      "Toute extraction automatisée de données (scraping, bot, spider) est strictement interdite sans autorisation écrite préalable. Tout contrevenant s'expose à des poursuites civiles et pénales."
    ]},
  ];
  return <LegalModal title="⚖️ Mentions Légales" subtitle="Oddrix — Damien Rossard — Nice (06)" accentColor={COLORS.blue} sections={sections} onClose={onClose}/>;
}

function PolitiqueConfModal({ onClose }) {
  const sections = [
    { title:"1. RESPONSABLE DU TRAITEMENT", content:[
      "Damien Rossard — Nice (06) — contact@oddrix.fr"
    ]},
    { title:"2. DONNÉES COLLECTÉES", content:["À l'inscription :"], bullets:[
      "Prénom — personnalisation de l'interface",
      "Pseudo — seule donnée visible publiquement dans les classements",
      "Email — connexion et communications de service (jamais affiché)",
      "Mot de passe — stocké de manière sécurisée",
    ]},
    { title:"3. DONNÉES D'UTILISATION", bullets:[
      "Paris saisis (sport, marché, cote, mise, résultat, date)",
      "Données de bankroll et transactions",
      "Statut d'abonnement",
    ], content:[]},
    { title:"4. FINALITÉS", bullets:[
      "Gestion du compte — Exécution du contrat",
      "Fourniture du service — Exécution du contrat",
      "Emails de service (rappels, renouvellement) — Intérêt légitime",
      "Classements anonymisés — Consentement (choix du pseudo)",
    ], content:["Aucun traitement à des fins publicitaires."]},
    { title:"5. ANONYMISATION DANS LES CLASSEMENTS", content:[
      "Seul votre pseudo est visible par les autres utilisateurs. Votre prénom, email et données financières ne sont jamais partagés.",
      "Nous recommandons de ne pas utiliser votre vrai nom comme pseudo."
    ]},
    { title:"6. PARTAGE DES DONNÉES", content:[
      "Vos données ne sont jamais vendues ni cédées à des tiers.",
      "Sous-traitants techniques : Stripe (paiements), Firebase (authentification), Vercel (hébergement) — tous soumis au RGPD."
    ]},
    { title:"7. CONSERVATION", bullets:[
      "Compte actif : durée de l'abonnement",
      "Après résiliation : 30 jours puis suppression définitive",
      "Données de facturation : 10 ans (obligation légale)",
      "Suppression compte : exécutée sous 72h",
    ], content:[]},
    { title:"8. VOS DROITS (RGPD)", content:["Vous disposez des droits d'accès, rectification, effacement, portabilité et opposition."], bullets:[
      "Exercer vos droits : support@oddrix.fr (réponse sous 30 jours)",
      "Suppression immédiate : Profil → Supprimer mon compte",
      "Réclamation : CNIL — www.cnil.fr — 01 53 73 22 22",
    ]},
    { title:"9. SÉCURITÉ", bullets:[
      "Transmission chiffrée HTTPS/TLS",
      "Mots de passe hashés (non stockés en clair)",
      "Aucune donnée sensible transmise à des tiers non autorisés",
    ], content:[]},
    { title:"10. MINEURS", content:[
      "Oddrix est réservé aux 18 ans et plus. Aucune donnée de mineur n'est collectée sciemment."
    ]},
  ];
  return <LegalModal title="🔒 Politique de Confidentialité" subtitle="Conforme RGPD — Version du 16 mai 2026" accentColor={COLORS.purple} sections={sections} onClose={onClose}/>;
}

// ── Codes promo — à gérer ici facilement ─────────────────────────────────
// extraDays = jours offerts en plus des 7 jours d'essai
// label = affiché à l'utilisateur
const PROMO_CODES = {
  "ODDRIX30":  { extraDays:30,  label:"1 mois offert 🎁",        partner:"Oddrix Launch" },
  "WELCOME14":   { extraDays:14,  label:"14 jours supplémentaires 🎁", partner:"Welcome offer" },
  "PARTENAIRE1": { extraDays:30,  label:"1 mois offert 🎁",        partner:"Partenaire #1" },
  "TIPSTER50":   { extraDays:60,  label:"2 mois offerts 🎁",       partner:"Tipster VIP" },
  "VIP90":       { extraDays:90,  label:"3 mois offerts 🎁",       partner:"VIP Partner" },
};

function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [pseudo, setPseudo]     = useState("");
  const [birthDay, setBirthDay]     = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear]   = useState("");
  const [promoCode, setPromoCode]   = useState("");
  const [promoValid, setPromoValid] = useState(null); // null | object | false
  const [error, setError]           = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [cgvOpen, setCgvOpen]       = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [mlOpen, setMlOpen]         = useState(false);
  const [pcOpen, setPcOpen]         = useState(false);

  const currentYear = new Date().getFullYear();
  const days   = Array.from({length:31}, (_,i)=>String(i+1).padStart(2,"0"));
  const months = [
    {v:"01",l:"Janvier"},{v:"02",l:"Février"},{v:"03",l:"Mars"},{v:"04",l:"Avril"},
    {v:"05",l:"Mai"},{v:"06",l:"Juin"},{v:"07",l:"Juillet"},{v:"08",l:"Août"},
    {v:"09",l:"Septembre"},{v:"10",l:"Octobre"},{v:"11",l:"Novembre"},{v:"12",l:"Décembre"}
  ];
  const years = Array.from({length:100}, (_,i)=>String(currentYear - 18 - i));

  const inputStyle = {
    width:"100%", background:COLORS.card2, border:`1px solid ${COLORS.border}`,
    borderRadius:10, padding:"14px", color:COLORS.text, fontSize:15,
    fontFamily:"inherit", boxSizing:"border-box", outline:"none",
  };

  const checkPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    const promo = PROMO_CODES[code];
    setPromoValid(promo || false);
  };

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    if (!email.includes("@")) { setError("Adresse email invalide."); return; }
    if (password.length < 6) { setError("Mot de passe minimum 6 caractères."); return; }

    if (mode==="register") {
      if (!name.trim())   { setError("Veuillez entrer votre prénom."); return; }
      if (!pseudo.trim()) { setError("Veuillez choisir un pseudo."); return; }
      if (pseudo.trim().length < 3) { setError("Le pseudo doit faire au moins 3 caractères."); return; }
      if (/\s/.test(pseudo.trim())) { setError("Le pseudo ne peut pas contenir d'espaces."); return; }
      if (!birthDay || !birthMonth || !birthYear) { setError("Veuillez renseigner votre date de naissance."); return; }
      const birth = new Date(`${birthYear}-${birthMonth}-${birthDay}`);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear() - (
        today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0
      );
      if (isNaN(birth.getTime())) { setError("Date de naissance invalide."); return; }
      if (age < 18) { setError("Vous devez avoir 18 ans ou plus pour vous inscrire."); return; }

      try {
        // Créer le compte Firebase Auth
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid  = cred.user.uid;

        const isAdmin     = email === ADMIN_EMAIL;
        const promoApplied = promoValid && promoValid !== false ? promoValid : null;
        const totalDays   = 7 + (promoApplied ? promoApplied.extraDays : 0);

        const profile = {
          uid,
          name:       name.trim(),
          pseudo:     pseudo.trim(),
          email,
          birthDate:  `${birthYear}-${birthMonth}-${birthDay}`,
          createdAt:  new Date().toISOString(),
          trialEnd:   new Date(Date.now() + totalDays*24*60*60*1000).toISOString(),
          subscribed: isAdmin,
          isAdmin,
          plan:       isAdmin ? "admin" : null,
          promoCode:  promoApplied ? promoCode.trim().toUpperCase() : null,
          promoLabel: promoApplied ? promoApplied.label : null,
          bankroll:   500,
          transactions: [{ type:"Dépôt", montant:500, date:new Date().toISOString().slice(0,10) }],
        };

        // Sauvegarder le profil dans Firestore
        await setDoc(doc(db, "users", uid), profile);
        onAuth(cred.user, true);
      } catch(e) {
        console.error("Firebase error:", e.code, e.message);
        if (e.code === "auth/email-already-in-use") setError("Cet email est déjà utilisé.");
        else if (e.code === "auth/invalid-email") setError("Adresse email invalide.");
        else if (e.code === "auth/weak-password") setError("Mot de passe trop faible (6 caractères min.).");
        else if (e.code === "auth/network-request-failed") setError("Erreur réseau. Vérifiez votre connexion.");
        else if (e.code === "permission-denied") setError("Erreur de permissions Firestore. Contactez le support.");
        else setError(`Erreur: ${e.code || e.message}`);
      }
    } else {
      // Connexion
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        onAuth(cred.user, false);
      } catch(e) {
        setError("Email ou mot de passe incorrect.");
        console.error(e);
      }
    }
  };

  return (
    <div style={{ background:COLORS.bg, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, maxWidth:480, margin:"0 auto" }}>
      {/* Logo */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:36 }}>
        <LogoSVG size={90}/>
        <div style={{ marginTop:14, fontWeight:900, fontSize:28, letterSpacing:-1 }}>
          <span style={{ color:COLORS.text }}>Odd</span><span style={{ color:COLORS.green }}>rix</span>
        </div>
        <div style={{ color:COLORS.muted, fontSize:11, letterSpacing:2, textTransform:"uppercase", marginTop:4 }}>Statistiques · Analyses · Performance</div>
      </div>

      {/* Card */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:20, padding:24, width:"100%" }}>
        {/* Toggle */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", background:COLORS.card2, borderRadius:10, padding:4, marginBottom:24 }}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");}} style={{
              background: mode===m ? COLORS.green : "transparent",
              color: mode===m ? COLORS.bg : COLORS.muted,
              border:"none", borderRadius:8, padding:"10px", fontWeight:700, fontSize:14, cursor:"pointer"
            }}>{m==="login"?"Connexion":"Inscription"}</button>
          ))}
        </div>

        {mode==="register" && (<>
          {/* Prénom */}
          <div style={{ marginBottom:14 }}>
            <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>PRÉNOM</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Votre prénom" style={inputStyle}/>
          </div>
          {/* Pseudo */}
          <div style={{ marginBottom:14 }}>
            <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>
              PSEUDO <span style={{ color:COLORS.teal, fontWeight:400 }}>— visible dans les classements</span>
            </label>
            <input value={pseudo} onChange={e=>setPseudo(e.target.value.replace(/\s/g,""))} placeholder="ex: BetMaster69 (sans espaces)" style={{ ...inputStyle, borderColor: pseudo.length>=3?`${COLORS.green}66`:COLORS.border }}/>
            <div style={{ color:COLORS.muted, fontSize:11, marginTop:4 }}>🔒 Votre email reste strictement confidentiel (RGPD)</div>
          </div>
          {/* Date de naissance */}
          <div style={{ marginBottom:14 }}>
            <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>
              DATE DE NAISSANCE <span style={{ color:COLORS.amber, fontWeight:400 }}>— 18 ans requis</span>
            </label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr 1fr", gap:8 }}>
              <select value={birthDay} onChange={e=>setBirthDay(e.target.value)} style={{ ...inputStyle, padding:"12px 8px" }}>
                <option value="">Jour</option>
                {days.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <select value={birthMonth} onChange={e=>setBirthMonth(e.target.value)} style={{ ...inputStyle, padding:"12px 8px" }}>
                <option value="">Mois</option>
                {months.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
              <select value={birthYear} onChange={e=>setBirthYear(e.target.value)} style={{ ...inputStyle, padding:"12px 8px" }}>
                <option value="">Année</option>
                {years.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ color:COLORS.muted, fontSize:11, marginTop:4 }}>🔒 Votre date de naissance n'est jamais affichée publiquement</div>
          </div>

          {/* Code promo */}
          <div style={{ marginBottom:14 }}>
            <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>
              CODE PROMO <span style={{ color:COLORS.muted, fontWeight:400 }}>— optionnel</span>
            </label>
            <div style={{ display:"flex", gap:8 }}>
              <input
                value={promoCode}
                onChange={e=>{ setPromoCode(e.target.value.toUpperCase()); setPromoValid(null); }}
                placeholder="Ex: ODDRIX30"
                style={{ ...inputStyle,
                  borderColor: promoValid===false ? COLORS.red : promoValid ? COLORS.green : COLORS.border,
                  color: promoValid ? COLORS.green : COLORS.text,
                  fontWeight: promoValid ? 700 : 400,
                  letterSpacing: promoCode ? 1 : 0,
                  flex:1
                }}
              />
              <button
                onClick={checkPromo}
                style={{ background: COLORS.card2, border:`1px solid ${COLORS.border}`, color:COLORS.muted, borderRadius:10, padding:"0 16px", fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0 }}
              >
                Vérifier
              </button>
            </div>
            {/* Feedback code promo */}
            {promoValid && promoValid !== false && (
              <div style={{ marginTop:8, background:`${COLORS.green}18`, border:`1px solid ${COLORS.green}44`, borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:20 }}>🎁</span>
                <div>
                  <div style={{ color:COLORS.green, fontWeight:800, fontSize:14 }}>Code valide ! {promoValid.label}</div>
                  <div style={{ color:COLORS.muted, fontSize:11, marginTop:2 }}>
                    Votre essai gratuit passe à {7 + promoValid.extraDays} jours au lieu de 7
                  </div>
                </div>
              </div>
            )}
            {promoValid === false && (
              <div style={{ marginTop:8, background:`${COLORS.red}18`, border:`1px solid ${COLORS.red}44`, borderRadius:8, padding:"8px 14px", color:COLORS.red, fontSize:13 }}>
                ❌ Code promo invalide ou expiré
              </div>
            )}
          </div>
        </>)}

        {/* Email */}
        <div style={{ marginBottom:14 }}>
          <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>EMAIL</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" style={inputStyle}/>
        </div>

        {/* Mot de passe */}
        <div style={{ marginBottom:20, position:"relative" }}>
          <label style={{ color:COLORS.muted, fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>MOT DE PASSE</label>
          <div style={{ position:"relative" }}>
            <input type={showPwd?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 6 caractères" style={{ ...inputStyle, paddingRight:46 }}/>
            <button onClick={()=>setShowPwd(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:COLORS.muted, cursor:"pointer", fontSize:16 }}>
              {showPwd?"🙈":"👁"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background:`${COLORS.red}18`, border:`1px solid ${COLORS.red}44`, borderRadius:8, padding:"10px 14px", color:COLORS.red, fontSize:13, marginBottom:16 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSubmit} style={{
          background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:12,
          padding:"15px", fontSize:16, fontWeight:800, cursor:"pointer", width:"100%"
        }}>{mode==="login" ? "Se connecter →" : "Créer mon compte →"}</button>

        {mode==="login" && (
          <button onClick={()=>setForgotOpen(true)} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:13, cursor:"pointer", width:"100%", marginTop:12, textDecoration:"underline" }}>
            Mot de passe oublié ?
          </button>
        )}

        {mode==="register" && (
          <div style={{ marginTop:16, background:`${COLORS.teal}12`, border:`1px solid ${COLORS.teal}33`, borderRadius:10, padding:"12px 14px" }}>
            <div style={{ color:COLORS.teal, fontWeight:700, fontSize:13 }}>🎁 7 jours gratuits inclus</div>
            <div style={{ color:COLORS.muted, fontSize:12, marginTop:3 }}>Puis 7,99 €/mois — Annulable à tout moment</div>
          </div>
        )}
      </div>

      <div style={{ color:COLORS.muted, fontSize:11, marginTop:20, textAlign:"center", lineHeight:2 }}>
        En vous inscrivant, vous acceptez nos{" "}
        <span onClick={()=>setCgvOpen(true)} style={{ color:COLORS.green, textDecoration:"underline", cursor:"pointer", fontWeight:700 }}>CGV</span>,{" "}
        notre{" "}
        <span onClick={()=>setPcOpen(true)} style={{ color:COLORS.purple, textDecoration:"underline", cursor:"pointer", fontWeight:700 }}>Politique de Confidentialité</span>{" "}
        et les{" "}
        <span onClick={()=>setMlOpen(true)} style={{ color:COLORS.blue, textDecoration:"underline", cursor:"pointer", fontWeight:700 }}>Mentions Légales</span>.<br/>
        Jeu responsable — 18 ans minimum.
      </div>

      {cgvOpen    && <CGVModal onClose={()=>setCgvOpen(false)}/>}
      {forgotOpen && <ForgotPasswordModal onClose={()=>setForgotOpen(false)}/>}
      {mlOpen     && <MentionsLegalesModal onClose={()=>setMlOpen(false)}/>}
      {pcOpen     && <PolitiqueConfModal onClose={()=>setPcOpen(false)}/>}
    </div>
  );
}

// ── Écran Abonnement expiré ───────────────────────────────────────────────
function PaywallScreen({ user, onSubscribe, onLogout }) {
  const plans = [
    { id:"monthly", label:"Mensuel",   price:"7,99 €", period:"/mois",  badge:null,         savings:null },
    { id:"yearly",  label:"Annuel",    price:"4,99 €", period:"/mois",  badge:"🔥 -38%",    savings:"Soit 59,88 €/an" },
  ];
  const [selected, setSelected] = useState("yearly");

  return (
    <div style={{ background:COLORS.bg, minHeight:"100vh", padding:24, maxWidth:480, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32 }}>
        <LogoSVG size={40}/>
        <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.muted, borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer" }}>Déconnexion</button>
      </div>

      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ fontSize:44, marginBottom:8 }}>⏰</div>
        <div style={{ fontWeight:900, fontSize:22, marginBottom:8 }}>Votre essai gratuit est terminé</div>
        <div style={{ color:COLORS.muted, fontSize:14, lineHeight:1.6 }}>Continuez à suivre vos paris et améliorer votre ROI avec Oddrix Premium.</div>
      </div>

      {/* Features */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:20, marginBottom:24 }}>
        <div style={{ fontWeight:700, marginBottom:14, color:COLORS.teal }}>✨ Tout inclus dans Premium</div>
        {[
          "📊 Statistiques avancées illimitées",
          "🎯 Analyse de style de jeu & conseils IA",
          "📈 Suivi bankroll & évolution",
          "🏆 Classement entre joueurs",
          "🎰 ROI par marché, bookmaker, sport",
          "💾 Sauvegarde automatique de vos paris",
        ].map((f,i)=>(
          <div key={i} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom: i<5?`1px solid ${COLORS.border}`:"none", color:COLORS.text, fontSize:14 }}>
            <span>{f}</span>
          </div>
        ))}
      </div>

      {/* Plans */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
        {plans.map(p=>(
          <div key={p.id} onClick={()=>setSelected(p.id)} style={{
            background: selected===p.id ? `${COLORS.green}15` : COLORS.card,
            border: `2px solid ${selected===p.id ? COLORS.green : COLORS.border}`,
            borderRadius:14, padding:16, cursor:"pointer", position:"relative", textAlign:"center"
          }}>
            {p.badge && <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:COLORS.amber, color:COLORS.bg, borderRadius:10, padding:"2px 10px", fontSize:11, fontWeight:800, whiteSpace:"nowrap" }}>{p.badge}</div>}
            <div style={{ color:COLORS.muted, fontSize:12, fontWeight:600, marginBottom:6 }}>{p.label}</div>
            <div style={{ color: selected===p.id ? COLORS.green : COLORS.text, fontWeight:900, fontSize:22 }}>{p.price}</div>
            <div style={{ color:COLORS.muted, fontSize:12 }}>{p.period}</div>
            {p.savings && <div style={{ color:COLORS.teal, fontSize:11, marginTop:4 }}>{p.savings}</div>}
          </div>
        ))}
      </div>

      <button onClick={()=>onSubscribe(selected)} style={{
        background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:12,
        padding:"16px", fontSize:16, fontWeight:800, cursor:"pointer", width:"100%", marginBottom:12
      }}>🚀 Démarrer l'abonnement</button>

      <div style={{ color:COLORS.muted, fontSize:11, textAlign:"center", lineHeight:1.6 }}>
        Paiement sécurisé par Stripe · Annulable à tout moment<br/>Sans engagement — Résiliation en 1 clic
      </div>
    </div>
  );
}

// ── App principale ────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]             = useState(null);
  const [screen, setScreen]         = useState("loading");
  const [showSplash, setShowSplash] = useState(false);
  const [isNewUser, setIsNewUser]   = useState(false);
  const [tab, setTab]               = useState(0);
  const [bets, setBets]             = useState([]);
  const [showAdd, setShowAdd]       = useState(false);

  // ── Charger le profil Firestore ──────────────────────────────────────────
  const loadUserProfile = async (firebaseUser, isNew=false) => {
    try {
      const docRef  = doc(db, "users", firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      let profile;

      if (docSnap.exists()) {
        profile = docSnap.data();
      } else {
        // Nouveau profil — créé par AuthScreen, on attend
        setScreen("auth");
        return;
      }

      setUser({ ...profile, uid: firebaseUser.uid });
      // Charger les paris
      const betsRef  = collection(db, "users", firebaseUser.uid, "bets");
      const betsSnap = await getDocs(betsRef);
      const userBets = betsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBets(userBets);
      // Publier les stats initiales dans le classement
      const profileForLB = { ...profile, uid: firebaseUser.uid };
      const activeBets = userBets.filter(b => b.resultat !== "en cours");
      const s = calcStats(activeBets);
      if (s.total > 0 && profile.pseudo) {
        setDoc(doc(db, "leaderboard", firebaseUser.uid), {
          pseudo:  profile.pseudo,
          paris:   s.total,
          wins:    s.won,
          roi:     parseFloat(s.roi.toFixed(1)),
          profit:  parseFloat(s.benefice.toFixed(0)),
          updatedAt: new Date().toISOString(),
        }).catch(()=>{});
      }

      const trialEnd  = new Date(profile.trialEnd);
      const hasAccess = profile.subscribed || trialEnd > new Date();

      setIsNewUser(isNew);
      setShowSplash(true);
      setTimeout(() => {
        setShowSplash(false);
        setScreen(isNew ? "onboarding" : (hasAccess ? "app" : "paywall"));
      }, 11000);
    } catch(e) {
      console.error("Erreur chargement profil:", e);
      setScreen("auth");
    }
  };

  // ── Écouter l'état Firebase Auth ─────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUserProfile(firebaseUser, false);
      } else {
        setScreen("auth");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = (u, isNew=false) => {
    // Appelé après inscription/connexion réussie dans AuthScreen
    loadUserProfile(u, isNew);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setBets([]);
    setScreen("auth");
  };

  const handleSubscribe = async (plan) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        subscribed: true, plan, subscribedAt: new Date().toISOString()
      });
      setUser(prev => ({ ...prev, subscribed: true, plan }));
      setScreen("app");
    } catch(e) { console.error(e); }
  };

  const addBet = async (bet) => {
    if (!user?.uid) return;
    try {
      const betRef = doc(collection(db, "users", user.uid, "bets"));
      const newBet = { ...bet, id: betRef.id };
      await setDoc(betRef, newBet);
      const updatedBets = [...bets, newBet];
      setBets(updatedBets);
      publishLeaderboard(updatedBets, user);
    } catch(e) { console.error("Erreur ajout pari:", e); }
  };


  // ── Publier les stats dans le classement global ──────────────────────────
  const publishLeaderboard = async (updatedBets, currentUser) => {
    if (!currentUser?.uid || !currentUser?.pseudo) return;
    const activeBets = updatedBets.filter(b => b.resultat !== "en cours");
    const s = calcStats(activeBets);
    try {
      await setDoc(doc(db, "leaderboard", currentUser.uid), {
        pseudo:  currentUser.pseudo,
        paris:   s.total,
        wins:    s.won,
        roi:     parseFloat(s.roi.toFixed(1)),
        profit:  parseFloat(s.benefice.toFixed(0)),
        updatedAt: new Date().toISOString(),
      });
    } catch(e) { console.error("Erreur publication classement:", e); }
  };

  const delBet = async (id) => {
    if (!user?.uid) return;
    try {
      await setDoc(doc(db, "users", user.uid, "bets", id), { deleted: true }, { merge: true });
      const updatedBets = bets.filter(b => b.id !== id);
      setBets(updatedBets);
      publishLeaderboard(updatedBets, user);
    } catch(e) { console.error("Erreur suppression pari:", e); }
  };

  const updateBetResult = async (id, newResult) => {
    const bet = bets.find(b => b.id === id);
    if (!bet) return;
    const gain = newResult === "gagné" ? parseFloat((bet.mise * bet.cote).toFixed(2)) : newResult === "perdu" ? -bet.mise : 0;
    const updated = { ...bet, resultat: newResult, gain };
    const updatedBets = bets.map(b => b.id === id ? updated : b);
    setBets(updatedBets);
    publishLeaderboard(updatedBets, user);
    if (user?.uid) {
      try {
        await setDoc(doc(db, "users", user.uid, "bets", String(id)), { resultat: newResult, gain }, { merge: true });
      } catch(e) { console.error("Erreur mise à jour pari:", e); }
    }
  };

  // Jours restants d'essai
  const trialDaysLeft = user ? Math.max(0, Math.ceil((new Date(user.trialEnd) - new Date()) / (1000*60*60*24))) : 0;

  const tabs = [
    { icon:"🏠", label:"Accueil" },
    { icon:"📊", label:"Stats" },
    { icon:"📋", label:"Paris" },
    { icon:"🔍", label:"Analyse" },
    { icon:"👤", label:"Profil" },
    { icon:"🏆", label:"Classe." },
    { icon:"🆘", label:"Aide" },
  ];

  if (screen==="loading")    return <div style={{ background:"#0d1117", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}><LogoSVG size={80}/></div>;
  if (showSplash) return <SplashScreen userName={user?.name} isNew={isNewUser}/>;
  if (screen==="onboarding") return <Onboarding onDone={()=>{ const trialEnd=new Date(user.trialEnd); setScreen(user.subscribed||trialEnd>new Date()?"app":"paywall"); }}/>;
  if (screen==="auth")       return <AuthScreen onAuth={handleAuth}/>;
  if (screen==="paywall")    return <PaywallScreen user={user} onSubscribe={handleSubscribe} onLogout={handleLogout}/>;

  return (
    <div style={{ background:COLORS.bg, minHeight:"100vh", color:COLORS.text, fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", maxWidth:480, margin:"0 auto", paddingBottom:80 }}>
      {/* Header */}
      <div style={{ background:COLORS.card, borderBottom:`1px solid ${COLORS.border}`, padding:"12px 20px 10px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <LogoSVG size={40}/>
            <div>
              <div style={{ fontWeight:900, fontSize:20, letterSpacing:-0.5, lineHeight:1.1 }}>
                <span style={{ color:COLORS.text }}>Odd</span><span style={{ color:COLORS.green }}>rix</span>
              </div>
              <div style={{ color:COLORS.muted, fontSize:9, letterSpacing:1.5, textTransform:"uppercase", marginTop:2 }}>Statistiques · Analyses · Performance</div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
            {user?.isAdmin && (
              <span style={{ background:`${COLORS.purple}22`, color:COLORS.purple, border:`1px solid ${COLORS.purple}44`, borderRadius:8, padding:"3px 8px", fontSize:10, fontWeight:700 }}>
                👑 Admin
              </span>
            )}
            {!user?.isAdmin && !user?.subscribed && trialDaysLeft > 0 && (
              <span style={{ background:`${COLORS.amber}22`, color:COLORS.amber, border:`1px solid ${COLORS.amber}44`, borderRadius:8, padding:"3px 8px", fontSize:10, fontWeight:700 }}>
                ⏳ {trialDaysLeft}j gratuit{trialDaysLeft>1?"s":""}
              </span>
            )}
            {!user?.isAdmin && user?.subscribed && (
              <span style={{ background:`${COLORS.green}18`, color:COLORS.green, border:`1px solid ${COLORS.green}33`, borderRadius:8, padding:"3px 8px", fontSize:10, fontWeight:700 }}>
                ✅ Premium
              </span>
            )}
            <div style={{ color:COLORS.muted, fontSize:10 }}>@{user?.pseudo || user?.name}</div>
          </div>
        </div>
      </div>

      {/* Bannière fin d'essai proche */}
      {!user?.subscribed && trialDaysLeft <= 2 && trialDaysLeft > 0 && (
        <div onClick={()=>setScreen("paywall")} style={{ background:`${COLORS.amber}18`, borderBottom:`1px solid ${COLORS.amber}44`, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
          <span style={{ color:COLORS.amber, fontSize:13, fontWeight:600 }}>⚠️ Essai se termine dans {trialDaysLeft} jour{trialDaysLeft>1?"s":""}</span>
          <span style={{ color:COLORS.amber, fontSize:12, fontWeight:700 }}>S'abonner →</span>
        </div>
      )}

      {/* Content */}
      <div style={{ padding:"16px 16px 0" }}>
        {tab===0 && <Dashboard bets={bets} onAddBet={()=>setShowAdd(true)}/>}
        {tab===1 && <Statistics bets={bets}/>}
        {tab===2 && <BetsList bets={bets} onAdd={()=>setShowAdd(true)} onDelete={delBet} onUpdate={updateBetResult}/>}
        {tab===3 && <Analysis bets={bets}/>}
        {tab===4 && <Profile bets={bets} user={user} onLogout={handleLogout} onSubscribe={()=>setScreen("paywall")}/>}
        {tab===5 && <Leaderboard bets={bets} user={user}/>}
        {tab===6 && <Help user={user}/>}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:COLORS.card, borderTop:`1px solid ${COLORS.border}`, display:"flex", zIndex:50 }}>
        {tabs.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{
            flex:1, background:"transparent", border:"none", padding:"10px 0 8px",
            cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2,
            borderTop: tab===i ? `2px solid ${COLORS.green}` : "2px solid transparent",
            transition:"border-color .2s"
          }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ color: tab===i ? COLORS.green : COLORS.muted, fontSize:9, fontWeight:tab===i?700:400 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {showAdd && <AddBetModal onSave={addBet} onClose={()=>setShowAdd(false)}/>}
    </div>
  );
}
