import { Platform } from "react-native";

export interface VoiceResult {
  transcript: string;
  isFinal: boolean;
}

export interface VoiceEngineCallbacks {
  onResult: (result: VoiceResult) => void;
  onError: (error: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

export interface VoiceEngineInterface {
  start(callbacks: VoiceEngineCallbacks): void;
  stop(): void;
  isAvailable(): boolean;
}

class WebVoiceEngine implements VoiceEngineInterface {
  private recognition: any = null;

  isAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }

  start(callbacks: VoiceEngineCallbacks): void {
    if (!this.isAvailable()) {
      callbacks.onError("Speech recognition not available in this browser.");
      return;
    }
    const SR: any =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => callbacks.onStart();
    this.recognition.onend = () => callbacks.onEnd();
    this.recognition.onerror = (e: any) => callbacks.onError(e.error ?? "Unknown error");

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        callbacks.onResult({
          transcript: res[0].transcript.trim().toLowerCase(),
          isFinal: res.isFinal,
        });
      }
    };

    try {
      this.recognition.start();
    } catch {
      callbacks.onError("Could not start recognition.");
    }
  }

  stop(): void {
    try {
      this.recognition?.stop();
    } catch {
      // ignore
    }
    this.recognition = null;
  }
}

class StubVoiceEngine implements VoiceEngineInterface {
  isAvailable(): boolean {
    return false;
  }
  start(_callbacks: VoiceEngineCallbacks): void {
    // no-op: native platforms use the text command input fallback
  }
  stop(): void {}
}

export const voiceEngine: VoiceEngineInterface =
  Platform.OS === "web" ? new WebVoiceEngine() : new StubVoiceEngine();
