/**
 * Question Intelligence & ML Answer Classification Engine
 *
 * Evaluates candidate spoken transcripts in real time against the active interview question.
 * Distinguishes genuine technical answers from greetings, small-talk, proctoring checks,
 * thinking-aloud hesitation, hint/repeat requests, and honest admissions of not knowing.
 *
 * Automatically normalizes any Urdu or Hindi script into Roman script before evaluation.
 * Computes multi-dimensional ML scores (Relevance, Depth, Clarity, Edge Cases),
 * and produces adaptive reinforcement directives for Gemini Live and the UI HUD.
 */

import { ensureRomanScript } from "./romanTransliterator";

export type AnswerIntent =
  | "TECHNICAL_ANSWER"
  | "CONVERSATIONAL_PLEASANTRY"
  | "PROCTORING_OR_HARDWARE"
  | "CLARIFICATION_OR_HINT"
  | "ADMISSION_DONT_KNOW"
  | "THINKING_ALOUD_HESITATION"
  | "INCOMPLETE_FRAGMENT"
  | "GENERAL_OR_OFF_TOPIC"
  | "ACOUSTIC_NOISE";

export type ReinforcementType =
  | "ESCALATE_DEEPER"
  | "PROBE_GAP"
  | "SUPPORT_COACH"
  | "REPEAT_CLARIFY"
  | "GIVE_HINT"
  | "WAIT_LISTENING"
  | "IGNORE_CONVERSATIONAL";

export interface QuestionAnalysis {
  questionText: string;
  focusArea: string;
  role: string;
  extractedKeyConcepts: string[];
  isClarificationQuestion?: boolean;
}

export type AnalyzedQuestion = QuestionAnalysis;

export interface MLAnswerEvaluation {
  intent: AnswerIntent;
  confidence: number; // 0..1
  isSubstantiveAnswer: boolean;
  shouldAutoAdvance: boolean;
  relevanceScore: number; // 0..100
  depthScore: number; // 0..100
  clarityScore: number; // 0..100
  edgeCaseScore: number; // 0..100
  conceptualCoverageScore: number; // 0..100
  overallGrade: "STRONG" | "PARTIAL" | "WEAK" | "NON_ANSWER";
  matchedConcepts: string[];
  recommendedAction: string;
  reinforcementAction: {
    type: ReinforcementType;
    systemDirective: string;
    uiBadgeText: string;
    uiBadgeColor: "emerald" | "amber" | "blue" | "purple" | "slate";
  };
}

// ─── Lexicons & NLP Patterns ──────────────────────────────────────────────────

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "was", "were",
  "are", "our", "your", "you", "they", "them", "then", "than", "will", "would",
  "can", "could", "should", "about", "into", "over", "under", "using", "used",
  "use", "how", "what", "when", "where", "which", "who", "why", "mein", "main",
  "hai", "hain", "tha", "thi", "kya", "kiye", "kiya", "karta", "kartay", "aur",
  "but", "not", "its", "his", "her", "she", "him", "all", "any", "more",
  "also", "just", "like", "well", "some", "here", "there", "such", "does",
  "pehlay", "baad", "hum", "aap", "tum", "mera", "meri", "mere", "mujhe",
]);

// Causal & technical explanation connectors (English & Roman Urdu)
const CAUSAL_CONNECTORS = [
  "because", "kyun ke", "kyun k", "is wajah se", "due to", "in order to", "taake",
  "so that", "whereas", "however", "instead of", "handles", "manage karta", "stores",
  "processes", "reduces", "improves", "optimizes", "prevents", "ensures", "tradeoff",
  "complexity", "latency", "scalable", "maintains", "architecture", "as compared to",
  "for example", "specifically", "in production", "therefore", "consequently",
];

// Edge case & failure recovery awareness keywords
const EDGE_CASE_KEYWORDS = [
  "edge case", "failure", "timeout", "retry", "fallback", "deadlock", "race condition",
  "memory leak", "bottleneck", "concurrency", "rate limit", "circuit breaker",
  "exception", "error handling", "backup", "partition", "high load", "outage",
  "failover", "null pointer", "validation", "masla", "crash", "recover",
];

// Domain Concept Associations (automatically links core terms to related architectural facets)
const DOMAIN_ASSOCIATIONS: Record<string, string[]> = {
  database: ["sql", "nosql", "index", "indexing", "query", "schema", "table", "acid", "sharding", "replica", "orm"],
  api: ["rest", "graphql", "endpoints", "json", "http", "status", "authentication", "jwt", "gateway", "payload"],
  microservices: ["distributed", "docker", "kubernetes", "decoupled", "service", "kafka", "queue", "rabbitmq", "grpc"],
  caching: ["redis", "memcached", "ttl", "invalidation", "hit", "miss", "eviction", "lru", "latency", "memory"],
  frontend: ["react", "component", "state", "hooks", "rendering", "dom", "props", "ui", "typescript", "css"],
  security: ["auth", "authorization", "encryption", "https", "oauth", "cors", "xss", "csrf", "token", "hash"],
  performance: ["latency", "throughput", "profiling", "optimization", "benchmark", "async", "threads", "memory"],
};

// Conversational greetings and pleasantries
const CONVERSATIONAL_PHRASES = [
  "alhamdulillah theek", "alhamdulillah main theek", "main theek hoon",
  "theek hoon", "theek hai", "haan theek hai", "sab theek hai", "all good",
  "i am good", "i am fine", "im good", "im fine", "doing well", "ji bilkul",
  "ji sir", "ji bhai", "shukriya", "thank you", "thanks", "walaikum assalam",
  "as salamu alaykum", "assalamu alaykum", "assalam o alaykum", "assalam alaykum",
  "as-salamu alaykum", "salam alaykum", "assalamualaikum", "salam", "kheriyat",
  "fine thank you", "good to meet you", "yes i am ready", "im ready", "ready hoon",
  "ji bilkul tayyar", "yes ready", "bilkul ready", "chalain shuru karein",
  "chalain shuru", "shuru karein", "namaste", "namaste ji", "namaskar", "haanji",
  "bilkul theek", "fit hoon", "sab kheriyat",
];

// Proctoring, camera, audio, or device acknowledgements
const PROCTORING_PHRASES = [
  "camera dekh raha hoon", "camera dekh raha", "camera mein dekh raha",
  "camera ki taraf", "awaaz aa rahi hai", "can you hear me", "am i audible",
  "audio check", "screen dekh raha hoon", "one second adjusting", "ek second",
  "posture theek hai", "sitting properly", "clear hai awaaz", "mic check",
  "camera theek hai", "screen theek hai", "audio clear hai",
];

// Clarification, repetition, or hint requests
const CLARIFICATION_PHRASES = [
  "sawal dobara bol dein", "sawal dobara", "sawal repeat kar dein", "please repeat",
  "can you repeat", "could you repeat", "repeat the question", "samajh nahi aayi",
  "pardon please", "pardon", "what do you mean", "can you explain again",
  "hint dein", "give me a hint", "can i get a hint", "koi hint mil sakti hai",
  "ek hint de dein", "ek hint dein", "example de dein", "thoda explain kar dein",
  "thoda clarify kar dein", "samajh nahi aya", "samajh nahi aaya",
  "sawal dobara bolein", "sawal dobara kahein", "dobara bolein", "dobara kahein",
];

// Candid admissions of not knowing or inexperience
const ADMISSION_DONT_KNOW_PHRASES = [
  "mujhe nahi pata", "pata nahi", "is ka idea nahi hai", "is ka idea nahi",
  "mujhe idea nahi hai", "is ka ilam nahi", "main ne use nahi kiya",
  "kaam nahi kiya is pe", "i dont know", "i do not know", "im not sure",
  "not sure", "no idea", "not familiar with", "haven't worked with",
  "havent worked with", "havent used this", "never used this", "skip this question",
  "next question please", "mujhe iska nahi pata", "is pe zyada kaam nahi kiya",
  "is baray mein nahi pata", "idea nahi hai", "nahi pata sir",
  "mujhe nahi maloom", "maloom nahi", "nahi maloom", "mujhe maloom nahi",
  "is ka pata nahi", "is ka ilm nahi", "mujhe ilm nahi",
];

// Thinking-aloud and hesitation phrases (multi-word phrases)
const HESITATION_PHRASES = [
  "let me think", "soch raha hoon", "sochte hain", "give me a second",
  "give me a moment", "kya tha sawal", "let me see", "hmm let me think",
  "wait a second", "ek second rukain", "ek minute sochte hain", "ek second",
  "let me consider", "let me recall", "soch raha", "sochta hoon",
  "dekhte hain", "dekh raha hoon", "socho", "sochna parta hai",
];

// Standalone filler tokens and elongated hesitation sounds
export const PURE_FILLER_WORDS = new Set([
  "hmm", "hmmm", "hmmmm", "hmmmmm", "hmmmmmm",
  "hmmn", "hmmmn", "hmmmmn", "hm", "hmn",
  "um", "umm", "ummm", "uhmm", "uhm",
  "uh", "uhh", "uhhh", "uhhhh",
  "er", "err", "erm",
  "ah", "ahh", "ahhh", "ahhhh",
  "eh", "ehh", "oh", "ohh", "ohhh",
  "mm", "mmm", "mmmm", "mmmmm"
]);

export const ELONGATED_FILLER_REGEX = /^(h+m+n*|m+|u+m+|u+h+|a+h+|e+r+m*|e+h+|o+h+)$/i;

// General remarks, meta-commentary, off-topic phrases, stalling, question commentary
export const GENERAL_OR_META_PHRASES = [
  "acha sawal hai", "bohat acha sawal hai", "bada acha sawal hai", "good question",
  "interesting question", "tough question", "mushkil sawal hai", "great question",
  "ye to acha sawal hai", "nice question", "main batata hoon", "kya batayein", "dekhein",
  "basically dekha jaye to", "actually kya hota hai", "kuch khas nahi",
  "mujhe nahi kehna kuch", "main to bas dekh raha tha", "kuch bol nahi raha",
  "kuch nahi bol raha", "kuch nahi keh raha", "main kuch nahi bol raha",
  "i am not answering", "not saying anything", "main to chup hoon", "chup hoon",
  "silent", "just listening", "sun raha hoon", "aap sunayein", "aap bolein",
  "aap batayein", "kya aap sun rahe hain", "sun rahe hain aap", "are you listening",
  "awaz nahi aa rahi", "awaz cut rahi hai", "internet issue hai", "theek ho gaya sir",
  "samajh gaya", "samajh gaya hoon", "samajh gaya sir", "understood sir",
  "got it", "i see", "yes sir", "haan sir", "g sir", "g bhai", "acha theek",
  "chalain sahi", "sahi ho gaya", "bilkul sahi keh rahe hain", "bilkul sahi kaha",
  "you are right", "that is right", "correct", "agree karta hoon", "main agree karta hoon",
  "kuch nahi", "nothing", "just checking", "test", "testing", "one two three",
];

// Common cross-domain engineering and computing keywords
export const COMMON_TECHNICAL_KEYWORDS = new Set([
  "database", "sql", "nosql", "query", "index", "indexing", "table", "schema", "acid", "sharding",
  "api", "rest", "graphql", "endpoint", "endpoints", "http", "https", "json", "jwt", "auth",
  "react", "state", "props", "hook", "hooks", "component", "render", "rendering", "dom", "ui",
  "flutter", "dart", "widget", "widgets", "stateful", "stateless", "bloc", "provider",
  "cache", "caching", "redis", "memcached", "ttl", "invalidation", "memory", "leak", "heap",
  "concurrency", "thread", "threads", "async", "await", "promise", "lock", "mutex", "deadlock",
  "microservice", "microservices", "docker", "container", "kubernetes", "k8s", "service", "queue",
  "kafka", "rabbitmq", "pubsub", "grpc", "protobuf", "pipeline", "ci", "cd", "deploy",
  "security", "encryption", "hash", "oauth", "cors", "xss", "csrf", "vulnerability",
  "performance", "latency", "throughput", "bottleneck", "scale", "scaling", "scalability", "load",
  "architecture", "design", "pattern", "mvc", "mvvm", "solid", "dry", "refactor",
  "test", "testing", "unit", "integration", "mock", "stub", "assert", "coverage",
  "error", "exception", "try", "catch", "fallback", "retry", "circuit", "breaker",
  "git", "branch", "commit", "merge", "pull", "push", "repository", "repo",
  "server", "client", "request", "response", "payload", "header", "status", "code",
  "node", "nodejs", "express", "fastapi", "django", "spring", "golang", "python", "typescript",
  "b-tree", "btree", "reads", "writes", "scan", "lookup", "filter", "aggregate", "model"
]);

// ─── Question Analysis ────────────────────────────────────────────────────────

/**
 * Extracts key architectural and technical terms from an asked question and focus area.
 * Dynamically expands key terms with domain association knowledge.
 */
export function analyzeQuestion(
  questionText: string,
  focusArea: string,
  role: string
): QuestionAnalysis {
  // Ensure Roman script in question before parsing
  const romanQ = ensureRomanScript(questionText);
  const cleanQ = romanQ
    .replace(/\[(?:STAGE_)?Q\d+\]/gi, "")
    .replace(/\[(?:SYSTEM|GREETING|ICEBREAKER|CONCLUSION|WRAPUP)\]/gi, "")
    .trim();

  // Tokenize question + focus area + role
  const rawWords = `${cleanQ} ${focusArea} ${role}`
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'!]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const concepts = new Set<string>();
  for (const w of rawWords) {
    if (w.length > 2 && !STOPWORDS.has(w)) {
      concepts.add(w);
      // Domain expansions
      if (DOMAIN_ASSOCIATIONS[w]) {
        for (const assoc of DOMAIN_ASSOCIATIONS[w].slice(0, 4)) {
          concepts.add(assoc);
        }
      }
    }
  }

  return {
    questionText: cleanQ,
    focusArea,
    role,
    extractedKeyConcepts: Array.from(concepts),
    isClarificationQuestion: cleanQ.toLowerCase().includes("repeat") || cleanQ.toLowerCase().includes("clarify"),
  };
}

// ─── Acoustic Artifact & Noise Detection ─────────────────────────────────────

/**
 * Detects whether a transcription string is purely acoustic artifact noise,
 * microphone clicks, fan/AC hum hallucinations, non-lexical phonemes, or punctuation.
 */
export function isAcousticNoiseTranscript(transcript: string): boolean {
  if (!transcript) return true;
  const trimmed = transcript.trim();
  if (!trimmed) return true;

  // 1. Parenthetical or bracketed speech-to-text sound descriptors
  // e.g. [noise], (clears throat), [cough], (applause), (laughter), (sigh), [static], [audio], [inaudible], (music), [coughing]
  if (/^[\[\(\{][\w\s\-]+[\]\)\}]$/i.test(trimmed)) {
    return true;
  }

  // 2. Pure punctuation, ellipsis, hyphens, or symbols with no alphanumeric characters
  // e.g. "...", ".", "-", "--", "_", "?", "!", ",,,", "~"
  if (!/[\p{L}\p{N}]/u.test(trimmed)) {
    return true;
  }

  // 3. Isolated non-lexical acoustic filler or noise phonemes
  const cleanTokens = trimmed
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (cleanTokens.length === 0) {
    return true;
  }

  const NOISE_PHONEMES = new Set([
    "sh", "shh", "shhh", "shhhh", "psst", "pssst", "hiss", "zzz", "zzzz",
    "mm", "mmm", "mmmm", "mmmmm", "mmmmmm",
    "hmm", "hmmm", "hmmmm", "hmmmmm", "hmmmmmm", "hmmn", "hmmmn", "hmmmmn",
    "hm", "hmn",
    "ah", "ahh", "ahhh", "ahhhh", "uh", "uhh", "uhhh", "uhhhh",
    "um", "umm", "ummm", "uhmm", "uhm",
    "eh", "ehh", "err", "er", "erm",
    "oh", "ohh", "ohhh",
    "cough", "throat", "sigh", "sighs",
    "static", "click", "clicks", "tap", "taps", "mic", "noise", "background",
    "inaudible", "unintelligible", "music", "beep", "beeps"
  ]);

  // Pure noise even if repeated multiple times (e.g. "hmm hmm hmm" = 3 tokens but all noise)
  if (cleanTokens.length <= 8 && cleanTokens.every((t) => NOISE_PHONEMES.has(t))) {
    return true;
  }

  // 4. Repeated single character strings (e.g. "aaaaa", "hhhhhh", ".....")
  if (/^(.)\1{3,}$/i.test(trimmed)) {
    return true;
  }

  // 5. Detect tokens that are purely elongated filler phonemes (e.g. "hmmnnnn", "hmmmmnnn", "ummmmm", "ahhhhhhh")
  if (cleanTokens.length <= 8 && cleanTokens.every((t) => NOISE_PHONEMES.has(t) || ELONGATED_FILLER_REGEX.test(t))) {
    return true;
  }

  return false;
}

// ─── Transcript Classification & ML Evaluation ───────────────────────────────

/**
 * Evaluates candidate spoken transcript against the active question using ML & NLP features.
 * Auto-normalizes Urdu & Hindi text into Roman script before intent classification.
 */
export function classifyCandidateUtterance(
  transcript: string,
  question: QuestionAnalysis
): MLAnswerEvaluation {
  // Acoustic noise, room fan hum hallucination, or punctuation filter
  if (isAcousticNoiseTranscript(transcript)) {
    return {
      intent: "ACOUSTIC_NOISE",
      confidence: 0.99,
      isSubstantiveAnswer: false,
      shouldAutoAdvance: false,
      relevanceScore: 0,
      depthScore: 0,
      clarityScore: 0,
      edgeCaseScore: 0,
      conceptualCoverageScore: 0,
      overallGrade: "NON_ANSWER",
      matchedConcepts: [],
      recommendedAction: "Ambient acoustic noise detected · Ignored",
      reinforcementAction: {
        type: "WAIT_LISTENING",
        systemDirective: "",
        uiBadgeText: "🔇 Ambient Noise · Ignored",
        uiBadgeColor: "slate",
      },
    };
  }

  // 1. Auto-convert any Urdu / Hindi script to unified Roman script
  const romanizedTranscript = ensureRomanScript(transcript);
  const trimmed = romanizedTranscript.trim();
  const lower = trimmed.toLowerCase();
  const noApos = lower.replace(/['’]/g, "");
  const cleanedText = noApos
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleanedText ? cleanedText.split(" ") : [];

  // Default fallback for empty speech
  if (words.length === 0) {
    return {
      intent: "INCOMPLETE_FRAGMENT",
      confidence: 1.0,
      isSubstantiveAnswer: false,
      shouldAutoAdvance: false,
      relevanceScore: 0,
      depthScore: 0,
      clarityScore: 0,
      edgeCaseScore: 0,
      conceptualCoverageScore: 0,
      overallGrade: "NON_ANSWER",
      matchedConcepts: [],
      recommendedAction: "Listening...",
      reinforcementAction: {
        type: "WAIT_LISTENING",
        systemDirective: "",
        uiBadgeText: "Listening...",
        uiBadgeColor: "slate",
      },
    };
  }

  // 1. Check for Candid Admissions of Not Knowing
  for (const phrase of ADMISSION_DONT_KNOW_PHRASES) {
    const isExact = cleanedText === phrase;
    const isPrefix = cleanedText.startsWith(phrase + " ");
    const isShortWithPhrase = words.length <= 6 && cleanedText.includes(phrase);
    if (isExact || isPrefix || isShortWithPhrase) {
      return {
        intent: "ADMISSION_DONT_KNOW",
        confidence: 0.95,
        isSubstantiveAnswer: false,
        shouldAutoAdvance: false,
        relevanceScore: 15,
        depthScore: 20,
        clarityScore: 70,
        edgeCaseScore: 0,
        conceptualCoverageScore: 10,
        overallGrade: "NON_ANSWER",
        matchedConcepts: [],
        recommendedAction: "Supportive Pivot to Core Foundation",
        reinforcementAction: {
          type: "SUPPORT_COACH",
          systemDirective: `[SYSTEM] Candidate candidly stated they are unfamiliar with this topic: "${trimmed}". Warmly validate their professional integrity, share a concise 1-sentence learning takeaway on this concept, and gently transition to an adjacent foundational question from "${question.focusArea}" so they can demonstrate their core skills. Keep a positive, encouraging tone.`,
          uiBadgeText: "🤝 Knowledge Gap · Supportive Pivot",
          uiBadgeColor: "purple",
        },
      };
    }
  }

  // 2. Check for Clarification, Hint, or Repetition Requests
  for (const phrase of CLARIFICATION_PHRASES) {
    if (cleanedText === phrase || cleanedText.includes(phrase)) {
      return {
        intent: "CLARIFICATION_OR_HINT",
        confidence: 0.95,
        isSubstantiveAnswer: false,
        shouldAutoAdvance: false,
        relevanceScore: 20,
        depthScore: 20,
        clarityScore: 80,
        edgeCaseScore: 0,
        conceptualCoverageScore: 15,
        overallGrade: "NON_ANSWER",
        matchedConcepts: [],
        recommendedAction: "Repeat Question with Scaffolded Hint",
        reinforcementAction: {
          type: "REPEAT_CLARIFY",
          systemDirective: `[SYSTEM] Candidate requested clarification or a hint: "${trimmed}". Warmly rephrase the question with a simple concrete analogy or offer a 1-sentence practical hint without advancing the question index.`,
          uiBadgeText: "💡 Clarification / Hint Requested",
          uiBadgeColor: "blue",
        },
      };
    }
  }

  // 3. Check for Conversational Greetings / Pleasantries
  for (const phrase of CONVERSATIONAL_PHRASES) {
    if (cleanedText === phrase || cleanedText.startsWith(phrase + " ") || cleanedText.endsWith(" " + phrase)) {
      return {
        intent: "CONVERSATIONAL_PLEASANTRY",
        confidence: 0.95,
        isSubstantiveAnswer: false,
        shouldAutoAdvance: false,
        relevanceScore: 5,
        depthScore: 10,
        clarityScore: 90,
        edgeCaseScore: 0,
        conceptualCoverageScore: 0,
        overallGrade: "NON_ANSWER",
        matchedConcepts: [],
        recommendedAction: "Casual Greeting Acknowledged",
        reinforcementAction: {
          type: "IGNORE_CONVERSATIONAL",
          systemDirective: "",
          uiBadgeText: "💬 Conversational · Not Counted as Answer",
          uiBadgeColor: "amber",
        },
      };
    }
  }

  // 4. Check for General Commentary, Stalling, or Question Praise
  for (const phrase of GENERAL_OR_META_PHRASES) {
    if (cleanedText === phrase || cleanedText.startsWith(phrase + " ") || cleanedText.endsWith(" " + phrase)) {
      return {
        intent: "GENERAL_OR_OFF_TOPIC",
        confidence: 0.94,
        isSubstantiveAnswer: false,
        shouldAutoAdvance: false,
        relevanceScore: 10,
        depthScore: 15,
        clarityScore: 75,
        edgeCaseScore: 0,
        conceptualCoverageScore: 0,
        overallGrade: "NON_ANSWER",
        matchedConcepts: [],
        recommendedAction: "General remark · Awaiting actual technical answer",
        reinforcementAction: {
          type: "WAIT_LISTENING",
          systemDirective: "",
          uiBadgeText: "💬 General Remark · Please provide your technical answer",
          uiBadgeColor: "amber",
        },
      };
    }
  }

  // Short casual tokens check (e.g. single word "haan", "theek", "shukriya")
  const casualTokens = new Set([
    "haan", "han", "jee", "ji", "ha", "acha", "theek", "thik", "thk", "sahi",
    "ok", "okay", "alhamdulillah", "shukriya", "thanks", "thank", "kheriyat",
    "walaikum", "assalam", "salam", "yes", "yup", "yeah", "sure", "fine",
    "good", "great", "hello", "hi", "hey", "bilkul", "hmm", "hm", "namaste", "haanji",
    "matlab", "basically", "actually", "sun", "rahe", "hain", "kuch", "nahi", "batayein",
    "bolein", "chup", "silent", "nothing", "test", "testing", "understood", "got", "it",
    "right", "agree", "correct", "sir", "bhai"
  ]);

  if (words.length <= 8) {
    const matchedTokens = words.filter((w) => casualTokens.has(w)).length;
    if (matchedTokens / words.length >= 0.5) {
      return {
        intent: "CONVERSATIONAL_PLEASANTRY",
        confidence: 0.9,
        isSubstantiveAnswer: false,
        shouldAutoAdvance: false,
        relevanceScore: 5,
        depthScore: 10,
        clarityScore: 85,
        edgeCaseScore: 0,
        conceptualCoverageScore: 0,
        overallGrade: "NON_ANSWER",
        matchedConcepts: [],
        recommendedAction: "Casual Greeting",
        reinforcementAction: {
          type: "IGNORE_CONVERSATIONAL",
          systemDirective: "",
          uiBadgeText: "💬 Conversational Greeting",
          uiBadgeColor: "amber",
        },
      };
    }
  }

  // 5. Check for Proctoring / Device Checks
  for (const phrase of PROCTORING_PHRASES) {
    if (cleanedText === phrase || cleanedText.includes(phrase)) {
      return {
        intent: "PROCTORING_OR_HARDWARE",
        confidence: 0.92,
        isSubstantiveAnswer: false,
        shouldAutoAdvance: false,
        relevanceScore: 5,
        depthScore: 10,
        clarityScore: 75,
        edgeCaseScore: 0,
        conceptualCoverageScore: 0,
        overallGrade: "NON_ANSWER",
        matchedConcepts: [],
        recommendedAction: "Proctoring / Setup Verified",
        reinforcementAction: {
          type: "IGNORE_CONVERSATIONAL",
          systemDirective: "",
          uiBadgeText: "🛡️ Proctoring / Audio Check",
          uiBadgeColor: "slate",
        },
      };
    }
  }

  // 6. Check for Thinking-Aloud / Hesitation Stalling
  // Pure filler check: utterance consists entirely of hesitation/filler sounds (e.g. "hmmm", "hmmnnnnn", "um", "uh", "hmm hmm")
  const isPureFillerUtterance =
    words.length > 0 &&
    words.length <= 10 &&
    words.every((w) => PURE_FILLER_WORDS.has(w) || ELONGATED_FILLER_REGEX.test(w));

  if (isPureFillerUtterance) {
    return {
      intent: "THINKING_ALOUD_HESITATION",
      confidence: 0.95,
      isSubstantiveAnswer: false,
      shouldAutoAdvance: false,
      relevanceScore: 5,
      depthScore: 5,
      clarityScore: 40,
      edgeCaseScore: 0,
      conceptualCoverageScore: 0,
      overallGrade: "NON_ANSWER",
      matchedConcepts: [],
      recommendedAction: "Awaiting candidate formulation...",
      reinforcementAction: {
        type: "WAIT_LISTENING",
        systemDirective: "",
        uiBadgeText: "⏳ Candidate Thinking Aloud...",
        uiBadgeColor: "amber",
      },
    };
  }

  // Multi-word hesitation phrase check for short utterances (9 words or fewer)
  if (words.length <= 9) {
    for (const phrase of HESITATION_PHRASES) {
      if (
        cleanedText === phrase ||
        cleanedText.includes(phrase)
      ) {
        return {
          intent: "THINKING_ALOUD_HESITATION",
          confidence: 0.88,
          isSubstantiveAnswer: false,
          shouldAutoAdvance: false,
          relevanceScore: 15,
          depthScore: 15,
          clarityScore: 50,
          edgeCaseScore: 0,
          conceptualCoverageScore: 5,
          overallGrade: "NON_ANSWER",
          matchedConcepts: [],
          recommendedAction: "Awaiting candidate formulation...",
          reinforcementAction: {
            type: "WAIT_LISTENING",
            systemDirective: "",
            uiBadgeText: "⏳ Candidate Thinking Aloud...",
            uiBadgeColor: "amber",
          },
        };
      }
    }
  }

  // 7. Check for Isolated Fragments (fewer than 5 words cannot constitute a complete technical answer)
  const candidateConcepts = new Set(
    words.filter((w) => w.length > 2 && !STOPWORDS.has(w) && !casualTokens.has(w))
  );
  const matchedList = question.extractedKeyConcepts.filter((c) => candidateConcepts.has(c));
  const matchedDomainConcepts = Array.from(candidateConcepts).filter((c) => COMMON_TECHNICAL_KEYWORDS.has(c));
  const totalRelevantConcepts = matchedList.length + matchedDomainConcepts.length;

  if (words.length < 5) {
    return {
      intent: "INCOMPLETE_FRAGMENT",
      confidence: 0.9,
      isSubstantiveAnswer: false,
      shouldAutoAdvance: false,
      relevanceScore: totalRelevantConcepts > 0 ? 30 : 10,
      depthScore: 10,
      clarityScore: 40,
      edgeCaseScore: 0,
      conceptualCoverageScore: 0,
      overallGrade: "NON_ANSWER",
      matchedConcepts: matchedList,
      recommendedAction: "Listening for complete explanation...",
      reinforcementAction: {
        type: "WAIT_LISTENING",
        systemDirective: "",
        uiBadgeText: "Listening for full explanation...",
        uiBadgeColor: "slate",
      },
    };
  }

  // 8. Strict Relevance & Off-Topic Judge ("kia wo bnta b ha k ni")
  // If candidate words have zero overlap with question concepts AND zero overlap with domain engineering terms:
  if (totalRelevantConcepts === 0) {
    return {
      intent: "GENERAL_OR_OFF_TOPIC",
      confidence: 0.92,
      isSubstantiveAnswer: false,
      shouldAutoAdvance: false,
      relevanceScore: 10,
      depthScore: 15,
      clarityScore: 60,
      edgeCaseScore: 0,
      conceptualCoverageScore: 0,
      overallGrade: "NON_ANSWER",
      matchedConcepts: [],
      recommendedAction: "Awaiting topic-relevant technical explanation",
      reinforcementAction: {
        type: "WAIT_LISTENING",
        systemDirective: "",
        uiBadgeText: "💬 Off-Topic / General Remark · Please address the question",
        uiBadgeColor: "amber",
      },
    };
  }

  // ─── TECHNICAL ANSWER EVALUATION ──────────────────────────────────────────

  // 1. Measure Semantic & Concept Relevance
  const totalQuestionConcepts = Math.max(1, question.extractedKeyConcepts.length);
  const conceptMatchRatio = (matchedList.length * 1.5 + matchedDomainConcepts.length * 0.8) / totalQuestionConcepts;

  // 2. Causal explanatory connector density (measures structural reasoning)
  let connectorMatches = 0;
  for (const connector of CAUSAL_CONNECTORS) {
    if (cleanedText.includes(connector)) {
      connectorMatches++;
    }
  }

  // 3. Edge case and production resilience awareness
  let edgeCaseMatches = 0;
  for (const kw of EDGE_CASE_KEYWORDS) {
    if (cleanedText.includes(kw)) {
      edgeCaseMatches++;
    }
  }

  // Calculate ML Sub-scores (0..100)
  const lengthFactor = Math.min(1.0, words.length / 28);
  const connectorFactor = Math.min(1.0, connectorMatches / 2);
  const depthScore = Math.round(lengthFactor * 55 + connectorFactor * 45);

  const baselineRelevance = Math.min(100, Math.round(40 + conceptMatchRatio * 50 + (candidateConcepts.size > 4 ? 10 : 0)));
  const relevanceScore = Math.min(100, baselineRelevance);

  const stutterCount = words.filter((w) => w === "um" || w === "uh" || w === "matlab").length;
  const clarityScore = Math.max(30, Math.min(100, Math.round(85 - stutterCount * 10 + connectorMatches * 5)));
  const edgeCaseScore = Math.min(100, Math.round(edgeCaseMatches * 35));
  const conceptualCoverageScore = Math.min(100, Math.round(Math.min(1.0, conceptMatchRatio) * 100));

  const compositeScore = Math.round(
    relevanceScore * 0.45 +
    depthScore * 0.25 +
    clarityScore * 0.15 +
    edgeCaseScore * 0.15
  );

  let overallGrade: "STRONG" | "PARTIAL" | "WEAK" = "PARTIAL";
  let reinforcementActionType: ReinforcementType = "PROBE_GAP";
  let uiBadgeColor: "emerald" | "amber" | "blue" | "purple" | "slate" = "amber";
  let systemDirective = "";
  let recommendedAction = "";

  if (compositeScore >= 68) {
    overallGrade = "STRONG";
    reinforcementActionType = "ESCALATE_DEEPER";
    uiBadgeColor = "emerald";
    recommendedAction = "🚀 Escalate to High-Concurrency & Production Edge Case";
    systemDirective = `[SYSTEM] Candidate gave a STRONG technical answer (Relevance: ${relevanceScore}%, Depth: ${depthScore}%, Clarity: ${clarityScore}%, Edge Cases: ${edgeCaseScore}%, Matched: ${matchedList.join(", ") || "domain concepts"}). Validate their specific architectural choice enthusiastically, then immediately escalate one level deeper: introduce a high-concurrency production dilemma, unexpected failure, or 10x scale bottleneck related to their approach.`;
  } else if (compositeScore >= 42) {
    overallGrade = "PARTIAL";
    reinforcementActionType = "PROBE_GAP";
    uiBadgeColor = "amber";
    recommendedAction = "🔍 Probe Missing Trade-offs & Consistency";
    systemDirective = `[SYSTEM] Candidate gave a PARTIAL technical answer (Relevance: ${relevanceScore}%, Depth: ${depthScore}%, Clarity: ${clarityScore}%). Acknowledge what was correct, then probe the specific trade-off or gap they skipped (e.g. error handling, data consistency, or scaling limitations).`;
  } else {
    overallGrade = "WEAK";
    reinforcementActionType = "SUPPORT_COACH";
    uiBadgeColor = "purple";
    recommendedAction = "🌱 Supportive Coaching & First-Principles Guidance";
    systemDirective = `[SYSTEM] Candidate gave a WEAK or incomplete technical answer (Relevance: ${relevanceScore}%, Depth: ${depthScore}%). Support and coach: gently break down the concept into first principles, provide an encouraging hint, and re-frame the question from an easier angle so they can learn.`;
  }

  // Multi-dimensional gate: Candidate must speak at least 6 words,
  // have >= 2 substantive concepts, achieve >= 40% relevance and composite score >= 38.
  const isSubstantiveAnswer =
    words.length >= 6 &&
    candidateConcepts.size >= 2 &&
    totalRelevantConcepts >= 1 &&
    relevanceScore >= 40 &&
    compositeScore >= 38;

  return {
    intent: "TECHNICAL_ANSWER",
    confidence: 0.94,
    isSubstantiveAnswer,
    shouldAutoAdvance: isSubstantiveAnswer,
    relevanceScore,
    depthScore,
    clarityScore,
    edgeCaseScore,
    conceptualCoverageScore,
    overallGrade,
    matchedConcepts: matchedList,
    recommendedAction,
    reinforcementAction: {
      type: reinforcementActionType,
      systemDirective,
      uiBadgeText: `🟢 Technical Answer (${overallGrade} · ${compositeScore}% Score)`,
      uiBadgeColor,
    },
  };
}

// ─── Candidate Reinforcement Tracker (Stateful Reinforcement Learning Memory) ─

export interface CandidateEvaluationHistoryEntry {
  questionNumber: number;
  questionText: string;
  focusArea: string;
  answerText: string;
  evaluation: MLAnswerEvaluation;
  timestamp: number;
}

export class CandidateReinforcementTracker {
  private history: CandidateEvaluationHistoryEntry[] = [];

  public recordEvaluation(
    questionNumber: number,
    questionText: string,
    focusArea: string,
    answerText: string,
    evaluation: MLAnswerEvaluation
  ) {
    this.history.push({
      questionNumber,
      questionText,
      focusArea,
      answerText,
      evaluation,
      timestamp: Date.now(),
    });
  }

  public getHistory(): CandidateEvaluationHistoryEntry[] {
    return [...this.history];
  }

  public getAverageScores(): {
    relevance: number;
    depth: number;
    clarity: number;
    edgeCases: number;
    overall: number;
  } {
    const valid = this.history.filter((h) => h.evaluation.intent === "TECHNICAL_ANSWER");
    if (valid.length === 0) {
      return { relevance: 0, depth: 0, clarity: 0, edgeCases: 0, overall: 0 };
    }

    const sum = valid.reduce(
      (acc, cur) => ({
        relevance: acc.relevance + cur.evaluation.relevanceScore,
        depth: acc.depth + cur.evaluation.depthScore,
        clarity: acc.clarity + cur.evaluation.clarityScore,
        edgeCases: acc.edgeCases + cur.evaluation.edgeCaseScore,
      }),
      { relevance: 0, depth: 0, clarity: 0, edgeCases: 0 }
    );

    const len = valid.length;
    const relevance = Math.round(sum.relevance / len);
    const depth = Math.round(sum.depth / len);
    const clarity = Math.round(sum.clarity / len);
    const edgeCases = Math.round(sum.edgeCases / len);
    const overall = Math.round(relevance * 0.4 + depth * 0.3 + clarity * 0.15 + edgeCases * 0.15);

    return { relevance, depth, clarity, edgeCases, overall };
  }

  public getMasteredConcepts(): string[] {
    const mastered = new Set<string>();
    for (const h of this.history) {
      if (h.evaluation.overallGrade === "STRONG") {
        for (const c of h.evaluation.matchedConcepts) {
          mastered.add(c);
        }
      }
    }
    return Array.from(mastered);
  }

  public getReinforcementSummary(): {
    totalAnswers: number;
    strongCount: number;
    partialCount: number;
    weakCount: number;
    masteredConcepts: string[];
    adaptiveTrajectory: "Accelerating" | "Steady" | "Needs Coaching";
  } {
    const valid = this.history.filter((h) => h.evaluation.intent === "TECHNICAL_ANSWER");
    const strongCount = valid.filter((h) => h.evaluation.overallGrade === "STRONG").length;
    const partialCount = valid.filter((h) => h.evaluation.overallGrade === "PARTIAL").length;
    const weakCount = valid.filter((h) => h.evaluation.overallGrade === "WEAK").length;

    let adaptiveTrajectory: "Accelerating" | "Steady" | "Needs Coaching" = "Steady";
    if (strongCount > partialCount + weakCount) {
      adaptiveTrajectory = "Accelerating";
    } else if (weakCount > strongCount) {
      adaptiveTrajectory = "Needs Coaching";
    }

    return {
      totalAnswers: valid.length,
      strongCount,
      partialCount,
      weakCount,
      masteredConcepts: this.getMasteredConcepts(),
      adaptiveTrajectory,
    };
  }
}
