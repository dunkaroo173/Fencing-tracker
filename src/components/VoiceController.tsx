import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { TournamentCommand } from "../voice/CommandParser";
import { VoiceState } from "../voice/useVoice";

const HELP_COMMANDS = [
  "add fencer Alice",
  "add fencer Bob rating 1400",
  "create poules",
  "five three",
  "next bout",
  "score 15 to 8",
  "create bracket",
  "finalize elo",
  "show standings",
  "export",
];

interface Props {
  voiceState: VoiceState;
  transcript: string;
  lastCommand: TournamentCommand | null;
  isVoiceAvailable: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onSubmitText: (text: string) => void;
}

export function VoiceController({
  voiceState,
  transcript,
  lastCommand,
  isVoiceAvailable,
  onStartListening,
  onStopListening,
  onSubmitText,
}: Props) {
  const [manualInput, setManualInput] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const isListening = voiceState === "listening";

  function handleMicPress() {
    if (isListening) onStopListening();
    else onStartListening();
  }

  function handleManualSubmit() {
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    onSubmitText(trimmed);
    setManualInput("");
  }

  function handleQuickCommand(cmd: string) {
    onSubmitText(cmd);
  }

  const micColor = isListening ? "#EF4444" : "#6366F1";
  const micLabel = isListening ? "Stop" : "Mic";
  const micRing = isListening ? styles.micRingActive : styles.micRingIdle;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Mic button — shown only where Web Speech API is available */}
        {(isVoiceAvailable || Platform.OS === "web") && (
          <Pressable
            onPress={handleMicPress}
            style={[styles.micButton, micRing, { backgroundColor: micColor }]}
          >
            <Text style={styles.micIcon}>{isListening ? "⏹" : "🎤"}</Text>
            <Text style={styles.micLabel}>{micLabel}</Text>
          </Pressable>
        )}

        {/* Text command input */}
        <TextInput
          style={styles.commandInput}
          placeholder={
            isVoiceAvailable
              ? "Or type a command…"
              : "Type a command (e.g. add fencer Alice)"
          }
          value={manualInput}
          onChangeText={setManualInput}
          onSubmitEditing={handleManualSubmit}
          returnKeyType="send"
          blurOnSubmit={false}
        />

        <Pressable onPress={handleManualSubmit} style={styles.sendButton}>
          <Text style={styles.sendLabel}>→</Text>
        </Pressable>

        <Pressable onPress={() => setShowHelp((h) => !h)} style={styles.helpButton}>
          <Text style={styles.helpLabel}>?</Text>
        </Pressable>
      </View>

      {/* Transcript bubble */}
      {(transcript || isListening) && (
        <View style={styles.transcriptBubble}>
          <Text style={styles.transcriptLabel}>
            {isListening && !transcript ? "Listening…" : transcript}
          </Text>
        </View>
      )}

      {/* Last command feedback */}
      {lastCommand && lastCommand.type !== "UNKNOWN" && (
        <View style={styles.feedbackBubble}>
          <Text style={styles.feedbackLabel}>✓ {renderCommand(lastCommand)}</Text>
        </View>
      )}
      {lastCommand?.type === "UNKNOWN" && (
        <View style={[styles.feedbackBubble, styles.feedbackError]}>
          <Text style={styles.feedbackLabel}>❓ "{lastCommand.raw}" — say help for commands</Text>
        </View>
      )}

      {/* Help panel */}
      {showHelp && (
        <View style={styles.helpPanel}>
          <Text style={styles.helpTitle}>Voice Commands</Text>
          {HELP_COMMANDS.map((cmd) => (
            <Pressable key={cmd} onPress={() => handleQuickCommand(cmd)} style={styles.helpRow}>
              <Text style={styles.helpCmd}>"{cmd}"</Text>
              <Text style={styles.helpTap}>tap to run</Text>
            </Pressable>
          ))}
          {!isVoiceAvailable && (
            <Text style={styles.helpNote}>
              Open in Chrome on Android or a desktop browser for live microphone input.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function renderCommand(cmd: TournamentCommand): string {
  switch (cmd.type) {
    case "ADD_FENCER": return `Add ${cmd.name} (${cmd.rating})`;
    case "REMOVE_FENCER": return `Remove ${cmd.name}`;
    case "CREATE_POULES": return "Create poules";
    case "CREATE_DE": return "Create DE bracket";
    case "FINALIZE_ELO": return "Finalize ELO";
    case "EXPORT": return "Export tournament";
    case "RESET": return "Reset tournament";
    case "NAVIGATE": return `Go to ${cmd.screen}`;
    case "SCORE_CURRENT": return `Score: ${cmd.aScore}–${cmd.bScore}`;
    case "SCORE_BY_NAME": return `${cmd.nameA} ${cmd.scoreA}–${cmd.scoreB} ${cmd.nameB}`;
    case "NEXT_BOUT": return "Next bout";
    case "HELP": return "Help shown";
    default: return "";
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  micRingIdle: {
    borderColor: "#818CF8",
  },
  micRingActive: {
    borderColor: "#FCA5A5",
    shadowColor: "#EF4444",
    shadowRadius: 12,
    shadowOpacity: 0.6,
    elevation: 8,
  },
  micIcon: { fontSize: 20 },
  micLabel: { fontSize: 10, color: "white", fontWeight: "700" },
  commandInput: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },
  sendLabel: { color: "white", fontSize: 18, fontWeight: "700" },
  helpButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#A5B4FC",
    alignItems: "center",
    justifyContent: "center",
  },
  helpLabel: { color: "white", fontWeight: "700", fontSize: 16 },
  transcriptBubble: {
    backgroundColor: "#DBEAFE",
    borderRadius: 10,
    padding: 8,
  },
  transcriptLabel: { color: "#1E40AF", fontStyle: "italic", fontSize: 14 },
  feedbackBubble: {
    backgroundColor: "#D1FAE5",
    borderRadius: 10,
    padding: 8,
  },
  feedbackError: { backgroundColor: "#FEE2E2" },
  feedbackLabel: { color: "#065F46", fontSize: 13, fontWeight: "600" },
  helpPanel: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  helpTitle: { fontSize: 15, fontWeight: "700", color: "#4338CA", marginBottom: 4 },
  helpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  helpCmd: { color: "#1E3A8A", fontSize: 13, fontFamily: "monospace" },
  helpTap: { color: "#94A3B8", fontSize: 11 },
  helpNote: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 12,
    fontStyle: "italic",
  },
});
