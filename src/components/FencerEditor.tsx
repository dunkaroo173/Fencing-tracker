import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Fencer } from "../engine/types";
import { createId } from "../engine/id";

interface Props {
  fencers: Fencer[];
  setFencers: (fencers: Fencer[]) => void;
}

export function FencerEditor({ fencers, setFencers }: Props) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState("1200");

  function addFencer() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const numericRating = Number(rating) || 1200;
    setFencers([
      ...fencers,
      { id: createId("fencer"), name: trimmed, rating: numericRating, elo: numericRating },
    ]);
    setName("");
    setRating("1200");
  }

  function removeFencer(id: string) {
    setFencers(fencers.filter((f) => f.id !== id));
  }

  const sorted = [...fencers].sort((a, b) => b.rating - a.rating);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Fencers ({fencers.length})</Text>

      <View style={styles.inputRow}>
        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          style={[styles.input, { flex: 2 }]}
          onSubmitEditing={addFencer}
          returnKeyType="next"
        />
        <TextInput
          placeholder="Rating"
          value={rating}
          onChangeText={setRating}
          keyboardType="numeric"
          style={[styles.input, { flex: 1 }]}
          onSubmitEditing={addFencer}
          returnKeyType="done"
        />
        <Pressable onPress={addFencer} style={styles.addButton}>
          <Text style={styles.addButtonLabel}>+ Add</Text>
        </Pressable>
      </View>

      {sorted.length === 0 && (
        <Text style={styles.emptyHint}>
          Add at least 2 fencers, then say "create poules" or tap the button below.
        </Text>
      )}

      {sorted.map((fencer, idx) => (
        <View key={fencer.id} style={styles.fencerRow}>
          <Text style={styles.seedNumber}>{idx + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.fencerName}>{fencer.name}</Text>
            <Text style={styles.fencerMeta}>Rating {fencer.rating} · ELO {fencer.elo}</Text>
          </View>
          <Pressable onPress={() => removeFencer(fencer.id)} style={styles.removeButton}>
            <Text style={styles.removeLabel}>✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  sectionTitle: { fontSize: 22, fontWeight: "700", color: "#1E293B" },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "white",
    fontSize: 15,
  },
  addButton: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButtonLabel: { color: "white", fontWeight: "700", fontSize: 15 },
  emptyHint: { color: "#94A3B8", fontStyle: "italic", textAlign: "center", paddingVertical: 16 },
  fencerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  seedNumber: { width: 28, fontSize: 16, fontWeight: "700", color: "#94A3B8", textAlign: "center" },
  fencerName: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  fencerMeta: { fontSize: 13, color: "#64748B", marginTop: 2 },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  removeLabel: { color: "#EF4444", fontWeight: "700", fontSize: 14 },
});
