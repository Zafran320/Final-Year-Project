/** Helpers for turning a raw provider posting into a ScrapedJob. Shared by JSearch and SerpApi. */
import type { JobPlatformSource, ScrapedJob } from "./careerOpsScraper";

/** Maps a publisher name ("LinkedIn", "via Indeed", "Rozee.pk") to our source id; anything else is Google Jobs. */
export function publisherToPlatform(publisher: string | null | undefined): JobPlatformSource {
  const p = (publisher || "").toLowerCase();
  if (p.includes("linkedin")) return "linkedin";
  if (p.includes("indeed")) return "indeed";
  if (p.includes("glassdoor")) return "glassdoor";
  if (p.includes("rozee")) return "rozee";
  return "googlejobs";
}

export function inferExperience(title: string): ScrapedJob["experienceLevel"] {
  const t = title.toLowerCase();
  if (/\b(lead|principal|head|manager|architect)\b/.test(t)) return "Lead";
  if (/\b(senior|sr\.?)\b/.test(t)) return "Senior";
  if (/\b(junior|jr\.?|intern|internship|trainee|graduate|entry)\b/.test(t)) return "Entry / Junior";
  return "Mid-Level";
}

export function inferWorkMode(isRemote: boolean | null | undefined, description: string | null | undefined): ScrapedJob["workMode"] {
  if (isRemote) return "Remote";
  return /\bhybrid\b/i.test(description || "") ? "Hybrid" : "On-site";
}

const SKILL_POOL = [
  "React", "TypeScript", "JavaScript", "Node.js", "Python", "Java", "SQL", "PostgreSQL", "MongoDB",
  "Next.js", "Angular", "Vue.js", "Django", "Laravel", "PHP", ".NET", "C#", "Flutter", "React Native",
  "Kotlin", "Swift", "AWS", "Azure", "Docker", "Kubernetes", "Go", "GraphQL", "Figma", "Machine Learning",
];

/** Skills actually named in the posting text; never padded with guesses. */
export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_POOL.filter((skill) => lower.includes(skill.toLowerCase())).slice(0, 8);
}

export function countryName(code: string | null | undefined) {
  if (!code) return "";
  if (code.toUpperCase() === "PK") return "Pakistan";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
