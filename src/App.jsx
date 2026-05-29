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
const ODDRIX_LOGO = "data:image/png;base64,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OZaN/oHtaCsX0+CTce2UNKDZT7py9H0fhXw23R9Iiqyr4LIojpHNZtKqgzEHMY9HVZitBoP6elarUQqNZhzFAmzWGwpaNAzEQmDq5CnYtr0XmzZtQltHO/KFLAgU1GhZloL1HAft5ZLaF9cGYwTZrIuJE7tx6IKDZz355JOrXUcx5N599juvXbNmzScefvjhShgwnH322b9YuHDhh7/61a+SI4444vL3vOc9X+no6MCqVavw05/+lCxatAi/+tWv5Pz589FsNlNTwve///3k3e86S773vedgeGgQ+Xz+ozfddBM+85nPkYmTJqFaqSuNOoOBMqDWqKMR1GBYBNlMFnEzAKMElmWAUMUkazYaoNTAL35x1Y8efnDRpz/+ifPlZRdfJr/wxS+SocEKPvKRj5CnnloOw1BDrP927vunbdu2BV/4whcIERK///3v5UknnrTql7/8JQmbEe79+4OvW7psKUzTXn3AAQfgwPlH4ne/+92T9939MASAb3zj6+TJJ5+UBx98IILA21gu7zdtv/32w0knnfS5fF75fU2ZMuW8VatWgXOOc845549tbW248847MXv2AfB8D/vPmjHBMCl+9eurzpg8ZaI8861nyAcX/YOYFuvIZB18/RtKM/DRRx+9dLgyiM09G9H06nBtE7mMun/yWRdcRCBUYvHixbjlllvI0NAQNm3ahPaONoSRjzAKYNkWOCQiobyxxiMj7EkA2pOAsuekqp1XXLuqrPZm//fkGMa+znipg8D/VluJ3T0WTaLbGXRnmiaiOEYcRThkwQLMmjXrgiCMtuTzuQ2VgcFH4jiGY9uQUuL2228/u1argTElvKoVGETMQehID0oHGcrMcRUYWi/4WIZRa28pCv2UFaYDTSu8pVUkWimxurHLGEOz3oDONt2MggAbjUZKS26dkg+CAELItOprNpsI/QC5XC6FQYaGhiClRLFYRK1WS7ctpeqztLW1wXEcDA4OwnEcVCsKwrIsNScVxlGqss05R8xHJF9oi47Z2IrSZKqCrVdrmDZtGl530kn3/OMf/3jd1q1bESf+TF/43Oflxo0br7n6mt+cK7nAe9733j+deOKJb/385z9POOcYHh7Gf37xInnSSSfhi1/84lGLFi1awhhDR0fHpB//+Mer/u3f/o08+uijEEJg0qRJ7znvvPPe86Y3vYkUi0V84hOf+PBjjz2GIAhwySWXfOXvf/87rrrqqve9733v++1pp50m//GPf5A4jvHII4/gT3/6kxMEQaBhoyOPPhI/ueLHq77zne/OeeMb3jCJc17P5/LwvRgNP8C06VOxbXsP/LCOQ448AG9/12lyxZqnPnHLjXf/j408GFc9v7DWROA303tmzZp1n172zHN4+qllP54/78D/KOWLiKIY73rX2fLYYzd+L5fLHfHLX/7yJEkl7JyDN7zx1P27uib82/yDD8Itf7n9Pwzbgem4+P6Pfizb2tqwevVqfPVrXyO+F2Ll6vUft2wHhgkUi0Vs3LgRXV2dR/m+v/boo4+edt1118n29nZce+21A8uWLcN73/tebN68GcuXL//mRRd9/ou33347Nm/e/L358w+60LIMHH/88VsnTZqEa665Rra3tyd9ugISBAD3338/HnroIZx++um455570NfXh23btuF973ufvPjii8kRRxyB97znPfIb3/4WaTabqFar3sqVK3HAAQdg+vTp2La9N62EgyBA/+Aw2tvbISKxyzVidyTF9oUf0s4C4djt7GlA3Buobnerxj0KSK+Uiva/WhDa0QVM/57URDLpHcgUsrPShTGXz6Ozq9uuVGuLACCTcec1DOMRzjnWrlunyA3Q1ggK0jIYAWwTJKHj6qFZZV/NELcQElpp2ToQpJUERij8rQZ/2l6CUsBgSseMxxwSI8Oevu+n1uka3tBViK6QtvdtS+dlKpUhxHEWpYTw4DgOglAFVlUZqe1NnToVPIoRxQEGBgZAKcWsWbOQzWaxYsUKnHTSSbNKpdJCQohpGEY5l8sdsWTJkresWrUKb3vb2774+te//hsGs7B48eJFN99884mVSkUxzChL6bqu7ajrQV7ILhJCJOKdFJ434g112mmnrfmPf//3mYceeqj8+Mc/TizLwvDgII488kiccOJx71+zbvUn77rrrmpHW/mM2bP3T+admthv6hTMnj0bcRzjzW9+8+MPPfQQEZyDAFTLzRgEkJTga5ddShae9Fr52Qs+I5ctW/btUr6An/zwR8SrN7CtZwuWLX3qz3/8/R+uvfba667N5ZTNRltbG1asWNHz+OOPB93d3RgeHgaoxPb+Prz+DafNfvqZZ6c+/dQzmwaGanCcIkAZ8kUXm7f1QJgN2EWOhWfOe6w8fQhz2vnFx9RK/3PfjcNwYgJKgUKhBIMkrEBJ8dEPfVSe+95zcfLJJ+Mb3/jGb2q1BgCKgw46BIcddsSFTc/Dz379a/hCDFV9H1+69NLVxXwBt/3lL7j59lt+MnfuXMSE47e/v/bb/f39NzSbzWe39G2FNICOCaWzvMh/hATAq19zwqe6u7vx9NNPP37QQQcf8dhjS3DVL35Fvv3tb8vHHl0yJYo4spk8hIxx6623fukzn/n0F++7774FYRhuDYLgwvb2dhx55JG4/vrrK9u2bfu54zgzL7jggreffPLJhwkhfMdxEMcC3/3ud8nBBx8sp0+fjmq1jiuvvJL817e/I0888UTZ0dGBJUuWwHUVieSdZ73dfcOpp8hcvoj/+q//+tStf7ntx47jYHh4GIwx5PNZ1Go15NzcLucUd2ft3Bfr6c5gvx2tY3tiW/5igtKOeln7hNTwrxSMXg7IbocXIGFvtY4ajf08TYV2TMU4qlUrQd/23sfb2zpQrQw/3rNxEwYHB2FZFrKJy6iuCnzfh20ZSWZPUssIZa1DYRCAKwlUSA7EPISI1Ti+ZdgAlK6PH3ogksLJ2IAgaDRriEMOytR29PCsJjJQSgFJQQ0GyzBx0EEHgUhg2bPPYHhwCJNn7Y9ZM/efY1nWxEKhcAKIEOVy+bT77rvv1eVyEfPmzfvNzTfffO7g4CD2228/vOtd75InnvgaCCnx8EMP4TfXXEv6erfjsAWHTL3k0q9s/M///E+2ceNGYZomPvShD8n58+dj4cKF5Iwzzli1cOFCDAwMgHOOtrY2fP7znz/K87zHL7jggm/09fVh7Zr1uOiiL53Q1tYmv/e975EwDsBMCs8PYVgmJI0QySZi0VRVHWWgcAFqK5o0Ub4/+XwWRAJOezsOO3zBzCeeeAKTJ0/E3Llz8dxzz8JxHAwN9OHgQxfggk9/uvLQokWkv7//hma9cXYcBWg0Glh4ysm3WqaJn/3sZzde8OlPv2NCdzeeeeYZMMbyANI+muM4GBis4Otf//r073znv9YvXLjwC7/5zW+wfPlyWJaF22+/vfaJT3zire94xzvko0sex09+8hMyMDCAnp4evPvd7558zjnnyHK5jKuuugoXX3oJ+epXv0o++9nPyssu/9rGrJvDNddc13/lz67qtBiDH3pwsw4iEqDRjLFu7apPBsh+WBrDg7mMM8GrYltHl2LcVYYHYRo2Jk6ciMHhYVDDQH9PDy657LJv//Y3v7lo7vz5oMTARV/4Elnx/HLwRDmCUGpXq1W86yMfId/+xjclNRgGBodRLJUKjuti0cMPXrRixYpEJ5HjRz/54blf/vKXfzM8PHhnZ0f7WR/+4Ic+/Ne//g0rV65De3tnnhCC++6/D7fddtv2r371q96TTz5J4jjGjBkzsG3bdtxww01YtOjhp4899thZtVoNhx9x1ETLdPCba64tbdqwEbHgmLX/HHn0Mcc9cf+99+WXPrXs0xk3g4HBYXz3O98j8w868DcA8MD9D+Ld730POfXUU/+wrWfLT+66956Hms0mfvrTn5Kf/exnqNeaCGMFfXueB9u2YTAF7fIoRtZx95ggsDeDr3tTdbSOiIwXEHbVinilvowd7eRLVRm98MTJVzRAkd34PJKM2493UYUg4wrQk5YeE008hngYYPOG9XBdF0HTUzpZlSqIpBBcIBaqJxPHMaIghG1asExFk2ZEKm+cKMDw8DA8z0NHRwc6OztRazZQypcgiIBt2HCyDpYvW46YR5g1YxZOeM0J9z3+yOMnLX9+OWQscf55H71v/+n7v1azvwghKJVK+PKXv0w+8YlPyEKhgM9+9rNk5n6z8LXLLpdz5s2FxQwsf34FLrv4EnLYkUfc/oXPfu6Ng4ODCQwo0dXVhfVrVh/qOM7ML37+C+//8403ndtWLOF73/mu7O7uxiOPPAJiMLzvnHfj8MMPl2ef9U5SrQ1vSqbzhaYyK0p6mMKFS5YswRe+8AXS19eXKF4P4QMf+MDFUkqcf94nyMrnV+I3v/ottvVtAzMp/KgOHhNkMp2QLIaV43CcJj503huXdXQWD/rzjQ+Q++7agqJrIqpDDWYaBiiR8JtNvOpVr5p4xKEL8MEPfpicd95H5TnnnC0/c+FnSXt7O9rby/jrbbfiuOOOw6f+/RNrV61d83Ep4rMtw0Ahn8WZZ5zx5iWPPoIf/+gnZ53zzrPkG05ZuGjZU8tOAI+bGduBxQwUi2VwztHZ0Y4777xrw+tPuxeHHXYYfnbVLwgYRcP38LVvfqNwz/334bTTTpMnnXQSZs+eLT/4wQ+ScrmMxx9/HD/4wQ+IZVno6dkECuDppc/i3Pd9gGSzGVz4mc9V3/nOszpuvuVW9PRsVlI+EqDSBHwfj9+//tHT8yd/ULKC9fjdz2/LZ5XgKQRBNqPcdyvVKiZM6sb5519KHlr0MAgFpFAK9UHk42Pnf1TWajVMnToVV1/zW8IktdqKbdiysQc/v/IX5Pe//72875775w8MDCzv7OxGLlcApQYmTZqMzZs3449/uOGaid2Tzv/3j3/yTsMwcNtf/oYrrriCSAArnl91jWmu78zmcvj5Vb/othxbdnR14r4H7n/tvfffF2eyWVx8yWXEtm089PAjq5c+9SwJwhBvP+udRAIolMqI4hhf+vJXCDMMNBsNPLDoIUKYAcpM3PfAP/DAoofOdVzVh1zx/CqseH7V2Zah5tQM08Yzzz6XEGNoSpZxLBeU0EQRXYIRpd5gGKMZsHtKYtjX6+nYOcCdBbddVUTjBdi9ZQHubhVpvJzVyMvx9VLYAO8o89mTi8G5srmmhEAk0jnq9yJpzkuIcbBcPS3+tjPPuO91r3vda/fbbyq2bNmCX/ziFyc//fTT91155ZVy0qRJ6OnpQRRFaGtrQxiGOPvss8nmzZvxpje9MT7//PPZ4sWL5Uc+8hEy3BjGkYcd/tqZM2cmkkEh1q9fDz2DQylFoVBAtVrF2We9U06fPh1f/uKXPrh9+/bfXnDBBRFjDDde/8fT//nY4+jo6Jj/5S9/6dnLL798+lNPPbWhXq/j7W9/+1nPPPMMpJQ4++yzH50xYwa+8Y1vnPeba373M9tiOOuss8657LLLfnfCCce5lUrFI0T1ytra2lKqe6FQSM9be3s7JkyYgNmzZ2drtVrjsccew/r16y8HcNlPf/pT+ehDj+DPN99KBrb3QRgRAIFsvoh6w4NpMzQG+3HqGQd2TZtZPqhny/onjjvx0CVrVvYduXltHTmzC7Ffg0WV1HSjUcPRRx+1Zf369Vi+/BksWrTop2eeeeb5UyZPgG2byGQyeOKJJ95z//33P/Td7353/aJFi/7GCBAFAY49+lWFjrY2TJo8EV/+0udW9vX14VWvetXxTGkSRtVqFb7vo1arpYPRsRRoNBp49tlnsWXLllQ94KCDDsIDDzyIBx9cRD7+8fN/8aEPfejDnZ2diOMYvb290DM7hUIB3Z0d+NrXviZv/cvt33700ccvmjlzVr5Wq6FSGVbXN2rAb4SgJgGTwOpnqvjVpps/5mQMDA0IlHNFhEGY9twUlKyGuSdPnnyKYbK7HMdJe4k9PT2YMGECJk+eDNM0kc/m5qxc8fz/3HPX3f/d2dGJBx98EBdffPFFlmVNWrdu3fJPfepTpwwODqJcLqNer6fMyx/+8IfHXnnllchkMujt7UU2m4VhGLjiiivObWtrAwAMDg7i4osvJkIIPP/88w9wzuG6Ljo6OqDP53CllmrPWZbSJdRGjhIxbCeTDPiqSWrOlVuymh8S6VyXhqd1b1S9jo6ywRAcLYPqBESM/DxeMHqlWx57sxbu6Xv2hLW3RxXS3py8vZEn39sD3pOLuK+D0ovJZvQckv6MdKAyYXwxqpr5BGK0+Rwlaf/nwAMPnPmR8z722hUrVuDqq6955A1veMMx73//++/94Ac/SK655pqfCiG8t7zlLZ+pVCr49re/3W5Z1sTe3l50dHTgwAMPZA8++CCmTp2KuXPnYunSpfjkJz9JBgYruOzSr3gHH7zAefc57yGK3aZUmfWQKqXKM+if//znr5c/twJ3/v0uUsjn0Gg0MDAwgPnz5y+nlGLjxo0bNmzsAaDUDjo7O2HbNubNm/eqDRs24L777vtZe1sRA4MV3Hnnndedf/75v9tvv/2+tnjx4guTpv+E5cuXb7NtG21tbfA8L5V9KZVK+MEPfiAdx0Gj0cDJJ59M7r77Xnzzm998x3ve854bzzzzDLznve+VP/7JDx/8zg++9+rO7nwy5a8EQuPQxPat1e2b11dWD1fEYpvZh/LAUo69XKJQKCHwmxiu1dE1cRLmHngQwAz87g/XS9u2MWHCBBx6xJHT77nnnvVD1RraOrvedc3v/nDdqW88HSeccBzWrVsLZpo4/MijVklCMTA0jDlz583evHULjj/+eLzq2GMxMFzZ0jVxAt7xrnfKdevWXTJ16tT/vPuue+2HH34YpVIJmWwWhmmi0WzikEMOwS+uukr29vZi3bp1OOmkk/CnP/0JW7ZuRUdnJw497DCc8vrXy3w+j76+Prz1zDPIP598Wnz0o+d94cLPfOELfQOD+Pa3vntgvd4AYxSMmqAWVV5FFIjjGuo1QMoYpWIWIlKK80p5QcC2XTzxxFJccMGFZP369aDUQCaTQxRVsHTp03jf+84l2sBQSol8Po9KpYInn3ySZLNZtLe341e/+tW3k3sBN910091aIT4MwzTxaDabCIIAtVpNnYMErtbjABra1JR+PVis5Zhs20YQBMjllcYfJQYMU0HNUQzwWCYWLwJCSiUUa6iEyzApCFgCdYsk8UPLgDgFSwRiLdN5AfylnlE1ctL6u71hyb0UAgS7qnz25P17ahD4YvfXeDHB6OWuYnY1dLU7dMsXS6fc27+P9STSAYkSuYPXq/8PDg4in88fvW3bNnz/+98n/7j/H/j5z3+OXC6D7X2DuPLKn39cSGDhwoWfiaIId9xx56BpGoNSSrzlLW/50JQpU/DFL36RXHrppXLhwoXywQcfIrZtIuNaKBQKTi6XQy6bSXtd2Ww2HeC87rrryOGHHy5vvPFG2Wg08Mgjj+DKK68k/f396O/vR0dHR6omUSrmMFypw/O8lbrq0QxBvYAce8xRGBoaSoQ5eU3L6QwMDGzTLLparYaOjg5IqSjfS5cuxeWXX06EEKhWq3BdF67r4oYbbrjpuuv+QLo72nHJJZfIY48//sRJ1/8WDa+GiEvkcmVEYQyvEeHhRZvQ1ZU5bPKUCZ9+7MmnT9i+pYGMNQEmtVGrVVEqZuH7PubNmzdhzpw5+NWvfvXXnp6e7/m+v/YDH/jAulNPPXXd3XffTbq7u6EUHoBvf/vbZN68q+W0afthxoyZOP3007ueeOIJXHDBBSQIOAqFDG677Tb5pje9ST7wwANOtVrFySefjCAILiuXy1i9au0HHlz04K9Xrlr1WFdX16sopWhvb8eTTz6J008/nZxzzjm1qVOn5i699NKv3HjjjV+rVqv44Q9/ODmKoj7P86JKpaIqhKE6Lr74UnbVL36F9vZOrFy1BmEYoqOjE57ngTACShl830MUhbAtF5at5HxkBDCYYJaZjghkMhkMDAzg8ccfVwoNrpsGB8uy0Gw21aBo4sRrGAba2toUrJzYznd3d8NxHGzbtg2dnZ0pKzOTySg4OhEsNQwjrYzq9XqawIVhmAoDm6aZ2jwUCgUMDQ0hjmN0d3crK4lYSQQJhBByhE2KxCAQdETzjhEGYpA0mApB0sFpKUfD8RotiMJoVAU0kjAm3k8vkq69L6XNdmW/sysI7sWun/uiCDB2FXB2l4e+t023F+tJ/1LgsvvyS5f8+ibW+5baQRgiGe4lLyBIaFrv8uXLfw/guosuukieffbZWLx48fn/uO/+KzOJCKmqZlSWa5oWJk6ciGq1ihNOePVVy5evwP33/wO33Xb7I2984xuP0ZCexsj9KEQmnwMANBoNSErghQEiIfHEU0txxlvPJG984xv/7cADD/z1qaeeirbODnn++ecTy3UwVK2Ag4AYJuqeD2YyFNva3xgJCWpaWLb8uVtPWnjKGROnTMWGDRvwyU9fIAuFAohhYvnzKy/t7R8AAMydO/eCJ5544gdz587FoYceimXLlkFKoFwup+ewra0Nc+bMwRNPPIHzzz9/28KFC7uvvPLKMyuDA3898MB5WLV2HSqVCorlIiShaDYV0aBU6sTAQB/+/Lvn65nC818LfSBrZ0GlAR5yWKaj1CCyebz7nPduXbV6Lb7/gx+drpmKlu2+9t3vfvf9hWIZt952OzZu6vkGF8D6DZvwve9/f/qCBQsWb9i4Gb+55tpfLF68+KN+wNHWVkKtVsN553+C5PNFbN68Ge86+xzSaDRSWrtlWcjl8/jOd/7r6Hw+j3y+mGjWOVi3bgMuvfTyvL4PlAdUAX/5y1+36PvbTsYE2to6MDw8jE09W9A/UEEYhsjl8onFhwtJJISIwagNaieyVVEILlSSEEcCnIcpI7NWqyVisJk0kGgxX9M0lb5eojOnqhkHnudBCMDzmul9Va8PorOzG41GI5WM0maUrptNxwAMg6Wfnclkks8SqcIFIQT5fD5Vh7csS0lxNZvJgKqVViqSizHPvkw/YzwoXAiAsJG+kA5MrWtf62xeq+K4YRhgBDskDOysUnkp1qfx1tc99UjaV0HoxVRnxu5u5MWezH0Fo+1MNWGvSuYXedH3puk4NuNqPT9S6L8j1Xh7cumTuPDCC8lb3vIWOXv2bHzmM5/56bvf+a6ffvrTnyabNm1KFb2DIIBt22g2m5g/fz4WLFiALVu24Fvf+pYslUpoa2vDa17zmqNvueWWR03TRKlUQjabHfXwDQ4OoqurC5ZlYN68eWg2m/jDH/5wdRTxqydOnCi7urrgum46COr7yjGzUCggydrXBkEwt16v4+abb37L2972NnnFFVfIe+65B4ZhYNq0aXjggQewePFiWJaFv//977jooou+/9a3vvX706dPRz6fx7XXXksAYGhoCAsXLsQ999wjGWPI5XK46KKLvnTTTTdNmDt3rvz0p//jZoNQrFm/DldccQUxDRs8FhgeHka+0IX29nYMDG6Hm3FBmIeoCZSLZVBhw29GyGYyoAyIItUr+PrXv04ajQa6urrUgGiziVtvvfWBG264geRyOVx++eXEMAx0dnaiXq/jr3+9Y8Pf//73Sb4f4sorr/yoZVkol4uoVCpwHAerV68GISob37JlC7LZ7ChNvziOkcvl0qFfSikyGWUCqFU7stlsOoOl1ds55ykbslqpwzRs2JabBi+lPpFRVQcdmUMjYJCCQQpT0d1hgRAln6T7KLpy18evRXtt204li/Qcm+u68P0wDbBaMd00zVRMVldTQRCoii0ZHdB/030hrRnImFKVHx4eTs3y9PY8z0v3R48h+Il6/MgzNdruo/WL0tGakFISIGZjKiM2CtXQ539sUNLzeuPN+ewJ7XlfSZvtSbtj7PzTztbPVnHnl6NKMnZ30X2xWkt7G5R2psu0OyXri4Xkxl7EPe2b0RYttV1VoQkYrv5GJEAUbdxgBh5//J9YsuSfRErggx/8t8+dd95535l30IEHb+zZvIwYDF4YoLe/DyGP0awM45jjj3uCmgaGa1VMmzEdzWYTW7f34uRTFj5y+x1/I47rouF7qdGalv5RKgt1mKaJz33uc/KQQw7Bww8/DNu2sWDBAvz617++qbe3F0IoWaSpU6eOMpJzHGem67ro7u7G2rVr8fGPf5x86Utfkq997WtRr9dxxx134LjjjsM73vGO0//4xz/e/s1vfpOsXr36B4cffvinlyxZMnD77bd3PP/88+joaMMtt9xC7r77bnieh4GBAWSzWVQqFaxevQbvf//7ybRpUxDHMRQDz0ahWEatUUVbWweaDR9hSJFzCwijAESaMBHBkFnEEQdkjDD0EMUBnIyNeq2Oytpq4marvJ8sR/lEZfM5NJpNZBPdOi4FqMHgWmphbe/sAJD44zADHV3dqNfrcDJKlaFeryNXUPp6UVOgrT2REKJKHYFQCkkALjiCKAQzDUQ8hpNx4YeBgssc1TOxHDuFcsvlMorlEgBg+/btaG9vT6oIA4PDA4pBmdyDUihvH0gC13aV+GoYwHUz4CJCmAxI53IFNJvK+7yrawKazWYaXFSPhcOynARebShFcR6jWh1OB6+bTZHahwNKVdxPhotVJU7TwKW1/XTA0wugVhDX79UQX6uCiJaeopSMGn5uHe4eC8GNHfwm1ABAR72m1dZC93tblT5af9Z9p10Nmu7o+X+p/eZe7Nq8pz2uF1O4SClf6Ic09oPGqkXviXz67kVQscfBY3cGwPZVhbQvPZdaFRI0Zq99gcZmW/qBqA5XcOGFFy598xmnL/jhD394fKPReOr9739/ffLkyfjkJz9JVq1aBcYYfvnLX8owDPHe976fHHDAbPz85z+X69evx3nnnUc8LwClwJe+9KXN//7v/z75He94B1m06GH8+te/lF1dXTjnnHMIpRTVahXf+c53ZEdHB8499wNk+vRpePvb337P0UcffXIURbjlllted+edd94rpZKYKRQKeN3rXveWRx999Bbf91GtVjFhwgRMnToVS5YsgRACjYaavZkyZZKiFFdqePvb33rUU0899fjmzZtbFjplQ8EYSyuwOFYDtGruSi1sujIYHBxOG8uuayOTzSOKOJhpKHtwJ5P2oQjYiLcTlJ1FGDQBmqhoJPJCvu8jn8+nUJVm/WnppHq9jmKxmGb6rd+e58F13bRHopW+wzBEsVhMWYzKAkKm1157++iqCUD6GVrRQssntTqf6ipBCqX919nZiVqtpmy5TZooyEsQSRO7DgJGTXAu0jk2dc/FqDeqafWmyQPa+K/13tS/0xVO6/M72oJCpvvbClNrYoq+huO9TivEa724KFIeSbqi0gxFTazQ52xE7V6O8j8amxDq1+i/aV8vZdbME8iOj+rzjodqjGyP7HRovlVDcayb7b5AjFrtI/YmcLwYe4x9gSK94FzlC20vqS7drntUL42n++5WdHQP1b7lOPNIO9KxasWrW43iNDymFiXzBZlU62fWKlW84Q1v6PzABz6wffbs2aCUYv369fjtb397yt///ve79YJx/vnn9wDAN77xjcnz5s3DO9/5zvDee++1HvjHAygWivB9H1OmTMGCBQuOeP755//57PJnsf/M/RELNfRXr9dTgoLOVrVoqt4X/TfNmGrF+E3TTJlTrYFDf4b+1r0ZLYGkoarWYK0X7FZb6dFQy8hCYTDtHqrdQOnoay4Tyq80EsuOGCARQELl9yRY+t4dZbJ7WrWP93oJ/oL7YmzF3SqK27qN1sV27D6MXjB5y2I3Xr5Hk2+S/CsA8MS1dSRp0tvTkk2t12dsINZ+RK3STK2Lna6K9HtbKdbKFVemMJ4Oxvo50UFH31P6/LQyV0Us0/tI30tjoabWY9KJiZTJ+2TybBIDQsaIQp5WSnpf9OC43k6r268KZHKX687eLPi7SoZ3BxUaC7ntbiB6uQLSWIPD1A9pT/DMfRG49sRRdU+hwj3x7KD72H5iVz+PXfRc1x69cI3JngLPRxiFaG9T8ziait3b25t66ujsW0MY+sHknKOjoyNlMAkhEIQBHFsN+9UbdZTb2kZZnmuMXvcRXmj5POI8qxSinfSB17Mqpmmm9s/jZYutC5fOwlsXvNaAM54YauvnmcxSjLGElQiZBDCqbnQeEwAs/T2lyiWV0FjRfmEC0hg38XhBUBlzbcZm0ONh9fqB0wHpBVl364LRcnyt5yLdppSjXjMSGLQ9d4uiefJc0UQCihIFTVFqgNER/UMQkajHk3TxbrVO0ddpVBBqCUxKJ0QkvReZ/jsS8NS/SuWdI47V9ig1wPlIlaXmh+LElFF9HucRDMNCGPqwLAdS8nSOSIgk2Yt5cv8BnEepCr5KTGRyzCMVkJ4/EkK5GROmtqu3z7lMj5vHMu1d6euoA9JIMrBnLLWdDbK+FASu3fUn2lcB6MUGJGNvKpN9iXvu7Ue9GIrlvtz/3bkhWrM2jZnrRZhLlbVRkDTrat1HN5uBbAL1ZgPPLH8WBEAum0M2m1WBAxJe4CeeLYqZpDPKFI6iJCU+oElgJiZ5YRylTeOx7rStGH1rI1sfk8b0td2DPi79u9ZFbWcPU2sFNF7g1pnz+FAtBSOGqgxInMAtSN101QJGAMmUthIRAAmSCilOZlYCAPQFgXNspTZqu63XXNJxb2ZCR2Ch8foaejsUIwu8/rf1fI/3ntbgYBhU9aFGVZEjszFcCjBqJJUBUkZm+nqJF1Q+rQExDajj9EQIIZAiApKgJARPgoAYFRjUzyS5HjwxkRTgXN1bhAJCxJBIgiNlkAKQICp4MaW1B5J8FgWkVOxUaqi/E0kASpOYrajurQFSw8LqfhItMLADIeLkHmCJ+oKRuO4mgUfGCAIxijHbinyMd372RN9ud4PX3qxdu/rsHdHAx/v7zn63tzyBnap970kQ2hvjqB0s2S+aWbc7IoA7bCDuIqvZHUhwV2X32AvY2hiNIhWYLMN8AVynF3v9gBiGASKRBoogCOCHI8FHPzB6JkT/POLdYqKtrQ31eh31ej0dQtWLn4aLWhch/bfWjL11QdIwnK6KZIvNuW3bqTfReMffivG3VkOtQUGz+MY/xxREqmAiECQsRTOZQwlHmFTSUFUSBEBDdcfJ1iYi2SFk16oOPnYx1n2Z8ZrmlI3uw44NMun9IV84o9YanLR6wNjzoisj3YMaDe+IhG0mIJN5HIKR6wvIJHYqCRwNc+oA3Nrn1EGpNVlprcyEjJP91nDhyM+qt0QgZTL3JJFUcwymyZD4GaYwGqCgvJF7MekREZn2irih9kmY4gXK7UJYaYI19m/6Pkw/Jzk2xVrU6vnqmTGYmVSGYhSZqTVQj0B2YrcW9h2tTztj3+3OOra7EPPL5V+3p0Fpj+wn9kRSfE8j9d4w1nbF+NttJhuwS1XbvS3Bx/vd2MqjdQFupckqUdPRsJAONPpBI4QgiEJAyER1uJj6BBFC4LqZ1PvIMMz0swzDghASjYYHSg04jgHfD0FYwvBKFi9QAoIRa9m0uoOEbAmk6QIpyAuUKDTmrhvdOw3wku8SJttxkKeg0lAZM41S1pRBjSTQaONCEyAGKJUgTGXGkCYIYaBgO6xkdsbUGmmWszFw1ugAE8fhuJ83drEYC89pNYARWGv894QJk03vh9TVmaSQUKrzSgSYQ0JAaFiPSVCpROoEH+mtxHGc3I8s3Qd1HuUL7DtUhc/AjNHwog68mgihq0whBAyuHFd1T0h9Dkl9uizLSnuUmk4uJYdlmWlwbCVESCpTxEFbo2hXVx10AIDFJHmetM9WEvgZHfkMqf6vWY+CCHDBwcGVrBchKq8hqnoTZCRh2ZW46Z5o3O3rXn7rWrs3LYadVVcvdk517JfxYgPNvsIa98VJ393935ssY0e+JeP9f2fHqhcznXXGCVtJVxkawtFfcRwjk1HyKPohdRwHEIrpZoCkMyqMsXSWQzuPataUzjxbWTlqkv+FU+hjm+xjM/NRwULSkT5Ia4UnZbpYtkJaO+pHjFdR6iprvMpEz4xQaagyg/lq4UQGBCzpIYmR2RJqgVAOypIFXOYAUMRRkPQw6Av6I/r8j73+ra9RA8mjDRtHZ7k7Jse0Ztw7CsJjq8nWYKgXbL0fJKEdSqnhJI5YcFUOSr2/Eozp+xgggkLJdo+GSfVgrF7g9e91JayrwDAeSaj04qv3Ud+rQRCksK6Ggi3LSno3dFTvUytDtCYHOkjqXmW6eBkUYEAUhzAMluzTCOQWBKJlX9V7dVUmAVBKIEWc/CSTypGAUAlKWKqWQogEZYAU9IVkkh0o/e/JoOqeoDMvFU18d3rkO9vXfRVIjd0NRmPZQHtKhHgpg9GLwUB3BkmOZaSMzTRa+0PjZSC7ClZ6UYjjKK0uUogMI8ehp911NuZ5HgyqHtDq4CCy2Szq9Tp8309nOzSRQYtmqtkSjFo4DMMAj+LRfZGdDPaNl+lrOf7WrHlEOJanPaCxvQn9O8tk4y7048nnjw1WAAU4BQgHqA4GFqRgql8EAVDVayIgAAEEUVCf5Cyl7JKkBwKQUQw1XfFoGExjfOoakpStRsh40IhIFQRGVV90ZPBZ95Bae1OUKDmb1kW9daHXiUWqhah7UMxMfx/HAkEUgnMK01Q9tliqHptiNxIIcIBLVV2Cg9BE0Z5KmBaD41owTAoWjlQljuOk1zNljXItakrT5KW1Z+q69kRAbFUVljpPtm0l1TNG6OnJ3w2DFgghhpTGoGmaBc55zTSZdBwLhmG4nHMvvbcsBkkFYilAWHKehQQzAWpIQ4ZxTPX9SKSCR2nCqjOkCkhcBxeR4riEqOuknpWRylBSCR7vGBUZ7xlvTS53BsGNrZRfyuDzUhHW9kVQ2iPIbm+HnXb2e0p3n9a9L7zmd7e03FnWPvaGG29OYbwA1Yo5p22MxNoijqK0WhrbWhvLYgO0D5JiXengM5ZIYVlWypRzXXcU7TbNNqkcFRBG9UFaZjjGwk36Zx7LNHvVVd9YSvN4VFOSni++w2C3I1LEyCIt9XKuxFKTmRK16KtvnthjJPFINdslBRLoCkJBlDvczzHQcmtlp6/p+HqF4gU0Z8ZUoGydY3Esd9TP+rP1OdWJig5sukLRvb4gCEAM3ZMxIDkAGiEWBDw5vyoYCYAINURqMlAQcCpBIjnCBpdqIFtDXgBS+HV0ksAT/Tjl00UMAoMaOUFEHbGASCwvODik5EHyLwRRAVRSTYKIlfK2QRwhiS84QBlsAckJlaqlRGmJWWzIsI2CaRmdNKY1LuKajIUHJilhAoi4IJQq8gOTSkSVwZbgsfo9kspRM/RUIGYMEBTgUgIckCJ5dom6ZxRZBKkpphBEJT+y5VlJkxGazjGNkDl2P2Efb43Z2dq3t0O1u2s9/nJWZ6MC0o4qiZEHUe4iw989tsYLH3S9rV2Opu4CfuO7ZH3srLmnJrV3doHGq5DSFHfUsZBxtqlx7NZFZAQG45CSQtAXLvos+TTKRld2abAAGbfpPhbuaG2qj3tDktFUX8160wvgWDx8bBPXNNEiNBnDTLbbOtipsX8pZDrbIrlQ+L0cPcSo5z9aq6vWwUnOebq4KwiIKGxf2Ekg0g1qVekYLGHhSZUFE0FACQVYpBYNRiGlmfbrtDQPj+L0Z2WsJ1KbdSEEDE1QSPZXv7Z1xkVJ2yiVAdd1R52/IAiSasRJ4FgfMecwGEO2xdKdJv2UMPThunZq3IiUbi1BDQJQtZAaNkMMCVAOMA6AgxEJKQUoI3AcA5ar9jP0fXAGWEzfKwSmk4FhGeBCgDIGKxkBiOIQEY9g2iZMUykmxDKCkASWYZqEEpcS0gBlUkBC8BiUAdQieUPSQQkKKVSfxrAYCAjhUSwBIOSRb1iUUkIRiXCAmUbZdGkbF2GTMZpxc2aOEM4E4Q0wIkEiwaiklBI7iEOPWQwiUcs3bANcCoRh1AAjiESsiJAkYZAkPSDBBaSMQBgDmArURBLIWIIjBqQElxxBHEKQGFxycKHIIlwohialAFJIlaqqXBJF8W/pp42GvHe0wMs0C2197Xjva32PYjPuucLO7jKRd1b1vBRIl7GjiDveSdldwsCLidh7/j6y2z2fnTX3drY/e9pvan3djgY79XfIw3GrE5YEYmaQcQOSZmeNpzW1I9bWeMfApRiFzbdWfGMJGTv6GtW4HXOcGmpMWWmEAgTgEqCEIm5JKFJoJLlGOqDpB1uTNVorDmYaowZKAc2MYi3QmQ6sLf0ewgGp52douj1Nf+dGnG5HW65rOJRzDjOhvcuW/TZNM913fd1bdN9MznnUymAcadprJ2Ax6jpJKUEZo4wx0cLQMwDEqVq8QdVimtCjQQHKCCQTIJKrIJ0yCSVIQpMGkSAGhYy4IjroZEZSxDKGkKoSaIVi1T4oppykEkRIHQhiAR5ICFWkSq4gQQnEIhrW0CmRSTWWzI2BashSQEAKKZI5NUgfhBggQkoCToikkhJIxVyPheRh8gR5ykl5bL9OvKCvN/J7tZCrRJZC6K0DEHJkAFkQgVgoajrn8cjna5FkQdIwosgkIvlBORDLFsh2vN7gnlLD9wQu29eVzIshLuzpnJSxqzJwXzXZ9u3s0p7NSO2JxfCe9pd2FpzHg/d0pZLSq9no3otJ2ehgQsef/9DzxLsKGOPBYK0DqnpuYywWvrNA13r8rZPveiHWVY7+WVc6lFIYdCSwEEJgWOYoiLC1skvt1JNKMI5jBEEwSjKGMNW70Arm480NjTrvko9pSI80symlsE31uVHC2jNNNceiA45uvltJg58mSgK6whphjin5AyGETLafl1IOCSHk6IRJbV/3h/R2LMvqEkL4UoiAUhq0khlaYUsB8YIkZ1QClmTdHBKUjNx3Uoqd9kLUt0DMo1F90kgosogKrFL1nohMIFAJQggVQooRLbi4ISVP+kckDb4AkSTplwlwSJ5AagyQ0oyTvl3IuQgJkQSE2lJCEEIZITJpeAlQSogQuvGnrqmuhkcCkU5EkgoEyUwaknsXWjJIwYgatVEyS2No3foZ2MXCPZbCvbv07X3BQt4XjLxdff6+G/vZRQ9pT0RUXwlhwBczsLurwLQrxd7x+go7CkS7A1vqxXI8yaA0ILT0ZEYxmMT4KgZjb35dWYx9Tetkfmul1crE04GytcJq7WforFmz/zQrTn+G1h5rZWYxMiLJIqWEm82MOrbWf7V9dGsA1fusAxIoSYPE2JknDUO1DvFyMTLEKwVeEJBHU7oVJVlXea0yOMlcGGWGURJCDCb7RZL3GZRSl3NeaznnsUwuTOuxtC72+tgMwygwxvKMsXwYBJtbIV9Kadx6zQUXo5IIPYCq4Twu1CBp2ruSBHE8UpHp6pBghIzReh+1VnRKSUH3fwSYQRWUxSMJiGoSaIQET5UpuIhiCQUXAhqObaWJc4hkdEANLjNwHgeEkIDzSAcpScA8EBITQgxCJYOUkhAQIbjQSYUKKnGLLh1P+3lAYtgHnvwsVLLHk+dF0+GpMu3TgUurQBDKVX8uOXYhBaQgoLtYHzSCs7umeeMhOq/EGrurIdiXykrD2DU9etcN/12VYjvLBF6KALWr7Y0+yS+OpLErUoReeMdK5qQPfTJlzzDSXG/NrCgloyRcGKGjZkY0nNVaebUGlNaHYywjsJXcoJUiNETF6cgirL+1qKqGzSzLAjXYqN6IHsrVQSuTyYzqXxmUpZJCmhbcylhshfv0Z+njbD2H6SwKMwAhwWkMThmIFKMZS6Cj6Mqcj1Rpqh+gWHdJkj+qotKU39aKkVEKOgKdmjyOh6UO0JRmlIEfdQkhBgGIFKJCCIHBWIEAhFHqU0odSkiFUkpt256WkAf6IkobGmPicTgopYwIkaS1j9t67ZLlEYTRlKmmaefpuUoIBCA0nZHSvUNQAkmT+0Pq6kImEjrRGOYXT1UwFARHlJdQGCKOCYSgiQwRS0gPOhiMVCY6MCqJHwIh4lQCCGTknuVcsSGFUEGFUQKmiAcRISQa6T9DioTco2euhBSQIJAkIewQQBJNABKQSdUoiVSzWS1BmKSVOhlhYFICQsSY6pEnJBE6WqljNxLYfd3SeLHL6J7AcXtCCtvb4zN2/eLdH0Ldk43vLU76Ylkku/O+HfXTxg/YZLeDZCtDS0/g8ySTJBi/wtK9Cw3nGHREVSGFjxKlBgApbKUX1bGipq3MsFaFhtbMX/9dw216f1sDpYaWCBvd99F9F80SG68C00OLejt6H/X+6P1MPsuQUsY6wOlqZ+xMyggEOZoZiP+vvWtbbiOHsQDItmXntqmpma39/5/bt92ZeOKLmsA+AGCDbLbUku0kNTuqciW2pBa7JeEQOAcH4Tz1uqbw+fMNLNXhbrHxcsvOyNZ2S0QHEck5579zzl9yzl89Q+qeR+H/2cp3MxEdUkqfOj7u0a7xUURmy7YyEc09J8jAgEz1e+rv4zy/aENtUIoBGiAAq+BjZFqiTA6UsjQ0u2qMmaFAUZl50gMSq2pNeSqu7usu4aYkAOibCbKSnYlLAJtS72J/ZBpSb8ilpTnXqp3VBUOkACYyLb9UfgiQrZfIsx/njaS6eTvAegP18v7YtfHPOnB9PCCsOFmZy1lF3VZ/4igT2Zpb9FYb5WtKdT+y4pWv6RM6VZJ6yxLbNeW4t8qy+m7ka0uWp+qxKSUAL7lAaxlSMyzQrOgmTzXYO0cTyX+fIBpLdc5pRADycQYuuHDAiG7kzsPEY1QOqLo0Y3OMKFmOJH8c+hbLhPE4sczo94WO/0PO+aEvM/pjltc1s0zDAufeUrqpgc4lvEvwVw6eKAFDO1q+iiMAgRAhaQZE9hgmgiklvEeknDN9zjl/RcRcSnkA8KYlLiYCIOU9uKipHhfLfKiU4/8i4gQgJSW8J6IbRMyIpEAMMgPgDASzoH5OnDdaXNTnxZKJBI58rNm1B2O/BoICLFzbCrzXRtkosOOrVNzdrBO4y3UBxKTxnwEQCyTrBRJYgEhQORpMqn5jKiCQAFCdEDQrUicEFjA6yPt+ir0nYIIe5XrUaaL0AlzTa2Bjl9Qa3lLjgs6szussBdDGmIsDkt3PDMBF/e+kyMA2CUIv2mmuvQejvf2ceycwbN19rWHra0yr3+I5+Vy/zhbv8tps5+2ABF+F+nt1+deeY+QKRsSl78a3G+tSDcAxY+lt9D2zcbFALG1FQIqqHy+7xfKicy0ONtFVIoJNtPMfuS/ENUehQbzfwSVa+vuxDSAPzPzkWQIzP8Xr07qD54Z7c0BazFll5bXHxnak1PJU8T2TNpu8Y+ZHe+yUUvrEzI8KIMobicgcs6SU0idEzNM0/eFckmdF/nx7rTu/v/s8Hu349X3zTEhLn8V6YKRyJZQQEhBQxrqzF7LyI3ogtV6Z+hm0xxJ0XGTLSakIx4O7imt8BAOa8i4CACIt2UVVPaI1nypH6ujCUgAtC0o5ARGqwamV3BaRAoXvTfDtAwYWBdz6edMFK1DJDAiTAbhlikKNByCzQClogFQAJVV+icxiCLnna887NIzKdufcG96DSrjmdm3CcRUgnVNpnUP+cxzKtQve07B6LrvpmxbHOxcervdaqeO58+7X0GdEfZbUOwpHx+GcM0hh5ZVAHY5vp5vKB6nfHUFK0Q5HICEBEir/4h8Eb9zsfo+OAW7/4jYyDh6Hw6FZayx7xVlKERA8M8sJQTJBIoCcEAiFbm8yiAgLz0855y9asiuPiQDu7259l0qIMLHACxFI9BRzTiKCFhE2BqKeAWmmBaakI+NOygLGNklXsy/Bm5v8nymlT4Er+t3BiIgOAPBfVmJ8yjl/NTHDLCKz/26PPyDiNE3T7/b4RwcxfTy/iEBCTLfM/Hhzc3Nk5mdmrvJzf//jXCEWC/hJHbQpaUWrLb9LlUqrBJuhzOaAjQQspXrwlWLAY5mBv5b2b82QIAML2/XyhmDLD2WGhBOkRFUIYMo7mOcXzb4oLyXjtGQfx3mGYiU4njVbSskk7rSAr84zwiVzRPMrNLEGF+WQ1MNQG6Jjdk2Gk/PsJUFqyoMrGydWpaa3IS5gvmWtJbti1bUBXQH/MpeYUzGq/9vIPPacJ97I5WYvcOYfISX8kVnTOfD6VdSCp7ioJuuo1v0yHKU88oJzEHFQGU0BrlmKjX+O4B3HIJxyrBhlgFvcW+8V5+c8TdMXAPjTwOHWS1+eKcSAzcxPInIM65kK83cR+WtlwUL9+ItePq+ebmX2Tfp6qufA4XpywYIDkAHM1Gc3kUcK5+OPz+G63HkWFB+rgCSzKAh8CwHi2bNT7ZFZwEgdCQTQJN46cJzNGgmrumzru4Lojx1lSAhCphPwkhW6tFqqS4EKScrCzSCHay9dQYOh8FyBCqrAwddgZrW0NKgvbRDGWYE2BaviYuGKPNVjKUASP7duPqvXqRwLcP1OuWScKt/EpQAXK/XFwYfvmHVcc5xzgX6UnW0By6UgOVrDtT1RGf6f3kaNtW/BU22R4bvXBVBVXBrsx5Y6rgobjYVwMUH0Pes/JFWZR+uxA/E4MdOJoojeYigq63oAjdxP0j4rC7riJP+tiBxTSh9TSh8RcXLgsawDPPjbz7HZIurtLx1JXbryIVbex4lwPXdVUj3DC2CBmgV4h73OUgVTphFYRnRwIcJE6TMRHRj1uD2gIGICwNu+BOdluMr1Id6KwGTvcxas651F5Mggs5bzmEXKM5A8CzIwlDrtFECAERZSvwv8jR2Of1ZIA7g3cKqFFBo4W5nPAMn7mcik4cW4TYUF0QZjH2FRe3xMiADFVG2oE3rB/rWfMi+jLRKiHkfEHK3C5kAhMXyeooOBlu6QwOg7CUYqDqoSxBdYS7htAMVhVuSuH0otoinrovJuXwD+UaKBPfHnUqDYEli8dtr4xRnS++8E9undzx1/L6e1px/gGmeGrTfwnKhj68OzgEJbOmt7ZNJK4h2zm8jV9Lv+yl8hNL1G/eyX0UjorYFuWyl/Y3mkpaocMwr720crhd3Z/Ycuq7sbBXXRxhh/rUcBPMaSGCKQv47+i8Ue+ySCUIqGzLghaGX39drceW9QzvlrpvRZwRRvTn0OnCPq1j7Xc8cOtBCxuT6ivFlK6SMzPxKXh/hee/YCJnhQ6ChG1C/2QoDtHCsfodAO7GTfEi2fE1hIf2blkMgDsGj5DQlro+1STovHFFM/Ypcx+TnzkpEwW3Ms1cF5CAWAk/Jj9TK1YyeWrAnHpSnk+rwIPIujNw4yBTB9PLaNtauy+2Wgc+0Au3N80zXtNX2z9d61vnWGtxI1nAOM9yqv+XouAaG32kG8BxG4h0Pqy3MxEK4GwHWTQ8n6ldzVsXc4iEPzRqW0UbpNCatjxEr1FubiIEHdJYN9V7lTI/YBoffE83KXZxI50xcrhR28DBYI/qOX5lw4EAO638/MT4noXkGGnh3k9DjVphsQcQJkZuYnZn7kAs88yZ8gZSVXihuAlFK27O3TROlzpvTZxQqU8HASkBBvOyA6CkAyVzXIOX81ocRs4bv4OhEgcZFnIrixa3Nn12Gu73Xno6igENR1YApDwiChBmDRPiIQlXq3xHwB9Cm6GO/yXiUHJK5TepcAHnsX5WwJSJtToSuVquZUfKifsDWlqu1UnIo7G5Z75uVzi9TF3D+nUhNpNoEEywxqVZTac2fNEvWnLdlqZiQNECH8WEfuPZz7ntaXSyTlP5LS+MeU7M5ZcWxf6P1lukvl8HsyIX99GtR3Rx50XS9MFSD0c3JqSSilmi2Mdu9RFRaBwu8L/MccvxRaBgKQUrRJ8qyZLkYepjaPpowfPPNw0HEAinxLBCNfmxH8f4jIsYIMz3+3IoPqjqCAhizM/FhKeSizPBxL+TM2Po7Ugr4+ByUv3ekxYdqzA+1Ld35+fjxXEKICUgZEEZFZvXUVgM35oXrZLbOX2IBj6dtBf10oWsqirp3A5ia13yFeNXrGxtEFkEhLfZ4Bs5Y8KXlGMWioRwZh2qgSRIWpl01LfVkCVLk622h0coDhsPkai5JW372oVgQBtAZpl7hzBSQBLg43ZDhUVuDgr32qn+gtAvyWe8MWEO3d4F9rDbdnUvZVGdLPFyjgm71pP2OHcqrktvc8yLr/+6ymz4wIcDOD6st5HvQ84EWhgGcgpZTck+8OBhGQPNi7eiwCkmdKW/ZFcW2Rg8k5fyWiO0DmaZp+jw2ivg4j+6dRqY6ZH2M2xTw/MOMTM977Oer9mqH4eQEyl1IeiOiOUO7T8fjfRPzQv4dE1gtjvFZGunfeKGQqE+LQfmvuuaLu3PrG2SmlNMW/zyLfGm4q0QEoPo8HX+zgYydrh+hzgclVYTXzUm8eMxtVDsfLdewetYFD6W2YtBQHTcBev24JfGMom7hOwVWmFvgRUT35/CRh21Hm3OZU7aO4ytYX3ikGduzKclil7G65BHB5pvEa89Rr4+U1LjnnejRPgdg1bTe/jMrutVzNtTXZa50d3uP820mka8PR/v/RVTr85C5o5qgC8/tjgLQ9YGKAkhBvRR/0oYg8J8TbmflvYP5QRJ5RROxfLiLPvrNnkwsDrpsAw5rvIhdDCW4Rc845f71J+bcC8kICJIREAuS/My7RV0SyZ1kx+CMmjODlwJcSfej2PwKWMEASnKbpDy7wzKUcF7EGeGbkWeO0cFIBULCS/kNQclCNnFEEJUScXO7tAKrPKc/IVfgxLwDjrx96pgSq7DnyhMqbzDpeAbaaMoNAIAgRRKhyK8tgQu/3oci2BTcH2LTR8eZWPQYGQO2NYe013XnBp9oiAMwCkMFsfAiEPBukOiLHQdCLdVitI8b0QwKEud5HlYPSz4CAEMJ8NONVO3/sMjGQ9413rxmAGocl7gHGLS6tB5dL+1QvLNmdGy/wOjeFU7sTf0ejauZ8CWw9AvranclivLjK6Fe/93NJlmPKBueGdbOnH3BcrPvN+r4pGdqXpx9FkTBBwrRStOX6mIUvieUt3bkLpESfKvCYgm0JiCmXUh4QMRNgVpcYlRqjAKRE9/pvugem+Vjm/5Eij0Q4AcOMIkRThpcyP0lSWx7v8XExgKv3bHTQRAlukSRlgkNO9JmI7hAkgZSXTHRLhDcCwJqk4JRT+lKYv1uZ7RuIzCAyo5e9Et5o4CYSkXkysQElVHk24q2XAz3AM/ChoHCB8l2niEqijEdgVE83qAq9W0RI05R/Szf5NyCcBHgWwJko3RHBhAg1S6ockfCz/99dGACkLKCExX44JbpXQMI7RMgiPIuUZ2MxCqGkmcs3lvIdgXnK9B8l00OZAYr5xTEIcMgSPKNJMWMOvUieCdUMxMUPpKCiiu6WVyKhCiClMJCZ0+JNmxWz9XSBuVwgqQmpgPrIuawbiQG4dfAQASjFSouiDhKYCDDZd54B2L4/dcRROC/07x2GHiDRPYjymeF7zGjPEAAkk7wnKMBQmNVHD2gZ6CdgVkTm+GGZUQF3OYdgTRSCdTdPDoQuFh2cshNamoXH/P95QEsXixgu4ftPtd6MXuunc0jXjnv4p3BdW1xLnxVt/JDZzdz1PFHcycdSXM/JJHQuxHgbbHfylUeyvzOyyq9RZigAguUpgUCxTlUhCqWNRpTRrUe/mYR4UwHSmkcIFWQQgJj5EWQJ5n3Wxwgcy5GI+g1FhNwDtWcaBDixrSGIKZ5CJgJESIEr8ms3JaIP+jfBoNaaT7zfx1P3M/OTcUiPek5c1tkr5iXscFn1S9Wy17yUygDr2IyTJbq+/OezkWTU7Oik/ohnOlUzM24K2TIsXty9l9DbOWQ7eKKKLmh5HtpY+rEDwuDY6JndYJ1dxrdeu4yfBwBSVYl7N7+XbfD7bOfSMtyvHjNHJb2fJvt+C238jwSR15YKz4HRaIy3ZkNoP9o3NC3u2x9MdhwBKfJB04i76MtLodHz0PMaHlD9/xb4P4nIUT3bABjKMxE9kUAdrcDmsh3tixLRPSHeLGIAzKEU1pThmoAt8hLAqPJKfgyBTolHXOLvEah7kUQt63H6llL6hogzLmXGu/BzsFLjx0T0MaX0UfuC5NjzRFEB2JfqRoDar6sHo1E5cLv83ALEqXlH8XGLqel5c9CR8XDDAXW9r6NZTaeCbPu3xYE8clzRsmd9jLFDAcJYoh3NFPb7x8lJWBlxKHsUvVszk/as6y2mKFz73LeKj79EhnQKiPo34y1qlJeC4DmzwUtqwVv2QD0odZLjZvaQg1GVHask+NAHuT5Lir04MSMCboL0KsMSkRybU90toWYokJ5FZM5ID6w39aaDJpPL0e8tBPme61qtNTS+roQNIjIDYQrPPaBgGYk0anDvVIVRbg4ATyjCQQl4iADqoGTuCs999hPBqHJr1oc0Ujm25VNfZ40sL6c+s+2wRh8/kaD2Ep3gA1pg6L5T7oK+o4SDgANAIm1SjQIXxhUQ9YcdB904EkM5J0LPIXWK7zrQw4a/nDRAHdcstubWnUI2r1M9pow2l+cGd26XsEbg89bihx8BRudKe6fWmLc6jP8pJbJfMdM6JQvvJceDst1tG8wFY1DvyXO3pnGFnAPLqR16DxC98aeIZB+fQEKHlNJH1nXMpZS/NZSsrYQ80Lt82hWAfSbQZRnS8jO9+agJrlD7eiK49u4JS8kLMJbhFjUeCqrNjAPE1Jc73bnblGVzBM94nWOPVC9hD2s69plt9L4bqfQ2wWmj5LRwKbJjx34+uCxZ0ij7gZrBxFLclvlom8mN1ubNtwxonnFcBCg5/4UNl9ucH4fPHVEj+qg2QYy19HdO/ry+IDgE1mvC5pZ691pj6L3Z15gDP3+s97zl0Q7+Ry/i1JTa9+aPLtkZXPsmbWVHp3a+I2WdOx20WQbcxF127/XWB3gLkgsABB+1HoxiUB6VkojoLoHKtRmFAlj8Xbg5nyaoxybPLYQbStwAAAVBSURBVDBymXlh/j64TrnrkQIRoFBanAYlzOykgYMpCj+qcEE96iSIJSKwxUwuAM484oocjBz8HZRCifRQX6tZv/+uggiWpUdsAFRN0Gpdpy30dmUuGAbc0MzsAX2ztHfqA+5BnVaA1HzOK19Dm2R8+1oIOvwQdboveqZjYEIyCKxrodK6ROeAtigEt7KhSzOH12Ynp2Yk7Z1kvafa9J7Z0hYg7ukTzT8LbE7NBPkVRQ3XDs7aW+aLyb6WYbjpO8pEkIluF1k3TLpbpxrkR68XjTlj8GzUdRtcR/9vJyyoHI2IzBNAYuYnITkqQQ8cAbRmWwJEoQTfcyS15GXc0ch6BxEnVnEZeGYjQj5577YdB1Gew2uwW1yEsQ5Z9Rh2DbnlqCjBrf8AsojAsV97kHjPq5JjB1ij5444KH/MCPzO7Xyl414gcCht2WhMhAuczxa8ZBczIAlTZ/eU48fZnDf0+hjxBTzA5y2Jz7KiOnFZJPrTLYC3qHC9QRmWcRWybZi632QUL4shO4Z/jjav2xOv5U25pLd43mvi40/nkE71Av3TyobnDApP8gSt7c4qcxlxLN7nEgN5bCy1esZd3L3HwNjzUCN+CkEzCFHuJWRV4BY+nRy9BuKjiKzAqM8GRvcBwBOjiyhScjDoRR3GyZRQejwA1HLjHTI+9FxOmAqaRz+m+HPQmvr1bb0fMfPrS3i92MLEGilmu6NrUr8jsQ3HeCQJQXhPkKiD53Z8dmPJrgZkocsDktAKFGN7hbt2V78+L68xACbnp6i6UOj9vJEdwCoTaoIoY2ji5dW1e21Af23AvqSl5i2A6b1j3i5AGqHwJXXMU0qSPWnolsrkXOa1d/fwnhd85FLQn++o8XVx94bap+SNfp3aLudMn1PC+5TwngAzAmbogpqP1Y5lr1g6iiQ7ImYgZgF5YWEBISakO6J0iyQJERIgMwt/R8SJEt4iYWLmRwRJCfGDzPiCRCh6W9bAKtUmwKyZjCraaj8Q8zMg3pRSHkTkaJ2t2ct0QRTwxMyPBaTNTOwSz7MwET15pkYppXDuRyK4CUKOjORTXd2FgT8l4cdldPhSXmt6l5gfO/NXYOanAnK0AXgkgKmwvBRp1v9Y16y52Qtz+YsRGIW/p4JTO3JDSuADjx0/VYf1jed2bWzuzJHg/GTkxf8tPjZ6usUsazHj5WohRIRNNtb2GXkfDzWO29q7087dEYbgzE2WIXGTIXkPUqZcBQ7L+VDoCxqIoWSxHvLxI6PrwQOA05Ihb5T3toUk9clX3Nbl2X1c0ZbZ7FYGuNfxYW9s3Yr3kY6Jx8pvEZD3Xpx/b7A3ExpmR0HGnBE8wK5csOduflAEpMd+h80sPpHVxQrHvmzUCwR8HTZo75OIzGJbZF4G6tBOUj5b8YhHWd6o/NUFhxSD/qlMZef7keOMoxNZ6Bxl3x3HM4/KdIOsaBqp785lXPu+mC5SoCUI4g/6PgqtX0vcCSHtjwu984OEwrYNF4xA4AAUnRtG6r5e9g7DArq+flPArOuRV03J/ve2jRH5LQ/8rzLvmgAodU7NyLMuE0CmIFMGnAgWI1RSQDj2aq/FbHQp2UWlnbtGk8mqTQ02GjS3Csw+yjvY9xzJSllZZEaUAgmwGbPQcUexxiQiL72TdwVMBBbbuHclLCtLKne0AGl5FoEbAJjcn3x84ZlBVk3Dk2A5emaIRGnUN2QrKz7arxNiHEd9SPHfMNvpaA4KUy9wEDjdULvc6EKg4B/56X73jelIVSeCAKtBgzbZlRcO6brXwl2B9dx9/8bL8e3/AIDXxP/CDRsyAAAAAElFTkSuQmCC"";
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
