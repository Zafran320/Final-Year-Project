import { describe, it, expect } from "vitest";
import {
  analyzeQuestion,
  classifyCandidateUtterance,
  CandidateReinforcementTracker,
  isAcousticNoiseTranscript,
} from "./questionIntelligence";

describe("Question Intelligence & ML Answer Classification Engine", () => {
  const sampleQuestion = analyzeQuestion(
    "[Q1] How does indexing in PostgreSQL improve query performance, and what are the trade-offs with write operations?",
    "Database Architecture & Query Optimization",
    "Backend Engineer"
  );

  it("extracts key technical entities and concepts from the question and focus area", () => {
    expect(sampleQuestion.extractedKeyConcepts).toContain("indexing");
    expect(sampleQuestion.extractedKeyConcepts).toContain("postgresql");
    expect(sampleQuestion.extractedKeyConcepts).toContain("performance");
    expect(sampleQuestion.extractedKeyConcepts).toContain("optimization");
    expect(sampleQuestion.extractedKeyConcepts).not.toContain("and");
    expect(sampleQuestion.extractedKeyConcepts).not.toContain("the");
  });

  describe("Conversational Pleasantry & Greeting Detection", () => {
    it("classifies Roman Urdu greetings and haal-chaal as conversational non-answers", () => {
      const eval1 = classifyCandidateUtterance("Alhamdulillah theek hoon", sampleQuestion);
      expect(eval1.intent).toBe("CONVERSATIONAL_PLEASANTRY");
      expect(eval1.isSubstantiveAnswer).toBe(false);
      expect(eval1.shouldAutoAdvance).toBe(false);
      expect(eval1.overallGrade).toBe("NON_ANSWER");

      const eval2 = classifyCandidateUtterance("Walaikum assalam main theek hoon aap sunayein", sampleQuestion);
      expect(eval2.intent).toBe("CONVERSATIONAL_PLEASANTRY");
      expect(eval2.shouldAutoAdvance).toBe(false);

      const eval3 = classifyCandidateUtterance("Shukriya", sampleQuestion);
      expect(eval3.intent).toBe("CONVERSATIONAL_PLEASANTRY");
      expect(eval3.shouldAutoAdvance).toBe(false);
    });

    it("classifies Perso-Arabic Urdu greetings as conversational non-answers via auto-Romanization", () => {
      const eval1 = classifyCandidateUtterance("السلام علیکم", sampleQuestion);
      expect(eval1.intent).toBe("CONVERSATIONAL_PLEASANTRY");
      expect(eval1.shouldAutoAdvance).toBe(false);

      const eval2 = classifyCandidateUtterance("وعلیکم السلام میں ٹھیک ہوں", sampleQuestion);
      expect(eval2.intent).toBe("CONVERSATIONAL_PLEASANTRY");
      expect(eval2.shouldAutoAdvance).toBe(false);
    });

    it("classifies Devanagari Hindi greetings as conversational non-answers via auto-Romanization", () => {
      const eval1 = classifyCandidateUtterance("नमस्ते, मैं ठीक हूँ", sampleQuestion);
      expect(eval1.intent).toBe("CONVERSATIONAL_PLEASANTRY");
      expect(eval1.shouldAutoAdvance).toBe(false);

      const eval2 = classifyCandidateUtterance("हाँ ठीक है", sampleQuestion);
      expect(eval2.intent).toBe("CONVERSATIONAL_PLEASANTRY");
      expect(eval2.shouldAutoAdvance).toBe(false);
    });

    it("classifies English greetings and acknowledgements as conversational", () => {
      const eval1 = classifyCandidateUtterance("All good thank you", sampleQuestion);
      expect(eval1.intent).toBe("CONVERSATIONAL_PLEASANTRY");
      expect(eval1.shouldAutoAdvance).toBe(false);

      const eval2 = classifyCandidateUtterance("Yes I am ready", sampleQuestion);
      expect(eval2.intent).toBe("CONVERSATIONAL_PLEASANTRY");
      expect(eval2.shouldAutoAdvance).toBe(false);
    });
  });

  describe("Proctoring & Device Acknowledgement Detection", () => {
    it("recognizes camera, audio, and posture checks without treating them as answers", () => {
      const eval1 = classifyCandidateUtterance("Camera dekh raha hoon", sampleQuestion);
      expect(eval1.intent).toBe("PROCTORING_OR_HARDWARE");
      expect(eval1.isSubstantiveAnswer).toBe(false);
      expect(eval1.shouldAutoAdvance).toBe(false);

      const eval2 = classifyCandidateUtterance("Awaaz aa rahi hai", sampleQuestion);
      expect(eval2.intent).toBe("PROCTORING_OR_HARDWARE");
      expect(eval2.shouldAutoAdvance).toBe(false);

      const eval3 = classifyCandidateUtterance("Can you hear me properly", sampleQuestion);
      expect(eval3.intent).toBe("PROCTORING_OR_HARDWARE");
      expect(eval3.shouldAutoAdvance).toBe(false);
    });
  });

  describe("Clarification, Hint, and Repetition Detection", () => {
    it("identifies requests to repeat the question and triggers repeat directive", () => {
      const evaluation = classifyCandidateUtterance("Sawal dobara bol dein please", sampleQuestion);
      expect(evaluation.intent).toBe("CLARIFICATION_OR_HINT");
      expect(evaluation.isSubstantiveAnswer).toBe(false);
      expect(evaluation.shouldAutoAdvance).toBe(false);
      expect(evaluation.reinforcementAction.type).toBe("REPEAT_CLARIFY");
      expect(evaluation.reinforcementAction.systemDirective).toContain("Candidate requested clarification or a hint");
    });

    it("identifies requests for hints and coaching", () => {
      const evaluation = classifyCandidateUtterance("Can you give me a hint please", sampleQuestion);
      expect(evaluation.intent).toBe("CLARIFICATION_OR_HINT");
      expect(evaluation.isSubstantiveAnswer).toBe(false);
      expect(evaluation.shouldAutoAdvance).toBe(false);
      expect(evaluation.reinforcementAction.uiBadgeText).toContain("Hint");
    });
  });

  describe("Honest Admission of Not Knowing (Learning Opportunity)", () => {
    it("detects when candidate states they don't know and formulates supportive coaching directive", () => {
      const eval1 = classifyCandidateUtterance("Mujhe is ka idea nahi hai", sampleQuestion);
      expect(eval1.intent).toBe("ADMISSION_DONT_KNOW");
      expect(eval1.isSubstantiveAnswer).toBe(false);
      expect(eval1.shouldAutoAdvance).toBe(false);
      expect(eval1.reinforcementAction.type).toBe("SUPPORT_COACH");
      expect(eval1.reinforcementAction.systemDirective).toContain("validate their professional integrity");
      expect(eval1.reinforcementAction.systemDirective).toContain("foundational question");

      const eval2 = classifyCandidateUtterance("I don't know this concept", sampleQuestion);
      expect(eval2.intent).toBe("ADMISSION_DONT_KNOW");
      expect(eval2.shouldAutoAdvance).toBe(false);

      const eval3 = classifyCandidateUtterance("Pata nahi main ne use nahi kiya", sampleQuestion);
      expect(eval3.intent).toBe("ADMISSION_DONT_KNOW");
      expect(eval3.shouldAutoAdvance).toBe(false);
    });

    it("detects Urdu script admissions of not knowing", () => {
      const evaluation = classifyCandidateUtterance("مجھے نہیں پتہ", sampleQuestion);
      expect(evaluation.intent).toBe("ADMISSION_DONT_KNOW");
      expect(evaluation.shouldAutoAdvance).toBe(false);
    });
  });

  describe("Thinking-Aloud and Incomplete Fragments", () => {
    it("prevents premature auto-advance while candidate is thinking out loud", () => {
      const eval1 = classifyCandidateUtterance("Uhhh let me think for a second", sampleQuestion);
      expect(eval1.intent).toBe("THINKING_ALOUD_HESITATION");
      expect(eval1.isSubstantiveAnswer).toBe(false);
      expect(eval1.shouldAutoAdvance).toBe(false);

      const eval2 = classifyCandidateUtterance("Soch raha hoon", sampleQuestion);
      expect(eval2.intent).toBe("THINKING_ALOUD_HESITATION");
      expect(eval2.shouldAutoAdvance).toBe(false);
    });

    it("treats isolated single-word fragments as incomplete", () => {
      const evaluation = classifyCandidateUtterance("Database", sampleQuestion);
      expect(evaluation.intent).toBe("INCOMPLETE_FRAGMENT");
      expect(evaluation.isSubstantiveAnswer).toBe(false);
      expect(evaluation.shouldAutoAdvance).toBe(false);
    });
  });

  describe("Technical Answer Evaluation & ML Scoring", () => {
    it("accurately evaluates a strong substantive technical answer with edge cases", () => {
      const candidateSpeech =
        "In PostgreSQL, indexing with B-Trees significantly accelerates read query performance because the database can do an index scan instead of a full table scan. However, the trade-off is that write operations like insert and update become slower because the index tree must be recalculated and rebalanced on disk. To handle concurrency and avoid table lock bottlenecks, we create indexes concurrently in production.";

      const evaluation = classifyCandidateUtterance(candidateSpeech, sampleQuestion);
      expect(evaluation.intent).toBe("TECHNICAL_ANSWER");
      expect(evaluation.isSubstantiveAnswer).toBe(true);
      expect(evaluation.shouldAutoAdvance).toBe(true);
      expect(evaluation.overallGrade).toBe("STRONG");
      expect(evaluation.relevanceScore).toBeGreaterThanOrEqual(70);
      expect(evaluation.depthScore).toBeGreaterThanOrEqual(60);
      expect(evaluation.edgeCaseScore).toBeGreaterThanOrEqual(35);
      expect(evaluation.matchedConcepts.length).toBeGreaterThanOrEqual(2);
      expect(evaluation.reinforcementAction.type).toBe("ESCALATE_DEEPER");
      expect(evaluation.reinforcementAction.systemDirective).toContain("escalate one level deeper");
    });

    it("evaluates a Roman Urdu technical explanation accurately", () => {
      const candidateSpeech =
        "PostgreSQL mein indexing query performance ko is wajah se fast karti hai kyun ke database B-Tree index scan karta hai bajaye poore table ko scan karne ke. Faida yeh hai ke latency kam hoti hai aur throughput barhti hai.";

      const evaluation = classifyCandidateUtterance(candidateSpeech, sampleQuestion);
      expect(evaluation.intent).toBe("TECHNICAL_ANSWER");
      expect(evaluation.isSubstantiveAnswer).toBe(true);
      expect(evaluation.shouldAutoAdvance).toBe(true);
      expect(evaluation.relevanceScore).toBeGreaterThanOrEqual(60);
      expect(evaluation.depthScore).toBeGreaterThanOrEqual(50);
    });

    it("evaluates an Urdu script technical explanation accurately via auto-Romanization", () => {
      const candidateSpeech =
        "ڈیٹابیس انڈیکسنگ کی وجہ سے ریڈ آپریشنز فاسٹ ہوتے ہیں کیونکہ ٹیبل کو پورا اسکین نہیں کرنا پڑتا۔";

      const evaluation = classifyCandidateUtterance(candidateSpeech, sampleQuestion);
      expect(evaluation.intent).toBe("TECHNICAL_ANSWER");
      expect(evaluation.isSubstantiveAnswer).toBe(true);
      expect(evaluation.shouldAutoAdvance).toBe(true);
    });

    it("identifies a brief or partial technical answer and suggests probing gaps", () => {
      const candidateSpeech =
        "Indexing makes reads faster in PostgreSQL but writes become slower on the database.";

      const evaluation = classifyCandidateUtterance(candidateSpeech, sampleQuestion);
      expect(evaluation.intent).toBe("TECHNICAL_ANSWER");
      expect(evaluation.isSubstantiveAnswer).toBe(true);
      expect(evaluation.shouldAutoAdvance).toBe(true);
      expect(evaluation.overallGrade).toBe("PARTIAL");
      expect(evaluation.reinforcementAction.type).toBe("PROBE_GAP");
      expect(evaluation.reinforcementAction.systemDirective).toContain("probe the specific trade-off or gap");
    });
  });

  describe("CandidateReinforcementTracker (Stateful RL Memory)", () => {
    it("records evaluations and calculates rolling mastery and adaptive trajectory", () => {
      const tracker = new CandidateReinforcementTracker();

      const eval1 = classifyCandidateUtterance(
        "In PostgreSQL, indexing with B-Trees speeds up read queries by doing index scans instead of full scans, but slows down writes.",
        sampleQuestion
      );
      tracker.recordEvaluation(1, sampleQuestion.questionText, sampleQuestion.focusArea, "Answer 1", eval1);

      const history = tracker.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].evaluation.intent).toBe("TECHNICAL_ANSWER");

      const averages = tracker.getAverageScores();
      expect(averages.relevance).toBeGreaterThan(0);
      expect(averages.depth).toBeGreaterThan(0);

      const summary = tracker.getReinforcementSummary();
      expect(summary.totalAnswers).toBe(1);
    });
  });

  describe("General vs Technical Distinction & Multi-Dimensional Judgment (False-Positive Prevention)", () => {
    it("rejects off-topic utterances that have no technical or question relevance", () => {
      // Candidate talks about weather/unrelated topics
      const offTopicSpeech = "Aaj dhoop bohat zyada hai aur garmi hai is liye main bahir nahi gaya";
      const evaluation = classifyCandidateUtterance(offTopicSpeech, sampleQuestion);
      expect(evaluation.intent).toBe("GENERAL_OR_OFF_TOPIC");
      expect(evaluation.isSubstantiveAnswer).toBe(false);
      expect(evaluation.shouldAutoAdvance).toBe(false);
      expect(evaluation.overallGrade).toBe("NON_ANSWER");
      expect(evaluation.relevanceScore).toBeLessThan(30);
    });

    it("rejects meta-commentary, stalling, and question praise without locking", () => {
      const phrases = [
        "Acha sawal hai sir",
        "Bohat acha sawal hai let me think",
        "Main kuch bol nahi raha tha",
        "Main to chup hoon silent hoon",
        "Theek ho gaya sir samajh gaya",
        "Bilkul sahi keh rahe hain aap",
        "Nothing just checking",
      ];

      for (const phrase of phrases) {
        const evaluation = classifyCandidateUtterance(phrase, sampleQuestion);
        expect(evaluation.isSubstantiveAnswer).toBe(false);
        expect(evaluation.shouldAutoAdvance).toBe(false);
      }
    });

    it("rejects audio and microphone checks from advancing the question", () => {
      const evaluation = classifyCandidateUtterance("Awaz aa rahi hai can you hear me properly", sampleQuestion);
      expect(evaluation.isSubstantiveAnswer).toBe(false);
      expect(evaluation.shouldAutoAdvance).toBe(false);
    });

    it("accepts genuine technical answer addressing the question concepts", () => {
      const validAnswer = "PostgreSQL mein B-Tree index scan use hota hai jis se query latency kam ho jati hai aur table lookup fast hota hai.";
      const evaluation = classifyCandidateUtterance(validAnswer, sampleQuestion);
      expect(evaluation.intent).toBe("TECHNICAL_ANSWER");
      expect(evaluation.isSubstantiveAnswer).toBe(true);
      expect(evaluation.shouldAutoAdvance).toBe(true);
      expect(evaluation.relevanceScore).toBeGreaterThanOrEqual(40);
    });
  });

  describe("Acoustic Artifact & Noise Rejection (Noise ko as a response na le)", () => {
    it("identifies parenthetical or bracketed speech-to-text noise markers as noise", () => {
      const markers = [
        "[noise]",
        "(clears throat)",
        "[cough]",
        "(coughing)",
        "(sigh)",
        "[applause]",
        "(laughter)",
        "[inaudible]",
        "[static]",
        "(music)",
        "[background noise]",
      ];

      for (const m of markers) {
        expect(isAcousticNoiseTranscript(m)).toBe(true);
        const evalResult = classifyCandidateUtterance(m, sampleQuestion);
        expect(evalResult.intent).toBe("ACOUSTIC_NOISE");
        expect(evalResult.isSubstantiveAnswer).toBe(false);
        expect(evalResult.shouldAutoAdvance).toBe(false);
        expect(evalResult.overallGrade).toBe("NON_ANSWER");
      }
    });

    it("identifies pure punctuation or ellipsis as noise artifacts", () => {
      const puncts = ["...", ".", "-", "_", "???", "!", "....", ",,,"];
      for (const p of puncts) {
        expect(isAcousticNoiseTranscript(p)).toBe(true);
        const evalResult = classifyCandidateUtterance(p, sampleQuestion);
        expect(evalResult.intent).toBe("ACOUSTIC_NOISE");
        expect(evalResult.isSubstantiveAnswer).toBe(false);
        expect(evalResult.shouldAutoAdvance).toBe(false);
      }
    });

    it("identifies non-lexical phonemes and isolated mic noise bursts as noise", () => {
      const noises = ["shhh", "shh", "psst", "hiss", "zzz", "mmm", "cough", "tap", "click"];
      for (const n of noises) {
        expect(isAcousticNoiseTranscript(n)).toBe(true);
        const evalResult = classifyCandidateUtterance(n, sampleQuestion);
        expect(evalResult.isSubstantiveAnswer).toBe(false);
        expect(evalResult.shouldAutoAdvance).toBe(false);
      }
    });
  });
});

