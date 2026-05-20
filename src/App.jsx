import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

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

const BOOKMAKERS = ["Betclic","Unibet","Winamax","PMU","Bwin"];
const SPORTS     = ["Football","Tennis","Basketball","MMA","Rugby","Hockey"];
const TYPES      = ["Simple","Combiné","Système"];

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
  const s = calcStats(bets);

  const sportPie = SPORTS.map(sp => ({ name:sp, value:bets.filter(b=>b.sport===sp).length })).filter(d=>d.value>0);
  const livePre  = [
    { name:"Live",       value: bets.filter(b=>b.live).length },
    { name:"Pré-match",  value: bets.filter(b=>!b.live).length },
  ];
  const gainByLive = [
    { type:"Live",      roi: parseFloat(calcStats(bets.filter(b=>b.live)).roi.toFixed(1)) },
    { type:"Pré-match", roi: parseFloat(calcStats(bets.filter(b=>!b.live)).roi.toFixed(1)) },
  ];
  const bookData = BOOKMAKERS.map(bk => {
    const bb = bets.filter(b=>b.bookmaker===bk);
    const bs = calcStats(bb);
    return { name:bk, roi:parseFloat(bs.roi.toFixed(1)), paris:bb.length };
  }).filter(d=>d.paris>0);

  const typeData = TYPES.map(t => {
    const tb = bets.filter(b=>b.type===t);
    const ts = calcStats(tb);
    return { name:t, roi:parseFloat(ts.roi.toFixed(1)), paris:tb.length };
  }).filter(d=>d.paris>0);

  // Taux réussite par cote range
  const coteRanges = [
    { label:"<1.5",  min:0,   max:1.5  },
    { label:"1.5-2", min:1.5, max:2    },
    { label:"2-2.5", min:2,   max:2.5  },
    { label:"2.5-3", min:2.5, max:3    },
    { label:">3",    min:3,   max:999  },
  ].map(r => {
    const rb = bets.filter(b=>b.cote>=r.min && b.cote<r.max);
    const rs = calcStats(rb);
    return { name:r.label, taux:parseFloat(rs.tauxReussite.toFixed(1)), paris:rb.length };
  }).filter(d=>d.paris>0);

  // Performance par jour de semaine
  const jours = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
  const jourData = jours.map((j,i) => {
    const jb = bets.filter(b=>new Date(b.date).getDay()===i);
    const js = calcStats(jb);
    return { name:j, roi:parseFloat(js.roi.toFixed(1)), paris:jb.length };
  });

  // Stats par marché
  const marcheData = Object.keys(MARCHES).map(m => {
    const mb = bets.filter(b=>b.marche===m);
    const ms = calcStats(mb);
    return { name:m, roi:parseFloat(ms.roi.toFixed(1)), taux:parseFloat(ms.tauxReussite.toFixed(1)), paris:mb.length };
  }).filter(d=>d.paris>0);

  // Top sous-marchés
  const sousMarcheMap = {};
  bets.forEach(b => {
    const k = b.sousMarche || "—";
    if (!sousMarcheMap[k]) sousMarcheMap[k] = { total:0, won:0, gain:0 };
    sousMarcheMap[k].total++;
    if (b.resultat==="gagné") { sousMarcheMap[k].won++; sousMarcheMap[k].gain += b.gain - b.mise; }
    else sousMarcheMap[k].gain -= b.mise;
  });
  const topSousMarches = Object.entries(sousMarcheMap)
    .map(([name,d]) => ({ name, ...d, taux: parseFloat((d.won/d.total*100).toFixed(0)), gain: parseFloat(d.gain.toFixed(1)) }))
    .filter(d=>d.total>=1)
    .sort((a,b)=>b.gain-a.gain)
    .slice(0,8);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <StatCard label="Paris gagnés" value={`${s.won}/${s.total}`} sub={`${s.tauxReussite.toFixed(1)}% réussite`} icon="✅" color={COLORS.green}/>
        <StatCard label="Cote moy. gains" value={calcStats(bets.filter(b=>b.resultat==="gagné")).coteMoy.toFixed(2)} sub="Paris gagnants" icon="📈" color={COLORS.teal}/>
      </div>

      {/* Répartition sport */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🏆 Répartition par sport</div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={sportPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
              {sportPie.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
            </Pie>
            <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Live vs pré-match */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>⚡ Live vs Pré-match</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={livePre} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={({name,value})=>`${name} ${value}`} labelLine={false}>
                {livePre.map((_,i)=><Cell key={i} fill={[COLORS.amber,COLORS.blue][i]}/>)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={gainByLive}>
              <YAxis tick={{fill:COLORS.muted,fontSize:10}}/>
              <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
              <Bar dataKey="roi" fill={COLORS.teal} radius={[4,4,0,0]}>
                {gainByLive.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.green:COLORS.red}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ROI bookmaker */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🏦 ROI par bookmaker</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={bookData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
            <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:10}}/>
            <YAxis tick={{fill:COLORS.muted,fontSize:10}}/>
            <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
            <Bar dataKey="roi" radius={[4,4,0,0]}>
              {bookData.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.teal:COLORS.red}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ROI type */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🎰 ROI par type de pari</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={typeData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
            <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:11}}/>
            <YAxis tick={{fill:COLORS.muted,fontSize:11}}/>
            <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
            <Bar dataKey="roi" radius={[4,4,0,0]}>
              {typeData.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.amber:COLORS.red}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Taux réussite par cote */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🎯 Réussite par cote</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={coteRanges}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
            <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:11}}/>
            <YAxis tick={{fill:COLORS.muted,fontSize:11}} domain={[0,100]}/>
            <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
            <Bar dataKey="taux" fill={COLORS.purple} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Performance par jour */}
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>📅 Performance par jour</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={jourData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
            <XAxis dataKey="name" tick={{fill:COLORS.muted,fontSize:11}}/>
            <YAxis tick={{fill:COLORS.muted,fontSize:11}}/>
            <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}/>
            <Bar dataKey="roi" radius={[4,4,0,0]}>
              {jourData.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.blue:COLORS.red}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ROI par marché */}
      {marcheData.length > 0 && (
        <Card>
          <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🎯 ROI par type de marché</div>
          <ResponsiveContainer width="100%" height={Math.max(160, marcheData.length * 36)}>
            <BarChart data={marcheData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
              <XAxis type="number" tick={{fill:COLORS.muted,fontSize:10}}/>
              <YAxis type="category" dataKey="name" tick={{fill:COLORS.muted,fontSize:10}} width={90}/>
              <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}
                formatter={(v,n,p)=>[`${v}% ROI · ${p.payload.paris} paris`,""]}/>
              <Bar dataKey="roi" radius={[0,4,4,0]}>
                {marcheData.map((e,i)=><Cell key={i} fill={e.roi>=0?COLORS.teal:COLORS.red}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Taux réussite par marché */}
      {marcheData.length > 0 && (
        <Card>
          <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>✅ Réussite par marché</div>
          <ResponsiveContainer width="100%" height={Math.max(160, marcheData.length * 36)}>
            <BarChart data={marcheData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border}/>
              <XAxis type="number" domain={[0,100]} tick={{fill:COLORS.muted,fontSize:10}}/>
              <YAxis type="category" dataKey="name" tick={{fill:COLORS.muted,fontSize:10}} width={90}/>
              <Tooltip contentStyle={{ background:COLORS.card2, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text }}
                formatter={(v,n,p)=>[`${v}% réussite · ${p.payload.paris} paris`,""]}/>
              <Bar dataKey="taux" radius={[0,4,4,0]}>
                {marcheData.map((e,i)=><Cell key={i} fill={e.taux>=50?COLORS.green:COLORS.amber}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Top sous-marchés */}
      {topSousMarches.length > 0 && (
        <Card>
          <div style={{ color:COLORS.text, fontWeight:700, marginBottom:12 }}>🏅 Meilleures sélections</div>
          {topSousMarches.map((sm,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom: i<topSousMarches.length-1?`1px solid ${COLORS.border}`:"none" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:COLORS.text, fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sm.name}</div>
                <div style={{ color:COLORS.muted, fontSize:11 }}>{sm.total} paris · {sm.taux}% réussite</div>
              </div>
              <div style={{ textAlign:"right", marginLeft:10, flexShrink:0 }}>
                <div style={{ color:sm.gain>=0?COLORS.green:COLORS.red, fontWeight:800, fontSize:14 }}>{sm.gain>=0?"+":""}{sm.gain} €</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── ONGLET 2 : Mes paris ──────────────────────────────────────────────────
function BetsList({ bets, onAdd, onDelete }) {
  const [filter, setFilter] = useState("tous");

  const filtered = filter==="tous" ? bets
    : filter==="gagné"||filter==="perdu" ? bets.filter(b=>b.resultat===filter)
    : bets.filter(b=>b.sport===filter);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <button onClick={onAdd} style={{
        background:COLORS.green, color:COLORS.bg, border:"none", borderRadius:10,
        padding:"14px", fontSize:15, fontWeight:800, cursor:"pointer", width:"100%"
      }}>+ Ajouter un pari</button>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {["tous","gagné","perdu"].map(f=>(
          <Btn key={f} active={filter===f} onClick={()=>setFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</Btn>
        ))}
      </div>

      {filtered.map(b => (
        <Card key={b.id}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                <Badge color={b.resultat==="gagné"?COLORS.green:COLORS.red}>{b.resultat==="gagné"?"✅ Gagné":"❌ Perdu"}</Badge>
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
            <button onClick={()=>onDelete(b.id)} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:18, cursor:"pointer" }}>🗑</button>
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
function Leaderboard({ bets }) {
  const myS = calcStats(bets);
  const fakeUsers = [
    { name:"🏆 TipsterPro",  roi:42.3, wins:78, paris:120, profit:890 },
    { name:"⚡ BetKing",     roi:35.1, wins:65, paris:98,  profit:640 },
    { name:"🎯 Vous",        roi:parseFloat(myS.roi.toFixed(1)), wins:myS.won, paris:myS.total, profit:parseFloat(myS.benefice.toFixed(0)) },
    { name:"🔥 FootMaster",  roi:28.7, wins:55, paris:85,  profit:420 },
    { name:"💎 ValueBettor", roi:21.5, wins:42, paris:70,  profit:310 },
    { name:"🎰 ComboBoss",   roi:15.2, wins:38, paris:65,  profit:210 },
  ].sort((a,b)=>b.roi-a.roi);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <Card>
        <div style={{ color:COLORS.text, fontWeight:700, fontSize:16, marginBottom:4 }}>🏆 Classement Global</div>
        <div style={{ color:COLORS.muted, fontSize:12 }}>Les pseudos sont les seules données visibles — email confidentiel (RGPD)</div>
      </Card>

      {fakeUsers.map((u,i) => (
        <Card key={i} style={{ border: u.name.includes("Vous") ? `1px solid ${COLORS.green}` : undefined }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              background: i===0?COLORS.amber:i===1?"#9e9e9e":i===2?"#cd7f32":COLORS.card2,
              color: i<3?COLORS.bg:COLORS.muted,
              width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:900, fontSize:14, flexShrink:0
            }}>#{i+1}</div>
            <div style={{ flex:1 }}>
              <div style={{ color: u.name.includes("Vous")?COLORS.green:COLORS.text, fontWeight:700, fontSize:14 }}>{u.name}</div>
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
                Envoyé en tant que <span style={{color:COLORS.text, fontWeight:600}}>@{user?.pseudo || "Anonyme"}</span> — réponse à <span style={{color:COLORS.text, fontWeight:600}}>{user?.email || "—"}</span>
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

      {/* Jeu responsable */}
      <Card>
        <div style={{ color:COLORS.red, fontWeight:800, fontSize:16, marginBottom:8 }}>🆘 Jeu responsable</div>
        <p style={{ color:COLORS.muted, fontSize:13, lineHeight:1.6 }}>
          Les paris sportifs peuvent créer une dépendance. Si vous ressentez des difficultés, des aides gratuites sont disponibles.
        </p>
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
    cote: "", mise: "", resultat: "gagné", live: false
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const [showScan, setShowScan] = useState(false);

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
    <div className="c-screen" style={{
      position:"fixed", inset:0,
      background:"radial-gradient(ellipse at 50% 45%, #0a1f0f 0%, #060d08 55%, #020504 100%)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      zIndex:9999, overflow:"hidden"
    }}>
      <style>{`
        /* ── 1. Cercle se trace lentement ── */
        @keyframes circleTrace {
          0%   { stroke-dashoffset:600; opacity:0; }
          8%   { opacity:1; }
          35%,100% { stroke-dashoffset:0; opacity:1; }
        }

        /* ── 2. Fond sombre apparaît ── */
        @keyframes bgFade {
          0%,5% { opacity:0; }
          25%,100% { opacity:.92; }
        }

        /* ── 3. Barres montent une par une lentement ── */
        @keyframes bar1 {
          0%,20% { transform:scaleY(0); opacity:0; }
          38%    { transform:scaleY(1.06); opacity:1; }
          45%,100% { transform:scaleY(1); opacity:1; }
        }
        @keyframes bar2 {
          0%,28% { transform:scaleY(0); opacity:0; }
          46%    { transform:scaleY(1.06); opacity:1; }
          53%,100% { transform:scaleY(1); opacity:1; }
        }
        @keyframes bar3 {
          0%,36% { transform:scaleY(0); opacity:0; }
          54%    { transform:scaleY(1.08); opacity:1; }
          61%,100% { transform:scaleY(1); opacity:1; }
        }
        @keyframes bar4 {
          0%,44% { transform:scaleY(0); opacity:0; }
          62%    { transform:scaleY(1.08); opacity:1; }
          69%,100% { transform:scaleY(1); opacity:1; }
        }
        @keyframes bar5 {
          0%,52% { transform:scaleY(0); opacity:0; }
          70%    { transform:scaleY(1.06); opacity:1; }
          77%,100% { transform:scaleY(1); opacity:1; }
        }

        /* ── 4. Ligne de tendance se trace ── */
        @keyframes lineTrace {
          0%,55%  { stroke-dashoffset:400; opacity:0; }
          60%     { opacity:1; }
          78%,100%{ stroke-dashoffset:0; opacity:1; }
        }

        /* ── 5. Points apparaissent un à un ── */
        @keyframes dot1 { 0%,62%{transform:scale(0);opacity:0} 70%{transform:scale(1.5);opacity:1} 76%,100%{transform:scale(1);opacity:1} }
        @keyframes dot2 { 0%,66%{transform:scale(0);opacity:0} 74%{transform:scale(1.5);opacity:1} 80%,100%{transform:scale(1);opacity:1} }
        @keyframes dot3 { 0%,70%{transform:scale(0);opacity:0} 78%{transform:scale(1.5);opacity:1} 84%,100%{transform:scale(1);opacity:1} }
        @keyframes dot4 { 0%,74%{transform:scale(0);opacity:0} 82%{transform:scale(1.5);opacity:1} 88%,100%{transform:scale(1);opacity:1} }
        @keyframes dot5 { 0%,78%{transform:scale(0);opacity:0} 86%{transform:scale(1.6);opacity:1} 92%,100%{transform:scale(1);opacity:1} }

        /* ── 6. Ballon — rebond lent et réaliste ── */
        @keyframes ballIn {
          0%,55%  { transform:translateY(320px) scale(0.15) rotate(0deg);   opacity:0; }
          60%     { opacity:1; }
          /* 1er rebond — haut */
          70%     { transform:translateY(-55px)  scale(1.18) rotate(210deg); opacity:1; }
          /* retombe */
          76%     { transform:translateY(18px)   scale(0.90) rotate(260deg); opacity:1; }
          /* 2e rebond */
          82%     { transform:translateY(-28px)  scale(1.08) rotate(300deg); opacity:1; }
          /* retombe */
          87%     { transform:translateY(10px)   scale(0.96) rotate(330deg); opacity:1; }
          /* 3e rebond léger */
          91%     { transform:translateY(-12px)  scale(1.03) rotate(345deg); opacity:1; }
          /* stabilise */
          95%     { transform:translateY(4px)    scale(0.99) rotate(355deg); opacity:1; }
          100%    { transform:translateY(0px)    scale(1)    rotate(360deg); opacity:1; }
        }

        /* Ombre ballon — s'écrase à chaque rebond */
        @keyframes shadowIn {
          0%,55%  { transform:scaleX(.05) scaleY(.5); opacity:0; }
          70%     { transform:scaleX(1.6) scaleY(.4); opacity:.5; }
          76%     { transform:scaleX(.8) scaleY(.8);  opacity:.25; }
          82%     { transform:scaleX(1.4) scaleY(.5); opacity:.45; }
          87%     { transform:scaleX(.9) scaleY(.8);  opacity:.28; }
          91%     { transform:scaleX(1.2) scaleY(.6); opacity:.38; }
          95%     { transform:scaleX(1.0) scaleY(.8); opacity:.28; }
          100%    { transform:scaleX(1)  scaleY(1);   opacity:.25; }
        }

        /* ── 7. Texte Oddrix apparaît lettre par lettre ── */
        @keyframes textReveal {
          0%,82%  { opacity:0; transform:translateY(18px) scale(.92); }
          90%     { opacity:1; transform:translateY(-2px) scale(1.02); }
          100%    { opacity:1; transform:translateY(0)    scale(1); }
        }

        /* ── 8. Slogan ── */
        @keyframes sloganIn {
          0%,88%  { opacity:0; }
          100%    { opacity:1; }
        }

        /* ── Barre chargement ── */
        @keyframes loadBar { from{width:0} to{width:100%} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }

        /* ── Lueur pulsante ── */
        @keyframes glow {
          0%,100% { filter:drop-shadow(0 0 8px #00e67633) }
          50%     { filter:drop-shadow(0 0 22px #76ff0355) drop-shadow(0 0 40px #00e67633) }
        }

        /* ── Particules ── */
        @keyframes spark {
          0%,100% { transform:translateY(0) scale(1);    opacity:.35; }
          50%     { transform:translateY(-20px) scale(1.3); opacity:.8; }
        }

        /* ── Anneaux ── */
        @keyframes ring1 { to{transform:rotate(360deg)}  }
        @keyframes ring2 { to{transform:rotate(-360deg)} }

        /* ── Barre chargement ── */
        @keyframes loadBar { from{width:0} to{width:100%} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        /* Fondu sortie vers l'app */
        @keyframes fadeOut {
          0%,80% { opacity:1; }
          100%   { opacity:0; pointer-events:none; }
        }

        /* Classes — animation sur 7s */
        .c-circle  { stroke-dasharray:600; animation:circleTrace 7s ease both; }
        .c-bg      { animation:bgFade 7s ease both; }
        .c-bar1    { transform-origin:bottom center; animation:bar1 7s cubic-bezier(.34,1.4,.64,1) both; }
        .c-bar2    { transform-origin:bottom center; animation:bar2 7s cubic-bezier(.34,1.4,.64,1) both; }
        .c-bar3    { transform-origin:bottom center; animation:bar3 7s cubic-bezier(.34,1.4,.64,1) both; }
        .c-bar4    { transform-origin:bottom center; animation:bar4 7s cubic-bezier(.34,1.4,.64,1) both; }
        .c-bar5    { transform-origin:bottom center; animation:bar5 7s cubic-bezier(.34,1.4,.64,1) both; }
        .c-line    { stroke-dasharray:400; animation:lineTrace 7s ease both; }
        .c-d1      { transform-origin:center; animation:dot1 7s cubic-bezier(.34,1.6,.64,1) both; }
        .c-d2      { transform-origin:center; animation:dot2 7s cubic-bezier(.34,1.6,.64,1) both; }
        .c-d3      { transform-origin:center; animation:dot3 7s cubic-bezier(.34,1.6,.64,1) both; }
        .c-d4      { transform-origin:center; animation:dot4 7s cubic-bezier(.34,1.6,.64,1) both; }
        .c-d5      { transform-origin:center; animation:dot5 7s cubic-bezier(.34,1.6,.64,1) both; }
        .c-ball    { animation:ballIn 7s cubic-bezier(.34,1.1,.64,1) both; }
        .c-shadow  { animation:shadowIn 7s ease both; }
        .c-text    { animation:textReveal 7s cubic-bezier(.34,1.2,.64,1) both; }
        .c-slogan  { animation:sloganIn 7s ease both; }
        .c-glow    { animation:glow 2.5s 7s ease-in-out infinite; }
        /* Fondu écran complet — démarre à 9s, dure 1.5s */
        .c-screen  { animation:fadeOut 10.5s 0s ease forwards; }
      `}</style>

      {/* Particules fond */}
      {[...Array(10)].map((_,i)=>(
        <div key={i} style={{
          position:"absolute",
          width:2+(i%3)*2, height:2+(i%3)*2, borderRadius:"50%",
          background:["#00e676","#76ff03","#1de9b6"][i%3],
          left:`${6+i*9}%`, top:`${8+(i*19)%72}%`,
          animation:`spark ${2+i*0.4}s ${i*0.3}s ease-in-out infinite`,
        }}/>
      ))}

      {/* Anneaux */}
      <div style={{position:"absolute",width:380,height:380,borderRadius:"50%",border:"1px solid #00e67610",animation:"ring1 16s linear infinite"}}/>
      <div style={{position:"absolute",width:320,height:320,borderRadius:"50%",border:"1px dashed #76ff0314",animation:"ring2 11s linear infinite"}}/>

      {/* ═══ SVG LOGO SE CONSTRUIT ═══ */}
      <div className="c-glow" style={{position:"relative",width:270,height:270}}>
        <svg width="270" height="270" viewBox="0 0 270 270" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gBar" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1de9b6"/><stop offset="100%" stopColor="#76ff03"/>
            </linearGradient>
            <linearGradient id="gCirc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3dff6e"/><stop offset="100%" stopColor="#76ff03"/>
            </linearGradient>
            <radialGradient id="gBall" cx="36%" cy="30%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="45%" stopColor="#e0e0e0"/>
              <stop offset="100%" stopColor="#999999"/>
            </radialGradient>
            <filter id="glow2"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="ballDrop"><feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity=".55"/></filter>
          </defs>

          {/* Cercle — se trace en premier */}
          <circle className="c-circle" cx="122" cy="116" r="96"
            fill="none" stroke="url(#gCirc)" strokeWidth="4.5" strokeLinecap="round"/>

          {/* Fond sombre */}
          <circle className="c-bg" cx="122" cy="116" r="92" fill="#050d07"/>

          {/* Barres — montent une par une */}
          <rect className="c-bar1" x="44"  y="154" width="20" height="24" rx="5" fill="url(#gBar)" filter="url(#glow2)"/>
          <rect className="c-bar2" x="70"  y="132" width="20" height="46" rx="5" fill="url(#gBar)" filter="url(#glow2)"/>
          <rect className="c-bar3" x="96"  y="106" width="20" height="72" rx="5" fill="url(#gBar)" filter="url(#glow2)"/>
          <rect className="c-bar4" x="122" y="84"  width="20" height="94" rx="5" fill="url(#gBar)" filter="url(#glow2)"/>
          <rect className="c-bar5" x="148" y="96"  width="20" height="82" rx="5" fill="url(#gBar)" filter="url(#glow2)"/>

          {/* Ligne de tendance */}
          <polyline className="c-line"
            points="44,156 70,132 96,104 122,78 148,58 170,38"
            fill="none" stroke="#00e676" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
            filter="url(#glow2)"/>

          {/* Points */}
          <circle className="c-d1" cx="44"  cy="156" r="5.5" fill="#1de9b6" filter="url(#glow2)"/>
          <circle className="c-d2" cx="70"  cy="132" r="5.5" fill="#1de9b6" filter="url(#glow2)"/>
          <circle className="c-d3" cx="96"  cy="104" r="5.5" fill="#00e676" filter="url(#glow2)"/>
          <circle className="c-d4" cx="122" cy="78"  r="5.5" fill="#00e676" filter="url(#glow2)"/>
          <circle className="c-d5" cx="170" cy="38"  r="7"   fill="#76ff03" filter="url(#glow2)"/>

          {/* Ballon — rebondit en dernier — vrai ballon de foot */}
          <g className="c-ball" filter="url(#ballDrop)">
            {/* Corps blanc du ballon */}
            <circle cx="182" cy="186" r="42" fill="url(#gBall)" stroke="#cccccc" strokeWidth=".5"/>

            {/* Pentagone central noir */}
            <polygon
              points="182,162 196,172 191,188 173,188 168,172"
              fill="#1a1a1a" stroke="#000" strokeWidth=".5"/>

            {/* 5 pentagones autour — disposition réelle d'un ballon */}
            {/* haut-gauche */}
            <polygon points="163,157 168,172 155,180 145,170 149,156" fill="#1a1a1a" stroke="#000" strokeWidth=".5"/>
            {/* haut-droite */}
            <polygon points="201,157 215,156 219,170 209,180 196,172" fill="#1a1a1a" stroke="#000" strokeWidth=".5"/>
            {/* bas-droite */}
            <polygon points="209,200 219,214 208,223 196,217 191,202" fill="#1a1a1a" stroke="#000" strokeWidth=".5"/>
            {/* bas */}
            <polygon points="182,210 191,202 196,217 182,224 168,217 173,202" fill="#1a1a1a" stroke="#000" strokeWidth=".5" opacity=".9"/>
            {/* bas-gauche */}
            <polygon points="155,200 173,202 168,217 156,223 145,214" fill="#1a1a1a" stroke="#000" strokeWidth=".5"/>

            {/* Lignes blanches entre pentagones */}
            <line x1="182" y1="162" x2="182" y2="144" stroke="white" strokeWidth="1" opacity=".15"/>
            <line x1="168" y1="172" x2="155" y2="180" stroke="white" strokeWidth="1" opacity=".15"/>
            <line x1="196" y1="172" x2="209" y2="180" stroke="white" strokeWidth="1" opacity=".15"/>

            {/* Reflet lumineux */}
            <ellipse cx="168" cy="160" rx="12" ry="8"
              fill="white" opacity=".4" transform="rotate(-35,168,160)"/>
            <ellipse cx="172" cy="163" rx="5" ry="3"
              fill="white" opacity=".6" transform="rotate(-35,172,163)"/>
          </g>
        </svg>

        {/* Ombre ballon */}
        <div className="c-shadow" style={{
          position:"absolute", bottom:2, right:14,
          width:80, height:16, borderRadius:"50%",
          background:"radial-gradient(ellipse,#00000077,transparent)",
        }}/>
      </div>

      {/* Texte Oddrix */}
      <div className="c-text" style={{textAlign:"center", marginTop:20}}>
        <div style={{
          fontFamily:"'Syne',sans-serif", fontWeight:900,
          fontSize:38, letterSpacing:-1, lineHeight:1
        }}>
          <span style={{color:"#ffffff"}}>Odd</span>
          <span style={{color:"#76ff03", textShadow:"0 0 20px #76ff0366"}}>rix</span>
        </div>
      </div>

      {/* Salutation + slogan */}
      <div className="c-slogan" style={{textAlign:"center", marginTop:10}}>
        <div style={{color:"#8b949e", fontSize:13, fontWeight:600, letterSpacing:2, textTransform:"uppercase", marginBottom:5}}>
          {timeGreet}
        </div>
        <div style={{color:"#8b949e", fontSize:10, letterSpacing:3, textTransform:"uppercase"}}>
          Statistiques · Analyses · Performance
        </div>
      </div>

      {/* Barre de chargement — apparaît à 6.5s, se remplit en 2s */}
      <div style={{
        width:180, height:3, background:"#1a2a1a", borderRadius:2,
        marginTop:24, overflow:"hidden",
        animation:"fadeIn .4s 6.5s ease forwards", opacity:0
      }}>
        <div style={{
          height:"100%", borderRadius:2,
          background:"linear-gradient(90deg,#1de9b6,#76ff03,#1de9b6)",
          animation:"loadBar 2s 6.7s ease forwards", width:0
        }}/>
      </div>

      {/* oddrix.fr — apparaît à 7s */}
      <div style={{
        position:"absolute", bottom:30,
        color:"#ffffff18", fontSize:10, letterSpacing:3, textTransform:"uppercase",
        animation:"fadeIn .4s 7s ease forwards", opacity:0
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

  const handleSend = () => {
    setError("");
    if (!email.includes("@")) { setError("Email invalide."); return; }
    const users = JSON.parse(localStorage.getItem("sb_users")||"[]");
    // En prod: envoi d'un vrai email via Firebase. Ici on simule.
    const user = users.find(u=>u.email===email);
    if (!user) { setError("Aucun compte avec cet email."); return; }
    // Génère un token temporaire
    const token = Math.random().toString(36).slice(2,10).toUpperCase();
    user.resetToken = token;
    user.resetExpiry = Date.now() + 15*60*1000;
    const idx = users.findIndex(u=>u.email===email);
    users[idx] = user;
    localStorage.setItem("sb_users", JSON.stringify(users));
    console.log(`[DEV] Token de réinitialisation pour ${email}: ${token}`);
    setStep("sent");
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

  const handleDelete = () => {
    if (confirm !== "SUPPRIMER") { setError('Tapez exactement "SUPPRIMER" pour confirmer.'); return; }
    const users = JSON.parse(localStorage.getItem("sb_users")||"[]");
    const filtered = users.filter(u=>u.id!==user.id);
    localStorage.setItem("sb_users", JSON.stringify(filtered));
    localStorage.removeItem("sb_session");
    onDeleted();
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

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:200, display:"flex", alignItems:"flex-end" }}>
      <div style={{ background:COLORS.card, width:"100%", borderRadius:"20px 20px 0 0", padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17 }}>📸 Scanner un ticket</div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:24, cursor:"pointer" }}>✕</button>
        </div>
        <p style={{ color:COLORS.muted, fontSize:13, lineHeight:1.6, marginBottom:20 }}>
          📱 <strong style={{color:COLORS.text}}>Depuis votre bookmaker :</strong> faites une capture d'écran puis choisissez-la dans votre galerie.<br/>
          📷 Ou photographiez directement votre ticket papier.<br/>
          <span style={{color:COLORS.teal}}>L'IA extrait automatiquement toutes les infos.</span>
        </p>

        {preview && <img src={preview} style={{ width:"100%", borderRadius:12, marginBottom:16, maxHeight:200, objectFit:"cover" }} alt="aperçu"/>}

        {loading ? (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🔍</div>
            <div style={{ color:COLORS.green, fontWeight:700 }}>Analyse en cours...</div>
            <div style={{ color:COLORS.muted, fontSize:12, marginTop:4 }}>L'IA lit votre ticket</div>
          </div>
        ) : (
          <label style={{ display:"block", background:COLORS.green, color:COLORS.bg, borderRadius:12, padding:"14px", textAlign:"center", fontWeight:800, fontSize:15, cursor:"pointer" }}>
            📷 Photo ou capture d'écran
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display:"none" }}/>
          </label>
        )}

        {error && <div style={{ background:`${COLORS.red}18`, border:`1px solid ${COLORS.red}44`, borderRadius:8, padding:"10px", color:COLORS.red, fontSize:13, marginTop:14 }}>⚠️ {error}</div>}
        <p style={{ color:COLORS.muted, fontSize:11, textAlign:"center", marginTop:14, lineHeight:1.5 }}>
          💡 Vérifiez toujours les données extraites avant d'enregistrer
        </p>
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

  const handleSubmit = () => {
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
      // Vérification majorité 18 ans
      const birth = new Date(`${birthYear}-${birthMonth}-${birthDay}`);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear() - (
        today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0
      );
      if (isNaN(birth.getTime())) { setError("Date de naissance invalide."); return; }
      if (age < 18) { setError("Vous devez avoir 18 ans ou plus pour vous inscrire."); return; }
    }

    const users = JSON.parse(localStorage.getItem("sb_users")||"[]");

    if (mode==="register") {
      if (users.find(u=>u.email===email)) { setError("Cet email est déjà utilisé."); return; }
      if (users.find(u=>u.pseudo?.toLowerCase()===pseudo.trim().toLowerCase())) { setError("Ce pseudo est déjà pris, choisissez-en un autre."); return; }

      const isAdmin = email === ADMIN_EMAIL;
      const promoApplied = promoValid && promoValid !== false ? promoValid : null;
      const totalDays = 7 + (promoApplied ? promoApplied.extraDays : 0);
      const newUser = {
        id: Date.now(),
        name: name.trim(),
        pseudo: pseudo.trim(),
        email,
        password,
        birthDate: `${birthYear}-${birthMonth}-${birthDay}`,
        createdAt: new Date().toISOString(),
        trialEnd: new Date(Date.now() + totalDays*24*60*60*1000).toISOString(),
        subscribed: isAdmin,
        isAdmin,
        plan: isAdmin ? "admin" : null,
        promoCode: promoApplied ? promoCode.trim().toUpperCase() : null,
        promoLabel: promoApplied ? promoApplied.label : null,
        bets: [],
        bankroll: 500,
        transactions: [{ type:"Dépôt", montant:500, date:new Date().toISOString().slice(0,10) }],
      };
      users.push(newUser);
      localStorage.setItem("sb_users", JSON.stringify(users));
      localStorage.setItem("sb_session", JSON.stringify({ id:newUser.id, email:newUser.email }));
      onAuth(newUser, true); // true = nouveau compte → onboarding
    } else {
      // Connexion admin spéciale
      if (email===ADMIN_EMAIL) {
        const adminUser = users.find(u=>u.email===ADMIN_EMAIL);
        if (!adminUser || adminUser.password!==password) { setError("Email ou mot de passe incorrect."); return; }
        // S'assurer que l'admin est toujours Premium
        adminUser.subscribed = true;
        adminUser.isAdmin = true;
        const idx = users.findIndex(u=>u.email===ADMIN_EMAIL);
        users[idx] = adminUser;
        localStorage.setItem("sb_users", JSON.stringify(users));
        localStorage.setItem("sb_session", JSON.stringify({ id:adminUser.id, email:adminUser.email }));
        onAuth(adminUser);
        return;
      }
      const user = users.find(u=>u.email===email && u.password===password);
      if (!user) { setError("Email ou mot de passe incorrect."); return; }
      localStorage.setItem("sb_session", JSON.stringify({ id:user.id, email:user.email }));
      onAuth(user);
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
  const [user, setUser]         = useState(null);
  const [screen, setScreen]     = useState("loading");
  const [showSplash, setShowSplash] = useState(false);
  const [isNewUser, setIsNewUser]   = useState(false);
  const [tab, setTab]           = useState(0);
  const [bets, setBets]         = useState([]);
  const [showAdd, setShowAdd]   = useState(false);

  // ── loginUser déclaré en premier car utilisé dans l'init ────────────────
  const loginUser = (u, isNew=false) => {
    setUser(u);
    setBets(u.bets || []);
    const trialEnd = new Date(u.trialEnd);
    const now = new Date();
    const hasAccess = u.subscribed || trialEnd > now;

    // Toujours afficher le splash — inscription ou connexion
    setIsNewUser(isNew);
    setShowSplash(true);
    setTimeout(() => {
      setShowSplash(false);
      if (isNew) {
        // Après le splash → onboarding pour les nouveaux
        setScreen("onboarding");
      } else {
        setScreen(hasAccess ? "app" : "paywall");
      }
    }, 11000);
  };

  // ── Vérifier session au démarrage
  useEffect(()=>{
    const session = localStorage.getItem("sb_session");
    if (!session) { setScreen("auth"); return; }
    try {
      const { id } = JSON.parse(session);
      const users = JSON.parse(localStorage.getItem("sb_users")||"[]");
      const u = users.find(u=>u.id===id);
      if (!u) { setScreen("auth"); return; }
      loginUser(u);
    } catch(e) { setScreen("auth"); }
  }, []);

  const handleAuth = (u, isNew=false) => loginUser(u, isNew);

  const handleLogout = () => {
    localStorage.removeItem("sb_session");
    setUser(null);
    setScreen("auth");
  };

  const handleSubscribe = (plan) => {
    // En production : redirection vers Stripe Checkout
    // Ici simulation de l'abonnement activé
    const users = JSON.parse(localStorage.getItem("sb_users")||"[]");
    const idx = users.findIndex(u=>u.id===user.id);
    if (idx>=0) {
      users[idx].subscribed = true;
      users[idx].plan = plan;
      users[idx].subscribedAt = new Date().toISOString();
      localStorage.setItem("sb_users", JSON.stringify(users));
      setUser(users[idx]);
    }
    setScreen("app");
  };

  const saveBets = (newBets) => {
    setBets(newBets);
    const users = JSON.parse(localStorage.getItem("sb_users")||"[]");
    const idx = users.findIndex(u=>u.id===user?.id);
    if (idx>=0) { users[idx].bets = newBets; localStorage.setItem("sb_users", JSON.stringify(users)); }
  };

  const addBet = bet => saveBets([...bets, bet]);
  const delBet = id  => saveBets(bets.filter(b=>b.id!==id));

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
        {tab===2 && <BetsList bets={bets} onAdd={()=>setShowAdd(true)} onDelete={delBet}/>}
        {tab===3 && <Analysis bets={bets}/>}
        {tab===4 && <Profile bets={bets} user={user} onLogout={handleLogout} onSubscribe={()=>setScreen("paywall")}/>}
        {tab===5 && <Leaderboard bets={bets}/>}
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
