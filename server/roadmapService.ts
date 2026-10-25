import { z } from "zod";
import { getGeminiApiKey, getAutoDiscoveredGeminiModels } from "./gemini";
import { createInterviewSession, getLatestInterviewSessionByUserId, updateInterviewSession } from "./db";
import type { InterviewSession } from "../drizzle/schema";
import {
  interviewLevelSchema,
  type InterviewLevel,
  generateRoadmapInputSchema,
  type GenerateRoadmapInput,
  roadmapResponseSchema,
  type RoadmapResponse,
} from "../shared/roadmapTypes";

export {
  interviewLevelSchema,
  type InterviewLevel,
  generateRoadmapInputSchema,
  type GenerateRoadmapInput,
  roadmapResponseSchema,
  type RoadmapResponse,
};


/* ─── Gemini Prompt Construction ────────────────────────────────────────── */

function buildGeminiRoadmapPrompt(input: GenerateRoadmapInput): string {
  const cv = input.user_cv_data || {};
  const job = input.job_description_data || {};

  return `You are an elite, world-class Technical Recruiter, Principal Engineer, and Executive Hiring Director.
Your task is to analyze the candidate's CV profile and the target job/company description, identify skill gaps and alignment areas, and synthesize a **strictly structured 10-level mock interview progression matrix**.

### Candidate Profile:
- Name: ${cv.fullName || "Candidate"}
- Target Role: ${cv.targetRole || job.targetRole || "Software Engineer"}
- Summary: ${cv.summary || "Not specified"}
- Skills & Tech Stack: ${cv.skills || "Not specified"}
- Experience & History: ${cv.experience || "Not specified"}
- Key Projects: ${cv.projects || "Not specified"}
- Education / Certifications: ${cv.education || "Not specified"}

### Target Job & Company Information:
- Company Name: ${job.companyName || "Target Company"}
- Role: ${job.targetRole || "Target Position"}
- Job Description: ${job.jobDescription || "Standard technical requirements and responsibilities"}
- Key Requirements: ${job.requirements?.join(", ") || "Standard domain competencies"}
- Notes / Context: ${job.notes || "None"}

### Progression Constraints:
You MUST create exactly 10 distinct, sequential interview levels adhering to this progression:
1. **Levels 1–3 (Easy)**: Icebreakers, background walkthrough, resume verification, culture alignment, and basic role motivation.
2. **Levels 4–7 (Intermediate)**: Deep scenario-based inquiries, STAR methodology behavioral evaluations, core technical architecture, problem-solving, and live system reasoning.
3. **Levels 8–10 (Hard)**: High-pressure situational stress testing, production outage triage, complex stakeholder conflict resolution, executive trade-offs, and critical leadership dilemmas under fire.

### Output Constraints:
You MUST reply strictly with a valid JSON array of 10 objects matching this exact structure:
[
  {
    "level_number": 1,
    "difficulty": "Easy",
    "title": "Level 1: Title Here",
    "focus_area": "Concise summary of topics evaluated",
    "ai_prompt_instructions": "Detailed adaptive instructions telling the live AI interviewer which focus area to stay inside, how to grade every answer (STRONG / PARTIAL / WEAK), and how to reinforce in real time — escalate deeper when strong, probe the specific gap when partial, simplify and coach when weak. Questions are UNLIMITED and generated live turn-by-turn; NEVER list or script specific questions.",
    "question_count": 3,
    "estimated_duration_min": 5
  },
  ...
  {
    "level_number": 10,
    "difficulty": "Hard",
    "title": "Level 10: Title Here",
    "focus_area": "High-stakes executive stress test & trade-offs",
    "ai_prompt_instructions": "Detailed adaptive instructions (as above — reinforcement loop, no scripted questions)...",
    "question_count": 4,
    "estimated_duration_min": 10
  }
]

IMPORTANT: "question_count" is the STAGE GOAL — the recommended number of exchanges to complete the stage at real-interview pacing (the live interviewer suggests wrapping up around it, but the candidate may keep practicing with unlimited extra questions). Never write fixed questions into any field.

DO NOT return any surrounding markdown commentary or markdown code fences if possible, just raw valid JSON.`;
}

function normalizeLevels(items: any[]): InterviewLevel[] {
  return items.map((item, idx) => {
    const levelNum = Number(item.level_number || item.level || idx + 1);
    let diff: "Easy" | "Intermediate" | "Hard" = "Intermediate";
    if (levelNum <= 3) diff = "Easy";
    else if (levelNum >= 8) diff = "Hard";
    else diff = "Intermediate";

    return interviewLevelSchema.parse({
      level_number: levelNum,
      difficulty: (item.difficulty as "Easy" | "Intermediate" | "Hard") || diff,
      title: item.title || `Level ${levelNum}: ${item.focus_area || "Interview Stage"}`,
      focus_area: item.focus_area || item.focus || "Core Competencies",
      ai_prompt_instructions: item.ai_prompt_instructions || item.instructions || item.prompt || "Conduct an interactive interview evaluating the candidate's answers.",
      question_count: Number(item.question_count) || (levelNum <= 3 ? 3 : levelNum <= 7 ? 4 : 5),
      estimated_duration_min: Number(item.estimated_duration_min) || (levelNum <= 3 ? 5 : 8),
    });
  });
}

function extractJsonArray(raw: string): InterviewLevel[] {
  let cleaned = raw.trim();
  // Remove markdown code fences like ```json ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // Remove control characters except tab, newline, carriage return
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  // 1. Direct JSON parse
  try {
    let candidate = cleaned;
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      candidate = candidate.slice(start, end + 1);
    }
    // Remove trailing commas before closing brackets
    candidate = candidate.replace(/,\s*([\}\]])/g, "$1");
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeLevels(parsed);
    }
  } catch {
    // Continue to repair attempts
  }

  // 2. Stream recovery: Extract individual complete JSON objects { ... }
  const objects: any[] = [];
  const objectRegex = /\{[\s\S]*?"(?:level_number|level)"[\s\S]*?\}(?=\s*,\s*\{|\s*\]|\s*$)/g;
  let match;
  while ((match = objectRegex.exec(cleaned)) !== null) {
    try {
      const objStr = match[0].replace(/,\s*([\}\]])/g, "$1");
      const obj = JSON.parse(objStr);
      if (obj && (obj.level_number || obj.level || obj.title || obj.focus_area)) {
        objects.push(obj);
      }
    } catch {}
  }

  if (objects.length > 0) {
    return normalizeLevels(objects);
  }

  // 3. Auto-close truncated array
  try {
    let candidate = cleaned;
    const start = candidate.indexOf("[");
    if (start !== -1) {
      candidate = candidate.slice(start);
      // Auto-close string if open
      let inString = false;
      let escaped = false;
      for (let i = 0; i < candidate.length; i++) {
        const char = candidate[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') inString = false;
        } else if (char === '"') {
          inString = true;
        }
      }
      if (inString) candidate += '"';
      candidate = candidate.replace(/,\s*$/, "");
      if (!candidate.endsWith("]")) candidate += "\n]";
      candidate = candidate.replace(/,\s*([\}\]])/g, "$1");
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeLevels(parsed);
      }
    }
  } catch {}

  throw new Error("Could not extract interview level array from model output.");
}

/* ─── Fallback Matrix Generator (Offline / Fail-Safe) ─────────────────────── */

// Shared reinforcement directive appended to every stage: questions are
// unlimited and generated live — the interviewer adapts turn by turn.
const ADAPTIVE_QUESTION_DIRECTIVE = ` Questions are UNLIMITED — generate each one live from the candidate's previous answer. Silently grade every answer (STRONG / PARTIAL / WEAK): STRONG → escalate deeper with a harder follow-up; PARTIAL → probe the specific gap; WEAK → simplify, coach briefly, and re-approach from an easier angle. Never repeat a question and never use a scripted question list. Treat "question_count" as the stage goal: around that number of exchanges, be ready to warmly suggest wrapping up the stage when directed.`;

function generateFallbackRoadmap(input: GenerateRoadmapInput): InterviewLevel[] {
  const role = input.job_description_data.targetRole || "Software Engineer";
  const company = input.job_description_data.companyName || "Target Company";

  const levels: InterviewLevel[] = [
    {
      level_number: 1,
      difficulty: "Easy",
      title: "Level 1: Background & Resume Validation",
      focus_area: "Work history, key projects, and career trajectory",
      ai_prompt_instructions: `Act as a warm hiring manager at ${company}. Validate the candidate's resume achievements, verify core tech stack familiarity for ${role}, and explore their motivation for joining.`,
      question_count: 3,
      estimated_duration_min: 5,
    },
    {
      level_number: 2,
      difficulty: "Easy",
      title: "Level 2: Culture Fit & Work Style",
      focus_area: "Collaboration, agility, and communication",
      ai_prompt_instructions: `Evaluate how the candidate collaborates in cross-functional teams, handles asynchronous communication, and adapts to ${company}'s fast-paced engineering culture.`,
      question_count: 3,
      estimated_duration_min: 5,
    },
    {
      level_number: 3,
      difficulty: "Easy",
      title: "Level 3: Core Technical Foundations",
      focus_area: "Fundamental concepts, syntax, and tooling",
      ai_prompt_instructions: `Probe baseline understanding of key tools, data structures, and core principles needed for ${role}.`,
      question_count: 3,
      estimated_duration_min: 6,
    },
    {
      level_number: 4,
      difficulty: "Intermediate",
      title: "Level 4: STAR Behavioral - Conflict & Ownership",
      focus_area: "Ownership, handling disagreements, and accountability",
      ai_prompt_instructions: `Ask STAR method questions about a time the candidate had a technical disagreement with a peer or lead, how they navigated trade-offs, and the measurable outcome.`,
      question_count: 4,
      estimated_duration_min: 7,
    },
    {
      level_number: 5,
      difficulty: "Intermediate",
      title: "Level 5: Practical Problem Solving & Scenario",
      focus_area: "Applied architecture, debugging, and edge cases",
      ai_prompt_instructions: `Present a realistic real-world engineering challenge relevant to ${company}. Ask the candidate to step through their diagnosis, design decisions, and testing strategy.`,
      question_count: 4,
      estimated_duration_min: 8,
    },
    {
      level_number: 6,
      difficulty: "Intermediate",
      title: "Level 6: System Design & Scalability",
      focus_area: "Data flow, caching, bottleneck resolution",
      ai_prompt_instructions: `Evaluate system design acumen for ${role}. Test knowledge of microservices/monolith trade-offs, database indexing, latency optimization, and reliability patterns.`,
      question_count: 4,
      estimated_duration_min: 8,
    },
    {
      level_number: 7,
      difficulty: "Intermediate",
      title: "Level 7: Security, Resilience & Testing",
      focus_area: "Defensive coding, CI/CD, and regression prevention",
      ai_prompt_instructions: `Probe the candidate's mindset regarding security vulnerabilities (OWASP), automated testing pipelines, and disaster recovery strategies.`,
      question_count: 4,
      estimated_duration_min: 8,
    },
    {
      level_number: 8,
      difficulty: "Hard",
      title: "Level 8: High-Pressure Production Outage",
      focus_area: "Incident response, root cause analysis, and triage",
      ai_prompt_instructions: `Place candidate into an active P0 production incident scenario where traffic spikes by 10x and error rates are climbing. Evaluate composure, triage prioritization, and rollback decisions.`,
      question_count: 4,
      estimated_duration_min: 9,
    },
    {
      level_number: 9,
      difficulty: "Hard",
      title: "Level 9: Architectural Deadlock & Trade-offs",
      focus_area: "Technical governance, legacy refactoring, and cost",
      ai_prompt_instructions: `Simulate a high-stakes meeting where leadership demands a 3-month feature delivered in 3 weeks. Ask candidate how they compromise without accumulating fatal technical debt.`,
      question_count: 4,
      estimated_duration_min: 9,
    },
    {
      level_number: 10,
      difficulty: "Hard",
      title: "Level 10: Executive Leadership & Stress Test",
      focus_area: "Vision, high-stakes trade-offs, and critical judgment",
      ai_prompt_instructions: `Act as the VP of Engineering asking demanding, multi-variable strategic questions. Test how candidate makes decisions with incomplete data and defends their technical decisions.`,
      question_count: 5,
      estimated_duration_min: 10,
    },
  ];

  return levels.map((level) => ({
    ...level,
    ai_prompt_instructions: `${level.ai_prompt_instructions}${ADAPTIVE_QUESTION_DIRECTIVE}`,
  }));
}

/* ─── Core Generation Function ───────────────────────────────────────────── */

export async function generateRoadmapMatrix(
  userId: number,
  input: GenerateRoadmapInput
): Promise<RoadmapResponse> {
  const apiKey = getGeminiApiKey();
  let levels: InterviewLevel[] = [];

  if (apiKey) {
    try {
      const models = await getAutoDiscoveredGeminiModels(apiKey);
      const prompt = buildGeminiRoadmapPrompt(input);

      for (const model of models.slice(0, 3)) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.4,
                  maxOutputTokens: 8192,
                  responseMimeType: "application/json",
                },
              }),
              signal: AbortSignal.timeout(30000),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = extractJsonArray(text);
              if (parsed.length > 0) {
                levels = parsed.slice(0, 10);
                if (levels.length >= 10) break;
              }
            }
          }
        } catch (modelErr) {
          console.warn(`[Roadmap AI] Model ${model} call failed, trying next:`, modelErr);
        }
      }
    } catch (err) {
      console.warn("[Roadmap AI] Gemini generation error, using deterministic fallback:", err);
    }
  }

  // If Gemini returned partial levels (e.g. 5-9 levels), seamlessly complete with fallback levels
  if (levels.length > 0 && levels.length < 10) {
    const fallback = generateFallbackRoadmap(input);
    for (let i = levels.length; i < 10; i++) {
      levels.push(fallback[i]);
    }
  }

  // If Gemini was completely unavailable, use the full high-quality customized fallback matrix
  if (levels.length < 10) {
    levels = generateFallbackRoadmap(input);
  }

  // Save to Database (interviewSessions table)
  const session = await createInterviewSession({
    userId,
    companyName: input.job_description_data.companyName || null,
    targetRole: input.job_description_data.targetRole || null,
    jobDescription: input.job_description_data.jobDescription || null,
    resumeSummary: input.user_cv_data?.summary || null,
    levels: JSON.stringify(levels),
    currentLevel: 1,
    status: "generated",
    metadata: JSON.stringify({
      skills: input.user_cv_data?.skills,
      generatedAt: new Date().toISOString(),
    }),
  });

  return {
    sessionId: session.id,
    currentLevel: session.currentLevel,
    status: session.status,
    companyName: session.companyName,
    targetRole: session.targetRole,
    levels,
  };
}
