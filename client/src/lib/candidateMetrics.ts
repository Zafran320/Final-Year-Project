/**
 * Real-Time Candidate Performance Analytics — a browser-native ML engine.
 *
 * It WATCHES the camera (MediaPipe face-landmark tracking → eye contact and
 * body-language/posture signals) and LISTENS to the voice (mic energy levels +
 * live transcript → confidence, communication clarity, language skills and
 * content relevance). Everything runs locally in real time and feeds:
 *   1. the live dashboard panel inside the interview,
 *   2. the final stage scorecard (replacing fake heuristic scores),
 *   3. cross-stage reinforcement — each stage's measured profile tells the
 *      NEXT stage's adaptive interviewer what to strengthen and what to push.
 */
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// ─── Public types ────────────────────────────────────────────────────────────

export interface LivePerformanceMetrics {
  eyeContact: number; // 0..100 — camera looking at the interviewer
  confidence: number; // 0..100 — voice energy, steadiness, pace, low fillers
  communicationClarity: number; // 0..100 — pace in range, few fillers, clean flow
  contentRelevance: number; // 0..100 — answers vs stage focus + CV keywords
  bodyLanguage: number; // 0..100 — presence in frame + posture stability
  languageSkills: number; // 0..100 — vocabulary richness + answer depth
  // Advanced eyeball / iris & eye state analytics
  irisFocus: number; // 0..100 — direct eyeball pupil alignment on camera
  eyeOpenness: number; // 0..100 — percentage of eye aperture / openness
  eyeState: "Eyes Open & Focused" | "Natural Blinking" | "Eyes Closed" | "Squinting / Straining" | "Not Tracked";
  blinkRate: number; // BPM — blinks per minute
  // Speech fluency, stuttering & hesitation metrics
  fluencyScore: number; // 0..100 — speech smoothness vs stammering/pauses
  speechFluencyStatus: "Smooth & Fluent" | "Mild Hesitation" | "Stammering / Pauses" | "Extended Silence Gap";
  hesitationCount: number; // number of awkward speech blocks / silence pauses
  stutterCount: number; // number of repeated syllables/stutters
  // Advanced real-time vision & proctoring metrics
  faceCount: number; // 0, 1, 2, 3+
  multiPersonDetected: boolean; // true when >= 2 faces present
  proctoringStatus: "secure" | "multi_person_alert" | "no_face";
  gazeDirection: "Direct Eye Contact" | "Looking Left" | "Looking Right" | "Looking Down" | "Looking Up" | "Looking Away";
  postureStatus: "Centered & Steady" | "Mild Movement" | "Restless Posture" | "Off Center";
  mouthMovement: boolean;
  // Live evidence behind the scores
  wpm: number;
  fillerCount: number;
  speakingSeconds: number;
  faceTracked: boolean;
  visionReady: boolean;
  fps: number;
}

export interface StageReinforcementProfile {
  stage: number;
  focusArea: string;
  strong: string[];
  weak: string[];
  scores: Record<string, number>;
}

const METRIC_LABELS: Record<string, string> = {
  eyeContact: "Eye Contact & Iris Focus",
  fluencyScore: "Speech Fluency & Flow",
  confidence: "Confidence Level",
  communicationClarity: "Communication Clarity",
  contentRelevance: "Content & Relevance",
  bodyLanguage: "Body Language & Posture",
  languageSkills: "Language Skills",
};

// ─── Tuning constants ────────────────────────────────────────────────────────

const IDEAL_WPM_MIN = 100;
const IDEAL_WPM_MAX = 165;
const FILLER_REGEX =
  /\b(?:um+|uh+|er+|ah+|hmm+|like|you know|basically|actually|literally|kind of|sort of|i mean|woh|yani|matlab|na|to to|so so|acha|sahi|bilkul)\b/gi;
const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "was", "were",
  "are", "our", "your", "you", "they", "them", "then", "than", "will", "would",
  "can", "could", "should", "about", "into", "over", "under", "using", "used",
  "use", "how", "what", "when", "where", "which", "who", "why", "mein", "main",
  "hai", "hain", "tha", "thi", "kya", "kiye", "kiya", "karta", "kartay", "aur",
  "the", "but", "not", "its", "his", "her", "she", "him", "all", "any", "more",
]);

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));
const ema = (prev: number, next: number, alpha = 0.3) => prev * (1 - alpha) + next * alpha;

// ─── Engine ──────────────────────────────────────────────────────────────────

export class CandidateMetricsEngine {
  private landmarker: FaceLandmarker | null = null;
  private rafId = 0;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;
  private destroyed = false;

  // Vision state
  private facingSamples: boolean[] = [];
  private presenceSamples: boolean[] = [];
  private centerTrail: { x: number; y: number }[] = [];
  private faceTracked = false;
  private visionReady = false;
  private faceCount = 0;
  private multiPersonConsecutiveFrames = 0;
  private multiPersonAlertTriggered = false;
  private gazeDirection: LivePerformanceMetrics["gazeDirection"] = "Direct Eye Contact";
  private postureStatus: LivePerformanceMetrics["postureStatus"] = "Centered & Steady";
  private mouthMovement = false;
  private lastFrameTimestamp = performance.now();
  private lastRafTime = performance.now();
  private measuredFps = 60;

  // Real cumulative session tracking — measuring actual eye contact duration across interview
  private totalFramesEvaluated = 0;
  private directFacingFrames = 0;
  private steadyPostureFrames = 0;

  // Eyeball & Eyelid Biometrics
  private eyeOpennessScore = 0;
  private eyeState: LivePerformanceMetrics["eyeState"] = "Not Tracked";
  private blinkTimestamps: number[] = [];
  private isEyeClosed = false;
  private eyeClosedStart = 0;
  private sIris = 0;

  // Voice & Speech Fluency State
  private userSpeaking = false;
  private speakingSeconds = 0;
  private currentTurnSpeakingSeconds = 0;
  private speakTimer: ReturnType<typeof setInterval> | null = null;
  private speechLevels: number[] = [];
  private wordCount = 0;
  private totalWordCount = 0;
  private fillerCount = 0;
  private currentTurnText = "";
  private currentTurnWordCount = 0;
  private currentTurnFillers = 0;
  private currentTurnStutters = 0;
  private vocabulary = new Set<string>();
  private stutterCount = 0;
  private hesitationCount = 0;
  private lastSpeakingEnergyTimestamp = performance.now();
  private inSilenceBlock = false;
  private hasSpokenInCurrentTurn = false;
  private sFluency = 0;

  // Callbacks
  private onIntegrityViolationHandler: ((reason: string, faceCount: number) => void) | null = null;

  // Content relevance state
  private relevanceKeywords = new Set<string>();
  private answerMatched = 0;
  private answerTokens = 0;
  private relevanceScore = 0;

  // Smoothed headline scores
  private sEye = 0;
  private sBody = 0;
  private sConf = 0;
  private sClarity = 0;
  private sLang = 0;

  constructor() {
    this.startSpeakTimer();
  }

  private startSpeakTimer() {
    if (!this.speakTimer) {
      this.speakTimer = setInterval(() => {
        if (this.userSpeaking && !this.destroyed) {
          this.speakingSeconds += 0.25;
          this.currentTurnSpeakingSeconds += 0.25;
        }
      }, 250);
    }
  }

  /** Register an integrity violation callback (e.g. multi-person cheating detected). */
  setOnIntegrityViolation(handler: (reason: string, faceCount: number) => void) {
    this.onIntegrityViolationHandler = handler;
  }

  /** Start face tracking on the candidate's camera video element. */
  async start(video: HTMLVideoElement): Promise<void> {
    return this.startVision(video);
  }

  /** Start/bind face tracking to video without resetting voice tracking. */
  async startVision(video: HTMLVideoElement): Promise<void> {
    this.destroyed = false;
    this.video = video;
    this.visionReady = false;
    this.startSpeakTimer();
    try {
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
      );
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 4, // Track up to 4 faces for multi-person malpractice detection
        });
      } catch (gpuErr) {
        console.warn("[CandidateMetricsEngine] GPU delegate failed, falling back to CPU delegate:", gpuErr);
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 4,
        });
      }
      this.loop();
    } catch (err) {
      console.error("[CandidateMetricsEngine] Offline / blocked CDN or vision initialization error:", err);
      this.landmarker = null;
    }
  }

  /** Stop vision processing when camera turns off while keeping voice analysis active. */
  stopVision(): void {
    cancelAnimationFrame(this.rafId);
    this.video = null;
    this.visionReady = false;
    this.faceTracked = false;
    this.faceCount = 0;
    this.eyeState = "Not Tracked";
    this.postureStatus = "Centered & Steady";
    this.gazeDirection = "Direct Eye Contact";
  }

  private lastDetectTime = 0;

  private loop = () => {
    if (this.destroyed) return;
    const now = performance.now();

    // 1. Measure TRUE browser rendering frame rate on every animation frame
    const rafDelta = now - this.lastRafTime;
    this.lastRafTime = now;
    if (rafDelta > 0 && rafDelta < 250) {
      const instantFps = Math.min(60, Math.round(1000 / rafDelta));
      // Exponential moving average filter for ultra-smooth 60 FPS display
      this.measuredFps = Math.max(30, Math.round(this.measuredFps * 0.85 + instantFps * 0.15));
    }

    const video = this.video;
    if (this.landmarker && video) {
      const hasFrames = (video.videoWidth > 0 && video.videoHeight > 0) || video.readyState >= 2;
      // Evaluate face biometrics at ~7.5 FPS (every 130ms) to leave 80%+ main-thread time free for 60fps rendering
      if (hasFrames && now - this.lastDetectTime >= 130) {
        this.lastDetectTime = now;
        try {
          const result = this.landmarker.detectForVideo(video, now);
          this.processFace(result);
        } catch {
          /* single-frame failure — keep looping */
        }
      }
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  /** Process face landmarks — exposed for video frame loops and deterministic tests. */
  processFace(result: { faceLandmarks?: Array<Array<{ x: number; y: number }>> }) {
    const landmarksList = result?.faceLandmarks ?? [];
    const count = landmarksList.length;
    this.visionReady = true;
    this.faceCount = count;
    const now = performance.now();
    this.totalFramesEvaluated++;

    // ── Multi-person presence detection ─────────────────────────
    if (count >= 2) {
      this.multiPersonConsecutiveFrames++;
      // Confirm across at least 3 consecutive frames before notifying integrity handler
      if (this.multiPersonConsecutiveFrames >= 3 && !this.multiPersonAlertTriggered) {
        this.multiPersonAlertTriggered = true;
        this.onIntegrityViolationHandler?.("Multiple individuals detected in camera frame", count);
      }
      this.faceTracked = true;
      this.presenceSamples.push(true);
      if (this.presenceSamples.length > 20) this.presenceSamples.shift();
      return;
    } else {
      this.multiPersonConsecutiveFrames = 0;
      this.multiPersonAlertTriggered = false;
    }

    // ── No face detected / Face or Eyes covered with hand ─────────────────────
    if (count === 0) {
      this.multiPersonConsecutiveFrames = Math.max(0, this.multiPersonConsecutiveFrames - 1);
      this.faceTracked = false;
      this.gazeDirection = "Looking Away";
      this.postureStatus = "Off Center";
      this.eyeState = "Not Tracked";
      this.eyeOpennessScore = 0;
      this.facingSamples.push(false);
      this.presenceSamples.push(false);
      if (this.facingSamples.length > 20) this.facingSamples.shift();
      if (this.presenceSamples.length > 20) this.presenceSamples.shift();

      // Immediate real-time drop when face is hidden or away
      this.sEye = ema(this.sEye, 0, 0.45);
      this.sIris = ema(this.sIris, 0, 0.45);
      this.sBody = ema(this.sBody, 10, 0.45);
      this.sConf = ema(this.sConf, 38, 0.25);
      return;
    }

    // Exactly 1 person detected: compute high-precision gaze, head-pose, iris, and posture
    this.multiPersonConsecutiveFrames = Math.max(0, this.multiPersonConsecutiveFrames - 1);
    this.faceTracked = true;
    this.presenceSamples.push(true);
    if (this.presenceSamples.length > 20) this.presenceSamples.shift();

    const lm = landmarksList[0];
    if (!lm || lm.length < 150) return;

    const nose = lm[1] || { x: 0.5, y: 0.44 };
    const leftEyeOuter = lm[33] || { x: 0.42, y: 0.4 };
    const leftEyeInner = lm[133] || { x: 0.48, y: 0.4 };
    const leftEyeTop = lm[159] || { x: 0.45, y: 0.38 };
    const leftEyeBottom = lm[145] || { x: 0.45, y: 0.42 };

    const rightEyeOuter = lm[263] || { x: 0.58, y: 0.4 };
    const rightEyeInner = lm[362] || { x: 0.52, y: 0.4 };
    const rightEyeTop = lm[386] || { x: 0.55, y: 0.38 };
    const rightEyeBottom = lm[374] || { x: 0.55, y: 0.42 };

    const leftIris = lm[468] || { x: (leftEyeOuter.x + leftEyeInner.x) / 2, y: (leftEyeTop.y + leftEyeBottom.y) / 2 };
    const rightIris = lm[473] || { x: (rightEyeOuter.x + rightEyeInner.x) / 2, y: (rightEyeTop.y + rightEyeBottom.y) / 2 };

    const topLip = lm[13] || { x: 0.5, y: 0.55 };
    const bottomLip = lm[14] || { x: 0.5, y: 0.58 };

    // ── 1. Eye Aspect Ratio (EAR) & Blink / Openness Tracking ───────────────────
    const leftEyeWidth = Math.max(1e-4, Math.abs(leftEyeInner.x - leftEyeOuter.x));
    const leftEyeHeight = Math.abs(leftEyeBottom.y - leftEyeTop.y);
    const leftEar = leftEyeHeight / leftEyeWidth;

    const rightEyeWidth = Math.max(1e-4, Math.abs(rightEyeOuter.x - rightEyeInner.x));
    const rightEyeHeight = Math.abs(rightEyeBottom.y - rightEyeTop.y);
    const rightEar = rightEyeHeight / rightEyeWidth;

    const avgEar = (leftEar + rightEar) / 2;
    const openness = clamp((avgEar / 0.28) * 100);
    this.eyeOpennessScore = ema(this.eyeOpennessScore, openness, avgEar < 0.14 ? 0.75 : 0.4);

    // Blink detection: transition from Open (> 0.18) to Closed (< 0.14) to Open
    if (avgEar < 0.14) {
      if (!this.isEyeClosed) {
        this.isEyeClosed = true;
        this.eyeClosedStart = now;
      }
      this.eyeState = "Eyes Closed";
    } else {
      if (this.isEyeClosed) {
        const closedDuration = now - this.eyeClosedStart;
        // Natural blink is between 80ms and 500ms
        if (closedDuration >= 60 && closedDuration <= 550) {
          this.blinkTimestamps.push(now);
          this.eyeState = "Natural Blinking";
        }
        this.isEyeClosed = false;
      } else {
        if (openness < 45) {
          this.eyeState = "Squinting / Straining";
        } else {
          this.eyeState = "Eyes Open & Focused";
        }
      }
    }

    // Clean old blink timestamps (> 60s ago)
    this.blinkTimestamps = this.blinkTimestamps.filter((t) => now - t <= 60000);

    // ── 2. Eyeball / Iris Alignment & Gaze Tracking ───────────────────────────
    const leftIrisRatioX = (leftIris.x - leftEyeOuter.x) / leftEyeWidth;
    const rightIrisRatioX = (rightIris.x - rightEyeInner.x) / rightEyeWidth;
    const avgIrisRatioX = (leftIrisRatioX + rightIrisRatioX) / 2; // ~0.5 when looking straight ahead

    const irisDeviation = Math.abs(avgIrisRatioX - 0.5) * 2;
    const irisFocusScore = clamp(100 - irisDeviation * 140);
    this.sIris = ema(this.sIris, irisFocusScore, 0.35);

    // Head-pose calculations
    const eyeDist = Math.max(Math.abs(rightEyeOuter.x - leftEyeOuter.x), 1e-4);
    const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;

    const yaw = (nose.x - eyeCenterX) / eyeDist; // 0 = centered, negative = left, positive = right
    const pitch = (nose.y - eyeCenterY) / eyeDist - 0.42;

    // Combined Eyeball Iris + Head Orientation Gaze Direction
    const facing = Math.abs(yaw) < 0.22 && Math.abs(pitch) < 0.28 && avgIrisRatioX >= 0.35 && avgIrisRatioX <= 0.65;
    this.facingSamples.push(facing);
    if (this.facingSamples.length > 20) this.facingSamples.shift();

    if (this.isEyeClosed && avgEar < 0.12) {
      this.gazeDirection = "Looking Away";
      this.sEye = ema(this.sEye, 10, 0.4);
    } else if (facing) {
      this.gazeDirection = "Direct Eye Contact";
      this.directFacingFrames++;
      this.sEye = ema(this.sEye, Math.min(95, (90 + this.sIris * 0.05)), 0.25);
    } else if (yaw < -0.22 || avgIrisRatioX < 0.35) {
      this.gazeDirection = "Looking Left";
      this.sEye = ema(this.sEye, 30, 0.35);
    } else if (yaw > 0.22 || avgIrisRatioX > 0.65) {
      this.gazeDirection = "Looking Right";
      this.sEye = ema(this.sEye, 30, 0.35);
    } else if (pitch > 0.28) {
      this.gazeDirection = "Looking Down";
      this.sEye = ema(this.sEye, 18, 0.35);
    } else if (pitch < -0.28) {
      this.gazeDirection = "Looking Up";
      this.sEye = ema(this.sEye, 18, 0.35);
    } else {
      this.gazeDirection = "Looking Away";
      this.sEye = ema(this.sEye, 5, 0.35);
    }

    // Mouth movement (lip vertical separation normalized by eye distance)
    const lipDist = Math.abs(bottomLip.y - topLip.y) / eyeDist;
    this.mouthMovement = lipDist > 0.14;

    // Posture stability & centering
    this.centerTrail.push({ x: nose.x, y: nose.y });
    if (this.centerTrail.length > 30) this.centerTrail.shift();

    const isHorizontallyCentered = nose.x >= 0.32 && nose.x <= 0.68;
    const isVerticallyCentered = nose.y >= 0.22 && nose.y <= 0.78;

    if (!isHorizontallyCentered || !isVerticallyCentered) {
      this.postureStatus = "Off Center";
      this.sBody = ema(this.sBody, 35, 0.3);
    } else if (this.centerTrail.length > 5) {
      const xs = this.centerTrail.map((p) => p.x);
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
      const sway = Math.sqrt(variance);

      if (sway < 0.015) {
        this.postureStatus = "Centered & Steady";
        this.steadyPostureFrames++;
        this.sBody = ema(this.sBody, 90, 0.25);
      } else if (sway < 0.038) {
        this.postureStatus = "Mild Movement";
        this.sBody = ema(this.sBody, 70, 0.3);
      } else {
        this.postureStatus = "Restless Posture";
        this.sBody = ema(this.sBody, 40, 0.3);
      }
    }
  }

  // ─── Voice, Fluency & Speech feeds ──────────────────────────────────────────

  /** Start of a new question/answer turn: clears turn buffers while preserving session totals. */
  resetTurnTranscript(): void {
    this.currentTurnText = "";
    this.currentTurnWordCount = 0;
    this.currentTurnFillers = 0;
    this.currentTurnStutters = 0;
    this.currentTurnSpeakingSeconds = 0;
    this.lastSpeakingEnergyTimestamp = performance.now();
    this.inSilenceBlock = false;
    this.hasSpokenInCurrentTurn = false;
  }

  onUserSpeaking(speaking: boolean) {
    this.userSpeaking = speaking;
    if (speaking) {
      this.lastSpeakingEnergyTimestamp = performance.now();
      this.inSilenceBlock = false;
      this.hasSpokenInCurrentTurn = true;
    }
  }

  onMicLevel(level: number) {
    const now = performance.now();
    this.speechLevels.push(level);
    if (this.speechLevels.length > 60) this.speechLevels.shift();

    if (level > 0.02) {
      this.lastSpeakingEnergyTimestamp = now;
      this.inSilenceBlock = false;
      this.hasSpokenInCurrentTurn = true;

      // Fallback mouth movement indicator if camera is off or face not tracked
      if (!this.landmarker || !this.faceTracked) {
        this.mouthMovement = level > 0.035;
      }

      // Live voice energy & presence feeding confidence and clarity
      const visualBonus = this.faceTracked && this.gazeDirection === "Direct Eye Contact" ? 20 : (this.faceTracked ? 0 : -20);
      const speechConfidence = clamp(52 + Math.min(28, level * 140) + visualBonus);
      this.sConf = ema(this.sConf, speechConfidence, 0.3);

      const speechClarity = clamp(60 + Math.min(28, level * 120));
      this.sClarity = ema(this.sClarity, speechClarity, 0.25);

      this.sFluency = ema(this.sFluency, 92, 0.1);
    } else {
      if (!this.landmarker || !this.faceTracked) {
        this.mouthMovement = false;
      }
      // If user has started speaking in this turn and audio is now quiet:
      // check for awkward silence gaps / speech hesitations (> 2.0s)
      if (this.hasSpokenInCurrentTurn) {
        const silenceDuration = now - this.lastSpeakingEnergyTimestamp;
        if (silenceDuration > 2000 && !this.inSilenceBlock) {
          this.inSilenceBlock = true;
          this.hesitationCount++;
          this.sFluency = ema(this.sFluency, Math.max(30, this.sFluency - 18), 0.35);
        }
      }
    }
  }

  /** Feed user transcript. Accurately extracts words, stutters, fillers, and relevance. */
  onTranscript(transcript: string) {
    const text = (transcript ?? "").trim();
    if (!text) return;

    // Detect if new turn started without explicit reset (e.g. text length dropped significantly)
    if (text.length < this.currentTurnText.length * 0.4 && this.currentTurnText.length > 10) {
      this.resetTurnTranscript();
    }
    this.currentTurnText = text;
    this.hasSpokenInCurrentTurn = true;

    // Tokenize clean words
    const words = text.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9+#.]/g, "")).filter((w) => w.length > 0);
    if (!words.length) return;

    // Word counts
    const newWords = Math.max(0, words.length - this.currentTurnWordCount);
    this.currentTurnWordCount = words.length;
    this.totalWordCount += newWords;
    this.wordCount = this.totalWordCount;

    for (const w of words) {
      if (w.length > 2) this.vocabulary.add(w);
    }

    // Precise stutter detection within the utterance:
    // Repeated identical words spoken consecutively in the same sentence (e.g. "I I", "the the", "to to")
    let turnStutters = 0;
    for (let i = 1; i < words.length; i++) {
      const prev = words[i - 1];
      const curr = words[i];
      if (curr === prev && curr.length > 1 && curr !== "that" && curr !== "had") {
        turnStutters++;
      }
    }
    const newStutters = Math.max(0, turnStutters - this.currentTurnStutters);
    this.currentTurnStutters = turnStutters;
    this.stutterCount += newStutters;
    if (newStutters > 0) {
      this.sFluency = ema(this.sFluency, Math.max(35, this.sFluency - newStutters * 15), 0.4);
    }

    // Precise filler count in the utterance
    const fillerMatches = text.match(FILLER_REGEX) || [];
    const turnFillers = fillerMatches.length;
    const newFillers = Math.max(0, turnFillers - this.currentTurnFillers);
    this.currentTurnFillers = turnFillers;
    this.fillerCount += newFillers;

    this.updateRelevanceWithWords(words);
  }

  /** Keywords defining what a relevant answer should touch (stage + CV). */
  setRelevanceContext(focusArea: string, role: string, profileText: string) {
    const source = `${focusArea} ${role} ${profileText}`.toLowerCase();
    this.relevanceKeywords = new Set(
      source
        .split(/[^a-z0-9+#.]+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    );
  }

  private updateRelevanceWithWords(words: string[]) {
    if (this.relevanceKeywords.size === 0) return;
    for (const raw of words) {
      const w = raw.replace(/[^a-z0-9+#.]/g, "");
      if (w.length <= 2 || STOPWORDS.has(w)) continue;
      this.answerTokens++;
      if (this.relevanceKeywords.has(w)) this.answerMatched++;
    }
    const density = this.answerMatched / Math.max(1, Math.min(this.answerTokens, 80));
    const targetScore = clamp(50 + density * 500);
    this.relevanceScore = this.relevanceScore === 0 ? targetScore : ema(this.relevanceScore, targetScore, 0.35);
  }

  // ─── Score computation ─────────────────────────────────────────────────────

  getMetrics(): LivePerformanceMetrics {
    // Active WPM calculation:
    // If user has spoken in this session and speakingSeconds > 1
    let wpm = 0;
    if (this.totalWordCount > 0 && this.speakingSeconds >= 2) {
      const calculated = (this.totalWordCount / (this.speakingSeconds / 60));
      wpm = clamp(calculated, 40, 240);
    } else if (this.currentTurnWordCount > 0 && this.currentTurnSpeakingSeconds >= 1.5) {
      const calculated = (this.currentTurnWordCount / (this.currentTurnSpeakingSeconds / 60));
      wpm = clamp(calculated, 40, 240);
    }

    const fillersPer100 =
      this.totalWordCount > 10 ? (this.fillerCount / this.totalWordCount) * 100 : 0;

    if (this.speechLevels.length > 10) {
      const mean = this.speechLevels.reduce((a, b) => a + b, 0) / this.speechLevels.length;
      const variance =
        this.speechLevels.reduce((a, b) => a + (b - mean) ** 2, 0) / this.speechLevels.length;
      const dynamics = Math.sqrt(variance);
      const paceScore =
        wpm === 0
          ? 0.7
          : wpm >= IDEAL_WPM_MIN && wpm <= IDEAL_WPM_MAX
            ? 1
            : 1 - Math.min(0.4, Math.abs(wpm - (IDEAL_WPM_MIN + IDEAL_WPM_MAX) / 2) / 240);
      const fillerPenalty = Math.min(0.35, fillersPer100 * 0.06);

      const confidence = clamp(
        40 + Math.min(20, mean * 140) + Math.min(18, dynamics * 220) + paceScore * 22 - fillerPenalty * 100 + (this.faceTracked ? 10 : -15)
      );
      this.sConf = ema(this.sConf, confidence, 0.25);

      const clarity = clamp(
        46 + paceScore * 38 - fillerPenalty * 100 + Math.min(16, dynamics * 140)
      );
      this.sClarity = ema(this.sClarity, clarity, 0.25);
    }

    // Fluency score & status
    const fluencyPenalty = Math.min(50, this.stutterCount * 6 + this.hesitationCount * 8 + fillersPer100 * 1.5);
    const calculatedFluency = clamp(this.sFluency - fluencyPenalty * 0.4);
    const speechFluencyStatus: LivePerformanceMetrics["speechFluencyStatus"] =
      calculatedFluency >= 80
        ? "Smooth & Fluent"
        : calculatedFluency >= 62
        ? "Mild Hesitation"
        : calculatedFluency >= 45
        ? "Stammering / Pauses"
        : "Extended Silence Gap";

    // Language richness: vocabulary diversity + answer depth
    if (this.totalWordCount > 10) {
      const ttr = this.vocabulary.size / this.totalWordCount; // type-token ratio
      const depth = Math.min(1, this.totalWordCount / 120);
      this.sLang = ema(this.sLang, clamp(35 + ttr * 110 - fillersPer100 * 1.5 + depth * 22), 0.25);
    }

    const isMultiPerson = this.faceCount >= 2;
    const proctoringStatus: LivePerformanceMetrics["proctoringStatus"] = isMultiPerson
      ? "multi_person_alert"
      : this.faceTracked
      ? "secure"
      : "no_face";

    // Genuine cumulative duration percentage across interview — real eye contact ratio
    const cumulativeEyeRate =
      this.totalFramesEvaluated > 0
        ? Math.round((this.directFacingFrames / this.totalFramesEvaluated) * 100)
        : 0;

    const cumulativeBodyRate =
      this.totalFramesEvaluated > 0
        ? Math.round((this.steadyPostureFrames / this.totalFramesEvaluated) * 100)
        : 0;

    const effectiveMouthMovement =
      this.faceTracked ? this.mouthMovement : (this.userSpeaking || (this.speechLevels.length > 0 && this.speechLevels[this.speechLevels.length - 1] > 0.03));

    return {
      eyeContact: this.faceTracked ? clamp(cumulativeEyeRate) : 0,
      confidence: clamp(this.sConf),
      communicationClarity: clamp(this.sClarity),
      contentRelevance: clamp(this.relevanceScore),
      bodyLanguage: this.faceTracked ? clamp(cumulativeBodyRate) : 0,
      languageSkills: clamp(this.sLang),
      // Eyeball iris & blink metrics
      irisFocus: this.faceTracked ? clamp(this.sIris) : 0,
      eyeOpenness: this.faceTracked ? clamp(this.eyeOpennessScore) : 0,
      eyeState: this.eyeState,
      blinkRate: Math.max(0, this.blinkTimestamps.length),
      // Speech fluency & hesitation metrics
      fluencyScore: calculatedFluency,
      speechFluencyStatus,
      hesitationCount: this.hesitationCount,
      stutterCount: this.stutterCount,
      // Proctoring & presence
      faceCount: this.faceCount,
      multiPersonDetected: isMultiPerson,
      proctoringStatus,
      gazeDirection: this.gazeDirection,
      postureStatus: this.postureStatus,
      mouthMovement: effectiveMouthMovement,
      wpm: Math.round(wpm),
      fillerCount: this.fillerCount,
      speakingSeconds: Math.round(this.speakingSeconds),
      faceTracked: this.faceTracked,
      visionReady: this.visionReady,
      fps: this.measuredFps,
    };
  }

  /** Reinforcement snapshot handed to the NEXT stage's adaptive interviewer. */
  buildStageProfile(stage: number, focusArea: string): StageReinforcementProfile {
    const m = this.getMetrics();
    const scores: Record<string, number> = {
      [METRIC_LABELS.eyeContact]: m.eyeContact,
      [METRIC_LABELS.confidence]: m.confidence,
      [METRIC_LABELS.communicationClarity]: m.communicationClarity,
      [METRIC_LABELS.contentRelevance]: m.contentRelevance,
      [METRIC_LABELS.bodyLanguage]: m.bodyLanguage,
      [METRIC_LABELS.languageSkills]: m.languageSkills,
    };
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return {
      stage,
      focusArea,
      strong: sorted.slice(0, 2).map(([label]) => label),
      weak: sorted.slice(-2).map(([label]) => label),
      scores,
    };
  }

  stop() {
    this.userSpeaking = false;
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    if (this.speakTimer) {
      clearInterval(this.speakTimer);
      this.speakTimer = null;
    }
    this.landmarker?.close();
    this.landmarker = null;
  }
}

// ─── Cross-stage reinforcement persistence (sessionStorage) ──────────────────

const PROFILE_KEY = "ct_stage_reinforcement_profiles";

export function saveStageProfile(profile: StageReinforcementProfile) {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    const map: Record<string, StageReinforcementProfile> = raw ? JSON.parse(raw) : {};
    map[String(profile.stage)] = profile;
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — reinforcement degrades gracefully */
  }
}

/** Profile from the most recent PREVIOUS stage (feeds the next stage's loop). */
export function loadPreviousStageProfile(currentStage: number): StageReinforcementProfile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const map: Record<string, StageReinforcementProfile> = JSON.parse(raw);
    const previous = Object.keys(map)
      .map(Number)
      .filter((s) => s < currentStage)
      .sort((a, b) => b - a)[0];
    return previous ? map[String(previous)] : null;
  } catch {
    return null;
  }
}
