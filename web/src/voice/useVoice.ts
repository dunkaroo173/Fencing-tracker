import { useCallback, useState } from "react";
import { voiceEngine } from "./VoiceEngine";
import { TournamentCommand, commandFeedback, parseCommand } from "./CommandParser";

export type VoiceState = "idle" | "listening" | "processing" | "error";

export function useVoice(knownNames: string[], onCommand: (cmd: TournamentCommand) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState<TournamentCommand | null>(null);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  }, []);

  const submitText = useCallback((text: string) => {
    const cmd = parseCommand(text, knownNames);
    setLastCommand(cmd);
    speak(commandFeedback(cmd));
    onCommand(cmd);
  }, [knownNames, onCommand, speak]);

  const startListening = useCallback(() => {
    if (state === "listening") return;
    setTranscript("");
    setState("listening");
    voiceEngine.start({
      onStart: () => setState("listening"),
      onEnd: () => setState("idle"),
      onError: () => setState("error"),
      onResult: ({ transcript: t, isFinal }) => {
        setTranscript(t);
        if (isFinal) {
          setState("processing");
          submitText(t);
          setState("idle");
        }
      },
    });
  }, [state, submitText]);

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
