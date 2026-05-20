import { useCallback, useRef, useState } from "react";
import * as Speech from "expo-speech";
import { voiceEngine } from "./VoiceEngine";
import { TournamentCommand, commandFeedback, parseCommand } from "./CommandParser";

export type VoiceState = "idle" | "listening" | "processing" | "error";

export interface UseVoiceOptions {
  knownNames?: string[];
  onCommand: (cmd: TournamentCommand) => void;
}

export function useVoice({ knownNames = [], onCommand }: UseVoiceOptions) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState<TournamentCommand | null>(null);
  const isMounted = useRef(true);

  const speak = useCallback((text: string) => {
    Speech.speak(text, { language: "en-US", rate: 1.1 });
  }, []);

  const submitText = useCallback(
    (text: string) => {
      const cmd = parseCommand(text, knownNames);
      setLastCommand(cmd);
      const feedback = commandFeedback(cmd);
      speak(feedback);
      onCommand(cmd);
    },
    [knownNames, onCommand, speak]
  );

  const startListening = useCallback(() => {
    if (state === "listening") return;
    if (!voiceEngine.isAvailable()) {
      setState("error");
      return;
    }
    setTranscript("");
    setState("listening");

    voiceEngine.start({
      onStart: () => {
        if (isMounted.current) setState("listening");
      },
      onEnd: () => {
        if (isMounted.current) setState("idle");
      },
      onError: (err) => {
        if (isMounted.current) {
          setState("error");
          speak("Voice recognition error. Please try again.");
          console.warn("Voice error:", err);
        }
      },
      onResult: ({ transcript: t, isFinal }) => {
        if (!isMounted.current) return;
        setTranscript(t);
        if (isFinal) {
          setState("processing");
          submitText(t);
          setState("idle");
        }
      },
    });
  }, [state, submitText, speak]);

  const stopListening = useCallback(() => {
    voiceEngine.stop();
    setState("idle");
  }, []);

  return {
    state,
    transcript,
    lastCommand,
    isAvailable: voiceEngine.isAvailable(),
    startListening,
    stopListening,
    submitText,
    speak,
  };
}
