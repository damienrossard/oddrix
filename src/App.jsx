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
      sport:      parsed.sport        || p.sport,
      bookmaker:  parsed.bookmaker    || p.bookmaker,
      type:       parsed.type         || p.type,
      pays:       parsed.pays         || p.pays,
      championnat:parsed.championnat  || p.championnat,
      marche:     parsed.marche       || p.marche,
      sousMarche: parsed.sousMarche   || p.sousMarche,
      cote:       parsed.cote         || p.cote,
      mise:       parsed.mise         || p.mise,
      resultat:   parsed.resultat     || p.resultat,
      date:       parsed.date         || p.date,
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
const ODDRIX_LOGO = "data:image/jpeg;base64,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";
// BALL_IMG_REMOVED = "iVBORw0KGgoAAAANSUhEUgAAAHoAAACMCAIAAAA88Cq3AABrkklEQVR42o39d5glV3E+jlfVOR1umLw5SqtVzhKSQIABIUAkES2MbYyNMSY4EA04YJNxxsYGgw02DhiMTZYACYFyztrVrjbP5skzN3b3Oafq+8fp7tt3+Ty/5zfS7s7O3Ll77+nTdareet+38Lr/iJ0D55gZnAgKCuLCyfSdF33kF5/1tr/47i/O9B5gG/bb0p2n1vGwfVL1l9EZQtFa6VAHQaDXr12zYe2Go8eO//d/f7VWG3dsCYkIiRQRkdKIhEiCCIgIKAAAiACAIAIAAiAgIiII/k8QABFWSs8tLt12yw9vuOENiQFBEAHrOE1SALj3wXvf+qfvM1EQkjLOIgAiSmaWd+yVmsZ6CFEQTdU3P/ec2YNLiAAAIEJaJ0+c1Ec7oAlEAASKD8lfGQoI5l8CwPwhAoAg+beh+vXi2yDoHwEI5fPm/wQKCFkr1op1YB2wQedgcS59z5V/9OsvePfHv3bD09P39peClRleOkqLh4P2SZ11NEoQ6DAKo1oYhUHQ7XS3bdl65hnbgyAYHx0LAh2HUaADIo0AiORfhV9rgOJ38K83/wQBARGRwD8MAQQQkBD9tUAQJCAkQtSKojgCgOc/5/lf+shf6MRmbBWhf2vCIoBABETCHDRCVMTWYX5NgZ1AYhGKy1z+AQB+ncq1Lv8O5QuvrOPgciD6PwBFcLD4gw8EEARUm16qnEMWEEZBWGmZ373kvW974Z98+F/fsPPIbQHUVha4PaPbx8P+QsBJSBBFKorDuB5FzBKH4fXXvei8c8997Imnjhw7YXvt2eNHhE1ci+O4psOYSEu+r/zrITj1AwefYLlhBECYBZVqdTrHj0yfd+FFzrK/Jn4DKq3TJD33rHPO3rDlu7f8EGoh+Z3oOJ1fxFBjrAVgdNNENDXamW2rQPnrBiw8vayMAFWWVMr1RAQEyVd2aNV/7hUL+JWufg3KzVLevOVf1aaXknMiFgWw1cveduFvvusln/nr//mj23d8ra7j1hL35nV3LkiXQ7RxTdfjqFaP4igMldJbNmy47KILHn5sxw9uvv26l73sfe97rxF8csfuu+68a+eOx9sri1EY1OqNIIqRFCCwACLl6/Vzi15EFUTygQgUIqqg1WofP3Lk3AsudNbl+wwBAImQFLW7vfPOPmfdyPj3b785ajTEOmCXLq5IQBQHIjJ5znoJdH++qzSBCCJx6uRIS0se0/xrQURBAX8zlXddeRdidbMiDq075g/Ayk+IVK9R8RfRjpGdkMjCSva6s69/5/Pfd9M9N/3woc+N1MPlWdub18mCztqB5rhea47UmlEQIgAAjY+Ozs/Of/3hm172ylf867/964YtW2y/f945Z73supccO3b80ccef3zHzvsefPS0LZsuvviibWdsH59ao6KmCAgzIgqASPkekCjftgAAbDqtlcX52bm5+eV2Z3G5vWpiDABEGIlEWBgAFSJqRfU6rbTbb3ztLx06PP0X//3lickpdgIKMVAQKGCMJxvdVgog4gRAkAASQ4aBCFgQsXgV4je1D8Q02J8o1dCAeagWkMHNmN8KAgggMoiW/rlEAPM3q50VFFzsZM/f8Nx3PvdN07Ppl298T1ynzgr3l1WyFGVthS6s15qTY5NjjQYhJf10eaW186m9l11+1be/+7lLL7mgvbK0ODsXBIH0E0LcuGHt1u2vvf41r3t6z74H77/nxptuboQ/ueD8cy+67Ir1W7dTEPtIAYKo8jVmkyzMzR48sH/303t279l34ND0iRMnl5aXjbVaqQ+++51iMxUEzhjJdxojaFIYEDZHmq129/fe9rtPPP3ULTseGms0BREDBQREKqqFy0db/qYSvyCJRfahC8uzsDjo0J9pxV71K5ZHF5DB2mO+h7FylFZW398u/uTHwamqnYV+L9sen/3Wq181PnrxX37l4ycXTsRB0J6ldCly3UiBbtRGV4+vmpoYD7Q+fmLmsSeeiuKRP/3ox9/8pl92WTI/O6O01koBgFIKETPLpt2Kotq5555z7rnnzC8s3H37bXfefftd99x/9dXPvPzKZ6/ddBrpAGy6PDNz8OD+HTt3PfbEU0/tfnr68BFj7OjY6Pq1a07fsunMbacZJ53UfPVbP+r0sre/852ilLMWkYRFSASICMMoDK2zqfnEH3xk57vfssIpBQoAIOWgHhBg1stIU54/EHLfail2ogyFNoGhT7AaT6RcSamEckHI/xPg6k0gPtHKg1Tx5Yv/kmSx9qHrfvu5573g0MHaBz57nY6wu4SmFbtOJCZsxiNrJ9etnpzShI8/seuhx3Zed91L//avPn3G6VuWlpYRSSklIFREXFJKkVZKkVKACpUi0gDQ6XRv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s6+++pv/+79r1q752W23bzn99Pe/9z3tdsdY0+11jx49BgDr1q5tt9uKNCAQqaTXPbC0uLS8XJpsi5/CDUBEReZTuDMiiAj90z/87eTURJqm/W7vrz71iff+3rtmZ2cuuuj8T330I6smxq99wfPf++53o8A528/4p3/8+zCKRpqN8886a8eOp+67575bf3qry8yv/eqvPL376V/+1Tf98KYf+mFnPgX2gGCamO0X1H7jty84bVvDpKBUDgT6Q1drvXPX7s9/8Ut/9olPxmF0+mlbASk1mQ7DdevWLa+0vM1YY3T03PPPH5+YXFpaBITR0dEv/OPnvvWt//2tt7410Ork7Nze/ftGx8aIaN/+g6tWTUVRCIT/9uUv/eyWm0dGxn9w04+azcbcwsKNN970Bx94f5Imd919z+jISKCDZ131zCiM3vHOt5+29fSXvOTFiqheqzuAj37s45dfcuH27ae3Wu3HHn/yissum1q1ZnZm9hUvf9m2bduy1Bw9duyjn/r03//Tl1ZaK2EQOOdyeT5U6VNlt1h8nqBDhdYYRbT3wP5PfPIz//CPf3fjj25+4w2/+PgTO770L1/+xMf+9MDBg29805sB4KKLLlyYn1c6ODB99CMf+2Rci4VhbKyZJn0AbLW7f/LxTwPgqtWrjck8ocsZiCY6v/mxrVlzbuLa5H//GBeOAgW+M4thFILwtm2n/+7v/s61z39+u9Pau+9Alpk33nDD6179qjiK3/Crb2qttOJa/F//8dXR5sgDDzx40w9//IqXvkQAlpcW+/3+iZMnkDkMVBwE8zMzAHDJpRefOHkyTTPS4c233PrS61562x137Nm779prr4mi6Nvf/e7b3vobDz740PShaWvd1OTExRdfeOjQ9NbNW/bs23/5pZdt2bIly7LxsbHpQ4e++KUvf+yPPzTSbNx8y62/9ZZf/5+vffXQ4WMvfMHz3/+BDzprnvGMy2/96U/Wrl79ve/94KMf++To2KgvvEW8/VU5ULHsfgMiaH/KI8DIyMj3f3zza35629//7d9oRR/95KczY39y68+uvfaFP77p+/c/8NA3vvlNETHGbt2y5a7bf7pmzeq777r7N972js/94+f/5MMf+t63vrncav/TF//lezd+PwhCaywgE6GO8MHpXW3uTU3qxurGiX26FhASKlBhELLA6qnJl7/kxUsLC7//6U8fPnq0Htf+8fOf//f//FocR+1O99KLL5yZmfmzj3/qYx/5k4cefbTVao2NjWfGfuRjnzJZSkqvnpqcOX7sDz7wvi9+8Z9f/9pXX37ZJb/0pt9g5kDjP3/5K0/ufOpzn/3bb/zPN4Rlw4YNR44e/fEtP7npRzdv3rjRWnvJxRdtWL/2d9/7gYMHD8Zx7daf3HzttdceOXIks0xEX/vGNy67+MJer9/pdn/zt9/1lt/4tXXrNrzzd373lp/cetEF53/8U5/pdLpZkp6YmYviyFpXDHvITVax4myHUPgJ3/bj777rPR9eXFpSSs/NzV1w3jlf/fK//OzOuz7woQ+HYdBaaT3jskt/5Y1veNZVV46Ojr3ul9543Ytf9Es3vOHz//QlY8309OH7HnjANzbPOuP03/+937vq2c953evf0O50fAlLhO3OykWv5ef+sjr8ONz8V5o49DPjATHtd//qM58GpN96xzv9bbdq1dS/funzew4cfOyJnadt3Xr7z362bu2a9733vVc9+7mvftX1X/zCF15w7bXPftYz3//+9//CC19sMoviFhbmL7/04j//1MdXr1mbpekXvvilr3z1Py+7+MIP/cH7PvwnHztw8NBffObTjz3x2OzJmauf85y/+ZvPkqJ2u7118+Z169adPHliYmJi34FDhJSkydo1GwRca2VZKZ2kabfTBpB6veGcS9PUJ2xhGI+MjCyvLDtr/GtuNEbCKCoGCeQlug69w8nATdPLdbQA9LrdXq+nlYprtenp6fm52Xvuuy9JUq3VGWdsO3r8xHs+8KFt206/+cbvX3ThhUjUarf/51vfiqOoVqtvWL/+I3/0oVtvv/POu+6x7Pr9jnMO8zpQrIA4eOi/7dGHoLsQgolUNBgJ7izHtQhJA8Do6Ji1DgFXlpcvveD8Sy66aGxsYn5u7sknnnjgoYfHxsdu+uGP/v7vP7d9+5n3PfDgX3/275AZxTnn4jh++NHHr3/dG7Zv3z47M3dy5mSzObJj9963vP33oiiMa7UPfPCDSgfO2ltuvW18YtwY22yOTB85dnB6GgQOTh+ZnJwUkUAHJ2aOayJShEha61q9rpQKg5DZRXEMAH7qr3NupDni+9T5+BrObdgR0RoX+JKHh2d2e7y7Vmu87OUvs9bVarVv/t//ickmx0frtRopzZZ/5+1ve9nLXvrT2+84Y9u2XpI89MhjF5x/3rnnnH3PHT/TQUCIv/yrbz548OCf/tEHdVRrLy//+V/9zdLyUr1W895cwqKDAADm9lBjNAoiGnjuCxt2f/N3/wiItVodiYh4cWnpd9/7wTTLjDFKqTCKkiR9+NHHm81mps0nP/MZHYbC8tSupycmJjzIFcUxkUrT9IknntQ6mJiYEgRACnSASGEYBkHgAdgwjFg4CAJEHBsbI6WEnS+0nIBS1AhquTkOETKHYejxQiLlRaUCYKzF0rR3ULPlwHlmMiJVaDCGRpjkgsRH7rvbgST9ROnwt97xzuOHD3/h7//6v//vOzf/9HZCiILgl254/VXPvHJpcelrX//mw488+uyrn7lly5blpaVOp5Nk2Y6duzrt1vYztq1Zs+bgoenFpZWRkZHCpzOfU87CftDl0IwUDxj0ulEY15sN30np9Xomyzz6EddqYRAYY6IoEpHMZIoIkNi5IAgLQgZ6CwnfnfLOZB4C8JOqnLhTpiPmRvCVFM3PMueibZpL/4sSuiQK+NIXKozgIbdGYWMtIgXae7IOHHuQSsag4AUXXrSyvNTrdgDROWl32oqoOTIShXGSJcvLy1JYWgVhFEdRu90aMN502Gg2nXPdblfYhlE8OjJandRWLLnk/WBARgEWQBRmay0pFQQBF5SksgMALKjy8aOKCMB3X4aRzEKKm3c78+maWDZnS6uLst8/GO4mQ2zJfCgMS4FhDdnvSg7Nc8XXqDqiJ4cuiCjQERIppTxvECuD5v3H/wf4GnsJ8Y9c5QAAAABJRU5ErkJggg==";
const ODDRIX_VIDEO = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAABKJbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAJzoAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAADZB0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAJzoAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAUAAAADsAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAACc6AAAEAAABAAAAAA0IbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAwAAAB4gBVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAAMs21pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAADHNzdGJsAAAAr3N0c2QAAAAAAAAAAQAAAJ9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAUAA7ABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANWF2Y0MBZAAN/+EAGGdkAA2s2UFB/7hAAAADAEAAAAwDxQplgAEABmjq4JSyLP34+AAAAAAUYnRydAAAAAAAAOICAADiAgAAABhzdHRzAAAAAAAAAAEAAADxAAACAAAAABRzdHNzAAAAAAAAAAEAAAABAAAHiGN0dHMAAAAAAAAA7wAAAAEAAAQAAAAAAQAACAAAAAACAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAABAAAAAABAAAGAAAAAAEAAAIAAAAAAQAABgAAAAABAAACAAAAAAEAAAYAAAAAAQAAAgAAAAABAAAEAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAGAAAAAAEAAAIAAAAAAQAACAAAAAACAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAABgAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAGAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAPEAAAABAAAD2HN0c3oAAAAAAAAAAAAAAPEAAA2jAAAAvQAAAA4AAAAWAAABPAAAAGYAAAArAAAALQAAAZcAAAA8AAAAQwAAAEMAAAHPAAAAWwAAADAAAAAvAAACKgAAAGEAAAAwAAAAPAAAAgIAAABmAAAAOwAAACcAAAKbAAAAZwAAAD0AAAArAAACEQAAAF8AAAAvAAAAIQAAAwMAAAB5AAAAMgAAADQAAALCAAAAaAAAAEgAAABKAAAC3AAAAFkAAABIAAAAJAAAAykAAACHAAAARQAAAD0AAAMVAAAAvgAAAEAAAAA6AAADaQAAAI4AAABFAAAASQAAAssAAABnAAAAMQAAADkAAANxAAAAqgAAAEgAAABHAAAC8wAAAKEAAABNAAAAUAAAAoUAAAB+AAAAPgAAAEgAAAOtAAAAkQAAAEYAAAAnAAADMgAAAKAAAAA4AAAAPAAAApMAAAB/AAAAKgAAAC0AAALhAAAAlQAAAEkAAAA2AAADhwAAAIMAAABAAAAANAAAArcAAABnAAAARQAAADoAAAIRAAAAWAAAADAAAAA4AAABzgAAAEsAAAAuAAAAIwAAAnEAAABtAAAANwAAACoAAAHfAAAAYQAAAC0AAAA5AAABdwAAAHUAAAArAAAANgAAANkAAAEWAAAAKwAAAZYAAABJAAADvQAAAIQAAAKhAAAHvwAAAZcAAACGAAABOQAAB0QAAAGyAAAAtQAAAQkAAAXxAAACVwAAAJgAAAD4AAAFlQAAAT8AAAD7AAAAkwAAArEAAADXAAAAWwAAAFsAAALiAAABGQAAAGgAAABuAAAEBgAAAU8AAACTAAAAvQAABK8AAAGlAAAAzwAAALEAAANUAAAA0wAABEEAAAEtAAAA3AAABTMAAAHhAAAA9QAAAN4AAAPDAAAA1AAABTcAAAGcAAAAtwAAANIAAASoAAABgAAAANUAAADLAAADsgAAALsAAASHAAABmAAAAPQAAACxAAAEyQAAAZ4AAADKAAAA0wAABAYAAAD5AAAAtAAAAIgAAAMAAAAA6AAAAIEAAACBAAAC9QAAANsAAAB6AAAAWwAAAtQAAACjAAAAXwAAAFQAAAKMAAAAfQAAAEoAAABAAAAB8gAAAHAAAAA+AAAAKQAAAgwAAABgAAAAKQAAAB0AAAGrAAAATwAAAB4AAAATAAABbgAAADgAAAATAAAADAAAASoAAAA9AAAADQAAAAwAAAEOAAAAFwAAAA4AAAAMAAAArgAAABUAAAAOAAAADAAAAHUAAAAVAAAADQAAAA4AAAA7AAAAFgAAAA0AAAAMAAAAFHN0Y28AAAAAAAAAAQAAErkAAASFdWR0YQAABH1tZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAABFBpbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjYwLjE2LjEwMAAABCOpY210AAAEG2RhdGEAAAABAAAAAFNpZ25hdHVyZTogM0diaWlrYVQvbU5lbEgxQ05yZ0dNYjU4K2kvQ1kwd2JEYTZ0VVZ0T1VkNHo3Nkc4L3ZRVDdocXc5VXFqTnYxdGdMdmJQcHBrUW9GNE11ZEVzUGZLWHNsQmw0Y2JYd2E3QlJ6SzM1Q3lvV1doUVM2Wkp2UTFvQ25Na1Vod1phaGdjUmo2ZWZQSlV1UGE2TFpZNnBrV2hUSXJPbFNIUzlLV1pLdjNpb0wrRjZoTkFGS2lSS1oyUFBndmxBOUlUVnRsUXFOR2I3elBHRlBQWTVnTm05bHlobWFIcTdjT0FLUGxscVpQZUlBckdYNmlHSnlJNWJiaVZlY2NXQWZ4dytSTGRibDVuZHdybzV6a1VIS3pSWW5XamhKR2pEUlloSWFma2ljY0t5NmFrMDhuVk4xOCt1NU03RTlicGJtazQrSDJHQlIxbEFCSTVFTWNmc3JzeHNXZkIwWUdIVUlldFlZb2R2Vng2MzAyUkJjWUFtNGxaS203c1VrMDhVTVN3Mm4wdUs0cVlVamNGa3VFdmdLQUVMaHRlY2FqaGxacis4TTRuaHY5ZGFhWkZSYUdkTFBIUE9DeURhMWtVblZOVS9HQndLM0ZnczBUemlndHpOK2xrbUNrbmM3RWZwRkp2TDloNmhYYXUxQ3FCUXJwb0dsNU93ZkpYTHh5QjRxb2RjZWlpVFdwNXY4TmJaa1h2TVdRaUl0enFtOHNWeHBTMjJCcGhlYzJSeFllNjBPZWxaV2llazBOSlZieHJESDBYbWM5aUdWRUhBMkYveEo1endkUURpbUNBOVNtZmNralQ4MC9jOUgyMXB0YzRZQXBFUFh5alIwL0xIT2VCelErOXd4SWd3d2t4MVl6T000MVZ1TVZjMncxUjNvQUNZc2xJOUhOSUN5S3ZZSGtiK0VqRXNaNjBLTFdScVpORktIYzRTQUVjcHdvYkZ5eFBSMkVEcjhaZTVHK0VJV3FzM0hkbUFydDE4eVZ2cTVwbEJLaFNkQTBzZjhDWVFrUkRlVHNLZFFYbU93VkxJUm45V0FLcGQwZ3JnR3RvbGFrck40Y21XbGRxV1UrLy96Vk1IUDdBQWlmbGJKaFFpZ2krdCtLUFZnOWJGbE9ycDdoc0pEY1VlVC9qTjZFTENSUVpZditTQ2hhQnpTS3NJUkZjZ0NHN3JCMFkxVTQya1ZHdDNOWndvTytNV1l1T2dWcTR3NElDS1dDQXJuM0tHYUkxSlQxSmVuL1V4dkFMSkZIRlU0dGR6blR6Q0VUWVQ1dWlBYnRxbWhxN0RxcTltenV6QjEybXZQekZ2alBScVJ2eVBLTWZERTEwQmdUU0ZRK2I5Sk8waU9KRExjamw2NzYrRE01OUJregAAAAhmcmVlAAEbuG1kYXQAAAKuBgX//6rcRem95tlIt5Ys2CDZI+7veDI2NCAtIGNvcmUgMTY0IHIzMTA4IDMxZTE5ZjkgLSBILjI2NC9NUEVHLTQgQVZDIGNvZGVjIC0gQ29weWxlZnQgMjAwMy0yMDIzIC0gaHR0cDovL3d3dy52aWRlb2xhbi5vcmcveDI2NC5odG1sIC0gb3B0aW9uczogY2FiYWM9MSByZWY9MiBkZWJsb2NrPTE6MDowIGFuYWx5c2U9MHgzOjB4MTEzIG1lPWhleCBzdWJtZT02IHBzeT0xIHBzeV9yZD0xLjAwOjAuMDAgbWl4ZWRfcmVmPTEgbWVfcmFuZ2U9MTYgY2hyb21hX21lPTEgdHJlbGxpcz0xIDh4OGRjdD0xIGNxbT0wIGRlYWR6b25lPTIxLDExIGZhc3RfcHNraXA9MSBjaHJvbWFfcXBfb2Zmc2V0PS0yIHRocmVhZHM9MSBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTMgYl9weXJhbWlkPTIgYl9hZGFwdD0xIGJfYmlhcz0wIGRpcmVjdD0xIHdlaWdodGI9MSBvcGVuX2dvcD0wIHdlaWdodHA9MSBrZXlpbnQ9MjUwIGtleWludF9taW49MjQgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD0zMCByYz1j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";
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
  const VIDEO_URL = ODDRIX_VIDEO;
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
      zIndex:9999,
    }}>
      <video
        src={VIDEO_URL}
        autoPlay
        muted
        playsInline
        style={{ width:300, height:"auto", objectFit:"contain", display:"block" }}
      />
      <div style={{ textAlign:"center", marginTop:16 }}>
        <div style={{ color:COLORS.green, fontSize:20, fontWeight:700, letterSpacing:2 }}>
          {timeGreet}
        </div>
        <div style={{ color:COLORS.muted, fontSize:11, letterSpacing:3, marginTop:4 }}>
          STATISTIQUES · ANALYSES · PERFORMANCE
        </div>
      </div>
    </div>
  );
}


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
      const userBets = betsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => !b.deleted);
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
