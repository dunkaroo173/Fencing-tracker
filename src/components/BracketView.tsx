import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Bracket, BracketMatch, Fencer } from "../engine/types";
import { enterDEMatchScore } from "../engine/bracket";

interface Props {
  fencers: Fencer[];
  bracket?: Bracket;
  setBracket: (bracket: Bracket) => void;
  activeMatchId: string;
  setActiveMatchId: (id: string) => void;
}

export function BracketView({ fencers, bracket, setBracket, activeMatchId, setActiveMatchId }: Props) {
  const fencerById = Object.fromEntries(fencers.map((f) => [f.id, f]));

  if (!bracket) {
    return (
      <Text style={styles.empty}>
        Complete poule bouts and tap "Create DE Bracket" on the standings screen.
      </Text>
    );
  }

  function name(id: string): string {
    if (!id) return "TBD";
    if (id.startsWith("bye-")) return "BYE";
    return fencerById[id]?.name ?? "Unknown";
  }

  function setScore(match: BracketMatch, slot: "a" | "b", value: string) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    const aScore = slot === "a" ? parsed : match.aScore ?? 0;
    const bScore = slot === "b" ? parsed : match.bScore ?? 0;
    setBracket(enterDEMatchScore(bracket!, match.id, aScore, bScore));
  }

  const roundLabels = (roundIndex: number) => {
    const total = bracket.rounds.length;
    if (roundIndex === total - 1) return "Final";
    if (roundIndex === total - 2) return "Semifinal";
    if (roundIndex === total - 3) return "Quarterfinal";
    return `Round ${roundIndex + 1}`;
  };

  const champion = (() => {
    const finalRound = bracket.rounds[bracket.rounds.length - 1];
    const finalMatch = finalRound?.[0];
    if (finalMatch?.complete && finalMatch.winnerId) {
      return name(finalMatch.winnerId);
    }
    return null;
  })();

  return (
    <View style={{ gap: 12 }}>
      {champion && (
        <View style={styles.championBanner}>
          <Text style={styles.championEmoji}>🏆</Text>
          <Text style={styles.championName}>{champion}</Text>
          <Text style={styles.championLabel}>Champion</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.bracketContainer}>
          {bracket.rounds.map((round, roundIndex) => (
            <View key={roundIndex} style={styles.roundColumn}>
              <Text style={styles.roundLabel}>{roundLabels(roundIndex)}</Text>
              <View style={styles.matchesColumn}>
                {round.map((match) => {
                  const isActive = match.id === activeMatchId;
                  const isBye = match.aId.startsWith("bye-") || match.bId.startsWith("bye-");
                  return (
                    <Pressable
                      key={match.id}
                      onPress={() => !isBye && setActiveMatchId(match.id)}
                      style={[
                        styles.matchCard,
                        isActive && styles.matchCardActive,
                        match.complete && styles.matchCardDone,
                        isBye && styles.matchCardBye,
                      ]}
                    >
                      <MatchSlot
                        label={name(match.aId)}
                        score={match.aScore}
                        isWinner={match.winnerId === match.aId}
                        isBye={match.aId.startsWith("bye-")}
                        onScoreChange={(v) => { setActiveMatchId(match.id); setScore(match, "a", v); }}
                      />
                      <View style={styles.matchDivider} />
                      <MatchSlot
                        label={name(match.bId)}
                        score={match.bScore}
                        isWinner={match.winnerId === match.bId}
                        isBye={match.bId.startsWith("bye-")}
                        onScoreChange={(v) => { setActiveMatchId(match.id); setScore(match, "b", v); }}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function MatchSlot({
  label,
  score,
  isWinner,
  isBye,
  onScoreChange,
}: {
  label: string;
  score?: number;
  isWinner: boolean;
  isBye: boolean;
  onScoreChange: (v: string) => void;
}) {
  return (
    <View style={slotStyles.row}>
      <Text
        style={[slotStyles.name, isWinner && slotStyles.winner, isBye && slotStyles.byeText]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {!isBye && (
        <TextInput
          style={[slotStyles.score, isWinner && slotStyles.scoreWinner]}
          keyboardType="numeric"
          value={score === undefined ? "" : String(score)}
          onChangeText={onScoreChange}
          maxLength={2}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: "#94A3B8", fontStyle: "italic", textAlign: "center", paddingVertical: 24 },
  championBanner: {
    backgroundColor: "#FEF9C3",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: "#FDE68A",
  },
  championEmoji: { fontSize: 40 },
  championName: { fontSize: 24, fontWeight: "800", color: "#92400E" },
  championLabel: { color: "#B45309", fontSize: 14, fontWeight: "600" },
  bracketContainer: { flexDirection: "row", gap: 12, paddingBottom: 8 },
  roundColumn: { width: 180, gap: 8 },
  roundLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6366F1",
    textAlign: "center",
    paddingBottom: 4,
  },
  matchesColumn: { gap: 8, flex: 1, justifyContent: "space-around" },
  matchCard: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  matchCardActive: { borderColor: "#6366F1", borderWidth: 2 },
  matchCardDone: { opacity: 0.75 },
  matchCardBye: { opacity: 0.4 },
  matchDivider: { height: 1, backgroundColor: "#E2E8F0" },
});

const slotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  name: { flex: 1, fontSize: 13, color: "#334155" },
  winner: { fontWeight: "700", color: "#059669" },
  byeText: { color: "#CBD5E1", fontStyle: "italic" },
  score: {
    width: 36,
    height: 32,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    backgroundColor: "#F8FAFC",
  },
  scoreWinner: { backgroundColor: "#D1FAE5", borderColor: "#86EFAC", color: "#059669" },
});
