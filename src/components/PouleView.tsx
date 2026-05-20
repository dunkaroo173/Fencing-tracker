import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Fencer, Poule } from "../engine/types";
import { calculatePouleStandings, updatePouleBout } from "../engine/poules";

interface Props {
  fencers: Fencer[];
  poules: Poule[];
  setPoules: (poules: Poule[]) => void;
  activePouleId: string;
  activeBoutId: string;
  setActive: (pouleId: string, boutId: string) => void;
}

export function PouleView({ fencers, poules, setPoules, activePouleId, activeBoutId, setActive }: Props) {
  const fencerById = Object.fromEntries(fencers.map((f) => [f.id, f]));
  const standings = calculatePouleStandings(fencers, poules);

  function setScore(
    pouleId: string,
    boutId: string,
    curA: number | undefined,
    curB: number | undefined,
    slot: "a" | "b",
    value: string
  ) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    const aScore = slot === "a" ? parsed : curA ?? 0;
    const bScore = slot === "b" ? parsed : curB ?? 0;
    setPoules(updatePouleBout(poules, pouleId, boutId, aScore, bScore));
  }

  if (poules.length === 0) {
    return <Text style={styles.empty}>No poules yet. Say "create poules" or tap Create Poules.</Text>;
  }

  const completedCount = poules.flatMap((p) => p.bouts).filter((b) => b.complete).length;
  const totalCount = poules.flatMap((p) => p.bouts).length;

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { flex: completedCount / totalCount }]} />
        <View style={{ flex: 1 - completedCount / totalCount }} />
      </View>
      <Text style={styles.progressLabel}>{completedCount} / {totalCount} bouts complete</Text>

      {poules.map((poule) => (
        <View key={poule.id} style={styles.card}>
          <Text style={styles.pouleTitle}>{poule.name}</Text>
          <Text style={styles.pouleMembers}>
            {poule.fencerIds.map((id) => fencerById[id]?.name ?? "?").join(" · ")}
          </Text>

          {poule.bouts.map((bout) => {
            const isActive = poule.id === activePouleId && bout.id === activeBoutId;
            return (
              <Pressable
                key={bout.id}
                onPress={() => setActive(poule.id, bout.id)}
                style={[styles.boutRow, isActive && styles.boutRowActive, bout.complete && styles.boutRowComplete]}
              >
                {isActive && <View style={styles.activeIndicator} />}
                <Text style={[styles.boutName, bout.winnerId === bout.aId && styles.winner]}>
                  {fencerById[bout.aId]?.name ?? "?"}
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={bout.aScore === undefined ? "" : String(bout.aScore)}
                  onChangeText={(v) => setScore(poule.id, bout.id, bout.aScore, bout.bScore, "a", v)}
                  onFocus={() => setActive(poule.id, bout.id)}
                  style={[styles.scoreInput, bout.complete && styles.scoreInputDone]}
                />
                <Text style={styles.scoreSep}>–</Text>
                <TextInput
                  keyboardType="numeric"
                  value={bout.bScore === undefined ? "" : String(bout.bScore)}
                  onChangeText={(v) => setScore(poule.id, bout.id, bout.aScore, bout.bScore, "b", v)}
                  onFocus={() => setActive(poule.id, bout.id)}
                  style={[styles.scoreInput, bout.complete && styles.scoreInputDone]}
                />
                <Text style={[styles.boutName, styles.boutNameRight, bout.winnerId === bout.bId && styles.winner]}>
                  {fencerById[bout.bId]?.name ?? "?"}
                </Text>
                {bout.complete && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.pouleTitle}>Standings</Text>
        {standings.map((s, i) => (
          <View key={s.id} style={[styles.standingRow, i === 0 && styles.standingFirst]}>
            <Text style={styles.standingRank}>{i + 1}</Text>
            <Text style={styles.standingName}>{s.name}</Text>
            <Text style={styles.standingStat}>W {s.wins}</Text>
            <Text style={styles.standingStat}>Ind {s.indicator > 0 ? "+" : ""}{s.indicator}</Text>
            <Text style={styles.standingStat}>TS {s.touchesScored}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: "#94A3B8", fontStyle: "italic", textAlign: "center", paddingVertical: 24 },
  progressBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  progressFill: { backgroundColor: "#6366F1" },
  progressLabel: { color: "#64748B", fontSize: 13, textAlign: "right" },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  pouleTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
  pouleMembers: { color: "#64748B", fontSize: 13, marginBottom: 4 },
  boutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  boutRowActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#A5B4FC",
  },
  boutRowComplete: { opacity: 0.65 },
  activeIndicator: {
    width: 4,
    height: 28,
    backgroundColor: "#6366F1",
    borderRadius: 2,
    marginRight: 2,
  },
  boutName: { flex: 1, fontSize: 14, color: "#334155" },
  boutNameRight: { textAlign: "right" },
  winner: { fontWeight: "700", color: "#059669" },
  scoreInput: {
    width: 44,
    height: 40,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    textAlign: "center",
    backgroundColor: "white",
    fontSize: 17,
    fontWeight: "700",
  },
  scoreInputDone: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" },
  scoreSep: { color: "#94A3B8", fontSize: 16 },
  checkmark: { color: "#22C55E", fontSize: 16, fontWeight: "700" },
  standingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  standingFirst: { backgroundColor: "#FEF9C3" },
  standingRank: { width: 24, fontWeight: "700", color: "#64748B", textAlign: "center" },
  standingName: { flex: 1, fontWeight: "600", color: "#1E293B" },
  standingStat: { color: "#64748B", fontSize: 13, minWidth: 50, textAlign: "right" },
});
