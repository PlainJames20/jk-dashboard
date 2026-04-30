import React, { useState, useRef, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#000000", card:"#0f0f0f", bord:"#1f1f1f", bord2:"#2a2a2a",
  p1:"#7c3aed", p2:"#a855f7", p3:"#c084fc",
  dim:"#444444", sub:"#666666", txt:"#f0f0f0", txt2:"#999999",
  green:"#22c55e", amber:"#f59e0b", rose:"#f43f5e", blue:"#38bdf8",
};

// ── Date ──────────────────────────────────────────────────────────────────────
const NOW       = new Date();
const TODAY_D   = NOW.getDate();
const TODAY_M   = NOW.getMonth();
const TODAY_Y   = NOW.getFullYear();
const TODAY_S   = NOW.toISOString().split("T")[0];
const TODAY_DOW = (NOW.getDay() + 6) % 7;
const TODAY_LBL = NOW.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
const DAYS      = ["M","T","W","T","F","S","S"];
const TARGETS   = { cal:[2400,2600], protein:160, fats:80, carbs:240 };

// ── Storage ───────────────────────────────────────────────────────────────────
const LS = { DATA:"jk:dash:v7", TPLS:"jk:tpl:v5", FBURL:"jk:fb:url", MEALS:"jk:meals:v3", RESET:"jk:reset:v2", WEIGHT:"jk:weight:v1", JOURNAL:"jk:journal:v1" };

async function lGet(k) {
  try {
    if (window.storage) { var r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; }
    var v = localStorage.getItem(k); return v ? JSON.parse(v) : null;
  } catch { return null; }
}
async function lSet(k, v) {
  try {
    if (window.storage) { await window.storage.set(k, JSON.stringify(v)); }
    else { localStorage.setItem(k, JSON.stringify(v)); }
  } catch {}
}
async function fbRead(url) {
  try { var r = await fetch(url + "/jk-dashboard.json"); return r.ok ? await r.json() : null; } catch { return null; }
}
async function fbWrite(url, data) {
  try { await fetch(url + "/jk-dashboard.json", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) }); } catch {}
}
function getAiUrl() {
  try { var h = window.location.hostname; return (h.includes("anthropic")||h.includes("claude")) ? "https://api.anthropic.com/v1/messages" : "/api/ai"; } catch { return "https://api.anthropic.com/v1/messages"; }
}
const AI_URL = getAiUrl();

// ── Initial Data ──────────────────────────────────────────────────────────────
function fw() { return [false,false,false,false,false,false,false]; }

const INIT_MORNING = [
  { id:"m1", name:"Visualization",    mode:"check", done:false,   freq:3,       weekDone:fw(), streak:0 },
  { id:"m2", name:"Meditation",       mode:"range", todayMins:0,  freq:"daily", weekDone:fw(), streak:0, rangeMin:10, rangeMax:25 },
  { id:"m3", name:"Reading",          mode:"pages", todayPages:0, freq:"daily", weekDone:fw(), streak:0, targetPages:20 },
  { id:"m4", name:"📓 Journal",       mode:"mins",  todayMins:0,  freq:3,       weekDone:fw(), streak:0, targetMins:10 },
  { id:"m5", name:"☀️ Solar Charge",  mode:"check", done:false,   freq:"daily", weekDone:fw(), streak:0 },
  { id:"m6", name:"🧊 Cold Protocol", mode:"check", done:false,   freq:"daily", weekDone:fw(), streak:0 },
];
const INIT_ATHLETE = [
  { id:"a1", name:"Run",               icon:"🏃", freq:4,       weekDone:fw(), todayMins:0, targetMins:30 },
  { id:"a2", name:"Upper Body",        icon:"💪", freq:3,       weekDone:fw(), todayMins:0, targetMins:45 },
  { id:"a3", name:"Lower Body",        icon:"🦵", freq:3,       weekDone:fw(), todayMins:0, targetMins:45 },
  { id:"a4", name:"Mobility",          icon:"🤸", freq:"daily", weekDone:fw(), todayMins:0, targetMins:20 },
  { id:"a5", name:"Deep Stretch/Yoga", icon:"🧘", freq:3,       weekDone:fw(), todayMins:0, targetMins:30 },
];
const INIT_GENERAL = [
  { id:"g1", name:"Hydration", mode:"ml", todayMl:0, targetMl:2800, done:false, freq:"daily", weekDone:fw(), streak:0 },
];
const INIT_TEMPLATES = [{ id:"t1", name:"🥤 ON Protein Shake", cal:255, protein:49, carbs:7, fats:4 }];
const MEAL_LIBRARY = [
  { name:"200g Chicken Breast + Rice", cal:530,protein:55,carbs:42,fats:8  },
  { name:"100g Paneer + 2 Rotis",      cal:505,protein:24,carbs:40,fats:22 },
  { name:"3 Fried Eggs",               cal:234,protein:18,carbs:0, fats:17 },
  { name:"4 Fried Eggs",               cal:312,protein:24,carbs:0, fats:22 },
  { name:"2 Toast (brown bread)",      cal:160,protein:6, carbs:28,fats:2  },
  { name:"Half Avocado",               cal:120,protein:1, carbs:6, fats:11 },
  { name:"Oats with Milk (100g)",      cal:350,protein:13,carbs:54,fats:7  },
  { name:"Dal + Rice (1 cup each)",    cal:360,protein:13,carbs:62,fats:4  },
  { name:"3 Idli + Sambar",            cal:280,protein:9, carbs:52,fats:3  },
  { name:"1 Masala Dosa",              cal:220,protein:5, carbs:38,fats:6  },
  { name:"Greek Yogurt 200g",          cal:130,protein:17,carbs:8, fats:3  },
  { name:"Banana",                     cal:90, protein:1, carbs:23,fats:0  },
  { name:"Mixed Nuts 30g",             cal:180,protein:5, carbs:6, fats:16 },
  { name:"2 Rotis + Dal",              cal:390,protein:15,carbs:60,fats:6  },
  { name:"Chicken Salad 200g",         cal:220,protein:28,carbs:8, fats:9  },
  { name:"Upma 1 cup",                 cal:200,protein:5, carbs:36,fats:4  },
  { name:"Poha 1 cup",                 cal:180,protein:4, carbs:34,fats:3  },
  { name:"Boiled Eggs x2",             cal:156,protein:12,carbs:1, fats:11 },
  { name:"Curd Rice 1 cup",            cal:220,protein:7, carbs:38,fats:4  },
  { name:"Sweet Potato 200g",          cal:172,protein:3, carbs:40,fats:0  },
];
const COFFEES = [
  { id:"filter",    name:"Filter Coffee", cal:75, protein:3,carbs:8, fats:3,caffeine:80  },
  { id:"black",     name:"Black Coffee",  cal:5,  protein:0,carbs:0, fats:0,caffeine:95  },
  { id:"americano", name:"Americano",     cal:10, protein:0,carbs:1, fats:0,caffeine:95  },
  { id:"latte",     name:"Latte",         cal:120,protein:6,carbs:12,fats:4,caffeine:95  },
  { id:"cappuccino",name:"Cappuccino",    cal:80, protein:4,carbs:8, fats:3,caffeine:95  },
  { id:"cold_brew", name:"Cold Brew",     cal:10, protein:0,carbs:0, fats:0,caffeine:155 },
  { id:"iced_latte",name:"Iced Latte",    cal:100,protein:5,carbs:10,fats:3,caffeine:95  },
  { id:"iced_mocha",name:"Iced Mocha",    cal:250,protein:6,carbs:38,fats:8,caffeine:95  },
];
const TRIGGER_TYPES = ["Boredom","Stress","Loneliness","Automatic","Social","Fatigue","Anxiety","Alcohol"];

// ── INIT RESET ────────────────────────────────────────────────────────────────
// Three independent streaks:
// noP:  No porn. Most critical. Resets on P.
// noMO: No solo masturbation. Resets on MO or P.
// sr:   Semen retention. Resets on MO or P. Partner sex does NOT reset.
const INIT_RESET = {
  noP:      { streakStart: TODAY_S, bestStreak: 0, prevStart: null },
  noMO:     { streakStart: TODAY_S, bestStreak: 0, prevStart: null },
  sr:       { streakStart: TODAY_S, bestStreak: 0, prevStart: null },
  history:  {},
  gummyLog: [],
  // history[date] = { p:bool, mo:bool, cigs:number, gummies:[ids], triggers:[], partnerSex:number }
};

// ── Science Engine ────────────────────────────────────────────────────────────
// Based on peer-reviewed neuroscience: dopamine receptor dynamics,
// testosterone studies (Jiang et al 2003), prefrontal cortex neuroplasticity research,
// androgen receptor sensitivity windows, and habit formation psychology.

function getPhase(days) {
  if (days <= 0)  return { emoji:"🔄", label:"Day 1 — Protocol Active",          color:C.rose,    desc:"Recalibration begins. Your dopamine system is preparing to reset. The first 72 hours are the neurologically hardest.", next:"Day 3 — Survive withdrawal peak" };
  if (days <= 2)  return { emoji:"⚡", label:"Withdrawal Window — Hold",          color:C.rose,    desc:"Dopamine crashing below baseline. Irritability, restlessness, brain fog — all normal. This is your brain detoxing. Every hour you hold compounds.", next:"Day 7 — Testosterone peak" };
  if (days <= 6)  return { emoji:"🔥", label:"Building Momentum",                 color:C.amber,   desc:"Receptors beginning to recover. Mental clarity starts returning. Urges are intense — this is the brain fighting to protect its old reward loop. Outlast it.", next:"Day 7 — First major milestone" };
  if (days === 7)  return { emoji:"🏆", label:"Day 7 — Testosterone Peak",         color:C.green,   desc:"Luteinizing hormone surges. Testosterone peaks at ~145% of your baseline (Jiang et al, 2003). Maximum androgenic state. You should feel the difference in your training and presence.", next:"Day 14 — Enter superpower window" };
  if (days <= 13) return { emoji:"⚡", label:"Superpower Window",                 color:C.green,   desc:"Elevated T still active. Social confidence rising measurably. Eye contact sharper, voice carries more, presence stronger. This is real — not placebo. Protect this phase.", next:"Day 14 — Prefrontal rebuilding" };
  if (days <= 20) return { emoji:"🧠", label:"Prefrontal Rebuilding",             color:C.blue,    desc:"Executive control strengthening. The prefrontal cortex — governing impulse regulation, long-term thinking, discipline — is measurably recovering. Getting easier because you're literally rebuilding grey matter.", next:"Day 21 — Habit formation threshold" };
  if (days <= 29) return { emoji:"💡", label:"Habit Formation Zone",              color:C.blue,    desc:"21-day mark crossed. New neural pathways solidifying. Your identity is shifting at a cellular level. The man you're becoming is taking root. Each day here is exponentially more valuable than the first.", next:"Day 30 — Dopamine baseline elevated" };
  if (days <= 44) return { emoji:"🚀", label:"Dopamine Elevation — Day " + days,  color:C.p2,      desc:"Baseline dopamine measurably elevated. D2 receptors repopulating. Food, music, sunlight, real human connection — all hitting differently. This is what normal feels like. Life is objectively better.", next:"Day 45 — Androgen receptor peak" };
  if (days <= 59) return { emoji:"🔬", label:"Androgen Receptor Peak",            color:C.p2,      desc:"Receptor sensitivity at maximum. Same testosterone hits harder. Athletic performance, drive, recovery, mood — all optimizing simultaneously. Your body is running at a fundamentally higher level.", next:"Day 60 — Deep rewiring" };
  if (days <= 89) return { emoji:"🌊", label:"Deep Rewiring — Day " + days,       color:C.p1,      desc:"Old pathways fading. New baseline establishing. The person you are now is who you were always meant to be. 90 days is the full D2 receptor recovery cycle. You're almost there.", next:"Day 90 — Mission complete" };
  return           { emoji:"⭐", label:"New Baseline — Superhuman Protocol",      color:"#ffd700", desc:"Full neurological reset complete. 90 days. D2 receptors fully repopulated. New identity solidified. This is your floor now, not your ceiling. Compound it for life.", next:"Maintain and compound forever" };
}

function getChargeScore(noPDays, srDays, noMODays, morningPct) {
  var base;
  if      (noPDays >= 90) base = 60;
  else if (noPDays >= 60) base = 52;
  else if (noPDays >= 45) base = 45;
  else if (noPDays >= 30) base = 38;
  else if (noPDays >= 21) base = 32;
  else if (noPDays >= 14) base = 25;
  else if (noPDays >= 7)  base = 18;
  else                    base = Math.round(noPDays * 2.5);
  var srBonus  = Math.min(20, Math.round(srDays * 0.5));
  var moBonus  = Math.min(10, Math.round(noMODays * 0.35));
  var mpBonus  = Math.round((morningPct || 0) * 0.1);
  return Math.min(100, base + srBonus + moBonus + mpBonus);
}

function getMaintenanceWindow(noPDays) {
  if (noPDays < 7)  return { available:false, color:C.rose,  label:"No window yet",              detail:"Survive the first 7 days uninterrupted. Your brain needs momentum to start the reset cycle. Every day below 7 is the hardest.", nextAt:7 };
  if (noPDays < 14) return { available:false, color:C.amber, label:"Approaching first window",   detail:"Testosterone peak still active — Day 7-13 is the most valuable window to hold. Don't interrupt the surge. Window opens Day 14.", nextAt:14 };
  if (noPDays < 21) return { available:true,  color:C.amber, label:"MO-only window — Day " + noPDays, detail:"Controlled MO without P is defensible here. Your P streak remains intact and continues. MO and SR streaks reset to Day 0. This is optional — holding through is always the stronger choice and accelerates rewiring." };
  return               { available:true,  color:C.green, label:"Full window available",        detail:"After Day 21, mindful release every 14+ days is neurologically sustainable. P streak continues if zero P is consumed. SR and MO streaks reset. The longer you hold beyond this, the deeper the rewiring compounds." };
}

function getLapseIntelligence(days) {
  var milestones = [];
  if (days >= 3)  milestones.push("Survived the withdrawal peak — Day 3");
  if (days >= 7)  milestones.push("Reached the testosterone peak — Day 7 (~145% baseline)");
  if (days >= 14) milestones.push("Entered the superpower window — Day 14");
  if (days >= 21) milestones.push("Crossed the habit formation threshold — Day 21");
  if (days >= 30) milestones.push("Achieved measurable dopamine elevation — Day 30");
  if (days >= 45) milestones.push("Androgen receptor peak reached — Day 45");
  if (days >= 60) milestones.push("Deep rewiring phase — Day 60");
  var nextTarget;
  if      (days < 3)  nextTarget = 3;
  else if (days < 7)  nextTarget = 7;
  else if (days < 14) nextTarget = 14;
  else if (days < 21) nextTarget = 21;
  else if (days < 30) nextTarget = 30;
  else if (days < 45) nextTarget = 45;
  else if (days < 60) nextTarget = 60;
  else                nextTarget = 90;
  return { milestones:milestones, nextTarget:nextTarget };
}

function daysBetween(d1, d2) {
  return Math.floor((new Date(d2) - new Date(d1)) / 86400000);
}

// ── Shared Styles ─────────────────────────────────────────────────────────────
const cardS  = { background:C.card, border:"1px solid "+C.bord, borderRadius:12, padding:"14px 16px" };
const labelS = { fontSize:10, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:9 };
const inpS   = { background:"#0a0a0a", border:"1px solid "+C.bord2, borderRadius:7, padding:"5px 9px", color:C.txt, fontSize:13, outline:"none", width:52, textAlign:"center", boxSizing:"border-box" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function isDone(h) {
  if (h.mode === "check") return h.done;
  if (h.mode === "range") return h.todayMins >= h.rangeMin;
  if (h.mode === "pages") return h.todayPages >= h.targetPages;
  if (h.mode === "ml")    return h.todayMl >= h.targetMl;
  return h.todayMins >= h.targetMins;
}

// ── NumInp ────────────────────────────────────────────────────────────────────
function NumInp({ value, onChange, suffix, width }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <input type="number" min={0}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={function(e) { onChange(e.target.value === "" ? 0 : Number(e.target.value)); }}
        onFocus={function(e) { e.target.select(); }}
        style={{ ...inpS, width:width || 52 }}
      />
      {suffix && <span style={{ fontSize:10, color:C.sub, whiteSpace:"nowrap" }}>{suffix}</span>}
    </div>
  );
}

// ── WeekDots ──────────────────────────────────────────────────────────────────
function WeekDots({ weekDone, freq }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:3, marginTop:2 }}>
      {DAYS.map(function(d, i) {
        var bg = weekDone[i] ? C.p2 : i === TODAY_DOW ? C.dim : "#1a1a1a";
        var border = (i === TODAY_DOW && !weekDone[i]) ? "1px solid " + C.p1 : "none";
        return <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:bg, border:border }} />;
      })}
      <span style={{ fontSize:10, color:C.sub, marginLeft:2 }}>
        {freq === "daily" ? "Daily" : freq + "×/wk"}
      </span>
    </div>
  );
}

// ── MacroBar ──────────────────────────────────────────────────────────────────
function MacroBar({ label, val, target, color }) {
  var pct = Math.min(100, target > 0 ? (val / target) * 100 : 0);
  return (
    <div style={{ marginBottom:7 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:11, color:C.txt2 }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:700, color:val > target ? C.rose : color }}>
          {val}g <span style={{ color:C.sub, fontWeight:400 }}>/ {target}g</span>
        </span>
      </div>
      <div style={{ height:4, background:"#1a1a1a", borderRadius:99, overflow:"hidden" }}>
        <div style={{ width:pct+"%", height:"100%", background:color, borderRadius:99, transition:"width 0.4s" }} />
      </div>
    </div>
  );
}

// ── MorningRow ────────────────────────────────────────────────────────────────
function MorningRow({ h, onToggle, onChange }) {
  var done = isDone(h);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 0", borderBottom:"1px solid "+C.bord }}>
      <div onClick={function() { if (h.mode === "check") onToggle(h.id); }}
        style={{ width:15, height:15, borderRadius:4, border:"1.5px solid "+(done?C.p2:C.dim), background:done?C.p2:"transparent", flexShrink:0, cursor:h.mode==="check"?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {done && <svg width="9" height="9" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:done?C.sub:C.txt }}>{h.name}</div>
        <WeekDots weekDone={h.weekDone} freq={h.freq} />
      </div>
      <div style={{ flexShrink:0 }}>
        {h.mode === "range" && <NumInp value={h.todayMins}  onChange={function(v){onChange(h.id,"todayMins",v);}}  suffix={"/"+h.rangeMin+"–"+h.rangeMax+"m"} />}
        {h.mode === "pages" && <NumInp value={h.todayPages} onChange={function(v){onChange(h.id,"todayPages",v);}} suffix={"/"+h.targetPages+"pg"} />}
        {h.mode === "mins"  && <NumInp value={h.todayMins}  onChange={function(v){onChange(h.id,"todayMins",v);}}  suffix={"/"+h.targetMins+"m"} />}
        {h.mode === "check" && <span style={{ fontSize:11, color:C.p3, fontWeight:700 }}>🔥{h.streak}</span>}
      </div>
    </div>
  );
}

// ── AthleteRow ────────────────────────────────────────────────────────────────
function AthleteRow({ h, onChange, mult }) {
  var target  = Math.round(h.targetMins * mult);
  var pct     = Math.min(100, target > 0 ? (h.todayMins / target) * 100 : 0);
  var reduced = mult < 1;
  return (
    <div style={{ padding:"7px 0", borderBottom:"1px solid "+C.bord }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
        <span style={{ fontSize:12 }}>{h.icon}</span>
        <span style={{ fontSize:12, fontWeight:600, color:C.txt, flex:1 }}>{h.name}</span>
        {reduced && <span style={{ fontSize:9, color:C.amber, background:C.amber+"15", padding:"1px 5px", borderRadius:4, fontWeight:700 }}>↓{Math.round((1-mult)*100)}%</span>}
        <WeekDots weekDone={h.weekDone} freq={h.freq} />
        <NumInp value={h.todayMins} onChange={function(v){onChange(h.id,v);}} suffix={"/"+target+"m"} />
      </div>
      <div style={{ height:3, background:"#1a1a1a", borderRadius:99, overflow:"hidden" }}>
        <div style={{ width:pct+"%", height:"100%", background:reduced?C.amber:C.p1, borderRadius:99, transition:"width 0.4s" }} />
      </div>
    </div>
  );
}

// ── Coffee ────────────────────────────────────────────────────────────────────
function Coffee({ log, setLog }) {
  var [sel, setSel] = useState("filter");
  var total = log.reduce(function(a, c) { return a + c.caffeine; }, 0);
  var cafColor = total > 400 ? C.rose : total > 250 ? C.amber : C.green;
  function add() {
    var t = COFFEES.find(function(c) { return c.id === sel; });
    setLog(function(l) { return l.concat([{ ...t, lid:Date.now(), time:new Date().toISOString() }]); });
  }
  return (
    <div style={{ padding:"9px 0", borderBottom:"1px solid "+C.bord, marginBottom:9 }}>
      <div style={{ display:"flex", alignItems:"center", marginBottom:7 }}>
        <span style={{ fontSize:13, marginRight:7 }}>☕</span>
        <span style={{ fontSize:12, fontWeight:700, color:C.txt, flex:1 }}>Coffee Log</span>
        <span style={{ fontSize:11, color:cafColor, fontWeight:700 }}>{total}mg caffeine</span>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:6 }}>
        <select value={sel} onChange={function(e){setSel(e.target.value);}} style={{ ...inpS, flex:1, width:"auto", textAlign:"left", padding:"6px 8px", cursor:"pointer", fontSize:11 }}>
          {COFFEES.map(function(c) { return <option key={c.id} value={c.id}>{c.name} · {c.cal}cal · {c.caffeine}mg</option>; })}
        </select>
        <button onClick={add} style={{ padding:"6px 14px", background:C.p1, border:"none", borderRadius:7, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>+ Add</button>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
        {log.map(function(c, i) {
          var late = new Date(c.time).getHours() >= 14;
          return (
            <div key={c.lid} style={{ display:"flex", alignItems:"center", gap:4, background:"#0a0a0a", border:"1px solid "+(late?C.amber+"50":C.bord2), borderRadius:6, padding:"3px 7px" }}>
              <span style={{ fontSize:10, color:late?C.amber:C.p3 }}>☕ {c.name}</span>
              {late && <span style={{ fontSize:9, color:C.amber }}>⚠️late</span>}
              <button onClick={function(){setLog(function(l){return l.filter(function(_,j){return j!==i;});});}} style={{ background:"none", border:"none", color:C.dim, cursor:"pointer", fontSize:12, lineHeight:1 }}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Nutrition ─────────────────────────────────────────────────────────────────
function Nutrition({ coffeeLog, setCoffeeLog, onUpdate }) {
  var [log,         setLog]         = useState([]);
  var [loading,     setLoading]     = useState(false);
  var [error,       setError]       = useState("");
  var [templates,   setTemplates]   = useState(INIT_TEMPLATES);
  var [savingId,    setSavingId]    = useState(null);
  var [tplName,     setTplName]     = useState("");
  var [recentMeals, setRecentMeals] = useState([]);
  var [mealSel,     setMealSel]     = useState("__none__");
  var [customInput, setCustomInput] = useState("");
  var inputRef = useRef(null);

  useEffect(function(){lGet(LS.TPLS).then(function(t){if(t)setTemplates(t);});}, []);
  useEffect(function(){lGet(LS.MEALS).then(function(m){if(m)setRecentMeals(m);});}, []);
  useEffect(function(){lSet(LS.TPLS, templates);}, [templates]);
  useEffect(function(){if(recentMeals.length) lSet(LS.MEALS, recentMeals);}, [recentMeals]);

  function addToRecent(meal) {
    setRecentMeals(function(prev) {
      var filtered = prev.filter(function(m){return m.name!==meal.name;});
      return [{name:meal.name,cal:meal.cal,protein:meal.protein,fats:meal.fats,carbs:meal.carbs}].concat(filtered).slice(0,20);
    });
  }
  var allMeals = useMemo(function() {
    var rn = new Set(recentMeals.map(function(m){return m.name;}));
    return recentMeals.concat(MEAL_LIBRARY.filter(function(m){return !rn.has(m.name);})).slice(0,20);
  }, [recentMeals]);

  function logFromDropdown() {
    if (mealSel === "__none__") return;
    var meal = allMeals.find(function(m){return m.name===mealSel;});
    if (meal) { setLog(function(l){return l.concat([{...meal,id:Date.now()}]);}); addToRecent(meal); setMealSel("__none__"); }
  }

  var coffeeMac = coffeeLog.reduce(function(a,c){return{cal:a.cal+c.cal,protein:a.protein+c.protein,carbs:a.carbs+c.carbs,fats:a.fats+c.fats};},{cal:0,protein:0,carbs:0,fats:0});
  var foodMac   = log.reduce(function(a,e){return{cal:a.cal+e.cal,protein:a.protein+e.protein,fats:a.fats+e.fats,carbs:a.carbs+e.carbs};},{cal:0,protein:0,fats:0,carbs:0});
  var grand     = {cal:foodMac.cal+coffeeMac.cal,protein:foodMac.protein+coffeeMac.protein,carbs:foodMac.carbs+coffeeMac.carbs,fats:foodMac.fats+coffeeMac.fats};
  useEffect(function(){if(onUpdate) onUpdate(grand);}, [grand.cal,grand.protein,grand.carbs,grand.fats]);

  var calMid   = (TARGETS.cal[0]+TARGETS.cal[1])/2;
  var calPct   = Math.min(100,(grand.cal/calMid)*100);
  var calColor = grand.cal<TARGETS.cal[0]?C.amber:grand.cal>TARGETS.cal[1]?C.rose:C.green;
  var hour     = NOW.getHours();
  var expProt  = Math.round(TARGETS.protein*Math.max(0,Math.min(1,(hour-6)/14)));
  var behind   = hour>=12 && grand.protein<expProt-20;

  async function logCustom() {
    if (!customInput.trim()) return;
    setLoading(true); setError("");
    try {
      var res = await fetch(AI_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:400,
        system:"Nutrition expert for Indian/Bangalore food. Portions: 1 roti=120cal, 1 idli=70cal, 1 dosa=120cal, 1 cup rice=210cal, 100g chicken=165cal, 100g paneer=265cal, 1 cup dal=150cal, 1 egg=78cal, 1 banana=90cal. Return ONLY valid JSON: {\"name\":string,\"cal\":number,\"protein\":number,\"fats\":number,\"carbs\":number}. No markdown.",
        messages:[{role:"user",content:customInput}],
      })});
      var data   = await res.json();
      var block  = data.content && data.content.find(function(b){return b.type==="text";});
      var parsed = JSON.parse((block?block.text:"").replace(/```json|```/g,"").trim());
      setLog(function(l){return l.concat([{...parsed,id:Date.now()}]);}); addToRecent(parsed);
      setCustomInput(""); if(inputRef.current) inputRef.current.focus();
    } catch { setError("Try: '150g chicken' or '2 rotis with dal'"); }
    setLoading(false);
  }

  return (
    <div style={cardS}>
      <div style={labelS}>AI Macro Tracker · Bangalore Calibrated</div>
      <div style={{ display:"flex", gap:7, marginBottom:10 }}>
        {[
          {l:"Cal",     v:grand.cal,     t:TARGETS.cal[0]+"–"+TARGETS.cal[1], c:calColor, u:""},
          {l:"Protein", v:grand.protein, t:TARGETS.protein,                   c:C.p2,     u:"g"},
          {l:"Carbs",   v:grand.carbs,   t:TARGETS.carbs,                     c:C.green,  u:"g"},
          {l:"Fats",    v:grand.fats,    t:TARGETS.fats,                      c:C.amber,  u:"g"},
        ].map(function(m) {
          return (
            <div key={m.l} style={{ flex:1, background:"#0a0a0a", border:"1px solid "+C.bord2, borderRadius:8, padding:"7px 5px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:C.sub, marginBottom:2, fontWeight:700, textTransform:"uppercase" }}>{m.l}</div>
              <div style={{ fontSize:16, fontWeight:800, color:m.c, lineHeight:1 }}>{m.v}</div>
              <div style={{ fontSize:9, color:C.sub, marginTop:1 }}>/{m.t}{m.u}</div>
            </div>
          );
        })}
      </div>
      <div style={{ height:4, background:"#1a1a1a", borderRadius:99, overflow:"hidden", marginBottom:7 }}>
        <div style={{ width:calPct+"%", height:"100%", background:calColor, borderRadius:99, transition:"width 0.4s" }} />
      </div>
      <MacroBar label="Protein" val={grand.protein} target={TARGETS.protein} color={C.p2} />
      {behind && <div style={{ fontSize:11, color:C.amber, background:C.amber+"12", border:"1px solid "+C.amber+"30", borderRadius:7, padding:"5px 10px", marginBottom:7 }}>💪 Protein behind — target ~{expProt}g by {hour}:00</div>}
      <MacroBar label="Carbs" val={grand.carbs} target={TARGETS.carbs} color={C.green} />
      <MacroBar label="Fats"  val={grand.fats}  target={TARGETS.fats}  color={C.amber} />
      {grand.cal < TARGETS.cal[0] && (
        <div style={{ background:"#0a0a0a", border:"1px solid "+C.bord2, borderRadius:7, padding:"6px 10px", marginBottom:8, fontSize:11 }}>
          <span style={{ color:C.sub }}>Still need: </span>
          <span style={{ color:C.amber, fontWeight:700 }}>{TARGETS.cal[0]-grand.cal}cal · </span>
          <span style={{ color:C.p3,    fontWeight:700 }}>{Math.max(0,TARGETS.protein-grand.protein)}g P · </span>
          <span style={{ color:C.green, fontWeight:700 }}>{Math.max(0,TARGETS.carbs-grand.carbs)}g C · </span>
          <span style={{ color:C.amber, fontWeight:700 }}>{Math.max(0,TARGETS.fats-grand.fats)}g F</span>
        </div>
      )}
      <Coffee log={coffeeLog} setLog={setCoffeeLog} />
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>Quick Log</div>
        {/* Instant chips — last 3 logged meals */}
        {recentMeals.length > 0 && (
          <div style={{ display:"flex", gap:5, marginBottom:6, flexWrap:"wrap" }}>
            {recentMeals.slice(0,3).map(function(m) {
              return (
                <button key={m.name} onClick={function(){setLog(function(l){return l.concat([{id:Date.now(),name:m.name,cal:m.cal,protein:m.protein,fats:m.fats,carbs:m.carbs}]);});addToRecent(m);}} style={{ padding:"5px 10px", background:"#0a0a0a", border:"1px solid "+C.p1+"50", borderRadius:8, color:C.p3, fontSize:11, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
                  {m.name.length > 20 ? m.name.slice(0,20)+"…" : m.name}
                  <span style={{ display:"block", fontSize:9, color:C.sub, fontWeight:400 }}>{m.cal}cal · {m.protein}g P</span>
                </button>
              );
            })}
          </div>
        )}
        {/* Templates */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {templates.map(function(t) {
            return (
              <div key={t.id} style={{ display:"flex", alignItems:"center", background:"#0a0a0a", border:"1px solid "+C.p1+"40", borderRadius:7, overflow:"hidden" }}>
                <button onClick={function(){setLog(function(l){return l.concat([{id:Date.now(),name:t.name,cal:t.cal,protein:t.protein,fats:t.fats,carbs:t.carbs}]);});addToRecent(t);}} style={{ padding:"4px 9px", background:"transparent", border:"none", color:C.p3, fontSize:11, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
                  {t.name}<span style={{ display:"block", fontSize:9, color:C.sub, fontWeight:400 }}>{t.cal}cal · {t.protein}g P</span>
                </button>
                <button onClick={function(){setTemplates(function(ts){return ts.filter(function(x){return x.id!==t.id;});});}} style={{ padding:"0 7px", background:"transparent", border:"none", color:C.dim, cursor:"pointer", fontSize:13, alignSelf:"stretch" }}>×</button>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>Log Meal</div>
        <div style={{ display:"flex", gap:6 }}>
          <select value={mealSel} onChange={function(e){setMealSel(e.target.value);}} style={{ ...inpS, flex:1, width:"auto", textAlign:"left", padding:"7px 10px", cursor:"pointer", fontSize:12 }}>
            <option value="__none__">— Select meal —</option>
            {recentMeals.length > 0 && <option disabled>── Recent ──</option>}
            {recentMeals.map(function(m){return <option key={"r_"+m.name} value={m.name}>{m.name} · {m.cal}cal</option>;})}
            {recentMeals.length > 0 && <option disabled>── All meals ──</option>}
            {MEAL_LIBRARY.filter(function(m){return !recentMeals.find(function(r){return r.name===m.name;});}).map(function(m){return <option key={m.name} value={m.name}>{m.name} · {m.cal}cal</option>;})}
          </select>
          <button onClick={logFromDropdown} disabled={mealSel==="__none__"} style={{ padding:"7px 14px", background:mealSel==="__none__"?C.dim:C.p1, border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:mealSel==="__none__"?"not-allowed":"pointer", flexShrink:0 }}>+ Log</button>
        </div>
      </div>
      <div style={{ marginBottom:6 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>Custom (AI)</div>
        <div style={{ display:"flex", gap:6 }}>
          <input ref={inputRef} value={customInput} onChange={function(e){setCustomInput(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")logCustom();}} placeholder="Anything not in list..." style={{ ...inpS, flex:1, width:"auto", textAlign:"left", padding:"7px 10px", borderRadius:8, fontSize:12 }} />
          <button onClick={logCustom} disabled={loading} style={{ padding:"7px 14px", background:loading?C.dim:C.p1, border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:loading?"wait":"pointer", flexShrink:0 }}>{loading?"…":"Log"}</button>
        </div>
        {error && <div style={{ fontSize:11, color:C.rose, marginTop:4 }}>{error}</div>}
      </div>
      {log.length === 0
        ? <div style={{ fontSize:11, color:C.dim, textAlign:"center", padding:"8px 0" }}>No food logged yet</div>
        : (
          <div style={{ maxHeight:160, overflowY:"auto" }}>
            {log.map(function(e) {
              return (
                <div key={e.id}>
                  <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 0", borderBottom:"1px solid "+C.bord, fontSize:11 }}>
                    <div style={{ flex:1, color:C.txt }}>{e.name}</div>
                    <span style={{ color:calColor, fontWeight:700, minWidth:28 }}>{e.cal}</span>
                    <span style={{ color:C.p3,    minWidth:28 }}>{e.protein}P</span>
                    <span style={{ color:C.green, minWidth:28 }}>{e.carbs}C</span>
                    <span style={{ color:C.amber, minWidth:24 }}>{e.fats}F</span>
                    <button onClick={function(){setSavingId(savingId===e.id?null:e.id);}} style={{ background:"none", border:"none", color:savingId===e.id?C.p3:C.dim, cursor:"pointer", fontSize:12, padding:"0 2px" }}>★</button>
                    <button onClick={function(){setLog(function(l){return l.filter(function(x){return x.id!==e.id;});});}} style={{ background:"none", border:"none", color:C.dim, cursor:"pointer", fontSize:13, padding:"0 2px", lineHeight:1 }}>×</button>
                  </div>
                  {savingId === e.id && (
                    <div style={{ display:"flex", gap:5, padding:"5px 0 6px", borderBottom:"1px solid "+C.bord }}>
                      <input value={tplName} onChange={function(x){setTplName(x.target.value);}} placeholder={e.name} style={{ ...inpS, flex:1, width:"auto", textAlign:"left", padding:"4px 8px", fontSize:11 }} />
                      <button onClick={function(){setTemplates(function(ts){return ts.concat([{id:"t"+Date.now(),name:tplName.trim()||e.name,cal:e.cal,protein:e.protein,fats:e.fats,carbs:e.carbs}]);});addToRecent(e);setSavingId(null);setTplName("");}} style={{ padding:"4px 11px", background:C.p1, border:"none", borderRadius:7, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Save</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ── Smart Daily Brief — rule-based, instant, zero API cost ───────────────────
function getDailyBrief(hour, morningDone, morningTotal, noPDays, recovery, grand) {
  var phase    = getPhase(noPDays);
  var r        = Number(recovery) || 0;
  var greeting = hour < 12 ? "Good morning" : hour < 17 ? "Afternoon" : "Evening";
  var lines    = [];

  // Streak context
  if (noPDays === 0) {
    lines.push(greeting + ", JK. Today is Day 1. Every streak starts exactly here.");
  } else if (noPDays < 7) {
    lines.push(greeting + ", JK. Day " + noPDays + " — " + phase.emoji + " " + phase.label + ". Day 7 is your first milestone.");
  } else {
    lines.push(greeting + ", JK. Day " + noPDays + " — " + phase.emoji + " " + phase.label + ".");
  }

  // Recovery or morning context
  if (r >= 67) lines.push("WHOOP: " + r + "% — full send. Your body is ready to push.");
  else if (r >= 34 && r > 0) lines.push("WHOOP: " + r + "% — moderate. Train smart, protect recovery.");
  else if (r > 0) lines.push("WHOOP: " + r + "% — red zone. Today is about recovery, not output.");
  else if (morningDone === morningTotal && morningTotal > 0) lines.push("Morning stack complete ✓ You're already ahead.");
  else if (hour < 12 && morningDone < morningTotal) lines.push((morningTotal - morningDone) + " morning habits remaining. Log them before the day pulls you away.");

  // Time-specific
  if (hour >= 6 && hour <= 9) {
    lines.push("Cold protocol + sunlight first. Sets cortisol, T, and dopamine for everything that follows.");
  } else if (hour >= 12 && hour <= 14) {
    var p = grand.protein || 0;
    if (p < 60) lines.push("Protein at " + p + "g — you need to eat now. Target 80g+ before 3pm.");
    else lines.push("Nutrition on track. Keep protein coming every 3-4 hours.");
  } else if (hour >= 18 && hour <= 20) {
    var calLeft = Math.max(0, TARGETS.cal[0] - (grand.cal || 0));
    if (calLeft > 400) lines.push("Still " + calLeft + " calories short of your target. One more meal needed.");
    else lines.push("Nutrition solid today. Wind down, no late caffeine, protect your sleep.");
  } else if (hour > 20) {
    lines.push("Screens down by 10pm. Sleep is where all of today's training, discipline, and nutrition compounds.");
  }

  return lines;
}

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 45, 60, 90];

function getMilestoneInfo(days) {
  var info = {
    3:  { emoji:"⚡", title:"Day 3 — Withdrawal Survived",        msg:"You outlasted the hardest neurological window. Dopamine is stabilising. The path forward gets more rewarding from here." },
    7:  { emoji:"🏆", title:"Day 7 — Testosterone Peak",          msg:"T levels at ~145% of baseline. This is real. Your body is rewarding your discipline with its most androgenic state. Feel it — this is what you're building towards." },
    14: { emoji:"⚡", title:"Day 14 — Superpower Window",         msg:"Two weeks. Prefrontal cortex rebuilding. Social confidence, presence, drive — all elevated and measurable. You're not the same person who started." },
    21: { emoji:"💡", title:"Day 21 — Habit Formation Complete",  msg:"The science says 21 days to form a habit. You did it. New neural pathways are solidified. The discipline is becoming automatic." },
    30: { emoji:"🚀", title:"Day 30 — Dopamine Baseline Elevated",msg:"A full month. D2 receptor repopulation measurably underway. Real-world rewards — training, connection, food — feel good again. This is your new floor." },
    45: { emoji:"🔬", title:"Day 45 — Androgen Receptor Peak",    msg:"Halfway and then some. Receptor sensitivity at maximum. The same testosterone hits harder now. Your training response, recovery, and drive are all running at a higher level." },
    60: { emoji:"🌊", title:"Day 60 — Deep Rewiring",             msg:"60 days. Old pathways fading. New identity establishing. The man you are today would have seemed unachievable 60 days ago. 30 days to complete the mission." },
    90: { emoji:"⭐", title:"Day 90 — Mission Complete",          msg:"90 days. Full D2 receptor recovery cycle complete. New neurological baseline established. You did what most people only talk about. This is your new normal — now compound it." },
  };
  return info[days] || null;
}
function DailyTab({ state, dispatch, noPDays, whoopRecovery }) {
  var morning      = state.morning;
  var athlete      = state.athlete;
  var general      = state.general;
  var coffeeLog    = state.coffeeLog;
  var grand        = state.grand;
  var whoopM       = state.whoopM;
  var weekHist     = state.weekHist;
  var morningDone  = morning.filter(isDone).length;
  var totalAthMins = athlete.reduce(function(a,h){return a+(h.todayMins||0);}, 0);
  var totalCaf     = coffeeLog.reduce(function(a,c){return a+c.caffeine;}, 0);
  var r            = Number(whoopM.recovery);
  var trainMult    = r > 0 ? (r < 34 ? 0.5 : r < 67 ? 0.8 : 1.0) : 1.0;
  var daysInMonth  = new Date(TODAY_Y, TODAY_M+1, 0).getDate();
  var firstDOW     = new Date(TODAY_Y, TODAY_M, 1).getDay();
  var totalHabits  = morning.length + general.length;
  var hour         = NOW.getHours();
  var brief        = getDailyBrief(hour, morningDone, morning.length, noPDays, whoopM.recovery, grand);

  // End-of-day summary (shows after 6pm)
  var isEvening    = hour >= 18;
  var dayScore     = Math.round(((morningDone / morning.length) * 40) + (totalAthMins > 0 ? 30 : 0) + (grand.cal >= TARGETS.cal[0] ? 20 : Math.round((grand.cal / TARGETS.cal[0]) * 20)) + (grand.protein >= TARGETS.protein ? 10 : Math.round((grand.protein / TARGETS.protein) * 10)));
  var dayScoreColor= dayScore >= 80 ? C.green : dayScore >= 50 ? C.amber : C.rose;

  return (
    <div>
      {/* Smart Daily Brief */}
      <div style={{ ...cardS, borderLeft:"3px solid "+C.p1, marginBottom:12, padding:"13px 16px" }}>
        {brief.map(function(line, i) {
          return (
            <div key={i} style={{ fontSize: i===0 ? 13 : 12, color: i===0 ? C.txt : C.txt2, fontWeight: i===0 ? 700 : 400, lineHeight:1.65, marginBottom: i < brief.length-1 ? 4 : 0 }}>
              {line}
            </div>
          );
        })}
      </div>

      {/* End-of-Day Score — shows after 6pm */}
      {isEvening && (
        <div style={{ ...cardS, borderTop:"1.5px solid "+dayScoreColor, marginBottom:12, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ textAlign:"center", minWidth:64 }}>
            <div style={{ fontSize:36, fontWeight:900, color:dayScoreColor, lineHeight:1 }}>{dayScore}</div>
            <div style={{ fontSize:9, color:C.sub, marginTop:2, textTransform:"uppercase", fontWeight:700 }}>Day Score</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:dayScoreColor, marginBottom:5 }}>
              {dayScore >= 80 ? "Strong day. This compounds." : dayScore >= 50 ? "Solid effort. Close the gaps tonight." : "Opportunity missed — tomorrow is the reset."}
            </div>
            <div style={{ display:"flex", gap:8, fontSize:10 }}>
              <span style={{ color:morningDone===morning.length?C.green:C.sub }}>Morning {morningDone}/{morning.length}</span>
              <span style={{ color:C.sub }}>·</span>
              <span style={{ color:totalAthMins>0?C.green:C.sub }}>Training {totalAthMins>0?"✓":"—"}</span>
              <span style={{ color:C.sub }}>·</span>
              <span style={{ color:grand.protein>=TARGETS.protein?C.green:C.amber }}>Protein {grand.protein}g</span>
              <span style={{ color:C.sub }}>·</span>
              <span style={{ color:grand.cal>=TARGETS.cal[0]?C.green:C.amber }}>Cal {grand.cal}</span>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:9, marginBottom:12 }}>
        {[
          {lbl:"Morning",  val:morningDone+"/"+morning.length, sub:"stack done"},
          {lbl:"Training", val:totalAthMins+"m",               sub:"logged today"},
          {lbl:"Caffeine", val:totalCaf+"mg",                  sub:coffeeLog.length+" drink"+(coffeeLog.length!==1?"s":"")},
          {lbl:"Calories", val:grand.cal,                      sub:"/"+TARGETS.cal[0]+"–"+TARGETS.cal[1]},
        ].map(function(item) {
          return (
            <div key={item.lbl} style={{ ...cardS, borderTop:"1.5px solid "+C.p1, padding:"10px 12px" }}>
              <div style={labelS}>{item.lbl}</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.p3, lineHeight:1 }}>{item.val}</div>
              <div style={{ fontSize:10, color:C.sub, marginTop:3 }}>{item.sub}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.1fr 0.9fr", gap:11, marginBottom:11 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          <div style={cardS}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
              <div style={labelS}>Morning Stack · 90 min</div>
              <span style={{ fontSize:9, color:C.p3, background:"#1a0a2e40", padding:"2px 7px", borderRadius:5, fontWeight:700 }}>🌅 AM</span>
            </div>
            {morning.map(function(h) {
              return (
                <MorningRow key={h.id} h={h}
                  onToggle={function(id){dispatch({type:"MORNING_TOGGLE",id:id});}}
                  onChange={function(id,k,v){dispatch({type:"MORNING_CHANGE",id:id,k:k,v:v});}}
                />
              );
            })}
          </div>
          <div style={cardS}>
            <div style={labelS}>General</div>
            {general.map(function(h) {
              return (
                <div key={h.id} style={{ padding:"8px 0", borderBottom:"1px solid "+C.bord }}>
                  {h.mode === "ml" ? (
                    <div>
                      <div style={{ display:"flex", alignItems:"center", marginBottom:5 }}>
                        <span style={{ fontSize:13, marginRight:6 }}>💧</span>
                        <span style={{ fontSize:12, fontWeight:700, color:C.txt, flex:1 }}>{h.name}</span>
                        <span style={{ fontSize:11, color:h.todayMl>=h.targetMl?C.green:C.blue, fontWeight:700 }}>{h.todayMl}/{h.targetMl}ml</span>
                      </div>
                      <div style={{ height:4, background:"#1a1a1a", borderRadius:99, overflow:"hidden", marginBottom:6 }}>
                        <div style={{ width:Math.min(100,(h.todayMl/h.targetMl)*100)+"%", height:"100%", background:h.todayMl>=h.targetMl?C.green:C.blue, borderRadius:99, transition:"width 0.4s" }} />
                      </div>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        {[100,200,300,500,1000].map(function(ml) {
                          return (
                            <button key={ml} onClick={function(){dispatch({type:"HYDRATION_ADD",id:h.id,ml:ml});}} style={{ flex:1, minWidth:34, padding:"4px 0", background:"#0a0a0a", border:"1px solid "+C.bord2, borderRadius:7, color:C.blue, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                              +{ml >= 1000 ? "1L" : ml}
                            </button>
                          );
                        })}
                        <button onClick={function(){dispatch({type:"HYDRATION_SET",id:h.id,ml:Math.max(0,h.todayMl-100)});}} style={{ padding:"4px 8px", background:"#0a0a0a", border:"1px solid "+C.bord2, borderRadius:7, color:C.dim, fontSize:11, cursor:"pointer" }}>−</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={function(){dispatch({type:"GENERAL_TOGGLE",id:h.id});}} style={{ display:"flex", alignItems:"center", gap:9, cursor:"pointer" }}>
                      <div style={{ width:15, height:15, borderRadius:4, border:"1.5px solid "+(h.done?C.p2:C.dim), background:h.done?C.p2:"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {h.done && <svg width="9" height="9" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, color:h.done?C.sub:C.txt }}>{h.name}</div>
                        <WeekDots weekDone={h.weekDone} freq={h.freq} />
                      </div>
                      <span style={{ fontSize:11, color:C.p3, fontWeight:700 }}>🔥{h.streak}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Nutrition coffeeLog={coffeeLog} setCoffeeLog={function(fn){dispatch({type:"COFFEE_SET",fn:fn});}} onUpdate={function(g){dispatch({type:"GRAND_SET",grand:g});}} />

        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          <div style={cardS}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
              <div style={labelS}>Athlete Training</div>
              {trainMult < 1 && <span style={{ fontSize:9, color:C.amber, background:C.amber+"15", padding:"2px 7px", borderRadius:5, fontWeight:700 }}>Recovery ↓{Math.round((1-trainMult)*100)}%</span>}
            </div>
            {athlete.map(function(h){return <AthleteRow key={h.id} h={h} onChange={function(id,v){dispatch({type:"ATHLETE_CHANGE",id:id,v:v});}} mult={trainMult} />;}) }
            <div style={{ marginTop:7, textAlign:"right" }}>
              <span style={{ fontSize:11, color:C.p3, fontWeight:700 }}>{totalAthMins} min today</span>
            </div>
          </div>
          <div style={cardS}>
            <div style={labelS}>{NOW.toLocaleDateString("en-IN",{month:"long",year:"numeric"})} · Habit History</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:3 }}>
              {["S","M","T","W","T","F","S"].map(function(d,i){return <div key={i} style={{ textAlign:"center", fontSize:9, color:C.sub, fontWeight:600 }}>{d}</div>;})}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
              {Array.from({length:firstDOW}).map(function(_,i){return <div key={"e"+i} />;}) }
              {Array.from({length:daysInMonth}).map(function(_,i) {
                var d = i+1;
                var isToday = d === TODAY_D;
                var dateKey = TODAY_Y+"-"+String(TODAY_M+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
                var hist = weekHist[dateKey] || 0;
                var pct  = totalHabits > 0 ? hist / totalHabits : 0;
                var bg   = isToday ? C.p1 : pct >= 0.8 ? C.green+"60" : pct >= 0.5 ? C.amber+"50" : pct > 0 ? C.rose+"30" : "transparent";
                var txtC = isToday ? "#fff" : pct > 0 ? C.txt : C.dim;
                return <div key={d} style={{ aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:5, fontSize:10, fontWeight:isToday?800:500, background:bg, color:txtC }}>{d}</div>;
              })}
            </div>
            <div style={{ display:"flex", gap:10, marginTop:7, fontSize:9, color:C.sub }}>
              <span style={{ color:C.green }}>■ ≥80%</span><span style={{ color:C.amber }}>■ ≥50%</span><span style={{ color:C.rose }}>■ &lt;50%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reset Tab — The Mirror ────────────────────────────────────────────────────
function ResetTab({ resetData, setResetData, morningPct }) {
  var noPDays  = daysBetween(resetData.noP.streakStart,  TODAY_S);
  var noMODays = daysBetween(resetData.noMO.streakStart, TODAY_S);
  var srDays   = daysBetween(resetData.sr.streakStart,   TODAY_S);
  var phase    = getPhase(noPDays);
  var charge   = getChargeScore(noPDays, srDays, noMODays, morningPct);
  var window_  = getMaintenanceWindow(noPDays);
  var chargeColor = charge >= 70 ? C.green : charge >= 40 ? C.p2 : charge >= 20 ? C.amber : C.rose;

  var today = resetData.history[TODAY_S] || { p:false, mo:false, cigs:0, gummies:[], triggers:[] };

  var [showLapse,     setShowLapse]     = useState(null);   // 'p' | 'mo' | null
  var [lapseIntel,    setLapseIntel]    = useState(null);
  var [trigStress,    setTrigStress]    = useState(3);
  var [trigType,      setTrigType]      = useState("Stress");
  var [trigNote,      setTrigNote]      = useState("");
  var [showGummyForm, setShowGummyForm] = useState(false);
  var [gBrand,        setGBrand]        = useState("");
  var [gMg,           setGMg]           = useState("");
  var [gType,         setGType]         = useState("CBD");
  var [gNote,         setGNote]         = useState("");
  var [aiText,        setAiText]        = useState("");
  var [analyzing,     setAnalyzing]     = useState(false);

  function updateToday(patch) {
    setResetData(function(prev) {
      var td = Object.assign({}, prev.history[TODAY_S] || {p:false,mo:false,cigs:0,gummies:[],triggers:[]}, patch);
      return { ...prev, history: Object.assign({}, prev.history, { [TODAY_S]: td }) };
    });
  }

  function logLapse(type) {
    var days  = type === "p" ? noPDays : noMODays;
    var intel = getLapseIntelligence(days);
    setLapseIntel({ type:type, days:days, intel:intel });
    setShowLapse(type);
  }

  function confirmLapse() {
    var type    = showLapse;
    var trigger = { time:new Date().toISOString(), stress:trigStress, type:trigType, note:trigNote, category:type };
    setResetData(function(prev) {
      var td = Object.assign({}, prev.history[TODAY_S] || {p:false,mo:false,cigs:0,gummies:[],triggers:[]});
      if (type === "p")  td.p  = true;
      if (type === "mo") td.mo = true;
      td.triggers = (td.triggers || []).concat([trigger]);
      var newHistory = Object.assign({}, prev.history, { [TODAY_S]: td });
      var newNoP  = type === "p"  ? { streakStart:TODAY_S, bestStreak:Math.max(prev.noP.bestStreak,  noPDays),  prevStart:prev.noP.streakStart  } : prev.noP;
      var newNoMO = (type==="p"||type==="mo") ? { streakStart:TODAY_S, bestStreak:Math.max(prev.noMO.bestStreak, noMODays), prevStart:prev.noMO.streakStart } : prev.noMO;
      var newSR   = (type==="p"||type==="mo") ? { streakStart:TODAY_S, bestStreak:Math.max(prev.sr.bestStreak,   srDays),   prevStart:prev.sr.streakStart   } : prev.sr;
      return { ...prev, noP:newNoP, noMO:newNoMO, sr:newSR, history:newHistory };
    });
    setShowLapse(null); setLapseIntel(null); setTrigNote(""); setTrigStress(3);
  }

  function undoLapse(type) {
    setResetData(function(prev) {
      var td = Object.assign({}, prev.history[TODAY_S] || {p:false,mo:false,cigs:0,gummies:[],triggers:[],partnerSex:0});
      if (type === "p")  td.p  = false;
      if (type === "mo") td.mo = false;
      var trigs = (td.triggers || []).slice();
      for (var i = trigs.length - 1; i >= 0; i--) {
        if (trigs[i].category === type) { trigs.splice(i, 1); break; }
      }
      td.triggers = trigs;
      var newNoP  = (type==="p" && prev.noP.prevStart)                          ? { streakStart:prev.noP.prevStart,  bestStreak:prev.noP.bestStreak,  prevStart:null } : prev.noP;
      var newNoMO = ((type==="p"||type==="mo") && prev.noMO.prevStart)          ? { streakStart:prev.noMO.prevStart, bestStreak:prev.noMO.bestStreak, prevStart:null } : prev.noMO;
      var newSR   = ((type==="p"||type==="mo") && prev.sr.prevStart)            ? { streakStart:prev.sr.prevStart,   bestStreak:prev.sr.bestStreak,   prevStart:null } : prev.sr;
      return { ...prev, noP:newNoP, noMO:newNoMO, sr:newSR, history:Object.assign({}, prev.history, { [TODAY_S]:td }) };
    });
  }

  function logPartnerSex(delta) {
    setResetData(function(prev) {
      var td = Object.assign({}, prev.history[TODAY_S] || {p:false,mo:false,cigs:0,gummies:[],triggers:[],partnerSex:0});
      td.partnerSex = Math.max(0, (td.partnerSex || 0) + delta);
      return { ...prev, history:Object.assign({}, prev.history, { [TODAY_S]:td }) };
    });
  }

  function addGummy() {
    if (!gBrand || !gMg) return;
    var entry = { id:Date.now(), time:new Date().toISOString(), brand:gBrand, mg:Number(gMg), type:gType, note:gNote };
    setResetData(function(prev) {
      var td = Object.assign({}, prev.history[TODAY_S] || {p:false,mo:false,cigs:0,gummies:[],triggers:[]});
      td.gummies = (td.gummies || []).concat([entry.id]);
      return { ...prev, gummyLog:(prev.gummyLog||[]).concat([entry]), history:Object.assign({}, prev.history, { [TODAY_S]:td }) };
    });
    setShowGummyForm(false); setGBrand(""); setGMg(""); setGNote("");
  }

  // 90-day grid
  var grid = [];
  for (var gi = 89; gi >= 0; gi--) {
    var gd  = new Date(TODAY_Y, TODAY_M, TODAY_D - gi);
    var gk  = gd.toISOString().split("T")[0];
    var gh  = resetData.history[gk] || {};
    grid.push({ key:gk, p:!!gh.p, mo:!!gh.mo, isToday:gi===0, tracked:!!resetData.history[gk] });
  }

  var lastGummy = (resetData.gummyLog || []).slice(-1)[0];
  var hoursSinceGummy = lastGummy ? Math.round((Date.now() - new Date(lastGummy.time)) / 3600000) : null;

  async function analyzePatterns() {
    setAnalyzing(true); setAiText("");
    var entries = Object.entries(resetData.history).sort();
    var summary = entries.map(function(pair) {
      var d = pair[0]; var h = pair[1];
      return d+": P="+h.p+" MO="+h.mo+" cigs="+(h.cigs||0)+" triggers="+(h.triggers||[]).map(function(t){return t.type+"(stress:"+t.stress+")";}).join(",");
    }).join("\n");
    try {
      var res = await fetch(AI_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:700,
        messages:[{role:"user",content:"You are an elite behavioral coach for JK, 31yo male, Bangalore. HYROX athlete, high performer optimizing dopamine and neurological baseline.\n\nCurrent state:\n- No-P: Day "+noPDays+" (best: "+resetData.noP.bestStreak+")\n- No-MO: Day "+noMODays+" (best: "+resetData.noMO.bestStreak+")\n- SR: Day "+srDays+" (best: "+resetData.sr.bestStreak+")\n- Charge Score: "+charge+"/100\n- Phase: "+phase.label+"\n\nHistory log:\n"+summary+"\n\n**Pattern Analysis**: specific patterns in his timing and triggers based on data\n**High Risk Profile**: exactly when and why he's most vulnerable\n**Circuit Breaker Protocol**: one specific, actionable 5-minute protocol for when the urge peaks\n**Next 7 Days**: what to do concretely to reach "+phase.next+"\n**Athletic Connection**: how this streak phase directly impacts his HYROX training and recovery\n\nDirect, science-backed, non-judgmental. Treat him as the elite athlete he's becoming. Max 250 words."}],
      })});
      var data  = await res.json();
      var block = data.content && data.content.find(function(b){return b.type==="text";});
      setAiText(block ? block.text : "No response");
    } catch { setAiText("Error — check connection"); }
    setAnalyzing(false);
  }

  return (
    <div>
      {/* ── Milestone Celebration ── */}
      {getMilestoneInfo(noPDays) && (function() {
        var m = getMilestoneInfo(noPDays);
        return (
          <div style={{ ...cardS, border:"2px solid "+C.green, background:"#0a1a0a", marginBottom:12, textAlign:"center", padding:"20px 16px" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>{m.emoji}</div>
            <div style={{ fontSize:15, fontWeight:800, color:C.green, marginBottom:8 }}>{m.title}</div>
            <div style={{ fontSize:12, color:C.txt2, lineHeight:1.7, maxWidth:340, margin:"0 auto" }}>{m.msg}</div>
          </div>
        );
      })()}

      {/* ── The Mirror ── */}
      <div style={{ ...cardS, borderTop:"2px solid "+chargeColor, marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:14 }}>
          <div style={{ textAlign:"center", minWidth:88 }}>
            <div style={{ fontSize:56, fontWeight:900, color:chargeColor, lineHeight:1 }}>{charge}</div>
            <div style={{ fontSize:9, color:C.sub, marginTop:3, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Charge Score</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
              <span style={{ fontSize:20 }}>{phase.emoji}</span>
              <span style={{ fontSize:14, fontWeight:800, color:phase.color, lineHeight:1.2 }}>{phase.label}</span>
            </div>
            <div style={{ fontSize:12, color:C.txt2, lineHeight:1.65, marginBottom:8 }}>{phase.desc}</div>
            <div style={{ fontSize:10, color:C.sub }}>▶ Next: <span style={{ color:phase.color, fontWeight:700 }}>{phase.next}</span></div>
          </div>
        </div>
        <div style={{ height:6, background:"#1a1a1a", borderRadius:99, overflow:"hidden", marginBottom:8 }}>
          <div style={{ width:charge+"%", height:"100%", background:chargeColor, borderRadius:99, transition:"width 0.6s" }} />
        </div>
        <div style={{ display:"flex", gap:14, fontSize:11 }}>
          <span style={{ color:C.sub }}>No-P <span style={{ color:phase.color, fontWeight:700 }}>Day {noPDays}</span></span>
          <span style={{ color:C.sub }}>SR <span style={{ color:C.p3, fontWeight:700 }}>Day {srDays}</span></span>
          <span style={{ color:C.sub }}>No-MO <span style={{ color:C.p2, fontWeight:700 }}>Day {noMODays}</span></span>
        </div>
      </div>

      {/* ── Three Streaks ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:9, marginBottom:12 }}>

        {/* No-P */}
        <div style={{ ...cardS, textAlign:"center", padding:"14px 10px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.txt, marginBottom:2 }}>📺 No-P</div>
          <div style={{ fontSize:9, color:C.sub, marginBottom:10, lineHeight:1.4 }}>Core reset · 90 day mission</div>
          <div style={{ fontSize:38, fontWeight:900, color:C.rose, lineHeight:1, marginBottom:4 }}>{noPDays}</div>
          <div style={{ fontSize:9, color:C.sub, marginBottom:10 }}>days · best: {resetData.noP.bestStreak}</div>
          {!today.p && (
            <button onClick={function(){logLapse("p");}} style={{ width:"100%", padding:"5px 0", background:"transparent", border:"1px solid "+C.rose+"50", borderRadius:7, color:C.rose, fontSize:10, cursor:"pointer", fontWeight:600 }}>
              Log P Lapse
            </button>
          )}
          {today.p && (
            <button onClick={function(){undoLapse("p");}} style={{ width:"100%", padding:"5px 0", background:C.amber+"15", border:"1px solid "+C.amber+"50", borderRadius:7, color:C.amber, fontSize:10, cursor:"pointer", fontWeight:600 }}>
              ↩ Undo Today's Lapse
            </button>
          )}
        </div>

        {/* No-MO */}
        <div style={{ ...cardS, textAlign:"center", padding:"14px 10px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.txt, marginBottom:2 }}>✋ No-MO</div>
          <div style={{ fontSize:9, color:C.sub, marginBottom:10, lineHeight:1.4 }}>Solo discipline · separate streak</div>
          <div style={{ fontSize:38, fontWeight:900, color:C.amber, lineHeight:1, marginBottom:4 }}>{noMODays}</div>
          <div style={{ fontSize:9, color:C.sub, marginBottom:10 }}>days · best: {resetData.noMO.bestStreak}</div>
          {!today.mo && (
            <button onClick={function(){logLapse("mo");}} style={{ width:"100%", padding:"5px 0", background:"transparent", border:"1px solid "+C.rose+"50", borderRadius:7, color:C.rose, fontSize:10, cursor:"pointer", fontWeight:600 }}>
              Log MO Lapse
            </button>
          )}
          {today.mo && (
            <button onClick={function(){undoLapse("mo");}} style={{ width:"100%", padding:"5px 0", background:C.amber+"15", border:"1px solid "+C.amber+"50", borderRadius:7, color:C.amber, fontSize:10, cursor:"pointer", fontWeight:600 }}>
              ↩ Undo Today's Lapse
            </button>
          )}
        </div>

        {/* SR */}
        <div style={{ ...cardS, textAlign:"center", padding:"14px 10px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.txt, marginBottom:2 }}>🔋 SR</div>
          <div style={{ fontSize:9, color:C.sub, marginBottom:10, lineHeight:1.4 }}>Energy retention · partner sex OK</div>
          <div style={{ fontSize:38, fontWeight:900, color:C.p3, lineHeight:1, marginBottom:4 }}>{srDays}</div>
          <div style={{ fontSize:9, color:C.sub, marginBottom:10 }}>days · best: {resetData.sr.bestStreak}</div>
          <div style={{ borderTop:"1px solid "+C.bord, paddingTop:8 }}>
            <div style={{ fontSize:9, color:C.sub, marginBottom:6 }}>🤝 Partner · today: <span style={{ color:C.green, fontWeight:700 }}>{today.partnerSex||0}</span></div>
            <div style={{ display:"flex", gap:5 }}>
              <button onClick={function(){logPartnerSex(1);}} style={{ flex:1, padding:"4px 0", background:C.green+"20", border:"1px solid "+C.green+"50", borderRadius:7, color:C.green, fontSize:11, fontWeight:700, cursor:"pointer" }}>+</button>
              {(today.partnerSex||0) > 0 && (
                <button onClick={function(){logPartnerSex(-1);}} style={{ flex:1, padding:"4px 0", background:C.amber+"15", border:"1px solid "+C.amber+"40", borderRadius:7, color:C.amber, fontSize:10, cursor:"pointer" }}>↩</button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Lapse Intelligence + Trigger ── */}
      {showLapse && lapseIntel && (
        <div style={{ ...cardS, border:"1px solid "+C.rose+"60", marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.rose, marginBottom:10 }}>
            Lapse Logged — You were on Day {lapseIntel.days}
          </div>

          {lapseIntel.intel.milestones.length > 0 && (
            <div style={{ background:"#0a0a0a", borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
              <div style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:"uppercase", marginBottom:7 }}>What you built — this is real, it's not gone</div>
              {lapseIntel.intel.milestones.map(function(m, i) {
                return <div key={i} style={{ fontSize:11, color:C.green, marginBottom:4 }}>✓ {m}</div>;
              })}
            </div>
          )}

          <div style={{ fontSize:12, color:C.txt2, lineHeight:1.7, marginBottom:12 }}>
            Your neural pathways still remember the clean state. You didn't erase the progress — you have to rebuild momentum, not restart from zero. <span style={{ color:C.p3, fontWeight:700 }}>Next target: Day {lapseIntel.intel.nextTarget}.</span> Aim there first, then beyond.
          </div>

          <div style={{ fontSize:10, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Log Trigger — helps find your pattern</div>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:C.sub, marginBottom:5 }}>Stress Level · {trigStress}/5</div>
            <input type="range" min={1} max={5} value={trigStress} onChange={function(e){setTrigStress(Number(e.target.value));}} style={{ width:"100%", accentColor:C.p1 }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:C.sub, marginTop:2 }}><span>Chill</span><span>Moderate</span><span>High</span></div>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
            {TRIGGER_TYPES.map(function(t) {
              return <button key={t} onClick={function(){setTrigType(t);}} style={{ padding:"4px 10px", borderRadius:7, border:"1px solid "+(trigType===t?C.p1:C.bord2), background:trigType===t?C.p1+"20":"transparent", color:trigType===t?C.p3:C.sub, fontSize:11, cursor:"pointer" }}>{t}</button>;
            })}
          </div>
          <input value={trigNote} onChange={function(e){setTrigNote(e.target.value);}} placeholder="Optional note — time of day, what you were doing..." style={{ ...inpS, width:"100%", textAlign:"left", padding:"7px 10px", marginBottom:12 }} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={function(){setShowLapse(null);setLapseIntel(null);}} style={{ flex:1, padding:"9px", borderRadius:8, border:"1px solid "+C.bord2, background:"transparent", color:C.sub, cursor:"pointer", fontSize:12 }}>Cancel</button>
            <button onClick={confirmLapse} style={{ flex:2, padding:"9px", borderRadius:8, border:"none", background:C.p1, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:700 }}>Confirm & Reset Streak</button>
          </div>
        </div>
      )}

      {/* ── Maintenance Window ── */}
      <div style={{ ...cardS, border:"1px solid "+(window_.available?window_.color+"60":C.bord), marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:window_.color, flexShrink:0 }} />
          <div style={{ fontSize:12, fontWeight:700, color:window_.color }}>
            {window_.label}
            {!window_.available && <span style={{ color:C.sub, fontWeight:400, fontSize:10 }}> · Day {window_.nextAt} in {window_.nextAt - noPDays} days</span>}
          </div>
        </div>
        <div style={{ fontSize:11, color:C.txt2, lineHeight:1.65 }}>{window_.detail}</div>
      </div>

      {/* ── Combustion + Fuel Pack ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
        {/* Combustion */}
        <div style={cardS}>
          <div style={{ fontSize:11, fontWeight:700, color:C.txt, marginBottom:2 }}>🚬 Combustion Log</div>
          <div style={{ fontSize:9, color:C.sub, marginBottom:12 }}>Cigarettes today</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:10 }}>
            <button onClick={function(){updateToday({cigs:Math.max(0,(today.cigs||0)-1)});}} style={{ width:30, height:30, borderRadius:8, border:"1px solid "+C.bord2, background:"transparent", color:C.txt, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
            <div style={{ fontSize:40, fontWeight:900, color:(today.cigs||0)>0?C.rose:C.sub, minWidth:44, textAlign:"center" }}>{today.cigs||0}</div>
            <button onClick={function(){updateToday({cigs:(today.cigs||0)+1});}} style={{ width:30, height:30, borderRadius:8, border:"none", background:C.rose, color:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
          </div>
          {(today.cigs||0) > 0 && (
            <div style={{ fontSize:10, color:C.rose, background:C.rose+"12", borderRadius:7, padding:"6px 8px", textAlign:"center", lineHeight:1.5 }}>
              Each cigarette resets the 21-day nicotine desensitisation cycle
            </div>
          )}
        </div>

        {/* Fuel Pack */}
        <div style={cardS}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:2 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.txt }}>🍬 Fuel Pack</div>
            <button onClick={function(){setShowGummyForm(function(v){return !v;});}} style={{ fontSize:10, color:C.p3, background:C.p1+"20", border:"none", borderRadius:6, padding:"3px 8px", cursor:"pointer" }}>+ Log</button>
          </div>
          <div style={{ fontSize:9, color:C.sub, marginBottom:8 }}>Supplement log · brand + mg</div>

          {hoursSinceGummy !== null && (
            <div style={{ fontSize:10, color:hoursSinceGummy<48?C.amber:C.green, background:"#0a0a0a", borderRadius:7, padding:"5px 8px", marginBottom:8, textAlign:"center" }}>
              {hoursSinceGummy}h since last · {hoursSinceGummy < 48 ? "⚠️ D2 receptors recovering" : "✓ Cleared — ready if needed"}
            </div>
          )}

          {showGummyForm && (
            <div style={{ borderTop:"1px solid "+C.bord, paddingTop:8 }}>
              <input value={gBrand} onChange={function(e){setGBrand(e.target.value);}} placeholder="Brand" style={{ ...inpS, width:"100%", textAlign:"left", padding:"5px 8px", marginBottom:6 }} />
              <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                <input type="number" value={gMg} onChange={function(e){setGMg(e.target.value);}} placeholder="mg" style={{ ...inpS, flex:1, textAlign:"left", padding:"5px 8px" }} />
                <select value={gType} onChange={function(e){setGType(e.target.value);}} style={{ ...inpS, flex:1, textAlign:"left", padding:"5px 8px", cursor:"pointer" }}>
                  {["CBD","THC","Hybrid","Other"].map(function(t){return <option key={t}>{t}</option>;})}
                </select>
              </div>
              <input value={gNote} onChange={function(e){setGNote(e.target.value);}} placeholder="Note (optional)" style={{ ...inpS, width:"100%", textAlign:"left", padding:"5px 8px", marginBottom:6 }} />
              <button onClick={addGummy} style={{ width:"100%", padding:"6px", background:C.p1, border:"none", borderRadius:7, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Save Entry</button>
            </div>
          )}

          {!showGummyForm && (resetData.gummyLog||[]).length === 0 && (
            <div style={{ fontSize:10, color:C.dim, textAlign:"center", padding:"8px 0" }}>No entries yet</div>
          )}
          {!showGummyForm && (resetData.gummyLog||[]).slice(-4).reverse().map(function(g) {
            return (
              <div key={g.id} style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.txt2, padding:"4px 0", borderBottom:"1px solid "+C.bord }}>
                <span><span style={{ color:C.p3 }}>{g.brand}</span> {g.mg}mg <span style={{ color:C.sub }}>{g.type}</span></span>
                <span style={{ color:C.dim }}>{new Date(g.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 90-Day Protocol Grid ── */}
      <div style={{ ...cardS, marginBottom:12 }}>
        <div style={labelS}>90-Day Protocol Grid</div>
        {[
          { label:"No-P",  color:C.rose,  check:function(g){return g.p;} },
          { label:"No-MO", color:C.amber, check:function(g){return g.mo;} },
          { label:"SR",    color:C.p3,    check:function(g){return g.mo||g.p;} },
        ].map(function(row) {
          return (
            <div key={row.label} style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, color:C.sub, fontWeight:700, marginBottom:4 }}>{row.label}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:2 }}>
                {grid.map(function(g) {
                  var isLapse  = row.check(g);
                  var isClean  = g.tracked && !isLapse;
                  var bg = g.isToday ? C.p1 : isLapse ? row.color+"70" : isClean ? C.green+"50" : "#1a1a1a";
                  return <div key={g.key} title={g.key} style={{ width:15, height:15, borderRadius:3, background:bg }} />;
                })}
              </div>
            </div>
          );
        })}
        <div style={{ display:"flex", gap:12, marginTop:8, fontSize:9, color:C.sub }}>
          <span style={{ color:C.green }}>■ Clean</span>
          <span style={{ color:C.rose  }}>■ Lapse</span>
          <span style={{ color:C.p1   }}>■ Today</span>
          <span>■ Not tracked</span>
        </div>
      </div>

      {/* ── Recent Triggers ── */}
      {Object.values(resetData.history).some(function(h){return (h.triggers||[]).length>0;}) && (
        <div style={{ ...cardS, marginBottom:12 }}>
          <div style={labelS}>Trigger Journal</div>
          {Object.entries(resetData.history).sort().reverse().slice(0,7).map(function(pair) {
            var date = pair[0]; var h = pair[1];
            var trigs = h.triggers || [];
            if (!trigs.length) return null;
            return (
              <div key={date} style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:C.sub, marginBottom:5 }}>{date}</div>
                {trigs.map(function(t, i) {
                  return (
                    <div key={i} style={{ display:"flex", gap:8, fontSize:11, color:C.txt2, padding:"4px 0", borderBottom:"1px solid "+C.bord, flexWrap:"wrap" }}>
                      <span style={{ color:C.p3, fontWeight:600 }}>{t.category}</span>
                      <span style={{ color:C.amber }}>Stress {t.stress}/5</span>
                      <span>{t.type}</span>
                      {t.note && <span style={{ color:C.sub }}>"{t.note}"</span>}
                      <span style={{ color:C.dim, marginLeft:"auto" }}>{new Date(t.time).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── AI Pattern Analysis ── */}
      <div style={cardS}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <div>
            <div style={labelS}>AI Pattern Analysis</div>
            <div style={{ fontSize:11, color:C.sub, marginTop:-6 }}>Needs 7+ days of data · on demand</div>
          </div>
          <button onClick={analyzePatterns} disabled={analyzing} style={{ padding:"8px 18px", background:analyzing?C.dim:C.p1, border:"none", borderRadius:8, color:"#fff", fontSize:11, fontWeight:700, cursor:analyzing?"wait":"pointer" }}>
            {analyzing ? "Analyzing…" : "Analyze ✦"}
          </button>
        </div>
        {!aiText && (
          <div style={{ fontSize:11, color:C.dim, textAlign:"center", padding:"14px 0" }}>
            Log 7+ days then tap Analyze — it will reveal your exact patterns and give you a protocol to break them.
          </div>
        )}
        {aiText && (
          <div style={{ background:"#0a0a0a", border:"1px solid "+C.p1+"40", borderRadius:10, padding:"13px 15px", fontSize:12, lineHeight:1.75, color:C.txt2, whiteSpace:"pre-wrap" }}>
            {aiText.split(/(\*\*[^*]+\*\*)/).map(function(part, i) {
              if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ color:C.p3, fontWeight:700 }}>{part.slice(2,-2)}</strong>;
              return <span key={i}>{part}</span>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Performance Tab ───────────────────────────────────────────────────────────
function PerformanceTab({ whoopM, setWhoopM, morning, athlete, grand }) {
  var [coaching, setCoaching] = useState("");
  var [loading,  setLoading]  = useState(false);
  var r  = Number(whoopM.recovery);
  var rc = r >= 67 ? C.green : r >= 34 ? C.amber : r > 0 ? C.rose : C.dim;
  function setM(k, v) { setWhoopM(function(prev){return {...prev,[k]:v};}); }

  async function getCoach() {
    setLoading(true); setCoaching("");
    var mDone = morning.filter(isDone).map(function(h){return h.name;}).join(", ") || "none";
    var aDone = athlete.filter(function(a){return a.todayMins>0;}).map(function(a){return a.name+" "+a.todayMins+"min";}).join(", ") || "none";
    try {
      var res = await fetch(AI_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:600,
        messages:[{role:"user",content:"Elite performance coach for JK, 31yo male, Bangalore. HYROX target sub-1:35. VO2 Max ~54-55.\n\nWHOOP: Recovery "+(whoopM.recovery||"?")+"% | HRV "+(whoopM.hrv||"?")+"ms | RHR "+(whoopM.rhr||"?")+"bpm | Sleep "+(whoopM.sleepHrs||"?")+"hrs @ "+(whoopM.sleepPerf||"?")+"% | Strain "+(whoopM.strain||"?")+"\nMorning: "+mDone+"\nTraining: "+aDone+"\nNutrition: "+grand.cal+"cal / "+grand.protein+"g P / "+grand.carbs+"g C / "+grand.fats+"g F\n\n**Recovery Status**: one line\n**Train Today**: specific + intensity\n**Nutrition Now**: what to eat next and when\n**Top Priority**: single biggest lever today\n**Tonight**: one action for a better tomorrow\n\nMax 180 words. Direct, data-driven."}],
      })});
      var data  = await res.json();
      var block = data.content && data.content.find(function(b){return b.type==="text";});
      setCoaching(block ? block.text : "No response");
    } catch { setCoaching("Error — check connection"); }
    setLoading(false);
  }

  var fields = [
    {key:"recovery", label:"Recovery", unit:"%",  color:rc},
    {key:"hrv",      label:"HRV",      unit:"ms"},
    {key:"rhr",      label:"RHR",      unit:"bpm"},
    {key:"sleepHrs", label:"Sleep",    unit:"hrs"},
    {key:"sleepPerf",label:"Sleep %",  unit:"%"},
    {key:"strain",   label:"Strain",   unit:"/21"},
  ];

  return (
    <div>
      <div style={{ ...cardS, borderTop:"1.5px solid "+C.p1, marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={labelS}>WHOOP · Daily Metrics</div>
            {whoopM.recovery && <div style={{ fontSize:11, color:rc, fontWeight:700, marginTop:-6, marginBottom:2 }}>{r>=67?"🟢 Full send":r>=34?"🟡 Train smart":"🔴 Recovery day"}</div>}
          </div>
          <button onClick={getCoach} disabled={loading} style={{ padding:"8px 18px", background:loading?C.dim:C.p1, border:"none", borderRadius:8, color:"#fff", fontSize:11, fontWeight:700, cursor:loading?"wait":"pointer" }}>
            {loading ? "Coaching…" : "Get AI Coach ✦"}
          </button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:7, marginBottom:coaching?14:0 }}>
          {fields.map(function(f) {
            return (
              <div key={f.key} style={{ background:"#0a0a0a", border:"1px solid "+C.bord2, borderRadius:8, padding:"8px 6px", textAlign:"center" }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.sub, textTransform:"uppercase", marginBottom:4 }}>{f.label}</div>
                <input type="number" value={whoopM[f.key]} onChange={function(e){setM(f.key,e.target.value);}} onFocus={function(e){e.target.select();}} style={{ ...inpS, width:"100%", boxSizing:"border-box", fontSize:13, fontWeight:700, color:f.color||C.p3, padding:3 }} />
                <div style={{ fontSize:9, color:C.sub, marginTop:3 }}>{f.unit}</div>
              </div>
            );
          })}
        </div>
        {coaching && (
          <div style={{ background:"#0a0a0a", border:"1px solid "+C.p1+"40", borderRadius:10, padding:"13px 15px", fontSize:12, lineHeight:1.75, color:C.txt2, whiteSpace:"pre-wrap" }}>
            {coaching.split(/(\*\*[^*]+\*\*)/).map(function(part, i) {
              if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ color:C.p3, fontWeight:700 }}>{part.slice(2,-2)}</strong>;
              return <span key={i}>{part}</span>;
            })}
          </div>
        )}
      </div>
      <div style={{ ...cardS, borderTop:"1.5px solid #fc4c02" }}>
        <div style={labelS}>Strava · Activity Sync</div>
        <div style={{ textAlign:"center", padding:"24px 0" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🏃</div>
          <div style={{ fontSize:13, color:C.txt, fontWeight:600, marginBottom:6 }}>Strava Auto-Sync Coming</div>
          <div style={{ fontSize:11, color:C.sub, lineHeight:1.8, maxWidth:300, margin:"0 auto" }}>
            Add <span style={{ color:"#fc4c02" }}>pages/api/strava-sync.js</span> to GitHub and set <span style={{ color:C.p3 }}>STRAVA_CLIENT_ID</span>, <span style={{ color:C.p3 }}>STRAVA_CLIENT_SECRET</span>, <span style={{ color:C.p3 }}>STRAVA_REFRESH_TOKEN</span> in Vercel. Daily cron pulls your last activity automatically.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sync Modal ────────────────────────────────────────────────────────────────
function SyncModal({ onClose, onSave, initUrl }) {
  var [url,     setUrl]     = useState(initUrl || "");
  var [testing, setTesting] = useState(false);
  var [status,  setStatus]  = useState("");
  async function test() {
    setTesting(true); setStatus("");
    var u = url.replace(/\/$/, "");
    try {
      var r = await fetch(u + "/jk-ping.json", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ping:true}) });
      if (r.ok) { setStatus("✓ Connected!"); await fetch(u+"/jk-ping.json",{method:"DELETE"}); }
      else setStatus("✗ Got "+r.status+" — check URL");
    } catch(e) { setStatus("✗ "+e.message); }
    setTesting(false);
  }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ ...cardS, width:420, padding:26 }}>
        <div style={{ fontSize:15, fontWeight:800, color:C.txt, marginBottom:4 }}>☁️ Enable Real-Time Sync</div>
        <div style={{ fontSize:12, color:C.sub, marginBottom:18 }}>Live sync across all devices. Enter once — saved forever.</div>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.sub, textTransform:"uppercase", marginBottom:5 }}>Firebase Database URL</div>
          <input value={url} onChange={function(e){setUrl(e.target.value);}} placeholder="https://your-app-default-rtdb.firebaseio.com" style={{ ...inpS, width:"100%", textAlign:"left", padding:"9px 12px", boxSizing:"border-box", fontSize:12 }} />
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={test} disabled={!url||testing} style={{ padding:"8px 14px", background:C.bord2, border:"1px solid "+C.bord2, borderRadius:8, color:C.txt2, fontSize:12, fontWeight:600, cursor:"pointer" }}>{testing?"Testing…":"Test"}</button>
          <button onClick={function(){if(url){onSave(url.replace(/\/$/,""));onClose();}}} disabled={!url} style={{ flex:1, padding:"9px", background:url?C.p1:C.dim, border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor:url?"pointer":"not-allowed" }}>Save & Sync</button>
          <button onClick={onClose} style={{ padding:"8px 12px", background:"transparent", border:"1px solid "+C.bord2, borderRadius:8, color:C.sub, fontSize:12, cursor:"pointer" }}>Cancel</button>
        </div>
        {status && <div style={{ fontSize:12, fontWeight:600, color:status.startsWith("✓")?C.green:C.rose, marginTop:10 }}>{status}</div>}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  var [tab,       setTab]       = useState("daily");
  var [morning,   setMorning]   = useState(INIT_MORNING);
  var [athlete,   setAthlete]   = useState(INIT_ATHLETE);
  var [general,   setGeneral]   = useState(INIT_GENERAL);
  var [coffeeLog, setCoffeeLog] = useState([]);
  var [grand,     setGrand]     = useState({cal:0,protein:0,carbs:0,fats:0});
  var [whoopM,    setWhoopM]    = useState({recovery:"",hrv:"",rhr:"",sleepPerf:"",sleepHrs:"",strain:""});
  var [weekHist,  setWeekHist]  = useState({});
  var [resetData, setResetData] = useState(INIT_RESET);
  var [loaded,    setLoaded]    = useState(false);
  var [showSync,  setShowSync]  = useState(false);
  var [fbUrl,     setFbUrl]     = useState("");
  var [syncSt,    setSyncSt]    = useState("local");
  var saveTimer = useRef(null);

  function snapshot() {
    return { date:TODAY_S, morning:morning, athlete:athlete, general:general, coffeeLog:coffeeLog, whoopM:whoopM, weekHist:weekHist, resetData:resetData };
  }

  useEffect(function() {
    var failsafe = setTimeout(function(){setLoaded(true);}, 4000);
    (async function() {
      try {
        var savedUrl = await lGet(LS.FBURL);
        var s = null;
        if (savedUrl) { setFbUrl(savedUrl); setSyncSt("syncing"); s = await fbRead(savedUrl); }
        if (!s) s = await lGet(LS.DATA);
        if (s) {
          var same = s.date === TODAY_S;
          if (s.morning)    setMorning(s.morning.map(function(h){return same?h:{...h,done:false,todayMins:0,todayPages:0};}));
          if (s.athlete)    setAthlete(s.athlete.map(function(h){return same?h:{...h,todayMins:0};}));
          if (s.general)    setGeneral(s.general.map(function(h){return same?h:{...h,done:false,todayMl:0};}));
          if (same&&s.coffeeLog)  setCoffeeLog(s.coffeeLog);
          if (same&&s.whoopM)     setWhoopM(s.whoopM);
          if (s.weekHist)         setWeekHist(s.weekHist);
          if (s.resetData)        setResetData(s.resetData);
        }
        setSyncSt(savedUrl?"synced":"local");
      } catch(e){ console.error(e); }
      finally{ clearTimeout(failsafe); setLoaded(true); }
    })();
  }, []);

  useEffect(function() {
    if (!loaded) return;
    var count = morning.filter(isDone).length + general.filter(function(h){return h.done||(h.mode==="ml"&&h.todayMl>=h.targetMl);}).length;
    setWeekHist(function(prev){return {...prev,[TODAY_S]:count};});
  }, [loaded, morning, general]);

  useEffect(function() {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async function() {
      var s = snapshot();
      await lSet(LS.DATA, s);
      if (fbUrl) { setSyncSt("syncing"); await fbWrite(fbUrl, s); setSyncSt("synced"); }
    }, 800);
  }, [loaded, morning, athlete, general, coffeeLog, whoopM, weekHist, resetData]);

  async function saveFbUrl(url) {
    setFbUrl(url); await lSet(LS.FBURL, url);
    setSyncSt("syncing"); await fbWrite(url, snapshot()); setSyncSt("synced");
  }

  function dispatch(action) {
    if (action.type === "MORNING_TOGGLE") setMorning(function(m){return m.map(function(h){return h.id===action.id?{...h,done:!h.done}:h;});});
    if (action.type === "MORNING_CHANGE") setMorning(function(m){return m.map(function(h){return h.id===action.id?{...h,[action.k]:action.v}:h;});});
    if (action.type === "ATHLETE_CHANGE") setAthlete(function(a){return a.map(function(h){return h.id===action.id?{...h,todayMins:action.v}:h;});});
    if (action.type === "GENERAL_TOGGLE") setGeneral(function(g){return g.map(function(h){return h.id===action.id?{...h,done:!h.done,streak:!h.done?h.streak+1:Math.max(0,h.streak-1)}:h;});});
    if (action.type === "HYDRATION_ADD")  setGeneral(function(g){return g.map(function(h){if(h.id!==action.id)return h;var ml=h.todayMl+action.ml;return{...h,todayMl:ml,done:ml>=h.targetMl};});});
    if (action.type === "HYDRATION_SET")  setGeneral(function(g){return g.map(function(h){if(h.id!==action.id)return h;return{...h,todayMl:action.ml,done:action.ml>=h.targetMl};});});
    if (action.type === "COFFEE_SET")     setCoffeeLog(action.fn);
    if (action.type === "GRAND_SET")      setGrand(action.grand);
  }

  var morningPct  = morning.length > 0 ? Math.round((morning.filter(isDone).length / morning.length) * 100) : 0;
  var noPDays     = resetData.noP ? daysBetween(resetData.noP.streakStart, TODAY_S) : 0;
  var syncColor   = syncSt==="synced"?C.green:syncSt==="syncing"?C.amber:C.dim;
  var syncLabel   = syncSt==="synced"?"Synced ✓":syncSt==="syncing"?"Syncing…":"Local only";

  var tabs = [
    { id:"daily",       label:"Daily",       icon:"📋" },
    { id:"reset",       label:"Mirror",      icon:"🔋" },
    { id:"performance", label:"Performance", icon:"⚡" },
  ];

  if (!loaded) {
    return <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:C.p3, fontFamily:"Inter,sans-serif", fontSize:14 }}>Loading…</div>;
  }

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'Inter',system-ui,sans-serif", color:C.txt, paddingBottom:70 }}>
      {showSync && <SyncModal onClose={function(){setShowSync(false);}} onSave={saveFbUrl} initUrl={fbUrl} />}

      {/* Header */}
      <div style={{ padding:"16px 18px 12px", borderBottom:"1px solid "+C.bord }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:C.txt, letterSpacing:"-0.5px" }}>Life Dashboard</div>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:syncColor }} />
              <span style={{ fontSize:10, color:C.sub }}>{syncLabel} · {TODAY_LBL}</span>
            </div>
          </div>
          <button onClick={function(){setShowSync(true);}} style={{ padding:"6px 12px", background:"transparent", border:"1px solid "+(fbUrl?C.p1:C.bord2), borderRadius:8, color:fbUrl?C.p3:C.sub, fontSize:10, fontWeight:600, cursor:"pointer" }}>
            {fbUrl ? "🔄 Sync" : "☁️ Sync"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:"14px 18px" }}>
        {tab === "daily"       && <DailyTab       state={{morning:morning,athlete:athlete,general:general,coffeeLog:coffeeLog,grand:grand,whoopM:whoopM,weekHist:weekHist}} dispatch={dispatch} noPDays={noPDays} whoopRecovery={whoopM.recovery} />}
        {tab === "reset"       && <ResetTab        resetData={resetData} setResetData={setResetData} morningPct={morningPct} />}
        {tab === "performance" && <PerformanceTab  whoopM={whoopM} setWhoopM={setWhoopM} morning={morning} athlete={athlete} grand={grand} />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.card, borderTop:"1px solid "+C.bord, display:"flex", zIndex:100 }}>
        {tabs.map(function(t) {
          var active = tab === t.id;
          return (
            <button key={t.id} onClick={function(){setTab(t.id);}} style={{ flex:1, padding:"12px 0 10px", background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <span style={{ fontSize:18 }}>{t.icon}</span>
              <span style={{ fontSize:10, fontWeight:active?700:400, color:active?C.p3:C.sub }}>{t.label}</span>
              {active && <div style={{ width:20, height:2, background:C.p1, borderRadius:99 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
