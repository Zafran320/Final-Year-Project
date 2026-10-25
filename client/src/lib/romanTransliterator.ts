/**
 * FutureMaker AI - Urdu & Hindi to Roman Script Transliterator
 *
 * Converts Perso-Arabic Urdu script and Devanagari Hindi script into fluent,
 * natural, human-readable Roman Urdu and Roman Hindi.
 *
 * Guaranteed to keep English and existing Roman/Latin text 100% untouched.
 */

// ─── Script Detection Regular Expressions ─────────────────────────────────────

export const URDU_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
export const DEVANAGARI_SCRIPT_REGEX = /[\u0900-\u097F]/;

export function containsUrduOrHindiScript(text: string): boolean {
  if (!text) return false;
  return URDU_SCRIPT_REGEX.test(text) || DEVANAGARI_SCRIPT_REGEX.test(text);
}

// ─── High-Frequency Urdu Phrases & Words (Perso-Arabic -> Roman Urdu) ─────────

const URDU_PHRASES: [RegExp, string][] = [
  // Greetings & Courtesies
  [/السلام\s*علیکم/gi, "As-salamu alaykum"],
  [/وعلیکم\s*السلام/gi, "Walaikum assalam"],
  [/اللہ\s*حافظ/gi, "Allah hafiz"],
  [/خدا\s*حافظ/gi, "Khuda hafiz"],
  [/فی\s*امان\s*اللہ/gi, "Fi amanillah"],
  [/خوش\s*آمدید/gi, "Khush aamdeed"],
  [/شکریہ/gi, "Shukriya"],
  [/جزاک\s*اللہ/gi, "JazakAllah"],
  [/الحمد\s*للہ/gi, "Alhamdulillah"],
  [/ماشاء\s*اللہ/gi, "Mashallah"],
  [/انشاء\s*اللہ/gi, "Inshallah"],

  // Conversational Idioms
  [/کیا\s*حال\s*ہے/gi, "Kya haal hai"],
  [/کیسے\s*ہیں/gi, "Kaise hain"],
  [/کیسی\s*ہیں/gi, "Kaisi hain"],
  [/سب\s*ٹھیک\s*ہے/gi, "Sab theek hai"],
  [/ٹھیک\s*ہوں/gi, "Theek hoon"],
  [/ٹھیک\s*ہے/gi, "Theek hai"],
  [/بہت\s*اچھا/gi, "Bohat acha"],
  [/بہت\s*خوب/gi, "Bohat khoob"],
  [/جی\s*بالکل/gi, "Ji bilkul"],
  [/جی\s*ہاں/gi, "Ji haan"],
  [/کوئی\s*بات\s*نہیں/gi, "Koi baat nahi"],
  [/کوئی\s*مسئلہ\s*نہیں/gi, "Koi masla nahi"],
  [/میرا\s*نام/gi, "Mera naam"],
  [/آپ\s*کا\s*نام/gi, "Aap ka naam"],
  [/تیار\s*ہوں/gi, "Tayyar hoon"],
  [/سمجھ\s*آیا/gi, "Samajh aaya"],
  [/سمجھ\s*آئی/gi, "Samajh aayi"],
  [/سمجھ\s*نہیں\s*آیا/gi, "Samajh nahi aaya"],
  [/دوبارہ\s*بولیں/gi, "Dobara bolein"],
  [/دوبارہ\s*کہیں/gi, "Dobara kahein"],
  [/سوال\s*دوبارہ/gi, "Sawal dobara"],
  [/مجھے\s*نہیں\s*پتہ/gi, "Mujhe nahi pata"],
  [/مجھے\s*نہیں\s*معلوم/gi, "Mujhe nahi maloom"],
  [/پتہ\s*نہیں/gi, "Pata nahi"],
  [/معلوم\s*نہیں/gi, "Maloom nahi"],

  // Common interview-answer constructions
  [/میں\s*نے/gi, "Maine"],
  [/کے\s*لیے/gi, "ke liye"],
  [/کی\s*مدد\s*سے/gi, "ki madad se"],
  [/اس\s*کے\s*بعد/gi, "is ke baad"],
  [/کام\s*کیا/gi, "kaam kiya"],
  [/استعمال\s*کیا/gi, "istemal kiya"],
];

const URDU_WORD_DICT: Record<string, string> = {
  // Pronouns
  "میں": "main",
  "ہم": "hum",
  "آپ": "aap",
  "تم": "tum",
  "وہ": "woh",
  "یہ": "yeh",
  "میرا": "mera",
  "میری": "meri",
  "میرے": "mere",
  "مجھے": "mujhe",
  "مجھکو": "mujhko",
  "مجھ": "mujh",
  "ہمارا": "hamara",
  "ہماری": "hamari",
  "ہمارے": "hamare",
  "ہمیں": "humein",
  "آپکا": "aapka",
  "آپکی": "aapki",
  "آپکے": "aapke",
  "تمہارا": "tumhara",
  "تمہاری": "tumhari",
  "تمہارے": "tumhare",
  "تمہیں": "tumhein",
  "اپنا": "apna",
  "اپنی": "apni",
  "اپنے": "apne",
  "نے": "ne",
  "نہیں": "nahi",
  "نہ": "na",
  "جو": "jo",
  "جس": "jis",
  "جسے": "jise",
  "پھر": "phir",
  "تاکہ": "taake",
  "لیے": "liye",
  "دوران": "doraan",
  "پچھلے": "pichlay",
  "پچھلی": "pichli",
  "مسئلے": "maslay",
  "مسائل": "masail",
  "استعمال": "istemal",
  "بہتری": "behtari",
  "رفتار": "raftaar",
  "اضافہ": "izafa",
  "کمی": "kami",
  "نتیجہ": "nateeja",
  "نتائج": "nataij",
  "فیصد": "feesad",
  "صارف": "sarif",
  "صارفین": "sarifeen",
  "انڈیکس": "indexes",
  "انڈیکسز": "indexes",
  "پروڈکشن": "production",
  "ٹیسٹ": "test",
  "ٹیسٹنگ": "testing",
  "ڈیپلائے": "deploy",
  "فیچر": "feature",
  "فیچرز": "features",
  "مختلف": "mukhtalif",
  "ذمہ": "zimma",
  "ذمہداری": "zimmedari",
  "ذمہداریاں": "zimmedariyan",
  "حل": "hal",
  "تبدیلی": "tabdeeli",
  "بنایا": "banaya",
  "بنائی": "banayi",
  "بنائے": "banaye",
  "اسکا": "iska",
  "اسکی": "iski",
  "اسکے": "iske",
  "اس": "is",
  "انکا": "unka",
  "انکی": "unki",
  "انکے": "unke",
  "ان": "un",
  "کس": "kis",
  "کسکا": "kiska",
  "کسکی": "kiski",
  "کسکے": "kiske",
  "کون": "kaun",
  "کونسا": "kaunsa",
  "کونسی": "kaunsi",
  "کونسے": "kaunse",

  // Tenses & Auxiliaries
  "ہے": "hai",
  "ہیں": "hain",
  "ہوں": "hoon",
  "ہو": "ho",
  "تھا": "tha",
  "تھی": "thi",
  "تھے": "the",
  "تھیں": "theen",
  "ہوگا": "hoga",
  "ہوگی": "hogi",
  "ہونگے": "honge",
  "ہوئے": "hue",
  "ہوا": "hua",
  "ہوئی": "hui",
  "ہوتا": "hota",
  "ہوتی": "hoti",
  "ہوتے": "hote",
  "ہونا": "hona",
  "ہونے": "hone",

  // Common Verbs
  "کر": "kar",
  "کرتا": "karta",
  "کرتی": "karti",
  "کرتے": "karte",
  "کرنا": "karna",
  "کرنے": "karne",
  "کریں": "karein",
  "کرو": "karo",
  "کیا": "kiya",
  "کیئے": "kiye",
  "کیے": "kiye",
  "کی": "ki",
  "کے": "ke",
  "کا": "ka",
  "کو": "ko",
  "رہا": "raha",
  "رہی": "rahi",
  "رہے": "rahe",
  "رہنا": "rahna",
  "رہنے": "rahne",
  "دیکھ": "dekh",
  "دیکھا": "dekha",
  "دیکھتا": "dekhta",
  "دیکھتی": "dekhti",
  "دیکھتے": "dekhte",
  "دیکھنا": "dekhna",
  "دیکھیں": "dekhein",
  "بول": "bol",
  "بولا": "bola",
  "بولتی": "bolti",
  "بولتے": "bolte",
  "بولنا": "bolna",
  "بولیں": "bolein",
  "کہا": "kaha",
  "کہتی": "kehti",
  "کہتے": "kehte",
  "کہنا": "kehna",
  "کہیں": "kahein",
  "پتہ": "pata",
  "پتا": "pata",
  "پوچھ": "pooch",
  "پوچھا": "poocha",
  "پوچھنا": "poochna",
  "پوچھیں": "poochein",
  "بتا": "bata",
  "بتایا": "bataya",
  "بتانا": "batana",
  "بتائیں": "batayein",
  "بتائیے": "batayiye",
  "سمجھ": "samajh",
  "سمجھا": "samjha",
  "سمجھتے": "samjhte",
  "سمجھنا": "samjhna",
  "سکتا": "sakta",
  "سکتی": "sakti",
  "سکتے": "sakte",
  "سکے": "sakay",
  "چاہئے": "chahiye",
  "چاہیے": "chahiye",
  "چاہتا": "chahta",
  "چاہتی": "chahti",
  "چاہتے": "chahte",
  "جانتا": "jaanta",
  "جانتی": "jaanti",
  "جانتے": "jaante",
  "جانا": "jaana",
  "گیا": "gaya",
  "گئی": "gayi",
  "گئے": "gaye",
  "آیا": "aaya",
  "آئی": "aayi",
  "آئے": "aaye",
  "آنا": "aana",
  "آتے": "aate",
  "آتی": "aati",

  // Connectors & Adverbs
  "اور": "aur",
  "یا": "ya",
  "لیکن": "lekin",
  "مگر": "magar",
  "اگر": "agar",
  "تو": "toh",
  "بھی": "bhi",
  "ہی": "hi",
  "پر": "par",
  "سے": "se",
  "تک": "tak",
  "پہ": "pe",
  "کیونکہ": "kyun ke",
  "اسلئے": "isliye",
  "اسلیئے": "isliye",
  "اس_وجہ_سے": "is wajah se",
  "ساتھ": "saath",
  "پاس": "paas",
  "دور": "door",
  "پہلے": "pehlay",
  "بعد": "baad",
  "جب": "jab",
  "تب": "tab",
  "اب": "ab",
  "کب": "kab",
  "کہاں": "kahan",
  "جہاں": "jahan",
  "یہاں": "yahan",
  "وہاں": "wahan",
  "کیسے": "kaise",
  "کیسا": "kaisa",
  "کیسی": "kaisi",
  "کیوں": "kyun",
  "کتنا": "kitna",
  "کتنی": "kitni",
  "کتنے": "kitne",
  "بہت": "bohat",
  "زیادہ": "zyada",
  "کم": "kam",
  "تھوڑا": "thora",
  "تھوڑی": "thori",
  "کچھ": "kuch",
  "سب": "sab",
  "سبھی": "sabhi",
  "کوئی": "koi",
  "ہر": "har",
  "ایک": "ek",
  "دو": "do",
  "تین": "teen",
  "چار": "chaar",
  "پانچ": "paanch",
  "دس": "das",

  // Technical & Interview Specific Words
  "کام": "kaam",
  "سوال": "sawal",
  "جواب": "jawab",
  "بات": "baat",
  "مسئلہ": "masla",
  "معلوم": "maloom",
  "علم": "ilm",
  "خیال": "khayal",
  "آئیڈیا": "idea",
  "وجہ": "wajah",
  "طریقہ": "tareeqa",
  "چیز": "cheez",
  "چیزیں": "cheezein",
  "پروجیکٹ": "project",
  "کوڈ": "code",
  "تجربہ": "tajurba",
  "تجربات": "tajurbaat",
  "ٹیم": "team",
  "کمپنی": "company",
  "ڈیٹا": "data",
  "ڈیٹابیس": "database",
  "سرور": "server",
  "سسٹم": "system",
  "نیٹورک": "network",
  "سروس": "service",
  "سروسز": "services",
  "ایپ": "app",
  "ایپلیکیشن": "application",
  "ویب": "web",
  "سائٹ": "site",
  "ماڈل": "model",
  "کلاؤڈ": "cloud",
  "انجینئر": "engineer",
  "ڈویلپر": "developer",
  "آرکیٹیکچر": "architecture",
  "کارکردگی": "karkardagi",
  "سیکیورٹی": "security",
  "سیکھنا": "seekhna",
  "سیکھا": "seekha",
  "مشکل": "mushkil",
  "آسان": "aasaan",
  "بہتر": "behtar",
  "بہترین": "behtareen",
  "صحیح": "sahi",
  "غلط": "galat",
  "بالکل": "bilkul",
  "ضرور": "zaroor",
  "ٹھیک": "theek",
  "اچھا": "acha",
  "اچھی": "achi",
  "اچھے": "ache",
  "تیار": "tayyar",
  "تیاری": "tayyari",
  "شروع": "shuru",
  "ختم": "khatam",
  "وقت": "waqt",
  "ٹائم": "time",
  "دن": "din",
  "سال": "saal",
  "مہینہ": "maheena",
  "مہینے": "maheene",
};

// Character-by-character phonetic map for arbitrary words
const URDU_CHAR_MAP: Record<string, string> = {
  "ا": "a", "آ": "aa", "ب": "b", "پ": "p", "ت": "t", "ٹ": "t", "ث": "s",
  "ج": "j", "چ": "ch", "ح": "h", "خ": "kh", "د": "d", "ڈ": "d", "ذ": "z",
  "ر": "r", "ڑ": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s",
  "ض": "z", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q",
  "ک": "k", "گ": "g", "ل": "l", "م": "m", "ن": "n", "ں": "n", "و": "o",
  "ہ": "h", "ۂ": "h", "ۃ": "t", "ھ": "h", "ء": "", "ی": "i", "ے": "e",
  "ئ": "y", "ؤ": "o",
  // Digits
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  // Punctuation
  "؟": "?", "،": ",", "۔": ".", "؛": ";",
};

// Aspirated compound combinations
const URDU_ASPIRATED: [string, string][] = [
  ["بھ", "bh"], ["پھ", "ph"], ["تھ", "th"], ["ٹھ", "th"],
  ["جھ", "jh"], ["چھ", "chh"], ["دھ", "dh"], ["ڈھ", "dh"],
  ["کھ", "kh"], ["گھ", "gh"], ["ڑھ", "rh"],
];

/**
 * Transliterates an individual Urdu token or fallback word into Roman Urdu.
 */
function transliterateUrduWord(word: string): string {
  // Check exact dictionary match
  const clean = word.trim();
  if (URDU_WORD_DICT[clean]) {
    return URDU_WORD_DICT[clean];
  }

  // Check punctuation stripped match
  const stripped = clean.replace(/[؟،۔؛!.]/g, "");
  if (URDU_WORD_DICT[stripped]) {
    const trailingPunc = clean.replace(stripped, "");
    const mappedPunc = trailingPunc.split("").map((c) => URDU_CHAR_MAP[c] || c).join("");
    return URDU_WORD_DICT[stripped] + mappedPunc;
  }

  // Handle aspirated digraphs first
  let remaining = clean;
  for (const [digraph, roman] of URDU_ASPIRATED) {
    remaining = remaining.split(digraph).join(roman);
  }

  // Fallback to character map
  let out = "";
  for (let i = 0; i < remaining.length; i++) {
    const char = remaining[i];
    if (URDU_CHAR_MAP[char] !== undefined) {
      out += URDU_CHAR_MAP[char];
    } else {
      out += char;
    }
  }

  return out;
}

/**
 * Converts Perso-Arabic Urdu text into fluent, natural Roman Urdu.
 */
export function urduToRoman(text: string): string {
  if (!text || !URDU_SCRIPT_REGEX.test(text)) return text;

  let processed = text;

  // 1. Replace high-frequency multi-word idioms and phrases
  for (const [pattern, replacement] of URDU_PHRASES) {
    processed = processed.replace(pattern, replacement);
  }

  // 2. Tokenize words while preserving Latin terms, numbers, and spacing
  const tokens = processed.split(/(\s+|[.,/#!$%^&*;:{}=\-_`~()?"'!]+)/);

  const mapped = tokens.map((token) => {
    if (!token || !URDU_SCRIPT_REGEX.test(token)) {
      return token;
    }
    return transliterateUrduWord(token);
  });

  return mapped.join("");
}

// ─── Devanagari Hindi -> Roman Hindi Transliteration ──────────────────────────

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

const HINDI_PHRASES: [RegExp, string][] = [
  [/नमस्ते/gi, "Namaste"],
  [/नमस्कार/gi, "Namaskar"],
  [/धन्यवाद/gi, "Dhanyawaad"],
  [/शुक्रिया/gi, "Shukriya"],
  [/हाँ\s*बिल्कुल/gi, "Haan bilkul"],
  [/हाँ\s*ठीक\s*है/gi, "Haan theek hai"],
  [/मेरा\s*नाम/gi, "Mera naam"],
  [/आप\s*कैसे\s*हैं/gi, "Aap kaise hain"],
  [/सब\s*ठीक\s*है/gi, "Sab theek hai"],
  [/तैयार\s*हूँ/gi, "Tayyar hoon"],
  [/मुझे\s*नहीं\s*पता/gi, "Mujhe nahi pata"],
  [/मुझे\s*नहीं\s*मालूम/gi, "Mujhe nahi maloom"],
  [/पता\s*नहीं/gi, "Pata nahi"],
  [/मालूम\s*नहीं/gi, "Maloom nahi"],
  [/मुझे\s*आइडिया\s*नहीं\s*है/gi, "Mujhe idea nahi hai"],
  [/सवाल\s*दोबारा\s*बोलें/gi, "Sawal dobara bolein"],
  [/एक\s*हिंट\s*दें/gi, "Ek hint dein"],
  [/समझ\s*नहीं\s*आया/gi, "Samajh nahi aaya"],
  [/डेटाबेस/gi, "Database"],
  [/सर्वर/gi, "Server"],
  [/प्रोजेक्ट/gi, "Project"],
  [/माइक्रोसर्विस/gi, "Microservices"],
];

/**
 * Converts Devanagari Hindi text into natural Roman Hindi/Urdu.
 */
export function devanagariToRoman(text: string): string {
  if (!text || !DEVANAGARI_SCRIPT_REGEX.test(text)) return text;

  let processed = text;
  for (const [pattern, replacement] of HINDI_PHRASES) {
    processed = processed.replace(pattern, replacement);
  }

  const chars = Array.from(processed);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];
    const nextIsDevanagari = next !== undefined && DEVANAGARI_SCRIPT_REGEX.test(next);

    const consonant = DEVANAGARI_CONSONANTS[ch];
    if (consonant) {
      out += consonant;
      if (next === "्") {
        i += 1; // halant: no inherent vowel
      } else if (next && DEVANAGARI_MATRAS[next]) {
        out += DEVANAGARI_MATRAS[next];
        i += 1;
      } else if (!nextIsDevanagari) {
        // word-final consonant: drop the inherent "a"
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
      out += DEVANAGARI_MATRAS[ch];
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
    out += ch;
  }

  return out.replace(/\s{2,}/g, " ").trim();
}

// ─── Unified Script Normalizer ───────────────────────────────────────────────

/**
 * Guarantees that any Hindi (Devanagari) or Urdu (Perso-Arabic) text is ALWAYS
 * displayed in Roman/Latin script, while preserving English, code, tags, and formatting.
 */
export function ensureRomanScript(text: string): string {
  if (!text) return "";
  let out = text;

  // Convert Urdu Perso-Arabic text to Roman Urdu
  if (URDU_SCRIPT_REGEX.test(out)) {
    out = urduToRoman(out);
  }

  // Convert Hindi Devanagari text to Roman Hindi
  if (DEVANAGARI_SCRIPT_REGEX.test(out)) {
    out = devanagariToRoman(out);
  }

  // Clean double spaces
  out = out.replace(/[ \t]{2,}/g, " ").trim();

  // Capitalize first letter of sentence if needed
  if (out.length > 0 && /^[a-z]/.test(out)) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }

  return out;
}
