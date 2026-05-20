import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bracket, Fencer, Poule, Screen } from "./engine/types";
import { createPoules, calculatePouleStandings, updatePouleBout, nextIncompleteBout } from "./engine/poules";
import { createDEBracket, enterDEMatchScore, nextIncompleteMatch } from "./engine/bracket";
import { finalizeElo } from "./engine/elo";
import { createId } from "./engine/id";
import { TournamentCommand, commandFeedback } from "./voice/CommandParser";
import { useVoice } from "./voice/useVoice";

const STORAGE_KEY = "sclass-tournament";

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"); } catch { return null; }
}
function save(data: object) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /**/ }
}

/* ── colour tokens ── */
const C = {
  indigo: "#6366f1", indigoDark: "#4338ca", indigoLight: "#eef2ff",
  slate900: "#0f172a", slate800: "#1e293b", slate600: "#475569",
  slate400: "#94a3b8", slate200: "#e2e8f0", slate100: "#f1f5f9",
  white: "#ffffff", green: "#059669", greenLight: "#d1fae5",
  red: "#ef4444", redLight: "#fee2e2", yellow: "#fde68a", yellowLight: "#fefce8",
};

/* ─────────────────── root ─────────────────── */
export default function App() {
  const [fencers, setFencers] = useState<Fencer[]>([]);
  const [poules, setPoules] = useState<Poule[]>([]);
  const [bracket, setBracket] = useState<Bracket | undefined>();
  const [screen, setScreen] = useState<Screen>("fencers");
  const [activePouleId, setActivePouleId] = useState("");
  const [activeBoutId, setActiveBoutId] = useState("");
  const [activeMatchId, setActiveMatchId] = useState("");
  const [eloFinalized, setEloFinalized] = useState(false);

  useEffect(() => {
    const s = load();
    if (!s) return;
    setFencers(s.fencers ?? []);
    setPoules(s.poules ?? []);
    setBracket(s.bracket);
    if (s.screen) setScreen(s.screen);
  }, []);

  useEffect(() => {
    save({ fencers, poules, bracket, screen });
  }, [fencers, poules, bracket, screen]);

  useEffect(() => {
    if (poules.length > 0 && !activeBoutId) {
      setActivePouleId(poules[0].id);
      setActiveBoutId(poules[0].bouts[0]?.id ?? "");
    }
  }, [poules]);

  useEffect(() => {
    if (bracket && !activeMatchId) {
      const first = nextIncompleteMatch(bracket);
      if (first) setActiveMatchId(first.id);
    }
  }, [bracket]);

  const knownNames = useMemo(() => fencers.map(f => f.name), [fencers]);

  function doCreatePoules() {
    if (fencers.length < 2) { voice.speak("Add at least two fencers first."); return; }
    const p = createPoules(fencers);
    setPoules(p);
    setBracket(undefined);
    setEloFinalized(false);
    setActivePouleId(p[0]?.id ?? "");
    setActiveBoutId(p[0]?.bouts[0]?.id ?? "");
    setScreen("poules");
  }

  function doCreateDE() {
    if (poules.length === 0) { voice.speak("Create poules first."); return; }
    const standings = calculatePouleStandings(fencers, poules);
    const b = createDEBracket(standings);
    setBracket(b);
    const first = nextIncompleteMatch(b);
    if (first) setActiveMatchId(first.id);
    setScreen("de");
  }

  function doFinalizeElo() {
    setFencers(finalizeElo(fencers, poules, bracket));
    setEloFinalized(true);
  }

  function doReset() {
    if (!window.confirm("Clear all tournament data?")) return;
    setFencers([]); setPoules([]); setBracket(undefined);
    setEloFinalized(false); setScreen("fencers");
    setActivePouleId(""); setActiveBoutId(""); setActiveMatchId("");
    localStorage.removeItem(STORAGE_KEY);
  }

  function scoreActiveBout(aScore: number, bScore: number) {
    if (!activePouleId || !activeBoutId) return;
    const updated = updatePouleBout(poules, activePouleId, activeBoutId, aScore, bScore);
    setPoules(updated);
    const next = nextIncompleteBout(updated, activePouleId, activeBoutId);
    if (next) { setActivePouleId(next.pouleId); setActiveBoutId(next.boutId); }
  }

  function scoreActiveMatch(aScore: number, bScore: number) {
    if (!bracket || !activeMatchId) return;
    const updated = enterDEMatchScore(bracket, activeMatchId, aScore, bScore);
    setBracket(updated);
    const next = nextIncompleteMatch(updated, activeMatchId);
    if (next) setActiveMatchId(next.id);
  }

  function scoreBoutByName(nameA: string, scoreA: number, nameB: string, scoreB: number) {
    const fA = fencers.find(f => f.name.toLowerCase() === nameA.toLowerCase());
    const fB = fencers.find(f => f.name.toLowerCase() === nameB.toLowerCase());
    if (!fA || !fB) return;
    for (const poule of poules) {
      if (!poule.fencerIds.includes(fA.id) || !poule.fencerIds.includes(fB.id)) continue;
      const bout = poule.bouts.find(b => !b.complete && ((b.aId === fA.id && b.bId === fB.id) || (b.aId === fB.id && b.bId === fA.id)));
      if (bout) {
        const aS = bout.aId === fA.id ? scoreA : scoreB;
        const bS = bout.aId === fA.id ? scoreB : scoreA;
        setPoules(updatePouleBout(poules, poule.id, bout.id, aS, bS));
        return;
      }
    }
  }

  const handleCommand = useCallback((cmd: TournamentCommand) => {
    switch (cmd.type) {
      case "ADD_FENCER":
        setFencers(prev => [...prev, { id: createId("fencer"), name: cmd.name, rating: cmd.rating, elo: cmd.rating }]);
        setScreen("fencers");
        break;
      case "REMOVE_FENCER":
        setFencers(prev => prev.filter(f => !f.name.toLowerCase().includes(cmd.name.toLowerCase())));
        break;
      case "CREATE_POULES": doCreatePoules(); break;
      case "CREATE_DE": doCreateDE(); break;
      case "FINALIZE_ELO": doFinalizeElo(); break;
      case "RESET": doReset(); break;
      case "NAVIGATE": setScreen(cmd.screen); break;
      case "EXPORT":
        const json = JSON.stringify({ fencers, poules, bracket }, null, 2);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        a.download = `sclass-tournament-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        break;
      case "SCORE_CURRENT":
        if (screen === "poules") scoreActiveBout(cmd.aScore, cmd.bScore);
        else if (screen === "de") scoreActiveMatch(cmd.aScore, cmd.bScore);
        break;
      case "SCORE_BY_NAME": scoreBoutByName(cmd.nameA, cmd.scoreA, cmd.nameB, cmd.scoreB); break;
      case "NEXT_BOUT":
        if (screen === "poules") {
          const next = nextIncompleteBout(poules, activePouleId, activeBoutId);
          if (next) { setActivePouleId(next.pouleId); setActiveBoutId(next.boutId); }
        } else if (screen === "de" && bracket) {
          const next = nextIncompleteMatch(bracket, activeMatchId);
          if (next) setActiveMatchId(next.id);
        }
        break;
    }
  }, [fencers, poules, bracket, screen, activePouleId, activeBoutId, activeMatchId]);

  const voice = useVoice(knownNames, handleCommand);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: C.slate800, padding: "10px 16px" }}>
        <div style={{ color: C.white, fontSize: 18, fontWeight: 800 }}>S-Class Tournament</div>
        <div style={{ color: C.slate400, fontSize: 12, marginTop: 2 }}>
          {fencers.length} fencers · {poules.length} poules{eloFinalized ? " · ELO updated" : ""}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: C.white, borderBottom: `1px solid ${C.slate200}` }}>
        {(["fencers", "poules", "standings", "de"] as Screen[]).map(s => (
          <button key={s} onClick={() => setScreen(s)} style={{
            flex: 1, padding: "8px 4px", border: "none", background: "none", cursor: "pointer",
            borderBottom: screen === s ? `3px solid ${C.indigo}` : "3px solid transparent",
            color: screen === s ? C.indigo : C.slate400, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {s === "fencers" ? "👥" : s === "poules" ? "⚔️" : s === "standings" ? "📊" : "🏆"}<br />{s}
          </button>
        ))}
      </div>

      {/* Voice bar */}
      <VoiceBar voice={voice} />

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {screen === "fencers" && (
          <FencersScreen fencers={fencers} setFencers={setFencers} onCreatePoules={doCreatePoules} />
        )}
        {screen === "poules" && (
          <PoulesScreen fencers={fencers} poules={poules} setPoules={setPoules}
            activePouleId={activePouleId} activeBoutId={activeBoutId}
            setActive={(p, b) => { setActivePouleId(p); setActiveBoutId(b); }} />
        )}
        {screen === "standings" && (
          <StandingsScreen fencers={fencers} poules={poules} onCreateDE={doCreateDE} />
        )}
        {screen === "de" && (
          <DEScreen fencers={fencers} bracket={bracket} setBracket={setBracket}
            activeMatchId={activeMatchId} setActiveMatchId={setActiveMatchId}
            onFinalizeElo={doFinalizeElo} />
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={() => handleCommand({ type: "EXPORT" })} style={smallBtn}>Export JSON</button>
          <button onClick={doReset} style={{ ...smallBtn, background: C.redLight, color: C.red }}>Reset</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Voice bar ─────────────── */
function VoiceBar({ voice }: { voice: ReturnType<typeof useVoice> }) {
  const [text, setText] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const isListening = voice.state === "listening";

  const HELP = ["add fencer Alice", "add Bob rating 1450", "create poules", "five three",
    "Alice five Bob three", "next bout", "create bracket", "finalize elo", "show standings", "export"];

  return (
    <div style={{ background: C.indigoLight, padding: "10px 12px", borderBottom: `1px solid ${C.slate200}`, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {voice.isAvailable && (
          <button
            onClick={isListening ? voice.stopListening : voice.startListening}
            style={{
              width: 48, height: 48, borderRadius: 24, border: `3px solid ${isListening ? "#fca5a5" : "#818cf8"}`,
              background: isListening ? C.red : C.indigo, color: C.white, fontSize: 20, cursor: "pointer",
              flexShrink: 0, boxShadow: isListening ? "0 0 12px rgba(239,68,68,0.5)" : "none",
            }}
            title={isListening ? "Stop" : "Start voice"}
          >
            {isListening ? "⏹" : "🎤"}
          </button>
        )}
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && text.trim()) { voice.submitText(text.trim()); setText(""); } }}
          placeholder={voice.isAvailable ? "Or type a command…" : "Type a command (e.g. add fencer Alice)"}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: `1px solid #c7d2fe`, fontSize: 15, outline: "none" }}
        />
        <button onClick={() => { if (text.trim()) { voice.submitText(text.trim()); setText(""); } }}
          style={{ width: 40, height: 40, borderRadius: 20, background: C.indigo, color: C.white, border: "none", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>→</button>
        <button onClick={() => setShowHelp(h => !h)}
          style={{ width: 32, height: 32, borderRadius: 16, background: "#a5b4fc", color: C.white, border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", flexShrink: 0 }}>?</button>
      </div>

      {(voice.transcript || isListening) && (
        <div style={{ background: "#dbeafe", borderRadius: 8, padding: "6px 10px", color: "#1e40af", fontStyle: "italic", fontSize: 13 }}>
          {isListening && !voice.transcript ? "Listening…" : voice.transcript}
        </div>
      )}

      {voice.lastCommand && (
        <div style={{
          borderRadius: 8, padding: "5px 10px", fontSize: 13, fontWeight: 600,
          background: voice.lastCommand.type === "UNKNOWN" ? C.redLight : C.greenLight,
          color: voice.lastCommand.type === "UNKNOWN" ? C.red : C.green,
        }}>
          {voice.lastCommand.type === "UNKNOWN" ? `❓ "${voice.lastCommand.raw}"` : `✓ ${commandFeedback(voice.lastCommand)}`}
        </div>
      )}

      {showHelp && (
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid #c7d2fe`, padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 700, color: C.indigoDark, fontSize: 13, marginBottom: 4 }}>Voice Commands</div>
          {HELP.map(cmd => (
            <button key={cmd} onClick={() => voice.submitText(cmd)}
              style={{ background: "none", border: "none", textAlign: "left", padding: "4px 2px", cursor: "pointer", fontSize: 13, color: "#1e3a8a", fontFamily: "monospace", borderBottom: `1px solid ${C.slate100}` }}>
              "{cmd}"
            </button>
          ))}
          {!voice.isAvailable && (
            <div style={{ color: C.slate400, fontSize: 11, fontStyle: "italic", marginTop: 4 }}>
              Open in Chrome on Android for live mic input.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Fencers ─────────────── */
function FencersScreen({ fencers, setFencers, onCreatePoules }: {
  fencers: Fencer[]; setFencers: (f: Fencer[]) => void; onCreatePoules: () => void;
}) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState("1200");

  function add() {
    const n = name.trim();
    if (!n) return;
    setFencers([...fencers, { id: createId("fencer"), name: n, rating: Number(rating) || 1200, elo: Number(rating) || 1200 }]);
    setName(""); setRating("1200");
  }

  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 20 }}>Fencers ({fencers.length})</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Name" style={{ ...inputStyle, flex: 2 }} />
        <input value={rating} onChange={e => setRating(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          type="number" placeholder="Rating" style={{ ...inputStyle, flex: 1 }} />
        <button onClick={add} style={primaryBtn}>+ Add</button>
      </div>
      {fencers.length === 0 && (
        <div style={{ textAlign: "center", color: C.slate400, fontStyle: "italic", padding: 20 }}>
          Add fencers or say "add fencer [name]"
        </div>
      )}
      {[...fencers].sort((a, b) => b.rating - a.rating).map((f, i) => (
        <div key={f.id} style={card}>
          <span style={{ color: C.slate400, fontWeight: 700, width: 24 }}>{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{f.name}</div>
            <div style={{ fontSize: 12, color: C.slate400 }}>Rating {f.rating} · ELO {f.elo}</div>
          </div>
          <button onClick={() => setFencers(fencers.filter(x => x.id !== f.id))}
            style={{ width: 28, height: 28, borderRadius: 14, background: C.redLight, border: "none", color: C.red, cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      ))}
      {fencers.length >= 2 && (
        <button onClick={onCreatePoules} style={{ ...primaryBtn, padding: "14px", fontSize: 16 }}>⚔️ Create Poules</button>
      )}
    </>
  );
}

/* ─────────────── Poules ─────────────── */
function PoulesScreen({ fencers, poules, setPoules, activePouleId, activeBoutId, setActive }: {
  fencers: Fencer[]; poules: Poule[]; setPoules: (p: Poule[]) => void;
  activePouleId: string; activeBoutId: string; setActive: (p: string, b: string) => void;
}) {
  const byId = Object.fromEntries(fencers.map(f => [f.id, f]));
  const standings = calculatePouleStandings(fencers, poules);
  const done = poules.flatMap(p => p.bouts).filter(b => b.complete).length;
  const total = poules.flatMap(p => p.bouts).length;

  if (poules.length === 0) return <div style={{ color: C.slate400, fontStyle: "italic", textAlign: "center", padding: 24 }}>Say "create poules" or tap Create Poules.</div>;

  return (
    <>
      <div style={{ height: 6, borderRadius: 3, background: C.slate200, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${total ? (done / total) * 100 : 0}%`, background: C.indigo, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 12, color: C.slate400, textAlign: "right" }}>{done}/{total} bouts</div>

      {poules.map(poule => (
        <div key={poule.id} style={{ ...card, flexDirection: "column", gap: 8, alignItems: "stretch" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{poule.name}</div>
          <div style={{ fontSize: 12, color: C.slate600 }}>{poule.fencerIds.map(id => byId[id]?.name).join(" · ")}</div>
          {poule.bouts.map(bout => {
            const isActive = poule.id === activePouleId && bout.id === activeBoutId;
            return (
              <div key={bout.id} onClick={() => setActive(poule.id, bout.id)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 8px",
                borderRadius: 10, background: isActive ? C.indigoLight : "transparent",
                border: `1px solid ${isActive ? "#a5b4fc" : "transparent"}`,
                opacity: bout.complete ? 0.6 : 1, cursor: "pointer",
              }}>
                {isActive && <div style={{ width: 3, height: 28, background: C.indigo, borderRadius: 2 }} />}
                <span style={{ flex: 1, fontWeight: bout.winnerId === bout.aId ? 700 : 400, color: bout.winnerId === bout.aId ? C.green : "inherit", fontSize: 14 }}>
                  {byId[bout.aId]?.name}
                </span>
                <ScoreInput value={bout.aScore} onChange={v => { setActive(poule.id, bout.id); setPoules(updatePouleBout(poules, poule.id, bout.id, v, bout.bScore ?? 0)); }} done={bout.complete} />
                <span style={{ color: C.slate400 }}>–</span>
                <ScoreInput value={bout.bScore} onChange={v => { setActive(poule.id, bout.id); setPoules(updatePouleBout(poules, poule.id, bout.id, bout.aScore ?? 0, v)); }} done={bout.complete} />
                <span style={{ flex: 1, textAlign: "right", fontWeight: bout.winnerId === bout.bId ? 700 : 400, color: bout.winnerId === bout.bId ? C.green : "inherit", fontSize: 14 }}>
                  {byId[bout.bId]?.name}
                </span>
                {bout.complete && <span style={{ color: C.green }}>✓</span>}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ ...card, flexDirection: "column", alignItems: "stretch", gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Standings</div>
        {standings.map((s, i) => (
          <div key={s.id} style={{ display: "flex", gap: 8, padding: "5px 4px", background: i === 0 ? C.yellowLight : "transparent", borderRadius: 6, alignItems: "center" }}>
            <span style={{ width: 20, color: C.slate400, fontWeight: 700, fontSize: 13 }}>{i + 1}</span>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{s.name}</span>
            <span style={{ fontSize: 12, color: C.slate600 }}>W{s.wins} Ind{s.indicator > 0 ? "+" : ""}{s.indicator} TS{s.touchesScored}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────────── Standings ─────────────── */
function StandingsScreen({ fencers, poules, onCreateDE }: { fencers: Fencer[]; poules: Poule[]; onCreateDE: () => void }) {
  const standings = calculatePouleStandings(fencers, poules);
  const MEDALS = ["🥇", "🥈", "🥉"];
  if (standings.length === 0) return <div style={{ color: C.slate400, fontStyle: "italic", textAlign: "center", padding: 24 }}>Complete poule bouts to see standings.</div>;
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 20 }}>Poule Standings</div>
      {standings.map((s, i) => (
        <div key={s.id} style={{ ...card, background: i < 3 ? "#fffbeb" : C.white, borderColor: i < 3 ? C.yellow : C.slate200, gap: 10 }}>
          <span style={{ fontSize: 22 }}>{MEDALS[i] ?? `${i + 1}.`}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: C.slate400 }}>Rating {s.rating} · ELO {s.elo}</div>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 13 }}>
            {[["W", s.wins], ["L", s.losses], ["Ind", s.indicator > 0 ? `+${s.indicator}` : s.indicator], ["TS", s.touchesScored]].map(([l, v]) => (
              <div key={String(l)} style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700 }}>{v}</div>
                <div style={{ color: C.slate400, fontSize: 10 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={onCreateDE} style={{ ...primaryBtn, padding: 14, fontSize: 16 }}>Create DE Bracket →</button>
    </>
  );
}

/* ─────────────── DE Bracket ─────────────── */
function DEScreen({ fencers, bracket, setBracket, activeMatchId, setActiveMatchId, onFinalizeElo }: {
  fencers: Fencer[]; bracket?: Bracket; setBracket: (b: Bracket) => void;
  activeMatchId: string; setActiveMatchId: (id: string) => void; onFinalizeElo: () => void;
}) {
  const byId = Object.fromEntries(fencers.map(f => [f.id, f]));
  if (!bracket) return <div style={{ color: C.slate400, fontStyle: "italic", textAlign: "center", padding: 24 }}>Create DE bracket from standings screen.</div>;

  function fName(id: string) {
    if (!id) return "TBD";
    if (id.startsWith("bye-")) return "BYE";
    return byId[id]?.name ?? "Unknown";
  }

  const champion = (() => {
    const final = bracket.rounds[bracket.rounds.length - 1]?.[0];
    return final?.complete && final.winnerId ? fName(final.winnerId) : null;
  })();

  const roundLabel = (i: number) => {
    const n = bracket.rounds.length;
    if (i === n - 1) return "Final";
    if (i === n - 2) return "Semifinal";
    if (i === n - 3) return "Quarterfinal";
    return `Round ${i + 1}`;
  };

  return (
    <>
      {champion && (
        <div style={{ textAlign: "center", background: C.yellowLight, border: `2px solid ${C.yellow}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 40 }}>🏆</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#92400e" }}>{champion}</div>
          <div style={{ color: "#b45309", fontWeight: 600 }}>Champion</div>
        </div>
      )}

      <div style={{ overflowX: "auto", display: "flex", gap: 12, paddingBottom: 8 }}>
        {bracket.rounds.map((round, ri) => (
          <div key={ri} style={{ minWidth: 170, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 12, color: C.indigo, letterSpacing: "0.05em", textTransform: "uppercase", paddingBottom: 4 }}>
              {roundLabel(ri)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "space-around", flex: 1 }}>
              {round.map(match => {
                const isActive = match.id === activeMatchId;
                const isBye = match.aId.startsWith("bye-") || match.bId.startsWith("bye-");
                return (
                  <div key={match.id} onClick={() => !isBye && setActiveMatchId(match.id)} style={{
                    border: `${isActive ? 2 : 1}px solid ${isActive ? C.indigo : C.slate200}`,
                    borderRadius: 10, overflow: "hidden", cursor: isBye ? "default" : "pointer",
                    opacity: isBye ? 0.4 : match.complete ? 0.8 : 1,
                    background: C.white, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}>
                    <MatchSlot label={fName(match.aId)} score={match.aScore} isWinner={match.winnerId === match.aId}
                      onChange={v => { setActiveMatchId(match.id); setBracket(enterDEMatchScore(bracket, match.id, v, match.bScore ?? 0)); }} />
                    <div style={{ height: 1, background: C.slate200 }} />
                    <MatchSlot label={fName(match.bId)} score={match.bScore} isWinner={match.winnerId === match.bId}
                      onChange={v => { setActiveMatchId(match.id); setBracket(enterDEMatchScore(bracket, match.id, match.aScore ?? 0, v)); }} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button onClick={onFinalizeElo} style={{ ...primaryBtn, background: C.slate800, padding: 14, fontSize: 15 }}>
        📈 Finalize ELO Ratings
      </button>
    </>
  );
}

function MatchSlot({ label, score, isWinner, onChange }: { label: string; score?: number; isWinner: boolean; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "7px 10px", gap: 6 }}>
      <span style={{ flex: 1, fontSize: 13, fontWeight: isWinner ? 700 : 400, color: isWinner ? C.green : "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <input type="number" min={0} max={15} value={score ?? ""} onChange={e => onChange(Number(e.target.value))}
        style={{ width: 36, height: 30, textAlign: "center", border: `1px solid ${isWinner ? "#86efac" : C.slate200}`, borderRadius: 6, fontSize: 14, fontWeight: 700, background: isWinner ? C.greenLight : C.slate100, outline: "none" }} />
    </div>
  );
}

function ScoreInput({ value, onChange, done }: { value?: number; onChange: (v: number) => void; done: boolean }) {
  return (
    <input type="number" min={0} max={5} value={value ?? ""} onChange={e => onChange(Number(e.target.value))}
      style={{ width: 42, height: 38, textAlign: "center", border: `1px solid ${done ? "#86efac" : C.slate200}`, borderRadius: 8, fontSize: 16, fontWeight: 700, background: done ? C.greenLight : C.white, outline: "none" }} />
  );
}

/* ─── shared micro-styles ─── */
const card: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  background: "#fff", borderRadius: 14, padding: 12, border: `1px solid ${C.slate200}`,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};
const primaryBtn: React.CSSProperties = {
  background: C.indigo, color: "#fff", border: "none", borderRadius: 12,
  padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const smallBtn: React.CSSProperties = {
  flex: 1, background: C.slate200, border: "none", borderRadius: 10,
  padding: "10px 0", fontWeight: 600, fontSize: 13, cursor: "pointer", color: C.slate600,
};
const inputStyle: React.CSSProperties = {
  border: `1px solid ${C.slate200}`, borderRadius: 10, padding: "10px 12px",
  fontSize: 15, outline: "none", background: C.white,
};
