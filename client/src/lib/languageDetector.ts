/**
 * FutureMaker AI - Pakistan-First Language & Dialect Classifier
 * Fast, lightweight, zero-latency detection for candidate speech & typed responses.
 */

import { ensureRomanScript } from "./romanTransliterator";

export interface DetectedLanguageResult {
  languageCode: string;
  languageName: string;
  confidence: number;
  isRegional: boolean;
}

// Common Roman Urdu stop words and tokens
const ROMAN_URDU_WORDS = new Set([
  "mera", "meri", "mere", "mujhe", "mujhko", "mujhey",
  "aap", "aapka", "aapki", "aapke", "tum", "tumhara",
  "hum", "humara", "humari", "humne", "hamara",
  "maine", "main", "mai", "mene",
  "kya", "kaise", "kaisey", "kyun", "kyu", "kaisa", "kaisi", "kahan", "kab",
  "bohot", "bohat", "bhut", "acha", "achi", "ache", "achha", "achhi",
  "theek", "thik", "sahi", "zaroor", "shukriya",
  "kaam", "kam", "kar", "karta", "karti", "karte", "kiya", "karenge", "karna", "karu", "karunga", "karungi",
  "banaya", "banayi", "banaye", "banane",
  "masla", "wajah", "samajh", "batao", "batayein", "bataun",
  "tha", "thi", "the", "hai", "hain", "hon", "hoo", "hoga", "hogi", "hoge",
  "lekin", "magar", "agar", "toh", "bhi", "bhee", "saath", "sath",
  "pe", "par", "se", "ko", "ka", "ki", "ke", "wali", "wale", "wala",
  "kuch", "sab", "log", "bhai",
]);

// Common Roman Punjabi keywords
const ROMAN_PUNJABI_WORDS = new Set([
  "tussi", "tuhada", "tuhadi", "assi", "sadda", "saddi",
  "kiddan", "changa", "changi", "veera", "paji", "paaji",
  "karange", "kitta", "kitti", "karan", "mainu", "tenu", "tuhanu",
  "ethe", "othe", "jiddan", "eddan", "hovega", "si", "siyan",
]);

// Pashto vocabulary
const PASHTO_WORDS = new Set([
  "زه", "تاسو", "ته", "موږ", "کار", "ښه", "مننه", "ولې", "څنګه",
  "مرکه", "تجربه", "پوښتنه", "ځواب", "کووم", "کړی", "پروژه", "لرم",
  "ډیر", "ډېره", "سره", "پروژو", "کې", "کولای", "یو",
]);

// Sindhi vocabulary
const SINDHI_WORDS = new Set([
  "توهان", "مان", "اسان", "آهي", "آهيون", "ڪم", "ڇا", "ڪيو",
  "ڪيئن", "وٽ", "ٿيو", "ٿيندو", "سنڌي", "تجربو", "سوال", "جواب",
  "آهيان", "ڪري", "پنهنجي",
]);

// Balochi vocabulary
const BALOCHI_WORDS = new Set([
  "شمے", "شمئے", "گوں", "پسو", "بہ", "انت", "منی", "را",
  "گوستگیں", "کار", "جست", "تجروبگ", "شر", "واجہ",
]);

// Saraiki vocabulary
const SARAIKI_WORDS = new Set([
  "تہاݙا", "تساں", "اساں", "اتھاں", "ٻولو", "ݙسو", "کریندا",
  "ہا", "ہئی", "پیا", "ودھا", "ڳالھ", "سوہݨا", "کیہاں",
]);

// Punjabi Shahmukhi vocabulary
const PUNJABI_SHAHMUKHI_WORDS = new Set([
  "تہاڈا", "ساڈا", "کیویں", "نال", "سی", "چنگا", "کیتا", "جیکر", "ہووے", "پیا", "اکھو", "ایہہ", "رہیا", "ہونا", "چاہندے", "وچ", "دیو",
]);

// Unique character patterns
// Sindhi unique: ڌ (\u068c), ڄ (\u0684), ڃ (\u0683), ڦ (\u06a6), ڳ (\u06b3), ڱ (\u06b1), ڻ (\u06bb), ٺ (\u067f), ٿ (\u067d), ڀ (\u0680), ڍ (\u068a), ڎ (\u068f), ڇ (\u0687), ٽ (\u067c), ڙ (\u0699), ڪ (\u06aa)
const SINDHI_UNIQUE_CHAR_REGEX = /[\u068c\u0684\u0683\u06a6\u06b3\u06b1\u06bb\u067f\u067d\u0680\u068a\u068f\u06aa]/;

// Pashto unique: ښ (\u069a), ږ (\u0696), ۍ (\u06cd), ې (\u06d0), څ (\u0685), ځ (\u0681), ڼ (\u06bc), ړ (\u0693)
const PASHTO_UNIQUE_CHAR_REGEX = /[\u069a\u0696\u06cd\u06d0\u0685\u0681\u06bc]/;

// Saraiki unique: ݙ (\u0759), ݨ (\u0768), ݪ (\u076a), ٻ (\u067b)
const SARAIKI_UNIQUE_CHAR_REGEX = /[\u0759\u0768\u076a\u067b]/;

const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F]/;

const ENGLISH_DICTIONARY = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
  "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
  "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
  "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "experience", "project", "developer", "engineering", "architecture", "scalable",
  "microservices", "latency", "system", "database", "backend", "frontend", "built",
  "lead", "led", "managed", "reducing", "percent", "team", "cloud", "production",
]);

/**
 * Detect language from spoken transcript or typed text.
 */
export function detectPakistaniLanguage(rawText: string): DetectedLanguageResult {
  const text = (rawText || "").trim();
  if (!text || text.length < 2) {
    return {
      languageCode: "ur-Roman",
      languageName: "Roman Urdu",
      confidence: 0.5,
      isRegional: true,
    };
  }

  // Check if text is in Arabic/Perso-Arabic script
  const hasArabicScript = ARABIC_SCRIPT_REGEX.test(text);

  if (hasArabicScript) {
    const tokens = text.split(/[\s,،.۔!؟]+/).filter(Boolean);

    // 1. Pashto Check
    let pashtoScore = 0;
    if (PASHTO_UNIQUE_CHAR_REGEX.test(text)) pashtoScore += 5;
    tokens.forEach((t) => {
      if (PASHTO_WORDS.has(t)) pashtoScore += 3;
    });

    // 2. Sindhi Check
    let sindhiScore = 0;
    if (SINDHI_UNIQUE_CHAR_REGEX.test(text)) sindhiScore += 5;
    tokens.forEach((t) => {
      if (SINDHI_WORDS.has(t)) sindhiScore += 3;
    });

    // 3. Saraiki Check
    let saraikiScore = 0;
    if (SARAIKI_UNIQUE_CHAR_REGEX.test(text)) saraikiScore += 5;
    tokens.forEach((t) => {
      if (SARAIKI_WORDS.has(t)) saraikiScore += 3;
    });

    // 4. Balochi Check
    let balochiScore = 0;
    tokens.forEach((t) => {
      if (BALOCHI_WORDS.has(t)) balochiScore += 3;
    });

    // 5. Punjabi (Shahmukhi) Check
    let punjabiScore = 0;
    tokens.forEach((t) => {
      if (PUNJABI_SHAHMUKHI_WORDS.has(t)) punjabiScore += 3;
    });

    // Determine highest scoring regional Arabic-script language
    const scores = [
      { code: "ps-PK", name: "پښتو (Pashto)", score: pashtoScore },
      { code: "sd-PK", name: "سنڌي (Sindhi)", score: sindhiScore },
      { code: "skr-PK", name: "سرائیکی (Saraiki)", score: saraikiScore },
      { code: "bal-PK", name: "بلوچی (Balochi)", score: balochiScore },
      { code: "pa-PK", name: "پنجابی (Punjabi)", score: punjabiScore },
    ];

    scores.sort((a, b) => b.score - a.score);

    if (scores[0].score >= 2) {
      return {
        languageCode: scores[0].code,
        languageName: scores[0].name,
        confidence: Math.min(0.98, 0.65 + scores[0].score * 0.05),
        isRegional: true,
      };
    }

    // Default Arabic Script -> Standard Urdu
    return {
      languageCode: "ur-PK",
      languageName: "اردو (Urdu)",
      confidence: 0.9,
      isRegional: true,
    };
  }

  // Latin / English Script token analysis (Roman Urdu, Roman Punjabi, English)
  const normalized = text.toLowerCase();
  const words = normalized.split(/[^a-z0-9]+/).filter((w) => w.length > 0);

  let romanUrduMatches = 0;
  let romanPunjabiMatches = 0;
  let englishMatches = 0;

  for (const word of words) {
    if (ROMAN_URDU_WORDS.has(word)) {
      romanUrduMatches++;
    }
    if (ROMAN_PUNJABI_WORDS.has(word)) {
      romanPunjabiMatches++;
    }
    if (ENGLISH_DICTIONARY.has(word)) {
      englishMatches++;
    }
  }

  // Roman Punjabi check
  if (romanPunjabiMatches >= 2 && romanPunjabiMatches >= romanUrduMatches) {
    return {
      languageCode: "pa-PK",
      languageName: "Punjabi (Roman)",
      confidence: 0.88,
      isRegional: true,
    };
  }

  // Urdu answers commonly contain more English technical terms than Urdu
  // function words, so a couple of strong Roman Urdu markers should outweigh
  // vocabulary such as "database", "performance", or "production".
  if (romanUrduMatches >= 2) {
    const confidence = Math.min(0.98, 0.65 + (romanUrduMatches / (words.length || 1)) * 0.35);
    return {
      languageCode: "ur-Roman",
      languageName: "Roman Urdu",
      confidence,
      isRegional: true,
    };
  }

  // English vs Roman Urdu evaluation:
  if (englishMatches > 0 && englishMatches > romanUrduMatches) {
    return {
      languageCode: "en-US",
      languageName: "English",
      confidence: Math.min(0.98, 0.7 + (englishMatches / (words.length || 1)) * 0.28),
      isRegional: false,
    };
  }

  if (romanUrduMatches >= 1) {
    const confidence = Math.min(0.98, 0.65 + (romanUrduMatches / (words.length || 1)) * 0.35);
    return {
      languageCode: "ur-Roman",
      languageName: "Roman Urdu",
      confidence,
      isRegional: true,
    };
  }

  // If purely English words
  if (englishMatches > 0) {
    return {
      languageCode: "en-US",
      languageName: "English",
      confidence: 0.85,
      isRegional: false,
    };
  }

  // Default fallback for ambiguous Roman text
  return {
    languageCode: "ur-Roman",
    languageName: "Roman Urdu",
    confidence: 0.6,
    isRegional: true,
  };
}

// ---------------------------------------------------------------------------
// Transcript language alignment (Pakistan-first)
// Spoken Urdu/Hindi are nearly identical, so ASR engines often render Urdu
// speech in Devanagari (Hindi script). When the selected language is Urdu,
// the user's transcript must stay in Roman/Latin — never Devanagari.
// ---------------------------------------------------------------------------

const DEVANAGARI_CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "w",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  "ळ": "l", "क़": "q", "ख़": "kh", "ग़": "g",
  "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f", "य़": "y",
};

const DEVANAGARI_MATRAS: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
  "ृ": "ri", "ॅ": "e", "े": "e", "ै": "ai", "ॉ": "o", "ो": "o", "ौ": "au",
};

const DEVANAGARI_VOWELS: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ऋ": "ri", "ऍ": "e", "ए": "e", "ऐ": "ai", "ऑ": "o", "ओ": "o", "औ": "au",
};

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

const DEVANAGARI_RANGE = /[\u0900-\u097F]/;

/** Lightweight Devanagari -> Roman transliteration for display transcripts. */
export function devanagariToRoman(text: string): string {
  const chars = Array.from(text);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];
    const nextIsDevanagari = next !== undefined && DEVANAGARI_RANGE.test(next);

    const consonant = DEVANAGARI_CONSONANTS[ch];
    if (consonant) {
      out += consonant;
      if (next === "्") {
        i += 1; // halant: no inherent vowel
      } else if (next && DEVANAGARI_MATRAS[next]) {
        out += DEVANAGARI_MATRAS[next];
        i += 1;
      } else if (!nextIsDevanagari) {
        // word-final consonant: drop the inherent "a" (hoon, theek, karta...)
      } else {
        out += "a"; // inherent schwa
      }
      continue;
    }
    if (DEVANAGARI_VOWELS[ch]) {
      out += DEVANAGARI_VOWELS[ch];
      continue;
    }
    if (DEVANAGARI_MATRAS[ch]) {
      out += DEVANAGARI_MATRAS[ch]; // stray matra without base consonant
      continue;
    }
    if (ch === "ं" || ch === "ँ") {
      out += "n";
      continue;
    }
    if (ch === "ः") {
      out += "h";
      continue;
    }
    if (ch === "्") {
      continue;
    }
    if (DEVANAGARI_DIGITS[ch]) {
      out += DEVANAGARI_DIGITS[ch];
      continue;
    }
    if (ch === "।" || ch === "॥") {
      out += ".";
      continue;
    }
    out += ch; // Latin text, spaces, punctuation pass through untouched
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

/**
 * Keep the displayed transcript aligned with the interview language requirements.
 * When Urdu/Hindi or any Pakistani regional language is spoken, it must always be
 * kept in a Roman/Latin display form. English remains natural and uncluttered.
 */
export function normalizeTranscriptForLanguage(text: string, languageCode?: string): string {
  if (!text) return "";

  const normalizedText = text.replace(/\s+/g, " ").trim();
  if (!normalizedText) return "";

  const code = (languageCode || "").toLowerCase();
  const wantsRomanizedOutput =
    code.startsWith("ur") ||
    code.startsWith("hi") ||
    code.startsWith("pa") ||
    code.startsWith("ps") ||
    code.startsWith("sd") ||
    code.startsWith("skr") ||
    code.startsWith("bal") ||
    code.includes("roman") ||
    code.includes("pakistan") ||
    code.includes("regional");

  const hasArabicScript = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(normalizedText);
  const hasDevanagariScript = /[\u0900-\u097F]/.test(normalizedText);
  const detected = detectPakistaniLanguage(normalizedText);
  const transcriptLooksRegional =
    detected.isRegional &&
    detected.languageCode !== "en-US" &&
    detected.languageCode !== "en";

  // Preserve clean English responses when the transcript itself is English.
  if (!wantsRomanizedOutput && !hasArabicScript && !hasDevanagariScript && !transcriptLooksRegional) {
    return normalizedText;
  }

  // Romanize only when the actual speech content is regional Urdu/Hindi or if
  // the ASR leaked script into the transcript.
  if (hasArabicScript || hasDevanagariScript || transcriptLooksRegional) {
    return ensureRomanScript(normalizedText);
  }

  return normalizedText;
}
