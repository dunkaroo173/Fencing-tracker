import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Fencer, Poule } from "../engine/types";
import { PouleStanding, calculatePouleStandings } from "../engine/poules";

interface Props {
  fencers: Fencer[];
  poules: Poule[];
  onCreateDE: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function StandingsView({ fencers, poules, onCreateDE }: Props) {
  const standings = calculatePouleStandings(fencers, poules);

  if (standings.length === 0) {
    return <Text style={styles.empty}>Complete poule bouts to see standings.</Text>;
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>Poule Standings</Text>
      <Text style={styles.subtitle}>Ranked by: wins → indicator → touches scored → initial rating</Text>

      {standings.map((s, i) => (
        <View key={s.id} style={[styles.row, i < 3 && styles.podium]}>
          <Text style={styles.medal}>{MEDALS[i] ?? `${i + 1}.`}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.meta}>Rating {s.rating} · ELO {s.elo}</Text>
          </View>
          <View style={styles.stats}>
            <Stat label="W" value={String(s.wins)} />
            <Stat label="L" value={String(s.losses)} />
            <Stat label="Ind" value={(s.indicator > 0 ? "+" : "") + s.indicator} />
            <Stat label="TS" value={String(s.touchesScored)} />
          </View>
        </View>
      ))}

      <Pressable onPress={onCreateDE} style={styles.deButton}>
        <Text style={styles.deButtonLabel}>Create DE Bracket →</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", minWidth: 36 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: "#1E293B" }}>{value}</Text>
      <Text style={{ fontSize: 10, color: "#94A3B8" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: "#94A3B8", fontStyle: "italic", textAlign: "center", paddingVertical: 24 },
  sectionTitle: { fontSize: 22, fontWeight: "700", color: "#1E293B" },
  subtitle: { color: "#64748B", fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  podium: { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  medal: { fontSize: 22, width: 32, textAlign: "center" },
  name: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  meta: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  stats: { flexDirection: "row", gap: 6 },
  deButton: {
    backgroundColor: "#6366F1",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  deButtonLabel: { color: "white", fontSize: 17, fontWeight: "700" },
});
