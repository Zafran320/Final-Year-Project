import { z } from "zod";

export const interviewLevelSchema = z.object({
  level_number: z.number().int().min(1).max(10),
  difficulty: z.enum(["Easy", "Intermediate", "Hard"]),
  title: z.string().min(1),
  focus_area: z.string().min(1),
  ai_prompt_instructions: z.string().min(10),
  question_count: z.number().int().default(3),
  estimated_duration_min: z.number().int().default(5),
});

export type InterviewLevel = z.infer<typeof interviewLevelSchema>;

export const generateRoadmapInputSchema = z.object({
  user_cv_data: z.object({
    fullName: z.string().optional(),
    targetRole: z.string().optional(),
    experience: z.string().optional(),
    skills: z.string().optional(),
    education: z.string().optional(),
    projects: z.string().optional(),
    summary: z.string().optional(),
    verifiedDetails: z.string().optional(),
  }).optional(),
  job_description_data: z.object({
    companyName: z.string().optional(),
    companyWebsite: z.string().optional(),
    targetRole: z.string().optional(),
    jobDescription: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
});

export type GenerateRoadmapInput = z.infer<typeof generateRoadmapInputSchema>;

export const roadmapResponseSchema = z.object({
  sessionId: z.number(),
  currentLevel: z.number(),
  status: z.string(),
  companyName: z.string().nullable(),
  targetRole: z.string().nullable(),
  levels: z.array(interviewLevelSchema),
});

export type RoadmapResponse = z.infer<typeof roadmapResponseSchema>;
