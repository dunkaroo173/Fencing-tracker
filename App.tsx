import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { FencerEditor } from "./src/components/FencerEditor";
import { PouleView } from "./src/components/PouleView";
import { BracketView } from "./src/components/BracketView";
import { StandingsView } from "./src/components/StandingsView";
import { VoiceController } from "./src/components/VoiceController";

import { Bracket, Fencer, Poule, TournamentScreen } from "./src/engine/types";
import { createPoules, nextIncompleteBout } from "./src/engine/poules";
import { calculatePouleStandings } from "./src/engine/poules";
import { createDEBracket, nextIncompleteMatch } from "./src/engine/bracket";
import { enterDEMatchScore } from "./src/engine/bracket";
import { updatePouleBout } from "./src/engine/poules";
import { finalizeElo } from "./src/engine/elo";
import { TournamentCommand } from "./src/voice/CommandParser";
import { useVoice } from "./src/voice/useVoice";
import { createId } from "./src/engine/id";
import {
  clearTournament,
  exportTournamentJson,
  loadTournament,
  saveTournament,
} from "./src/storage/tournamentStorage";

const TAB_ICONS: Record<TournamentScreen, string> = {
  fencers: "👥",
  poules: "⚔️",
  standings: "📊",
  de: "🏆",
};
const TAB_LABELS: Record<TournamentScreen, string> = {
  fencers: "Fencers",
  poules: "Poules",
  standings: "Standings",
  de: "Bracket",
};
const ALL_SCREENS: TournamentScreen[] = ["fencers", "poules", "standings", "de"];

export default function App() {
  const [fencers, setFencers] = useState<Fencer[]>([]);
  const [poules, setPoules] = useState<Poule[]>([]);
  const [bracket, setBracket] = useState<Bracket | undefined>();
  const [screen, setScreen] = useState<TournamentScreen>("fencers");
  const [activePouleId, setActivePouleId] = useState("");
  const [activeBoutId, setActiveBoutId] = useState("");
  const [activeMatchId, setActiveMatchId] = useState("");
  const [eloFinalized, setEloFinalized] = useState(false);

  // Load on mount
  useEffect(() => {
    loadTournament().then((saved) => {
      if (!saved) return;
      setFencers(saved.fencers ?? []);
      setPoules(saved.poules ?? []);
      setBracket(saved.bracket);
    });
  }, []);

  // Auto-save on every state change
  useEffect(() => {
    saveTournament({ fencers, poules, bracket, updatedAt: new Date().toISOString() });
  }, [fencers, poules, bracket]);

  // Seed active bout when poules are created
  useEffect(() => {
    if (poules.length > 0 && !activeBoutId) {
      const first = poules[0];
      setActivePouleId(first.id);
      setActiveBoutId(first.bouts[0]?.id ?? "");
    }
  }, [poules]);

  // Seed active match when bracket is created
  useEffect(() => {
    if (bracket && !activeMatchId) {
      const first = nextIncompleteMatch(bracket);
      if (first) setActiveMatchId(first.id);
    }
  }, [bracket]);

  const knownNames = useMemo(() => fencers.map((f) => f.name), [fencers]);

  function handleCreatePoules() {
    if (fencers.length < 2) {
      voice.speak("Add at least two fencers first.");
      return;
    }
    const newPoules = createPoules(fencers);
    setPoules(newPoules);
    setBracket(undefined);
    setEloFinalized(false);
    setActivePouleId(newPoules[0]?.id ?? "");
    setActiveBoutId(newPoules[0]?.bouts[0]?.id ?? "");
    setScreen("poules");
  }

  function handleCreateDE() {
    if (poules.length === 0) {
      voice.speak("Create poules first.");
      return;
    }
    const standings = calculatePouleStandings(fencers, poules);
    const newBracket = createDEBracket(standings);
    setBracket(newBracket);
    const first = nextIncompleteMatch(newBracket);
    if (first) setActiveMatchId(first.id);
    setScreen("de");
  }

  function handleFinalizeElo() {
    setFencers(finalizeElo(fencers, poules, bracket));
    setEloFinalized(true);
  }

  function handleReset() {
    Alert.alert("Reset Tournament", "Clear all fencers, poules, and bracket?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          setFencers([]);
          setPoules([]);
          setBracket(undefined);
          setEloFinalized(false);
          setActivePouleId("");
          setActiveBoutId("");
          setActiveMatchId("");
          setScreen("fencers");
          await clearTournament();
        },
      },
    ]);
  }

  function scoreActiveBout(aScore: number, bScore: number) {
    if (!activePouleId || !activeBoutId) return;
    const updated = updatePouleBout(poules, activePouleId, activeBoutId, aScore, bScore);
    setPoules(updated);
    const next = nextIncompleteBout(updated, activePouleId, activeBoutId);
    if (next) {
      setActivePouleId(next.pouleId);
      setActiveBoutId(next.boutId);
    }
  }

  function scoreActiveMatch(aScore: number, bScore: number) {
    if (!bracket || !activeMatchId) return;
    const updated = enterDEMatchScore(bracket, activeMatchId, aScore, bScore);
    setBracket(updated);
    const next = nextIncompleteMatch(updated, activeMatchId);
    if (next) setActiveMatchId(next.id);
  }

  function scoreBoutByName(nameA: string, scoreA: number, nameB: string, scoreB: number) {
    const fA = fencers.find((f) => f.name.toLowerCase() === nameA.toLowerCase());
    const fB = fencers.find((f) => f.name.toLowerCase() === nameB.toLowerCase());
    if (!fA || !fB) return;

    if (screen === "de" && bracket) {
      const match = bracket.rounds.flat().find(
        (m) =>
          !m.complete &&
          ((m.aId === fA.id && m.bId === fB.id) || (m.aId === fB.id && m.bId === fA.id))
      );
      if (match) {
        const aScore2 = match.aId === fA.id ? scoreA : scoreB;
        const bScore2 = match.aId === fA.id ? scoreB : scoreA;
        const updated = enterDEMatchScore(bracket, match.id, aScore2, bScore2);
        setBracket(updated);
        return;
      }
    }

    for (const poule of poules) {
      if (!poule.fencerIds.includes(fA.id) || !poule.fencerIds.includes(fB.id)) continue;
      const bout = poule.bouts.find(
        (b) =>
          !b.complete &&
          ((b.aId === fA.id && b.bId === fB.id) || (b.aId === fB.id && b.bId === fA.id))
      );
      if (bout) {
        const aScore2 = bout.aId === fA.id ? scoreA : scoreB;
        const bScore2 = bout.aId === fA.id ? scoreB : scoreA;
        const updated = updatePouleBout(poules, poule.id, bout.id, aScore2, bScore2);
        setPoules(updated);
        return;
      }
    }
  }

  const handleCommand = useCallback(
    (cmd: TournamentCommand) => {
      switch (cmd.type) {
        case "ADD_FENCER":
          setFencers((prev) => [
            ...prev,
            { id: createId("fencer"), name: cmd.name, rating: cmd.rating, elo: cmd.rating },
          ]);
          setScreen("fencers");
          break;
        case "REMOVE_FENCER": {
          const match = fencers.find((f) =>
            f.name.toLowerCase().includes(cmd.name.toLowerCase())
          );
          if (match) setFencers((prev) => prev.filter((f) => f.id !== match.id));
          break;
        }
        case "CREATE_POULES":
          handleCreatePoules();
          break;
        case "CREATE_DE":
          handleCreateDE();
          break;
        case "FINALIZE_ELO":
          handleFinalizeElo();
          break;
        case "EXPORT":
          exportTournamentJson({ fencers, poules, bracket, updatedAt: new Date().toISOString() });
          break;
        case "RESET":
          handleReset();
          break;
        case "NAVIGATE":
          setScreen(cmd.screen);
          break;
        case "SCORE_CURRENT":
          if (screen === "poules") scoreActiveBout(cmd.aScore, cmd.bScore);
          else if (screen === "de") scoreActiveMatch(cmd.aScore, cmd.bScore);
          break;
        case "SCORE_BY_NAME":
          scoreBoutByName(cmd.nameA, cmd.scoreA, cmd.nameB, cmd.scoreB);
          break;
        case "NEXT_BOUT":
          if (screen === "poules") {
            const next = nextIncompleteBout(poules, activePouleId, activeBoutId);
            if (next) {
              setActivePouleId(next.pouleId);
              setActiveBoutId(next.boutId);
            }
          } else if (screen === "de" && bracket) {
            const next = nextIncompleteMatch(bracket, activeMatchId);
            if (next) setActiveMatchId(next.id);
          }
          break;
        case "HELP":
          break;
        case "UNKNOWN":
          break;
      }
    },
    [fencers, poules, bracket, screen, activePouleId, activeBoutId, activeMatchId]
  );

  const voice = useVoice({ knownNames, onCommand: handleCommand });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>S-Class Tournament</Text>
        <Text style={styles.headerSub}>
          {fencers.length} fencers · {poules.length} poules
          {eloFinalized ? " · ELO updated" : ""}
        </Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {ALL_SCREENS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setScreen(s)}
            style={[styles.tab, screen === s && styles.tabActive]}
          >
            <Text style={styles.tabIcon}>{TAB_ICONS[s]}</Text>
            <Text style={[styles.tabLabel, screen === s && styles.tabLabelActive]}>
              {TAB_LABELS[s]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Voice controller — always visible */}
      <View style={styles.voiceBar}>
        <VoiceController
          voiceState={voice.state}
          transcript={voice.transcript}
          lastCommand={voice.lastCommand}
          isVoiceAvailable={voice.isAvailable}
          onStartListening={voice.startListening}
          onStopListening={voice.stopListening}
          onSubmitText={voice.submitText}
        />
      </View>

      {/* Main content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {screen === "fencers" && (
          <>
            <FencerEditor fencers={fencers} setFencers={setFencers} />
            {fencers.length >= 2 && (
              <Pressable onPress={handleCreatePoules} style={styles.primaryAction}>
                <Text style={styles.primaryActionLabel}>⚔️ Create Poules</Text>
              </Pressable>
            )}
          </>
        )}

        {screen === "poules" && (
          <PouleView
            fencers={fencers}
            poules={poules}
            setPoules={setPoules}
            activePouleId={activePouleId}
            activeBoutId={activeBoutId}
            setActive={(pId, bId) => { setActivePouleId(pId); setActiveBoutId(bId); }}
          />
        )}

        {screen === "standings" && (
          <StandingsView fencers={fencers} poules={poules} onCreateDE={handleCreateDE} />
        )}

        {screen === "de" && (
          <>
            <BracketView
              fencers={fencers}
              bracket={bracket}
              setBracket={setBracket}
              activeMatchId={activeMatchId}
              setActiveMatchId={setActiveMatchId}
            />
            {bracket && (
              <Pressable onPress={handleFinalizeElo} style={[styles.primaryAction, styles.eloAction]}>
                <Text style={styles.primaryActionLabel}>📈 Finalize ELO Ratings</Text>
              </Pressable>
            )}
          </>
        )}

        {/* Footer actions */}
        <View style={styles.footerActions}>
          <Pressable
            onPress={() =>
              exportTournamentJson({
                fencers,
                poules,
                bracket,
                updatedAt: new Date().toISOString(),
              })
            }
            style={styles.footerButton}
          >
            <Text style={styles.footerButtonLabel}>Export JSON</Text>
          </Pressable>
          <Pressable onPress={handleReset} style={[styles.footerButton, styles.footerButtonDanger]}>
            <Text style={[styles.footerButtonLabel, styles.footerButtonLabelDanger]}>Reset</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white" },
  headerSub: { color: "#94A3B8", fontSize: 13, marginTop: 2 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    gap: 2,
  },
  tabActive: { borderBottomWidth: 3, borderBottomColor: "#6366F1" },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  tabLabelActive: { color: "#6366F1" },
  voiceBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  content: {
    padding: 14,
    gap: 14,
    paddingBottom: 40,
  },
  primaryAction: {
    backgroundColor: "#6366F1",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  eloAction: { backgroundColor: "#0F172A" },
  primaryActionLabel: { color: "white", fontSize: 17, fontWeight: "700" },
  footerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  footerButton: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#E2E8F0",
  },
  footerButtonDanger: { backgroundColor: "#FEE2E2" },
  footerButtonLabel: { fontWeight: "600", color: "#334155", fontSize: 14 },
  footerButtonLabelDanger: { color: "#DC2626" },
});
