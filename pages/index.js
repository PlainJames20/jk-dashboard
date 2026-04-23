import { useState, useRef, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE REALTIME DATABASE — works from sandboxed iframes, no auth needed
// REST API: GET/PUT to https://YOUR-DB.firebaseio.com/jk-dashboard.json
// Firebase always returns Access-Control-Allow-Origin: * on all responses
// ─────────────────────────────────────────────────────────────────────────────
async function fbRead(dbUrl) {
  try {
    const r = await fetch(`${dbUrl}/jk-dashboard.json`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function fbWrite(dbUrl, data) {
  try {
    await fetch(`${dbUrl}/jk-dashboard.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL STORAGE (Claude window.storage) — backup when offline
// ─────────────────────────────────────────────────────────────────────────────
const LS_DATA = "jk:dash:v4";
const LS_TPLS = "jk:tpl:v3";
const LS_FBURL = "jk:fb:url";

async function lGet(k) {
  try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function lSet(k, v) {
  try { await window.storage.set(k, JSON.stringify(v)); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: "#000", card: "#0f0f0f", bord: "#1f1f1f", bord2: "#2a2a2a",
  p1: "#7c3aed", p2: "#a855f7", p3: "#c084fc",
  dim: "#444", sub: "#666", txt: "#f0f0f0", txt2: "#999",
  green: "#22c55e", amber: "#f59e0b", rose: "#f43f5e",
};

// ─────────────────────────────────────────────────────────────────────────────
// DATE — always live
// ─────────────────────────────────────────────────────────────────────────────
const NOW       = new Date();
const TODAY_D   = NOW.getDate();
const TODAY_M   = NOW.getMonth();
const TODAY_Y   = NOW.getFullYear();
const TODAY_S   = NOW.toISOString().split("T")[0];
const TODAY_DOW = (NOW.getDay() + 6) % 7; // Mon=0
const TODAY_LBL = NOW.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const DAYS      = ["M", "T", "W", "T", "F", "S", "S"];
const TARGETS   = { cal: [2400, 2600], protein: 160, fats: 80, carbs: 240 };

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL DATA
// ─────────────────────────────────────────────────────────────────────────────
const fw = () => [false, false, false, false, false, false, false];

const INIT_MORNING = [
  { id: "m1", name: "Visualization",  mode: "check", done: false,     freq: "daily", weekDone: fw(), streak: 0 },
  { id: "m2", name: "Meditation",     mode: "range", todayMins: 0,    freq: "daily", weekDone: fw(), streak: 0, rangeMin: 10, rangeMax: 25 },
  { id: "m3", name: "Reading",        mode: "pages", todayPages: 0,   freq: "daily", weekDone: fw(), streak: 0, targetPages: 20 },
  { id: "m4", name: "Voice Training", mode: "mins",  todayMins: 0,    freq: 3,       weekDone: fw(), streak: 0, targetMins: 20 },
];

const INIT_ATHLETE = [
  { id: "a1", name: "Run",               icon: "🏃", freq: 4,       weekDone: fw(), todayMins: 0, targetMins: 30 },
  { id: "a2", name: "Upper Body",        icon: "💪", freq: 3,       weekDone: fw(), todayMins: 0, targetMins: 45 },
  { id: "a3", name: "Lower Body",        icon: "🦵", freq: 3,       weekDone: fw(), todayMins: 0, targetMins: 45 },
  { id: "a4", name: "Mobility",          icon: "🤸", freq: "daily", weekDone: fw(), todayMins: 0, targetMins: 20 },
  { id: "a5", name: "Deep Stretch/Yoga", icon: "🧘", freq: 3,       weekDone: fw(), todayMins: 0, targetMins: 30 },
];

const INIT_GENERAL = [
  { id: "g1", name: "Hydration · 8 glasses", done: false, freq: "daily", weekDone: fw(), streak: 0 },
];

const INIT_TEMPLATES = [
  { id: "t1", name: "🥤 ON Protein Shake", cal: 255, protein: 49, carbs: 7, fats: 4 },
];

const COFFEES = [
  { id: "filter",    name: "Filter Coffee",  cal: 75,  protein: 3, carbs: 8,  fats: 3, caffeine: 80  },
  { id: "black",     name: "Black Coffee",   cal: 5,   protein: 0, carbs: 0,  fats: 0, caffeine: 95  },
  { id: "americano", name: "Americano",      cal: 10,  protein: 0, carbs: 1,  fats: 0, caffeine: 95  },
  { id: "latte",     name: "Latte",          cal: 120, protein: 6, carbs: 12, fats: 4, caffeine: 95  },
  { id: "cappuccino",name: "Cappuccino",     cal: 80,  protein: 4, carbs: 8,  fats: 3, caffeine: 95  },
  { id: "cold_brew", name: "Cold Brew",      cal: 10,  protein: 0, carbs: 0,  fats: 0, caffeine: 155 },
  { id: "iced_latte",name: "Iced Latte",     cal: 100, protein: 5, carbs: 10, fats: 3, caffeine: 95  },
  { id: "iced_mocha",name: "Iced Mocha",     cal: 250, protein: 6, carbs: 38, fats: 8, caffeine: 95  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────
const card  = { background: C.card, border: `1px solid ${C.bord}`, borderRadius: 12, padding: "14px 16px" };
const label = { fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 9 };
const inp   = { background: "#0a0a0a", border: `1px solid ${C.bord2}`, borderRadius: 7, padding: "5px 9px", color: C.txt, fontSize: 13, outline: "none", width: 52, textAlign: "center", boxSizing: "border-box" };

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function isDone(h) {
  if (h.mode === "check") return h.done;
  if (h.mode === "range") return h.todayMins >= h.rangeMin;
  if (h.mode === "pages") return h.todayPages >= h.targetPages;
  return h.todayMins >= h.targetMins;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEK DOTS
// ─────────────────────────────────────────────────────────────────────────────
function WeekDots({ weekDone, freq }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
      {DAYS.map((d, i) => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: weekDone[i] ? C.p2 : i === TODAY_DOW ? C.dim : "#1a1a1a",
          border: i === TODAY_DOW && !weekDone[i] ? `1px solid ${C.p1}` : "none",
        }} />
      ))}
      <span style={{ fontSize: 10, color: C.sub, marginLeft: 2 }}>
        {freq === "daily" ? "Daily" : `${freq}×/wk`}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MACRO BAR
// ─────────────────────────────────────────────────────────────────────────────
function MacroBar({ label: lbl, val, target, color }) {
  const pct = Math.min(100, target > 0 ? (val / target) * 100 : 0);
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: C.txt2 }}>{lbl}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: val > target ? C.rose : color }}>
          {val}g <span style={{ color: C.sub, fontWeight: 400 }}>/ {target}g</span>
        </span>
      </div>
      <div style={{ height: 4, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// READINESS SCORE
// ─────────────────────────────────────────────────────────────────────────────
function Readiness({ recovery, morningPct, sleepPerf, proteinPct }) {
  const r     = +recovery || 0;
  const s     = +sleepPerf || 0;
  const score = Math.round(r * 0.35 + morningPct * 0.25 + s * 0.25 + proteinPct * 0.15);
  const has   = recovery || morningPct > 0;
  const color = score >= 70 ? C.green : score >= 40 ? C.amber : C.rose;
  const lbl   = score >= 70 ? "High Performance" : score >= 40 ? "On Track" : "Needs Attention";
  const bars  = [["Recovery", r * 0.35, C.green], ["Morning", morningPct * 0.25, C.p2], ["Sleep", s * 0.25, "#38bdf8"], ["Nutrition", proteinPct * 0.15, C.amber]];
  return (
    <div style={{ ...card, borderTop: `1.5px solid ${color}`, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ textAlign: "center", minWidth: 46 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{has ? score : "—"}</div>
        <div style={{ fontSize: 9, color: C.sub, marginTop: 2 }}>READINESS</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 5 }}>{has ? lbl : "Log WHOOP to score"}</div>
        <div style={{ display: "flex", gap: 3 }}>
          {bars.map(([name, val, clr]) => (
            <div key={name} style={{ flex: 1 }}>
              <div style={{ height: 3, background: "#1a1a1a", borderRadius: 99, overflow: "hidden", marginBottom: 2 }}>
                <div style={{ width: `${Math.min(100, val)}%`, height: "100%", background: clr, borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 8, color: C.sub }}>{name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MORNING ROW
// ─────────────────────────────────────────────────────────────────────────────
function MorningRow({ h, onToggle, onChange }) {
  const done = isDone(h);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderBottom: `1px solid ${C.bord}` }}>
      <div
        onClick={() => h.mode === "check" && onToggle(h.id)}
        style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${done ? C.p2 : C.dim}`, background: done ? C.p2 : "transparent", flexShrink: 0, cursor: h.mode === "check" ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {done && <svg width="9" height="9" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: done ? C.sub : C.txt }}>{h.name}</div>
        <WeekDots weekDone={h.weekDone} freq={h.freq} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
        {h.mode === "range" && (
          <>
            <input type="number" min={0} value={h.todayMins} onChange={e => onChange(h.id, "todayMins", +e.target.value)} style={inp} />
            <span style={{ fontSize: 10, color: C.sub }}>/{h.rangeMin}–{h.rangeMax}m</span>
          </>
        )}
        {h.mode === "pages" && (
          <>
            <input type="number" min={0} value={h.todayPages} onChange={e => onChange(h.id, "todayPages", +e.target.value)} style={inp} />
            <span style={{ fontSize: 10, color: C.sub }}>/{h.targetPages}pg</span>
          </>
        )}
        {h.mode === "mins" && (
          <>
            <input type="number" min={0} value={h.todayMins} onChange={e => onChange(h.id, "todayMins", +e.target.value)} style={inp} />
            <span style={{ fontSize: 10, color: C.sub }}>/{h.targetMins}m</span>
          </>
        )}
        {h.mode === "check" && (
          <span style={{ fontSize: 11, color: C.p3, fontWeight: 700 }}>🔥{h.streak}</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATHLETE ROW
// ─────────────────────────────────────────────────────────────────────────────
function AthleteRow({ h, onChange, mult }) {
  const target  = Math.round(h.targetMins * mult);
  const pct     = Math.min(100, target > 0 ? (h.todayMins / target) * 100 : 0);
  const reduced = mult < 1;
  return (
    <div style={{ padding: "7px 0", borderBottom: `1px solid ${C.bord}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{h.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.txt, flex: 1 }}>{h.name}</span>
        {reduced && <span style={{ fontSize: 9, color: C.amber, background: `${C.amber}15`, padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>↓{Math.round((1 - mult) * 100)}%</span>}
        <WeekDots weekDone={h.weekDone} freq={h.freq} />
        <input type="number" min={0} value={h.todayMins} onChange={e => onChange(h.id, +e.target.value)} style={inp} />
        <span style={{ fontSize: 10, color: reduced ? C.amber : C.sub, minWidth: 34 }}>/{target}m</span>
      </div>
      <div style={{ height: 3, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: reduced ? C.amber : C.p1, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COFFEE
// ─────────────────────────────────────────────────────────────────────────────
function Coffee({ log, setLog }) {
  const [sel, setSel] = useState("filter");
  const add = () => {
    const t = COFFEES.find(c => c.id === sel);
    setLog(l => [...l, { ...t, lid: Date.now(), time: new Date().toISOString() }]);
  };
  const total    = log.reduce((a, c) => a + c.caffeine, 0);
  const cafColor = total > 400 ? C.rose : total > 250 ? C.amber : C.green;
  return (
    <div style={{ padding: "9px 0", borderBottom: `1px solid ${C.bord}`, marginBottom: 9 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 7 }}>
        <span style={{ fontSize: 13, marginRight: 7 }}>☕</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.txt, flex: 1 }}>Coffee Log</span>
        <span style={{ fontSize: 11, color: cafColor, fontWeight: 700 }}>{total}mg caffeine</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <select value={sel} onChange={e => setSel(e.target.value)} style={{ ...inp, flex: 1, width: "auto", textAlign: "left", padding: "6px 8px", cursor: "pointer", fontSize: 11 }}>
          {COFFEES.map(c => <option key={c.id} value={c.id}>{c.name} · {c.cal}cal · {c.caffeine}mg</option>)}
        </select>
        <button onClick={add} style={{ padding: "6px 14px", background: C.p1, border: "none", borderRadius: 7, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {log.map((c, i) => {
          const late = new Date(c.time).getHours() >= 14;
          return (
            <div key={c.lid} style={{ display: "flex", alignItems: "center", gap: 4, background: "#0a0a0a", border: `1px solid ${late ? C.amber + "50" : C.bord2}`, borderRadius: 6, padding: "3px 7px" }}>
              <span style={{ fontSize: 10, color: late ? C.amber : C.p3 }}>☕ {c.name}</span>
              {late && <span style={{ fontSize: 9, color: C.amber }}>⚠️late</span>}
              <button onClick={() => setLog(l => l.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 12, lineHeight: 1 }}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NUTRITION
// ─────────────────────────────────────────────────────────────────────────────
function Nutrition({ coffeeLog, setCoffeeLog, onUpdate }) {
  const [foodInput, setFoodInput] = useState("");
  const [log, setLog]             = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [templates, setTemplates] = useState(INIT_TEMPLATES);
  const [savingId, setSavingId]   = useState(null);
  const [tplName, setTplName]     = useState("");
  const inputRef = useRef(null);

  useEffect(() => { lGet(LS_TPLS).then(t => { if (t) setTemplates(t); }); }, []);
  useEffect(() => { lSet(LS_TPLS, templates); }, [templates]);

  const coffeeMac = coffeeLog.reduce((a, c) => ({ cal: a.cal + c.cal, protein: a.protein + c.protein, carbs: a.carbs + c.carbs, fats: a.fats + c.fats }), { cal: 0, protein: 0, carbs: 0, fats: 0 });
  const foodMac   = log.reduce((a, e) => ({ cal: a.cal + e.cal, protein: a.protein + e.protein, fats: a.fats + e.fats, carbs: a.carbs + e.carbs }), { cal: 0, protein: 0, fats: 0, carbs: 0 });
  const grand     = { cal: foodMac.cal + coffeeMac.cal, protein: foodMac.protein + coffeeMac.protein, carbs: foodMac.carbs + coffeeMac.carbs, fats: foodMac.fats + coffeeMac.fats };

  useEffect(() => { onUpdate && onUpdate(grand); }, [grand.cal, grand.protein, grand.carbs, grand.fats]);

  const calMid   = (TARGETS.cal[0] + TARGETS.cal[1]) / 2;
  const calPct   = Math.min(100, (grand.cal / calMid) * 100);
  const calColor = grand.cal < TARGETS.cal[0] ? C.amber : grand.cal > TARGETS.cal[1] ? C.rose : C.green;
  const hour     = NOW.getHours();
  const expProt  = Math.round(TARGETS.protein * Math.max(0, Math.min(1, (hour - 6) / 14)));
  const behind   = hour >= 12 && grand.protein < expProt - 20;

  const logFood = async () => {
    if (!foodInput.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: "Nutrition expert for Indian/Bangalore food. Standard portions: 1 roti=120cal/3g P, 1 idli=70cal/2g P, 1 dosa=120cal/3g P, 1 cup cooked rice=210cal/4g P, 100g chicken breast=165cal/31g P, 100g paneer=265cal/18g P, 1 cup dal=150cal/9g P, 1 egg=78cal/6g P, 1 banana=90cal/1g P. Return ONLY valid JSON: {\"name\":string,\"cal\":number,\"protein\":number,\"fats\":number,\"carbs\":number}. No markdown.",
          messages: [{ role: "user", content: foodInput }]
        })
      });
      const data   = await res.json();
      const text   = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setLog(l => [...l, { ...parsed, id: Date.now() }]);
      setFoodInput("");
      inputRef.current?.focus();
    } catch {
      setError("Try: '2 rotis with dal' or '150g chicken + rice'");
    }
    setLoading(false);
  };

  const addTemplate = (t) => {
    setLog(l => [...l, { id: Date.now(), name: t.name, cal: t.cal, protein: t.protein, fats: t.fats, carbs: t.carbs }]);
  };

  const saveTemplate = (e) => {
    const name = tplName.trim() || e.name;
    setTemplates(ts => [...ts, { id: `t${Date.now()}`, name, cal: e.cal, protein: e.protein, fats: e.fats, carbs: e.carbs }]);
    setSavingId(null);
    setTplName("");
  };

  return (
    <div style={card}>
      <div style={label}>AI Macro Tracker · Bangalore Calibrated</div>

      <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
        {[
          { l: "Cal",     v: grand.cal,     t: `${TARGETS.cal[0]}–${TARGETS.cal[1]}`, c: calColor, u: ""  },
          { l: "Protein", v: grand.protein, t: TARGETS.protein,                       c: C.p2,     u: "g" },
          { l: "Carbs",   v: grand.carbs,   t: TARGETS.carbs,                         c: C.green,  u: "g" },
          { l: "Fats",    v: grand.fats,    t: TARGETS.fats,                          c: C.amber,  u: "g" },
        ].map(m => (
          <div key={m.l} style={{ flex: 1, background: "#0a0a0a", border: `1px solid ${C.bord2}`, borderRadius: 8, padding: "7px 5px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.sub, marginBottom: 2, fontWeight: 700, textTransform: "uppercase" }}>{m.l}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: m.c, lineHeight: 1 }}>{m.v}</div>
            <div style={{ fontSize: 9, color: C.sub, marginTop: 1 }}>/{m.t}{m.u}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 4, background: "#1a1a1a", borderRadius: 99, overflow: "hidden", marginBottom: 7 }}>
        <div style={{ width: `${calPct}%`, height: "100%", background: calColor, borderRadius: 99, transition: "width 0.4s" }} />
      </div>

      <MacroBar label="Protein" val={grand.protein} target={TARGETS.protein} color={C.p2} />
      {behind && (
        <div style={{ fontSize: 11, color: C.amber, background: `${C.amber}12`, border: `1px solid ${C.amber}30`, borderRadius: 7, padding: "5px 10px", marginBottom: 7 }}>
          💪 Protein behind — target ~{expProt}g by {hour}:00
        </div>
      )}
      <MacroBar label="Carbs" val={grand.carbs} target={TARGETS.carbs} color={C.green} />
      <MacroBar label="Fats"  val={grand.fats}  target={TARGETS.fats}  color={C.amber} />

      {grand.cal < TARGETS.cal[0] && (
        <div style={{ background: "#0a0a0a", border: `1px solid ${C.bord2}`, borderRadius: 7, padding: "6px 10px", marginBottom: 8, fontSize: 11 }}>
          <span style={{ color: C.sub }}>Still need: </span>
          <span style={{ color: C.amber, fontWeight: 700 }}>{TARGETS.cal[0] - grand.cal} cal · </span>
          <span style={{ color: C.p3,    fontWeight: 700 }}>{Math.max(0, TARGETS.protein - grand.protein)}g P · </span>
          <span style={{ color: C.green, fontWeight: 700 }}>{Math.max(0, TARGETS.carbs - grand.carbs)}g C · </span>
          <span style={{ color: C.amber, fontWeight: 700 }}>{Math.max(0, TARGETS.fats - grand.fats)}g F</span>
        </div>
      )}

      <Coffee log={coffeeLog} setLog={setCoffeeLog} />

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Quick Add</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {templates.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", background: "#0a0a0a", border: `1px solid ${C.p1}40`, borderRadius: 7, overflow: "hidden" }}>
              <button onClick={() => addTemplate(t)} style={{ padding: "4px 9px", background: "transparent", border: "none", color: C.p3, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                {t.name}
                <span style={{ display: "block", fontSize: 9, color: C.sub, fontWeight: 400 }}>{t.cal} cal · {t.protein}g P</span>
              </button>
              <button onClick={() => setTemplates(ts => ts.filter(x => x.id !== t.id))} style={{ padding: "0 7px", background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 13, alignSelf: "stretch" }}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input
          ref={inputRef} value={foodInput}
          onChange={e => setFoodInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && logFood()}
          placeholder="2 rotis + dal, 150g chicken, banana..."
          style={{ ...inp, flex: 1, width: "auto", textAlign: "left", padding: "7px 10px", borderRadius: 8, fontSize: 12 }}
        />
        <button onClick={logFood} disabled={loading} style={{ padding: "7px 14px", background: loading ? C.dim : C.p1, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: loading ? "wait" : "pointer", flexShrink: 0 }}>
          {loading ? "…" : "Log"}
        </button>
      </div>
      {error && <div style={{ fontSize: 11, color: C.rose, marginBottom: 5 }}>{error}</div>}

      {log.length === 0
        ? <div style={{ fontSize: 11, color: C.dim, textAlign: "center", padding: "8px 0" }}>No food logged yet</div>
        : (
          <div style={{ maxHeight: 160, overflowY: "auto" }}>
            {log.map(e => (
              <div key={e.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 0", borderBottom: `1px solid ${C.bord}`, fontSize: 11 }}>
                  <div style={{ flex: 1, color: C.txt }}>{e.name}</div>
                  <span style={{ color: calColor, fontWeight: 700, minWidth: 28 }}>{e.cal}</span>
                  <span style={{ color: C.p3,    minWidth: 28 }}>{e.protein}P</span>
                  <span style={{ color: C.green, minWidth: 28 }}>{e.carbs}C</span>
                  <span style={{ color: C.amber, minWidth: 24 }}>{e.fats}F</span>
                  <button onClick={() => setSavingId(savingId === e.id ? null : e.id)} style={{ background: "none", border: "none", color: savingId === e.id ? C.p3 : C.dim, cursor: "pointer", fontSize: 12, padding: "0 2px" }}>★</button>
                  <button onClick={() => setLog(l => l.filter(x => x.id !== e.id))} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 13, padding: "0 2px", lineHeight: 1 }}>×</button>
                </div>
                {savingId === e.id && (
                  <div style={{ display: "flex", gap: 5, padding: "5px 0 6px", borderBottom: `1px solid ${C.bord}` }}>
                    <input value={tplName} onChange={x => setTplName(x.target.value)} placeholder={e.name}
                      style={{ ...inp, flex: 1, width: "auto", textAlign: "left", padding: "4px 8px", fontSize: 11 }} />
                    <button onClick={() => saveTemplate(e)} style={{ padding: "4px 11px", background: C.p1, border: "none", borderRadius: 7, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHOOP
// ─────────────────────────────────────────────────────────────────────────────
function Whoop({ morning, athlete, grand, onChange }) {
  const [metrics, setMetrics] = useState({ recovery: "", hrv: "", rhr: "", sleepPerf: "", sleepHrs: "", strain: "" });
  const [coaching, setCoaching] = useState("");
  const [loading, setLoading]   = useState(false);

  const setM = (k, v) => {
    const m = { ...metrics, [k]: v };
    setMetrics(m);
    onChange && onChange(m);
  };

  const r  = +metrics.recovery;
  const rc = r >= 67 ? C.green : r >= 34 ? C.amber : r > 0 ? C.rose : C.dim;

  const getCoach = async () => {
    setLoading(true);
    setCoaching("");
    const mDone = morning.filter(isDone).map(h => h.name).join(", ") || "none";
    const aDone = athlete.filter(a => a.todayMins > 0).map(a => `${a.name} ${a.todayMins}min`).join(", ") || "none";
    const prompt = `You are an elite performance coach for JK, 31yo male, Bangalore. HYROX target sub-1:35. VO2 Max ~54-55.

WHOOP: Recovery ${metrics.recovery || "?"}% | HRV ${metrics.hrv || "?"}ms | RHR ${metrics.rhr || "?"}bpm | Sleep ${metrics.sleepHrs || "?"}hrs @ ${metrics.sleepPerf || "?"}% | Strain ${metrics.strain || "?"}
Morning done: ${mDone}
Training: ${aDone}
Nutrition: ${grand.cal}cal / ${grand.protein}g P / ${grand.carbs}g C / ${grand.fats}g F (targets: 2400-2600cal, 160P, 240C, 80F)

Reply with EXACTLY this structure:
**Recovery Status**: one line interpretation
**Train Today**: specific recommendation + intensity
**Nutrition Now**: what to eat next and when
**Top Priority**: single biggest lever today
**Tonight**: one thing to do for a better tomorrow

Direct, data-driven, max 180 words.`;

    try {
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      setCoaching(data.content?.find(b => b.type === "text")?.text || "No response");
    } catch {
      setCoaching("Error — check connection");
    }
    setLoading(false);
  };

  const fields = [
    { key: "recovery", label: "Recovery", unit: "%",  color: rc },
    { key: "hrv",      label: "HRV",      unit: "ms"           },
    { key: "rhr",      label: "RHR",      unit: "bpm"          },
    { key: "sleepHrs", label: "Sleep",    unit: "hrs"          },
    { key: "sleepPerf",label: "Sleep %",  unit: "%"            },
    { key: "strain",   label: "Strain",   unit: "/21"          },
  ];

  return (
    <div style={{ ...card, borderTop: `1.5px solid ${C.p1}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={label}>WHOOP · Daily Metrics</div>
          {metrics.recovery && (
            <div style={{ fontSize: 11, color: rc, fontWeight: 700, marginTop: -6, marginBottom: 2 }}>
              {r >= 67 ? "🟢 Full send" : r >= 34 ? "🟡 Train smart" : "🔴 Recovery day"}
            </div>
          )}
        </div>
        <button onClick={getCoach} disabled={loading} style={{ padding: "7px 16px", background: loading ? C.dim : C.p1, border: "none", borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Coaching…" : "Get AI Coach ✦"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 7, marginBottom: coaching ? 12 : 0 }}>
        {fields.map(f => (
          <div key={f.key} style={{ background: "#0a0a0a", border: `1px solid ${C.bord2}`, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.sub, textTransform: "uppercase", marginBottom: 4 }}>{f.label}</div>
            <input type="number" value={metrics[f.key]} onChange={e => setM(f.key, e.target.value)}
              style={{ ...inp, width: "100%", boxSizing: "border-box", fontSize: 13, fontWeight: 700, color: f.color || C.p3, padding: 3 }} />
            <div style={{ fontSize: 9, color: C.sub, marginTop: 3 }}>{f.unit}</div>
          </div>
        ))}
      </div>

      {coaching && (
        <div style={{ background: "#0a0a0a", border: `1px solid ${C.p1}40`, borderRadius: 10, padding: "13px 15px", fontSize: 12, lineHeight: 1.75, color: C.txt2, whiteSpace: "pre-wrap" }}>
          {coaching.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={i} style={{ color: C.p3, fontWeight: 700 }}>{part.slice(2, -2)}</strong>
              : <span key={i}>{part}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC MODAL — Firebase Realtime Database
// ─────────────────────────────────────────────────────────────────────────────
function SyncModal({ onClose, onSave, initUrl }) {
  const [url, setUrl]         = useState(initUrl || "");
  const [testing, setTesting] = useState(false);
  const [status, setStatus]   = useState("");

  const test = async () => {
    setTesting(true);
    setStatus("");
    const testUrl = url.replace(/\/$/, "");
    try {
      const r = await fetch(`${testUrl}/jk-ping.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ping: true })
      });
      if (r.ok) {
        setStatus("✓ Connected! Firebase is working perfectly.");
        await fetch(`${testUrl}/jk-ping.json`, { method: "DELETE" });
      } else {
        setStatus(`✗ Got ${r.status} — check your database URL and rules`);
      }
    } catch (e) {
      setStatus(`✗ ${e.message}`);
    }
    setTesting(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...card, width: 420, padding: 26 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.txt, marginBottom: 4 }}>☁️ Enable Real-Time Sync</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 18 }}>Live sync across phone + laptop. Free. Just a URL — no keys needed.</div>

        <div style={{ background: "#0a0a0a", border: `1px solid ${C.bord2}`, borderRadius: 9, padding: "13px 15px", marginBottom: 18, fontSize: 12, lineHeight: 2 }}>
          <div style={{ color: C.p3, fontWeight: 700, marginBottom: 6 }}>Setup — 3 minutes</div>
          <div style={{ color: C.txt2 }}>1. Go to <strong style={{ color: C.p3 }}>console.firebase.google.com</strong></div>
          <div style={{ color: C.txt2 }}>2. <strong style={{ color: C.p3 }}>Add project</strong> → name it anything → Continue × 2 → Create</div>
          <div style={{ color: C.txt2 }}>3. Left sidebar → <strong style={{ color: C.p3 }}>Build → Realtime Database</strong> → Create Database</div>
          <div style={{ color: C.txt2 }}>4. Choose any location → <strong style={{ color: C.p3 }}>Start in test mode</strong> → Enable</div>
          <div style={{ color: C.txt2 }}>5. Copy the URL shown (e.g. <span style={{ color: C.green }}>https://jk-xxx-rtdb.firebaseio.com</span>)</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", marginBottom: 5 }}>Firebase Database URL</div>
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://your-app-default-rtdb.firebaseio.com"
            style={{ ...inp, width: "100%", textAlign: "left", padding: "9px 12px", boxSizing: "border-box", fontSize: 12 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={test} disabled={!url || testing}
            style={{ padding: "8px 14px", background: C.bord2, border: `1px solid ${C.bord2}`, borderRadius: 8, color: C.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {testing ? "Testing…" : "Test"}
          </button>
          <button onClick={() => { if (url) { onSave(url.replace(/\/$/, "")); onClose(); } }} disabled={!url}
            style={{ flex: 1, padding: "9px", background: url ? C.p1 : C.dim, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: url ? "pointer" : "not-allowed" }}>
            Save & Sync
          </button>
          <button onClick={onClose} style={{ padding: "8px 12px", background: "transparent", border: `1px solid ${C.bord2}`, borderRadius: 8, color: C.sub, fontSize: 12, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
        {status && <div style={{ fontSize: 12, fontWeight: 600, color: status.startsWith("✓") ? C.green : C.rose, marginTop: 10 }}>{status}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD HABIT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AddHabit({ onAdd, onClose }) {
  const [name,    setName]    = useState("");
  const [section, setSection] = useState("morning");
  const [freq,    setFreq]    = useState("daily");
  const [mode,    setMode]    = useState("check");
  const [target,  setTarget]  = useState(20);

  const Sel = ({ val, set, opts }) => (
    <select value={val} onChange={e => set(e.target.value)} style={{ ...inp, width: "100%", textAlign: "left", padding: "7px 10px", cursor: "pointer" }}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  const submit = () => {
    if (!name.trim()) return;
    const base = { id: `c${Date.now()}`, name, streak: 0, freq: freq === "daily" ? "daily" : +freq, weekDone: fw() };
    let h;
    if      (mode === "check") h = { ...base, mode: "check", done: false };
    else if (mode === "range") h = { ...base, mode: "range", rangeMin: 10, rangeMax: +target, todayMins: 0 };
    else if (mode === "pages") h = { ...base, mode: "pages", todayPages: 0, targetPages: +target };
    else                       h = { ...base, mode: "mins",  todayMins: 0,  targetMins: +target };
    onAdd(section, h);
    onClose();
  };

  const Field = ({ lbl, children }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", marginBottom: 4 }}>{lbl}</div>
      {children}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...card, width: 320, padding: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Add Habit</div>
        <Field lbl="Name">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Habit name"
            style={{ ...inp, width: "100%", textAlign: "left", padding: "7px 10px" }} />
        </Field>
        <Field lbl="Section"><Sel val={section} set={setSection} opts={[["morning","Morning Stack"],["general","General"]]} /></Field>
        <Field lbl="Frequency"><Sel val={freq} set={setFreq} opts={[["daily","Daily"],["6","6×/wk"],["5","5×/wk"],["4","4×/wk"],["3","3×/wk"],["2","2×/wk"],["1","1×/wk"]]} /></Field>
        <Field lbl="Mode"><Sel val={mode} set={setMode} opts={[["check","Checkbox"],["mins","Minutes"],["range","Minute Range"],["pages","Pages"]]} /></Field>
        {mode !== "check" && (
          <Field lbl="Target">
            <input type="number" value={target} onChange={e => setTarget(e.target.value)}
              style={{ ...inp, width: "100%", textAlign: "left", padding: "7px 10px" }} />
          </Field>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${C.bord2}`, background: "transparent", color: C.sub, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={submit}  style={{ flex: 2, padding: "8px", borderRadius: 8, border: "none", background: C.p1, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Add</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [morning,   setMorning]   = useState(INIT_MORNING);
  const [athlete,   setAthlete]   = useState(INIT_ATHLETE);
  const [general,   setGeneral]   = useState(INIT_GENERAL);
  const [coffeeLog, setCoffeeLog] = useState([]);
  const [grand,     setGrand]     = useState({ cal: 0, protein: 0, carbs: 0, fats: 0 });
  const [whoopM,    setWhoopM]    = useState({ recovery: "", hrv: "", rhr: "", sleepPerf: "", sleepHrs: "", strain: "" });
  const [loaded,    setLoaded]    = useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [showSync,  setShowSync]  = useState(false);
  const [fbUrl,     setFbUrl]     = useState("");
  const [syncSt,    setSyncSt]    = useState("local");
  const saveTimer = useRef(null);

  const snapshot = () => ({ date: TODAY_S, morning, athlete, general, coffeeLog, whoopM });

  // Load on mount — with 4s timeout failsafe
  useEffect(() => {
    const failsafe = setTimeout(() => setLoaded(true), 4000);
    (async () => {
      try {
        const savedUrl = await lGet(LS_FBURL);
        let s = null;
        if (savedUrl) {
          setFbUrl(savedUrl);
          setSyncSt("syncing");
          s = await fbRead(savedUrl);
        }
        if (!s) s = await lGet(LS_DATA);
        if (s) {
          const same = s.date === TODAY_S;
          if (s.morning) setMorning(s.morning.map(h => same ? h : { ...h, done: false, todayMins: 0, todayPages: 0 }));
          if (s.athlete) setAthlete(s.athlete.map(h => same ? h : { ...h, todayMins: 0 }));
          if (s.general) setGeneral(s.general.map(h => same ? h : { ...h, done: false }));
          if (same && s.coffeeLog) setCoffeeLog(s.coffeeLog);
          if (same && s.whoopM)    setWhoopM(s.whoopM);
        }
        setSyncSt(savedUrl ? "synced" : "local");
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        clearTimeout(failsafe);
        setLoaded(true);
      }
    })();
  }, []);

  // Save on change (debounced 800ms)
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const s = snapshot();
      await lSet(LS_DATA, s);
      if (fbUrl) {
        setSyncSt("syncing");
        await fbWrite(fbUrl, s);
        setSyncSt("synced");
      }
    }, 800);
  }, [loaded, morning, athlete, general, coffeeLog, whoopM]);

  const saveFbUrl = async (url) => {
    setFbUrl(url);
    await lSet(LS_FBURL, url);
    setSyncSt("syncing");
    await fbWrite(url, snapshot());
    setSyncSt("synced");
  };

  const toggleGen     = id      => setGeneral(g => g.map(h => h.id === id ? { ...h, done: !h.done, streak: !h.done ? h.streak + 1 : Math.max(0, h.streak - 1) } : h));
  const changeMorning = (id, k, v) => setMorning(m => m.map(h => h.id === id ? { ...h, [k]: v } : h));
  const changeAthlete = (id, v) => setAthlete(a => a.map(h => h.id === id ? { ...h, todayMins: v } : h));
  const addHabit      = (sec, h) => sec === "morning" ? setMorning(m => [...m, h]) : setGeneral(g => [...g, h]);

  const morningDone  = morning.filter(isDone).length;
  const morningPct   = Math.round((morningDone / morning.length) * 100);
  const totalAthMins = athlete.reduce((a, h) => a + (h.todayMins || 0), 0);
  const totalCaf     = coffeeLog.reduce((a, c) => a + c.caffeine, 0);
  const r            = +whoopM.recovery;
  const trainMult    = r > 0 ? (r < 34 ? 0.5 : r < 67 ? 0.8 : 1.0) : 1.0;

  const alerts = useMemo(() => {
    const list = [];
    if (r > 0 && r < 34) list.push({ type: "error", msg: "🔴 Recovery critical — training targets reduced 50%" });
    else if (r > 0 && r < 67) list.push({ type: "warn", msg: "🟡 Moderate recovery — targets reduced 20%" });
    if (totalCaf > 400) list.push({ type: "error", msg: "☕ Caffeine over 400mg — stop now" });
    else if (coffeeLog.some(c => new Date(c.time).getHours() >= 14)) list.push({ type: "warn", msg: "☕ Late caffeine detected — may affect sleep" });
    const h = NOW.getHours();
    if (h >= 12 && grand.protein < Math.round(TARGETS.protein * (h - 6) / 14) - 20) list.push({ type: "warn", msg: "💪 Protein behind pace — boost next meal" });
    return list;
  }, [r, totalCaf, coffeeLog, grand.protein]);

  const syncColor = syncSt === "synced" ? C.green : syncSt === "syncing" ? C.amber : C.dim;
  const syncLabel = syncSt === "synced" ? "Synced ✓" : syncSt === "syncing" ? "Syncing…" : "Local only";

  const daysInMonth = new Date(TODAY_Y, TODAY_M + 1, 0).getDate();
  const firstDOW    = new Date(TODAY_Y, TODAY_M, 1).getDay();
  const weekBars    = DAYS.map((d, i) => ({ day: d, v: 0 }));

  if (!loaded) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.p3, fontFamily: "Inter, sans-serif", fontSize: 14 }}>
        Loading your dashboard…
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "18px 20px", fontFamily: "'Inter', system-ui, sans-serif", color: C.txt }}>

      {showAdd  && <AddHabit  onAdd={addHabit} onClose={() => setShowAdd(false)} />}
      {showSync && <SyncModal onClose={() => setShowSync(false)} onSave={saveFbUrl} initUrl={fbUrl} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.txt, letterSpacing: "-0.5px" }}>Life Dashboard</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: syncColor }} />
            <span style={{ fontSize: 11, color: C.sub }}>{syncLabel}</span>
            <span style={{ fontSize: 11, color: C.dim }}>· {TODAY_LBL} · Bangalore</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowSync(true)} style={{ padding: "7px 13px", background: "transparent", border: `1px solid ${fbUrl ? C.p1 : C.bord2}`, borderRadius: 8, color: fbUrl ? C.p3 : C.sub, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {fbUrl ? "🔄 Sync On" : "☁️ Enable Sync"}
          </button>
          <button onClick={() => setShowAdd(true)} style={{ padding: "7px 14px", background: C.p1, border: "none", borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            + Add Habit
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 11 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ padding: "5px 11px", borderRadius: 8, background: a.type === "error" ? `${C.rose}15` : `${C.amber}12`, border: `1px solid ${a.type === "error" ? C.rose + "40" : C.amber + "40"}`, fontSize: 11, color: a.type === "error" ? C.rose : C.amber, fontWeight: 600 }}>
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1.3fr", gap: 9, marginBottom: 12 }}>
        {[
          { lbl: "Morning",  val: `${morningDone}/${morning.length}`, sub: "stack done"   },
          { lbl: "Training", val: `${totalAthMins}m`,                 sub: "logged today" },
          { lbl: "Caffeine", val: `${totalCaf}mg`,                    sub: `${coffeeLog.length} drink${coffeeLog.length !== 1 ? "s" : ""}` },
          { lbl: "Calories", val: grand.cal,                          sub: `/${TARGETS.cal[0]}–${TARGETS.cal[1]}` },
        ].map(({ lbl, val, sub }) => (
          <div key={lbl} style={{ ...card, borderTop: `1.5px solid ${C.p1}`, padding: "10px 12px" }}>
            <div style={label}>{lbl}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.p3, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 10, color: C.sub, marginTop: 3 }}>{sub}</div>
          </div>
        ))}
        <Readiness recovery={whoopM.recovery} morningPct={morningPct} sleepPerf={whoopM.sleepPerf} proteinPct={Math.min(100, (grand.protein / TARGETS.protein) * 100)} />
      </div>

      {/* 3-col body */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 0.9fr", gap: 11, marginBottom: 11 }}>

        {/* Col 1 — Habits */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <div style={label}>Morning Stack · 90 min</div>
              <span style={{ fontSize: 9, color: C.p3, background: "#1a0a2e40", padding: "2px 7px", borderRadius: 5, fontWeight: 700 }}>🌅 AM</span>
            </div>
            {morning.map(h => (
              <MorningRow key={h.id} h={h}
                onToggle={id => setMorning(m => m.map(x => x.id === id ? { ...x, done: !x.done } : x))}
                onChange={changeMorning}
              />
            ))}
          </div>

          <div style={card}>
            <div style={label}>General</div>
            {general.map(h => (
              <div key={h.id} onClick={() => toggleGen(h.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderBottom: `1px solid ${C.bord}`, cursor: "pointer" }}>
                <div style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${h.done ? C.p2 : C.dim}`, background: h.done ? C.p2 : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {h.done && <svg width="9" height="9" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: h.done ? C.sub : C.txt }}>{h.name}</div>
                  <WeekDots weekDone={h.weekDone} freq={h.freq} />
                </div>
                <span style={{ fontSize: 11, color: C.p3, fontWeight: 700 }}>🔥{h.streak}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={label}>This Week</div>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={weekBars} barSize={13}>
                <XAxis dataKey="day" tick={{ fill: C.sub, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: "rgba(124,58,237,0.06)" }} />
                <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                  {weekBars.map((_, i) => <Cell key={i} fill={i === TODAY_DOW ? C.p2 : `${C.p1}44`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Col 2 — Nutrition */}
        <Nutrition coffeeLog={coffeeLog} setCoffeeLog={setCoffeeLog} onUpdate={setGrand} />

        {/* Col 3 — Athlete + Calendar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <div style={label}>Athlete Training</div>
              {trainMult < 1 && <span style={{ fontSize: 9, color: C.amber, background: `${C.amber}15`, padding: "2px 7px", borderRadius: 5, fontWeight: 700 }}>Recovery ↓{Math.round((1 - trainMult) * 100)}%</span>}
            </div>
            {athlete.map(h => <AthleteRow key={h.id} h={h} onChange={changeAthlete} mult={trainMult} />)}
            <div style={{ marginTop: 7, textAlign: "right" }}>
              <span style={{ fontSize: 11, color: C.p3, fontWeight: 700 }}>{totalAthMins} min today</span>
            </div>
          </div>

          <div style={card}>
            <div style={label}>{NOW.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 3 }}>
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 9, color: C.sub, fontWeight: 600 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
              {[...Array(firstDOW)].map((_, i) => <div key={`e${i}`} />)}
              {[...Array(daysInMonth)].map((_, i) => {
                const d       = i + 1;
                const isToday = d === TODAY_D;
                return (
                  <div key={d} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, fontSize: 10, fontWeight: isToday ? 800 : 500, background: isToday ? C.p1 : "transparent", color: isToday ? "#fff" : C.dim }}>
                    {d}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* WHOOP */}
      <Whoop morning={morning} athlete={athlete} grand={grand} onChange={setWhoopM} />
    </div>
  );
}
