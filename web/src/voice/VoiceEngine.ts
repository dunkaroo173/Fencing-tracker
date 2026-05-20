export interface VoiceResult {
  transcript: string;
  isFinal: boolean;
}

export interface VoiceCallbacks {
  onResult: (r: VoiceResult) => void;
  onError: (msg: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

class WebVoiceEngine {
  private recognition: any = null;

  isAvailable(): boolean {
    return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  }

  start(cb: VoiceCallbacks): void {
    if (!this.isAvailable()) { cb.onError("Not available"); return; }
    const SR: any = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.recognition.onstart = () => cb.onStart();
    this.recognition.onend = () => cb.onEnd();
    this.recognition.onerror = (e: any) => cb.onError(e.error ?? "error");
    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        cb.onResult({
          transcript: event.results[i][0].transcript.trim().toLowerCase(),
          isFinal: event.results[i].isFinal,
        });
      }
    };
    try { this.recognition.start(); } catch { cb.onError("Failed to start"); }
  }

  stop(): void {
    try { this.recognition?.stop(); } catch { /**/ }
    this.recognition = null;
  }
}

export const voiceEngine = new WebVoiceEngine();
