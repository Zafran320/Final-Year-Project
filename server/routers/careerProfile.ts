import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getCareerProfileByUserId, upsertCareerProfile } from "../db";
import { extractResumeSuggestions, normalizePublicHttpsUrl, normalizeResumePayload, resumeSuggestionSchema } from "../gemini";
import { getGitHubRepositoryMetadataForLinks } from "../github";
import { storageGetBuffer, storageGetSignedUrl, storagePut } from "../storage";
import { JOB_PLATFORM_SOURCES, buildJobBoardSearchLinks, scrapeAndEvaluateLiveJobs } from "../services/careerOpsScraper";
import { DEFAULT_LOCATION_LABEL, findKnownCity } from "../../shared/pakistanCities";
import { createRateLimiter } from "../_core/requestGuards";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { allowedResumeTypes, type AllowedResumeType } from "../../shared/const";
export { allowedResumeTypes, type AllowedResumeType };

const educationValues = ["Bachelor's", "Master's", "MPhil", "PhD", "Diploma", "Other"] as const;
const careerStatusValues = ["working", "seeking"] as const;
const lookingForValues = ["First Job", "Internship", "Freelance", "Career Switch", "Higher Studies"] as const;
const maxResumeBytes = 5 * 1024 * 1024;
const allowedProfilePhotoTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const maxProfilePhotoBytes = 2 * 1024 * 1024;
const resumeReviewCacheVersion = "resume-review-v3:";
// Normal browsing needs a handful of searches per hour; this stops one account from draining the monthly job-search quota.
const liveJobsLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 40 });

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const nullablePublicHttpsUrl = (max: number) => nullableText(max).transform((value) => value ? normalizePublicHttpsUrl(value) || null : value);

export const careerProfileInput = z.object({
  fullName: nullableText(160),
  location: nullableText(160),
  phone: nullableText(64),
  contactEmail: nullableText(320),
  linkedinUrl: nullablePublicHttpsUrl(500),
  portfolioUrl: nullablePublicHttpsUrl(500),
  age: z.number().int().min(16).max(99).nullable().optional(),
  education: z.enum(educationValues).nullable().optional(),
  degree: nullableText(180),
  careerStatus: z.enum(careerStatusValues).nullable().optional(),
  currentJob: nullableText(180),
  company: nullableText(180),
  lookingFor: z.enum(lookingForValues).nullable().optional(),
  careerField: nullableText(120),
  targetRole: nullableText(180),
  skills: nullableText(2000),
  experience: nullableText(6000),
  professionalSummary: nullableText(1600),
  certifications: nullableText(6000),
  languages: nullableText(2000),
  projects: nullableText(12_000),
  verifiedDetails: nullableText(6000),
  personalizationEnabled: z.boolean().optional(),
  jobRecommendationsEnabled: z.boolean().optional(),
  professionalConnectionsEnabled: z.boolean().optional(),
});

type ProfileData = z.infer<typeof careerProfileInput>;

export function profileIsComplete(profile: ProfileData) {
  return Boolean(profile.fullName?.trim() && profile.education && profile.careerStatus && profile.targetRole?.trim() && profile.skills?.trim());
}

function sanitizeResumeName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "resume";
}

function base64ByteSize(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function profilePhotoExtension(mimeType: (typeof allowedProfilePhotoTypes)[number]) {
  return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
}

function profilePhotoSignatureMatches(file: Buffer, mimeType: (typeof allowedProfilePhotoTypes)[number]) {
  if (mimeType === "image/jpeg") return file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff;
  if (mimeType === "image/png") return file.length >= 8 && file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return file.length >= 12 && file.subarray(0, 4).equals(Buffer.from("RIFF")) && file.subarray(8, 12).equals(Buffer.from("WEBP"));
}

export const careerProfileRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return (await getCareerProfileByUserId(ctx.user.id)) ?? null;
  }),

  githubMetadata: protectedProcedure.input(z.object({ links: z.array(z.string().trim().max(500)).max(8) })).query(async ({ input }) => ({
    repositories: await getGitHubRepositoryMetadataForLinks(input.links),
  })),

  previewResume: protectedProcedure.mutation(async ({ ctx }) => {
    const current = await getCareerProfileByUserId(ctx.user.id);
    const legacyKey = current?.resumeUrl?.match(/\/manus-storage\/([^?]+)/)?.[1];
    const key = current?.resumeKey ?? legacyKey;
    if (!key || !current?.resumeMimeType || !current.resumeName) throw new Error("Upload a resume before opening its preview.");
    const url = await storageGetSignedUrl(key);
    return { url, mimeType: current.resumeMimeType, name: current.resumeName };
  }),

  save: protectedProcedure.input(careerProfileInput).mutation(async ({ ctx, input }) => {
    const isComplete = profileIsComplete(input);
    const profile = await upsertCareerProfile(ctx.user.id, { ...input, isComplete });
    return { profile, isComplete };
  }),

  uploadResume: protectedProcedure.input(z.object({
    fileName: z.string().trim().min(1).max(260),
    mimeType: z.enum(allowedResumeTypes),
    contentBase64: z.string().min(4).max(7_000_000),
  })).mutation(async ({ ctx, input }) => {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.contentBase64)) throw new Error("The resume data could not be validated.");

    const size = base64ByteSize(input.contentBase64);
    if (size <= 0 || size > maxResumeBytes) throw new Error("Resume files must be smaller than 5 MB.");

    const extension = input.fileName.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "doc", "docx"].includes(extension)) throw new Error("Please upload a PDF, DOC, or DOCX resume.");

    const safeName = sanitizeResumeName(input.fileName);
    const key = `users/${ctx.user.id}/resumes/${randomUUID()}-${safeName}`;
    const storedResume = await storagePut(key, Buffer.from(input.contentBase64, "base64"), input.mimeType);
    const profile = await upsertCareerProfile(ctx.user.id, {
      resumeKey: storedResume.key,
      resumeUrl: storedResume.url,
      resumeName: safeName,
      resumeSize: size,
      resumeMimeType: input.mimeType,
      resumeReviewCache: null,
      resumeReviewCacheKey: null,
    });

    return { profile, suggestions: null, aiMessage: "Resume uploaded securely. Gemini review is ready to start." };
  }),

  analyzeResume: protectedProcedure.input(
    z.object({
      contentBase64: z.string().min(4).optional(),
      mimeType: z.enum(allowedResumeTypes).optional(),
    }).optional()
  ).mutation(async ({ ctx, input }) => {
    let fileBuffer: Buffer | null = null;
    let mimeTypeToUse: (typeof allowedResumeTypes)[number] | undefined = input?.mimeType;

    if (input?.contentBase64 && input?.mimeType) {
      fileBuffer = Buffer.from(input.contentBase64, "base64");
      mimeTypeToUse = input.mimeType;
    }

    const current = await getCareerProfileByUserId(ctx.user.id);

    // If input buffer was NOT directly provided, read from current profile and persistent storage
    if (!fileBuffer) {
      if (!current?.resumeKey || !current.resumeMimeType) throw new Error("Upload a resume before starting AI review.");
      mimeTypeToUse = current.resumeMimeType as (typeof allowedResumeTypes)[number];

      const cacheKey = `${resumeReviewCacheVersion}${current.resumeKey}`;
      if (current.resumeReviewCacheKey === cacheKey && current.resumeReviewCache) {
        try {
          const cached = resumeSuggestionSchema.safeParse(normalizeResumePayload(JSON.parse(current.resumeReviewCache)));
          if (cached.success) {
            const isUsable = Boolean(cached.data.fullName || cached.data.skills.length > 0 || cached.data.experience.length > 0);
            if (isUsable) {
              const serializedCache = JSON.stringify(cached.data);
              if (serializedCache !== current.resumeReviewCache) {
                await upsertCareerProfile(ctx.user.id, { resumeReviewCache: serializedCache, resumeReviewCacheKey: cacheKey });
              }
              return { suggestions: cached.data, aiMessage: null, source: "cached" as const };
            }
            console.log(`[Resume AI] Cached review for user ${ctx.user.id} was empty; bypassing cache to extract fresh.`);
          }
        } catch {
          console.warn(`[Resume AI] Ignoring invalid private review cache for user ${ctx.user.id}.`);
        }
      }

      // Try direct storage buffer retrieval first (local disk / tmp / Supabase download)
      fileBuffer = await storageGetBuffer(current.resumeKey);

      if (!fileBuffer) {
        const candidates = [current.resumeKey];
        const legacyUrlKey = current.resumeUrl?.match(/\/manus-storage\/([^?]+)/)?.[1];
        if (legacyUrlKey && !candidates.includes(legacyUrlKey)) candidates.push(legacyUrlKey);

        let lastReadFailure = "";
        for (const key of candidates) {
          try {
            const signedUrl = await storageGetSignedUrl(key);
            if (!signedUrl.startsWith("http://") && !signedUrl.startsWith("https://")) {
              const localBuf = await storageGetBuffer(key);
              if (localBuf) {
                fileBuffer = localBuf;
                break;
              }
              continue;
            }
            const response = await fetch(signedUrl, { signal: AbortSignal.timeout(8_000), redirect: "follow" });
            if (!response.ok) {
              lastReadFailure = `storage returned HTTP ${response.status}`;
              continue;
            }
            const candidate = Buffer.from(await response.arrayBuffer());
            if (candidate.length === 0) {
              lastReadFailure = "storage returned an empty file";
              continue;
            }
            if (current.resumeMimeType === "application/pdf" && !candidate.subarray(0, 4).equals(Buffer.from("%PDF"))) {
              lastReadFailure = "stored bytes are not a PDF";
              continue;
            }
            fileBuffer = candidate;
            break;
          } catch (error) {
            lastReadFailure = error instanceof Error ? error.message : "storage read failed";
          }
        }
      }

      if (!fileBuffer) {
        console.warn(`[Resume AI] Unable to read stored resume for user ${ctx.user.id}: no candidate key succeeded`);
        return { suggestions: null, aiMessage: "Your resume is saved, but its stored file could not be opened for AI review. Please use Replace resume to upload it again, then retry AI review.", source: "error" as const };
      }
    }

    if (!mimeTypeToUse) {
      mimeTypeToUse = "application/pdf";
    }

    const targetKey = current?.resumeKey;
    const cacheKey = targetKey ? `${resumeReviewCacheVersion}${targetKey}` : null;

    try {
      const suggestions = await extractResumeSuggestions(fileBuffer, mimeTypeToUse);
      if (cacheKey) {
        await upsertCareerProfile(ctx.user.id, { resumeReviewCache: JSON.stringify(suggestions), resumeReviewCacheKey: cacheKey });
      }
      return { suggestions, aiMessage: null, source: "fresh" as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Resume saved securely, but AI import was unavailable. Please retry AI review.";
      console.warn(`[Resume AI] Analysis failed for user ${ctx.user.id}: ${message}`);
      return { suggestions: null, aiMessage: message, source: "error" as const };
    }
  }),

  removeResume: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await upsertCareerProfile(ctx.user.id, {
      resumeKey: null,
      resumeUrl: null,
      resumeName: null,
      resumeSize: null,
      resumeMimeType: null,
      resumeReviewCache: null,
      resumeReviewCacheKey: null,
    });
    return { profile };
  }),

  uploadProfilePhoto: protectedProcedure.input(z.object({
    mimeType: z.enum(allowedProfilePhotoTypes),
    contentBase64: z.string().min(4).max(3_000_000),
  })).mutation(async ({ ctx, input }) => {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.contentBase64)) throw new Error("The profile photo data could not be validated.");

    const size = base64ByteSize(input.contentBase64);
    if (size <= 0 || size > maxProfilePhotoBytes) throw new Error("Profile photos must be smaller than 2 MB.");

    const photo = Buffer.from(input.contentBase64, "base64");
    if (!profilePhotoSignatureMatches(photo, input.mimeType)) throw new Error("Please choose a valid JPEG, PNG, or WebP image.");

    const key = `users/${ctx.user.id}/profile-photos/${randomUUID()}.${profilePhotoExtension(input.mimeType)}`;
    const { url } = await storagePut(key, photo, input.mimeType);
    const profile = await upsertCareerProfile(ctx.user.id, {
      profilePhotoKey: key,
      profilePhotoUrl: url,
      profilePhotoSize: size,
      profilePhotoMimeType: input.mimeType,
    });

    return { profile };
  }),

  removeProfilePhoto: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await upsertCareerProfile(ctx.user.id, {
      profilePhotoKey: null,
      profilePhotoUrl: null,
      profilePhotoSize: null,
      profilePhotoMimeType: null,
    });
    return { profile };
  }),

  // Signed-in only: each new city/role search spends the shared, quota-limited job-search API.
  fetchLiveJobs: protectedProcedure.input(z.object({
    location: z.string().trim().max(160).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    countryCode: z.string().trim().length(2).optional(),
    workMode: z.enum(["all", "Remote", "Hybrid", "On-site"]).optional(),
    platform: z.enum(["all", ...JOB_PLATFORM_SOURCES]).optional(),
  }).optional()).query(async ({ ctx, input }) => {
    if (!liveJobsLimiter.check(`user:${ctx.user.id}`).allowed) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many job searches. Please wait a few minutes and try again." });
    }
    const profile = (await getCareerProfileByUserId(ctx.user.id)) ?? null;
    const userLocation = input?.location || profile?.location || DEFAULT_LOCATION_LABEL;
    // The role comes from the profile only. Free-text search is filtered on the client so typing
    // never triggers a new (quota-limited) job search.
    const targetRole = profile?.targetRole || profile?.careerField || profile?.currentJob || "Software Engineer";
    const candidateCoords = input?.lat !== undefined && input?.lng !== undefined ? { lat: input.lat, lng: input.lng } : null;

    const { jobs, localSearch, localProviders } = await scrapeAndEvaluateLiveJobs({
      candidateLocation: userLocation,
      candidateCoords,
      countryCode: input?.countryCode ?? null,
      candidateSkills: profile?.skills || "",
      targetRole,
      workMode: input?.workMode,
      platform: input?.platform,
    });

    const knownCity = findKnownCity(userLocation);
    const searchCity = knownCity?.name ?? userLocation.split(",")[0].trim();
    const placeLabel = knownCity ? `${knownCity.name}, Pakistan` : userLocation;

    return {
      jobs,
      lastSyncedAt: new Date().toISOString(),
      userLocation,
      targetRole,
      searchLinks: buildJobBoardSearchLinks(targetRole, searchCity, placeLabel, input?.countryCode ?? (knownCity ? "PK" : null)),
      localSearch,
      localProviders,
    };
  }),
});
