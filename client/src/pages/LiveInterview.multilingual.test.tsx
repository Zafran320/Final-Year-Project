import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LANGUAGES,
  buildLiveSystemInstruction,
  cleanAiSpeechText,
  detectStageWrapUpChoice,
  isConversationalOrProctoringReply,
  VOICE_AUTO_ADVANCE_SILENCE_MS,
  MIN_WORDS_FOR_AUTO_ADVANCE,
  parseCandidateProjects,
} from "./LiveInterview";
import { detectPakistaniLanguage } from "@/lib/languageDetector";
import { CandidateMetricsEngine } from "@/lib/candidateMetrics";

describe("LiveInterview Pakistan-First Multilingual & Auto-Detect Architecture", () => {
  it("provides comprehensive coverage for Pakistani regional languages and Roman Urdu", () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain("ur-Roman"); // Roman Urdu
    expect(codes).toContain("ps-PK");    // Pashto
    expect(codes).toContain("pa-PK");    // Punjabi
    expect(codes).toContain("sd-PK");    // Sindhi
    expect(codes).toContain("bal-PK");   // Balochi
    expect(codes).toContain("skr-PK");   // Saraiki
    expect(codes).toContain("ur-PK");    // Urdu Script
    expect(codes).toContain("en-US");    // English
  });

  it("maintains a clean LTR English UI layout and screen context across all voice modes", () => {
    SUPPORTED_LANGUAGES.forEach((lang) => {
      expect(lang.dir).toBe("ltr");
      expect(lang.labels.aiInterview).toBe("AI INTERVIEW");
      expect(lang.labels.live).toBe("LIVE");
      expect(lang.labels.endInterview).toBe("End Interview");
      expect(lang.tips[0]).toContain("Speak clearly");

      // Fixed question banks are gone — every language config now relies on
      // the real-time adaptive engine (no scripted getQuestions/getSpokenQuestion).
      expect((lang as any).getQuestions).toBeUndefined();
      expect((lang as any).getSpokenQuestion).toBeUndefined();
    });
  });

  it("builds a real-time adaptive question engine instruction with no fixed question script", () => {
    const instruction = buildLiveSystemInstruction(
      "Flutter Developer",
      "Systems Limited",
      {
        levelNumber: 4,
        title: "Level 4: Practical Problem Solving",
        focusArea: "Applied architecture, debugging, and edge cases",
        difficulty: "Intermediate",
        instructions: "Evaluate scenario-based reasoning.",
        targetQuestions: 4,
        targetMinutes: 8,
      },
      "Ahmed",
      "- Skills: Flutter, Dart"
    );

    // Adaptive reinforcement loop is embedded in the live interviewer persona
    expect(instruction).toContain("Real-Time Adaptive Question Engine");
    expect(instruction).toContain("local heuristic grade supplied by the app is only a rough hint");
    expect(instruction).toContain("ask one focused follow-up");
    expect(instruction).toContain("give the candidate a fair chance to try again");
    expect(instruction).toContain("avoid repeating earlier questions");
    expect(instruction).toContain("When the candidate asks you a relevant question, answer it briefly and honestly");

    // Stage goal (real-interview pacing) keeps the 10-stage progression meaningful
    expect(instruction).toContain("GOAL");
    expect(instruction).toContain("about 4 exchanges");
    expect(instruction).toContain("≈ 8 minutes");

    // Stage context is passed through, 10-stage structure preserved
    expect(instruction).toContain("4 of 10");
    expect(instruction).toContain("Applied architecture, debugging, and edge cases");

    // No scripted question list remains
    expect(instruction).not.toContain("ask strictly in this order");
    expect(instruction).not.toContain("Can you tell me about your experience with");
  });

  it("injects cross-stage reinforcement from the previous stage's measured profile", () => {
    const instruction = buildLiveSystemInstruction(
      "Flutter Developer",
      "Systems Limited",
      {
        levelNumber: 5,
        title: "Level 5: Deep Systems Knowledge",
        focusArea: "Performance and rendering internals",
        difficulty: "Intermediate",
        instructions: "Evaluate depth of platform knowledge.",
        targetQuestions: 5,
        targetMinutes: 9,
      },
      "Ahmed",
      "- Skills: Flutter, Dart",
      {
        stage: 4,
        focusArea: "Applied architecture, debugging, and edge cases",
        strong: ["Content & Relevance", "Language Skills"],
        weak: ["Confidence", "Eye Contact"],
        scores: {
          "Eye Contact": 62,
          Confidence: 58,
          "Communication Clarity": 71,
          "Content & Relevance": 84,
          "Body Language": 69,
          "Language Skills": 80,
        },
      }
    );

    // The last stage's measured weaknesses steer the next stage's questions
    expect(instruction).toContain("Cross-Stage Reinforcement");
    expect(instruction).toContain("Stage 4");
    expect(instruction).toContain("Confidence, Eye Contact");
    expect(instruction).toContain("reinforce them");
    // Strong areas are pushed deeper instead of re-tested
    expect(instruction).toContain("Content & Relevance, Language Skills");
    expect(instruction).toContain("Do not re-test these basics");
    // Full measured profile travels with the reinforcement
    expect(instruction).toContain("Eye Contact 62/100");
  });

  describe("Real-Time ML Performance Analytics Engine", () => {
    function createMockFace(opts?: {
      noseX?: number;
      noseY?: number;
      leftEyeX?: number;
      rightEyeX?: number;
      leftEyeTopY?: number;
      leftEyeBottomY?: number;
      rightEyeTopY?: number;
      rightEyeBottomY?: number;
      leftIrisX?: number;
      rightIrisX?: number;
    }) {
      const lm = new Array(500).fill(null).map(() => ({ x: 0.5, y: 0.5 }));
      lm[1] = { x: opts?.noseX ?? 0.5, y: opts?.noseY ?? 0.44 }; // nose tip
      lm[33] = { x: opts?.leftEyeX ?? 0.42, y: 0.4 }; // left eye outer
      lm[133] = { x: 0.48, y: 0.4 }; // left eye inner
      lm[159] = { x: 0.45, y: opts?.leftEyeTopY ?? 0.38 }; // left eye top
      lm[145] = { x: 0.45, y: opts?.leftEyeBottomY ?? 0.42 }; // left eye bottom
      lm[468] = { x: opts?.leftIrisX ?? 0.45, y: 0.4 }; // left iris center

      lm[263] = { x: opts?.rightEyeX ?? 0.58, y: 0.4 }; // right eye outer
      lm[362] = { x: 0.52, y: 0.4 }; // right eye inner
      lm[386] = { x: 0.55, y: opts?.rightEyeTopY ?? 0.38 }; // right eye top
      lm[374] = { x: 0.55, y: opts?.rightEyeBottomY ?? 0.42 }; // right eye bottom
      lm[473] = { x: opts?.rightIrisX ?? 0.55, y: 0.4 }; // right iris center

      lm[13] = { x: 0.5, y: 0.55 }; // top lip
      lm[14] = { x: 0.5, y: 0.58 }; // bottom lip
      return lm;
    }

    it("measures voice-based metrics live from transcript and mic signals", () => {
      const engine = new CandidateMetricsEngine();
      engine.setRelevanceContext(
        "state management and redux architecture",
        "React Developer",
        "Skills: React, Redux, state management"
      );
      engine.onUserSpeaking(true);
      engine.onTranscript("I used redux for state management in react and it handled the architecture well");
      // Feed realistic mic energy while speaking
      for (let i = 0; i < 60; i++) engine.onMicLevel(0.2 + (i % 5) * 0.04);

      const m = engine.getMetrics();
      // All headline scores stay bounded 0..100
      for (const value of [
        m.eyeContact,
        m.confidence,
        m.communicationClarity,
        m.contentRelevance,
        m.bodyLanguage,
        m.languageSkills,
        m.fluencyScore,
      ]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
      // Answer vocabulary matched the stage focus → relevance is healthy
      expect(m.contentRelevance).toBeGreaterThan(60);
      engine.destroy();
    });

    it("tracks single candidate face with direct eye contact, iris focus, and centered posture", () => {
      const engine = new CandidateMetricsEngine();
      const face = createMockFace({ noseX: 0.5, noseY: 0.44 });
      for (let i = 0; i < 20; i++) {
        engine.processFace({ faceLandmarks: [face] });
      }

      const m = engine.getMetrics();
      expect(m.faceCount).toBe(1);
      expect(m.faceTracked).toBe(true);
      expect(m.multiPersonDetected).toBe(false);
      expect(m.proctoringStatus).toBe("secure");
      expect(m.gazeDirection).toBe("Direct Eye Contact");
      expect(m.postureStatus).toBe("Centered & Steady");
      expect(m.irisFocus).toBeGreaterThan(80);
      expect(m.eyeState).toBe("Eyes Open & Focused");
      expect(m.eyeOpenness).toBeGreaterThan(50);
      engine.destroy();
    });

    it("accurately detects looking left and looking right gaze offsets", () => {
      const engine = new CandidateMetricsEngine();
      // Looking left: nose shifted significantly left of eye center
      const lookingLeftFace = createMockFace({ noseX: 0.45, leftEyeX: 0.48, rightEyeX: 0.58 });
      engine.processFace({ faceLandmarks: [lookingLeftFace] });
      expect(engine.getMetrics().gazeDirection).toBe("Looking Left");

      // Looking right: nose shifted significantly right
      const lookingRightFace = createMockFace({ noseX: 0.58, leftEyeX: 0.42, rightEyeX: 0.52 });
      engine.processFace({ faceLandmarks: [lookingRightFace] });
      expect(engine.getMetrics().gazeDirection).toBe("Looking Right");
      engine.destroy();
    });

    it("detects closed eyes and eye openness drops when candidate blinks or shuts eyes", () => {
      const engine = new CandidateMetricsEngine();
      // Eyes closed: top and bottom eyelids touching
      const closedEyesFace = createMockFace({
        leftEyeTopY: 0.4,
        leftEyeBottomY: 0.402,
        rightEyeTopY: 0.4,
        rightEyeBottomY: 0.402,
      });

      for (let i = 0; i < 5; i++) {
        engine.processFace({ faceLandmarks: [closedEyesFace] });
      }
      const m = engine.getMetrics();
      expect(m.eyeState).toBe("Eyes Closed");
      expect(m.eyeOpenness).toBeLessThan(35);
      engine.destroy();
    });

    it("accurately tracks speech hesitation, stutters, and fluency scoring", () => {
      const engine = new CandidateMetricsEngine();
      engine.onUserSpeaking(true);
      // Candidate stammers on words
      engine.onTranscript("I I I used kubernetes and and it worked");

      const m = engine.getMetrics();
      expect(m.stutterCount).toBeGreaterThan(0);
      expect(m.fluencyScore).toBeLessThanOrEqual(95);
      engine.destroy();
    });

    it("triggers onIntegrityViolation callback and flags multi_person_alert when 2+ individuals appear in camera frame", () => {
      const engine = new CandidateMetricsEngine();
      let violationCaught: any = null;
      engine.setOnIntegrityViolation((reason: string, count: number) => {
        violationCaught = { reason, faceCount: count };
      });

      const face1 = createMockFace({ noseX: 0.35 });
      const face2 = createMockFace({ noseX: 0.65 });

      // Frame 1: 2 faces detected
      engine.processFace({ faceLandmarks: [face1, face2] });
      expect(engine.getMetrics().faceCount).toBe(2);
      expect(engine.getMetrics().multiPersonDetected).toBe(true);
      expect(engine.getMetrics().proctoringStatus).toBe("multi_person_alert");

      // Frame 2 and 3: consecutive multi-person confirmation
      engine.processFace({ faceLandmarks: [face1, face2] });
      engine.processFace({ faceLandmarks: [face1, face2] });

      // Integrity violation callback must have fired with face count
      expect(violationCaught).not.toBeNull();
      expect((violationCaught as any)?.faceCount).toBe(2);
      expect((violationCaught as any)?.reason).toContain("Multiple individuals");

      engine.destroy();
    });

    it("enforces immediate zero-delay detection for multiple persons and terminates for cheating on 3rd warning", () => {
      // Simulation of LiveInterview's proctoring strike manager
      let strikes = 0;
      let terminatedForCheating = false;
      let terminationReason = "";
      const warningsIssued: string[] = [];

      const onDetectedMultiPerson = (faceCount: number) => {
        strikes += 1;
        if (strikes === 1) {
          warningsIssued.push(`Warning 1/3: Multiple persons detected (${faceCount} faces)!`);
        } else if (strikes === 2) {
          warningsIssued.push(`Final Warning 2/3: Another person still detected!`);
        } else {
          terminatedForCheating = true;
          terminationReason = "Cheating detected: Multiple individuals in camera frame (3 warnings exceeded)";
        }
      };

      const engine = new CandidateMetricsEngine();
      const face1 = createMockFace({ noseX: 0.35 });
      const face2 = createMockFace({ noseX: 0.65 });

      // Frame 1: Instant detection of 2 faces with ZERO delay (no 3-5s threshold)
      engine.processFace({ faceLandmarks: [face1, face2] });
      expect(engine.getMetrics().faceCount).toBe(2);
      expect(engine.getMetrics().multiPersonDetected).toBe(true);

      // Strike 1: Agent immediately warns the candidate
      onDetectedMultiPerson(engine.getMetrics().faceCount);
      expect(strikes).toBe(1);
      expect(warningsIssued[0]).toContain("Warning 1/3");
      expect(terminatedForCheating).toBe(false);

      // Strike 2: 2nd detection provides final warning
      onDetectedMultiPerson(engine.getMetrics().faceCount);
      expect(strikes).toBe(2);
      expect(warningsIssued[1]).toContain("Final Warning 2/3");
      expect(terminatedForCheating).toBe(false);

      // Strike 3: 3rd detection triggers immediate cheating cancellation & termination!
      onDetectedMultiPerson(engine.getMetrics().faceCount);
      expect(strikes).toBe(3);
      expect(terminatedForCheating).toBe(true);
      expect(terminationReason).toContain("Cheating detected");

      engine.destroy();
    });

    it("drops eye contact and body language immediately when face/eyes are covered or hidden", () => {
      const engine = new CandidateMetricsEngine();
      const face = createMockFace({ noseX: 0.5, noseY: 0.44 });
      for (let i = 0; i < 15; i++) {
        engine.processFace({ faceLandmarks: [face] });
      }
      expect(engine.getMetrics().eyeContact).toBeGreaterThan(80);

      // Candidate covers eyes / face with hand (0 faces detected)
      engine.processFace({ faceLandmarks: [] });
      const hiddenMetrics = engine.getMetrics();
      expect(hiddenMetrics.faceCount).toBe(0);
      expect(hiddenMetrics.faceTracked).toBe(false);
      expect(hiddenMetrics.proctoringStatus).toBe("no_face");
      expect(hiddenMetrics.eyeContact).toBeLessThanOrEqual(5);
      expect(hiddenMetrics.bodyLanguage).toBeLessThanOrEqual(15);
      engine.destroy();
    });

    it("builds a reinforcement profile with strongest and weakest areas for the next stage", () => {
      const engine = new CandidateMetricsEngine();
      const profile = engine.buildStageProfile(3, "Core fundamentals");
      expect(profile.stage).toBe(3);
      expect(profile.focusArea).toBe("Core fundamentals");
      expect(profile.strong).toHaveLength(2);
      expect(profile.weak).toHaveLength(2);
      expect(Object.keys(profile.scores)).toHaveLength(6);
      engine.destroy();
    });
  });

  describe("Real-Time Auto-Language Detection Engine", () => {
    it("accurately detects Roman Urdu from conversational candidate responses", () => {
      const result1 = detectPakistaniLanguage("Maine React aur Node.js pe kaam kiya tha aur state management ke liye Zustand use kiya tha");
      expect(result1.languageCode).toBe("ur-Roman");
      expect(result1.confidence).toBeGreaterThan(0.6);

      const result2 = detectPakistaniLanguage("Production me ek critical bug aaya tha jise maine debug kiya aur fix kar diya");
      expect(result2.languageCode).toBe("ur-Roman");
    });

    it("keeps technical English code-switching in a Roman Urdu answer classified as Urdu", () => {
      const result = detectPakistaniLanguage(
        "Maine improve kiya caching strategy because database latency high thi"
      );
      expect(result.languageCode).toBe("ur-Roman");
    });

    it("accurately detects Pashto from candidate responses", () => {
      const result = detectPakistaniLanguage("زه په خپلو پروژو کې د سافټویر انجینر په توګه کار کوم او ډیر ښه تجربه لرم");
      expect(result.languageCode).toBe("ps-PK");
    });

    it("accurately detects Sindhi from candidate responses", () => {
      const result = detectPakistaniLanguage("مان سافٽ ويئر انجنيئر آهيان ۽ مان ڊيٽابيس مئنيجمينٽ تي ڪم ڪيو آهي");
      expect(result.languageCode).toBe("sd-PK");
    });

    it("accurately detects Punjabi Shahmukhi from candidate responses", () => {
      const result = detectPakistaniLanguage("تہاڈا سوال بہت چنگا اے میں پچھلی کمپنی وچ بیک اینڈ تے کم کیتا سی");
      expect(result.languageCode).toBe("pa-PK");
    });

    it("accurately detects English responses", () => {
      const result = detectPakistaniLanguage("I have led the architecture of scalable microservices reducing API latency by 45 percent");
      expect(result.languageCode).toBe("en-US");
    });
  });

  it("contains complete UI labels and microcopy for every voice configuration", () => {
    SUPPORTED_LANGUAGES.forEach((lang) => {
      expect(lang.labels.aiInterview).toBeTruthy();
      expect(lang.labels.live).toBeTruthy();
      expect(lang.labels.endInterview).toBeTruthy();
      expect(lang.labels.speakNow).toBeTruthy();
      expect(lang.labels.listening).toBeTruthy();
      expect(lang.labels.typeOrSpeakPlaceholder).toBeTruthy();
      expect(lang.tips.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Automated Voice Answer Completion & Progression", () => {
    it("configures tuned silence window and word threshold for non-intrusive voice auto-advance", () => {
      // Allow a real thinking pause before the voice turn is considered complete.
      expect(VOICE_AUTO_ADVANCE_SILENCE_MS).toBeGreaterThanOrEqual(2200);
      expect(VOICE_AUTO_ADVANCE_SILENCE_MS).toBeLessThanOrEqual(2500);

      // Minimum word count threshold must be at least 3 words to prevent noise/coughs from advancing
      expect(MIN_WORDS_FOR_AUTO_ADVANCE).toBe(3);
    });

    it("understands spoken choices at the stage wrap-up", () => {
      expect(detectStageWrapUpChoice("I'd like to keep practicing")).toBe("continue");
      expect(detectStageWrapUpChoice("Aur sawal poochain")).toBe("continue");
      expect(detectStageWrapUpChoice("Please show my scorecard")).toBe("finish");
      expect(detectStageWrapUpChoice("Ji theek hai, end karte hain")).toBe("finish");
      expect(detectStageWrapUpChoice("Okay, let's end here")).toBe("finish");
      expect(detectStageWrapUpChoice("Please open the scoreboard")).toBe("finish");
      expect(detectStageWrapUpChoice("Bas itna, stage khatam")).toBe("finish");
      expect(detectStageWrapUpChoice("I don't want to end yet")).toBeNull();
      expect(detectStageWrapUpChoice("End abhi nahi karna")).toBeNull();
      expect(detectStageWrapUpChoice("Let me think about it")).toBeNull();
    });

    it("filters out small-talk greetings, pleasantries, and proctoring acknowledgements from advancing technical questions", () => {
      // Common greetings and casual acknowledgements must be recognized as non-technical
      expect(isConversationalOrProctoringReply("Alhamdulillah theek hoon")).toBe(true);
      expect(isConversationalOrProctoringReply("haan theek hai")).toBe(true);
      expect(isConversationalOrProctoringReply("Haan")).toBe(true);
      expect(isConversationalOrProctoringReply("Ji sir")).toBe(true);
      expect(isConversationalOrProctoringReply("Shukriya")).toBe(true);
      expect(isConversationalOrProctoringReply("All good thank you")).toBe(true);
      expect(isConversationalOrProctoringReply("I am good")).toBe(true);
      expect(isConversationalOrProctoringReply("Yes I am ready")).toBe(true);

      // Proctoring cues and repeat requests must NOT count as technical answers
      expect(isConversationalOrProctoringReply("Camera dekh raha hoon")).toBe(true);
      expect(isConversationalOrProctoringReply("Awaaz aa rahi hai")).toBe(true);
      expect(isConversationalOrProctoringReply("Sawal dobara bol dein")).toBe(true);
      expect(isConversationalOrProctoringReply("Please repeat the question")).toBe(true);

      // Substantive technical answers must NOT be filtered out
      expect(
        isConversationalOrProctoringReply(
          "State management in Flutter is handled via Bloc or Provider with reactive streams"
        )
      ).toBe(false);
      expect(
        isConversationalOrProctoringReply(
          "Main database indexing aur query optimization use karta hoon high concurrency handle karne ke liye"
        )
      ).toBe(false);
    });

    it("cleans [SYSTEM] reflections, question numbers, and stage tags from AI subtitle speech", () => {
      expect(cleanAiSpeechText("[SYSTEM] Interview begins now. As-salamu alaykum!")).toBe(
        "As-salamu alaykum!"
      );
      expect(
        cleanAiSpeechText("[Q1] What is the difference between StatefulWidget and StatelessWidget?")
      ).toBe("What is the difference between StatefulWidget and StatelessWidget?");
      expect(
        cleanAiSpeechText("[STAGE_Q2] How do you handle database connection pooling in Node.js?")
      ).toBe("How do you handle database connection pooling in Node.js?");
      expect(
        cleanAiSpeechText("[CONCLUSION] You did an incredible job covering system design today!")
      ).toBe("You did an incredible job covering system design today!");
    });

    it("enforces multi-phase structure with icebreaker and question tagging in system instructions", () => {
      const instruction = buildLiveSystemInstruction(
        "Backend Engineer",
        "Careem",
        {
          levelNumber: 1,
          title: "Level 1: Icebreaker & Core Fundamentals",
          focusArea: "System architecture and data flow",
          difficulty: "Easy",
          instructions: "Assess fundamental architecture skills",
          targetQuestions: 5,
          targetMinutes: 8,
        },
        "Hamza",
        "- Skills: Go, PostgreSQL, Kafka"
      );

      // System instruction mandates Phase 1 icebreaker without [Q1]
      expect(instruction).toContain("Phase 1 (Warm Opening & Icebreaker — DO NOT use [Q1]");
      // Phase 2 requires explicit [Q1] tag on the first real technical question
      expect(instruction).toContain("Phase 2 (Technical Stage Questions — Tag each question with [Q1], [Q2], etc.)");
      // Instructs model that casual pleasantries & proctoring cues are NOT technical answers
      expect(instruction).toContain("Conversational pleasantries");
      expect(instruction).toContain("are NOT technical answers");
      // Phase 3 wrap-up tag
      expect(instruction).toContain("Phase 3 (Stage Conclusion)");
      expect(instruction).toContain("[CONCLUSION]");
    });

    it("parses candidate projects from JSON array and string inputs", () => {
      // JSON array of project objects
      const projectArray = [
        {
          name: "CareerTwin AI",
          link: "https://careertwin.ai",
          summary: "Real-time AI voice interview platform",
          technologies: ["React", "TypeScript", "Node.js", "WebAudio"],
        },
      ];
      const parsedFromArray = parseCandidateProjects(projectArray);
      expect(parsedFromArray).toHaveLength(1);
      expect(parsedFromArray[0].name).toBe("CareerTwin AI");
      expect(parsedFromArray[0].link).toBe("https://careertwin.ai");
      expect(parsedFromArray[0].technologies).toContain("WebAudio");

      // JSON string
      const jsonString = JSON.stringify(projectArray);
      const parsedFromJson = parseCandidateProjects(jsonString);
      expect(parsedFromJson).toHaveLength(1);
      expect(parsedFromJson[0].name).toBe("CareerTwin AI");

      // Plain text with URLs
      const textProjects = "E-Commerce App https://github.com/example/shop; Chatbot https://github.com/example/bot";
      const parsedFromText = parseCandidateProjects(textProjects);
      expect(parsedFromText).toHaveLength(2);
      expect(parsedFromText[0].link).toBe("https://github.com/example/shop");
      expect(parsedFromText[1].link).toBe("https://github.com/example/bot");
    });

    it("uses natural single-question pacing and evidence-grounded project follow-ups", () => {
      const instruction = buildLiveSystemInstruction(
        "Full Stack Developer",
        "Arbisoft",
        {
          levelNumber: 2,
          title: "Level 2: Core Engineering",
          focusArea: "API Design and Architecture",
          difficulty: "Easy",
          instructions: "Test core API design",
          targetQuestions: 5,
          targetMinutes: 8,
        },
        "Mirza",
        `- Name: Mirza
- Portfolio / Code Link: https://github.com/example
- Verified Live Projects & Repositories (Ask about their architecture, tech choices, scale/failure edge cases, and retrospectives):
  * 1. "CareerTwin AI" | Live Link / Repo: https://careertwin.ai | Tech Stack: React, Node.js, WebAudio | Overview: Real-time voice interview platform`
      );

      // Human turn pacing without an artificial response word budget
      expect(instruction).toContain("Speech Pacing & Turn Taking");
      expect(instruction).toContain("one clear primary question at a time");
      expect(instruction).toContain("do not force a word count");
      expect(instruction).toContain("Avoid generic praise");
      expect(instruction).toContain("never speak the marker aloud");
      expect(instruction).toContain("Let the candidate finish");

      // Project questions stay grounded without pretending to inspect links.
      expect(instruction).toContain("Project Conversation");
      expect(instruction).toContain("Do not claim you opened or verified a URL");
      expect(instruction).toContain("do not make unsupported claims about the company");
    });
  });
});
