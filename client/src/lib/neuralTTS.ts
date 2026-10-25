/**
 * CareerTwin AI - Neural Male Voice TTS Streaming Audio Player Client
 * Guarantees 100% deep, authoritative male neural voice playback directly in browser memory.
 */

export interface NeuralTTSOptions {
  text: string;
  language?: string;
  voice?: string;
  rate?: string;
  pitch?: string;
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (err: any) => void;
}

class NeuralAudioStreamingClient {
  private activeAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private abortController: AbortController | null = null;
  private isAudioUnlocked = false;

  /**
   * Unlock browser audio playback restriction on first user gesture
   */
  public unlockAudio() {
    if (this.isAudioUnlocked) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          ctx.resume();
        }
      }
      this.isAudioUnlocked = true;
    } catch {}
  }

  /**
   * Stop currently playing audio and abort pending stream
   */
  public stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }

  /**
   * Stream and play 100% Male Neural Voice via edge-tts backend
   */
  public async speak(options: NeuralTTSOptions, apiBaseUrl = ""): Promise<void> {
    this.stop();
    this.unlockAudio();

    const {
      text,
      language = "ur-Roman",
      voice,
      rate = "+0%",
      pitch = "-2Hz", // Authoritative deep male pitch
      onStart,
      onEnded,
      onError,
    } = options;

    if (!text || !text.trim()) return;

    this.abortController = new AbortController();

    try {
      const response = await fetch(`${apiBaseUrl}/api/generate-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/wav, audio/mpeg, audio/*",
        },
        body: JSON.stringify({
          text: text.trim(),
          language,
          voice,
          rate,
          pitch,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS Streaming failed with HTTP status ${response.status}`);
      }

      // Buffer audio in memory as Blob (zero disk write)
      const audioBlob = await response.blob();
      if (audioBlob.size < 500) {
        throw new Error("Received empty or truncated audio stream.");
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentObjectUrl = audioUrl;

      const audio = new Audio();
      audio.src = audioUrl;
      audio.preload = "auto";
      this.activeAudio = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };

      audio.onended = () => {
        if (this.currentObjectUrl) {
          URL.revokeObjectURL(this.currentObjectUrl);
          this.currentObjectUrl = null;
        }
        this.activeAudio = null;
        if (onEnded) onEnded();
      };

      audio.onerror = (e) => {
        if (this.currentObjectUrl) {
          URL.revokeObjectURL(this.currentObjectUrl);
          this.currentObjectUrl = null;
        }
        this.activeAudio = null;
        if (onError) onError(e);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[NeuralTTS] Autoplay paused until user gesture:", err);
          if (onError) onError(err);
        });
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return;
      }
      console.warn("[NeuralTTS] Audio generation error:", err);
      if (onError) onError(err);
    }
  }

  /**
   * Quick preview test for male voice
   */
  public async testSampleVoice(voiceId = "ur-PK-AsadNeural", language = "ur-Roman") {
    const sampleText =
      language.includes("ur") || language.includes("roman")
        ? "Assalam-o-Alaikum! Main aapka AI Technical Interviewer hoon. Let us begin your rehearsal."
        : "Hello! I am your AI Technical Interviewer. Whenever you are ready, let us begin.";

    await this.speak({
      text: sampleText,
      language,
      voice: voiceId,
      pitch: "-2Hz",
      rate: "+0%",
    });
  }
}

export const neuralAudioPlayer = new NeuralAudioStreamingClient();
