import { useAuth } from "@/_core/hooks/useAuth";
import { AccountNavigation, type AccountNavDestination } from "@/components/AccountNavigation";
import { ProfilePhotoCropper } from "@/components/ProfilePhotoCropper";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Award, BriefcaseBusiness, CheckCircle2, Cloud, ExternalLink, FileText, GitFork, ImagePlus, Languages, Loader2, LockKeyhole, Pencil, Plus, RefreshCw, Save, ShieldCheck, Star, Trash2, Upload, UserRound, X, AlertCircle } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FaGithub, FaLinkedinIn } from "react-icons/fa";
import { SiFiverr, SiIndeed, SiUpwork } from "react-icons/si";
import { toast } from "sonner";
import { useLocation } from "wouter";

import { allowedResumeTypes } from "@shared/const";

const educationValues = ["Bachelor's", "Master's", "MPhil", "PhD", "Diploma", "Other"] as const;
const careerStatusValues = ["working", "seeking"] as const;
const lookingForValues = ["First Job", "Internship", "Freelance", "Career Switch", "Higher Studies"] as const;
const acceptedResumeTypes = allowedResumeTypes;
const acceptedProfilePhotoTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export type ProfileForm = {
  fullName: string; location: string; phone: string; contactEmail: string; linkedinUrl: string; portfolioUrl: string; age: string; education: string; degree: string; careerStatus: "" | "working" | "seeking";
  currentJob: string; company: string; lookingFor: string; careerField: string; targetRole: string;
  skills: string; experience: string; professionalSummary: string; certifications: string; languages: string; projects: string; verifiedDetails: string; personalizationEnabled: boolean; jobRecommendationsEnabled: boolean; professionalConnectionsEnabled: boolean;
};

type PersonalizationSettings = Pick<ProfileForm, "personalizationEnabled" | "jobRecommendationsEnabled" | "professionalConnectionsEnabled">;

type ConnectionPlatform = "linkedin" | "indeed" | "upwork" | "github" | "fiverr";

type ConnectionSnapshotMetric = { label: string; value: string };
type ConnectionSnapshotDetail = { label: string; value: string };
type ConnectionSnapshotSection = { label: string; title: string; items: string[] };
type ConnectionSnapshotSource = { label: string; detail: string };
type ConnectionPlatformDefinition = {
  id: ConnectionPlatform;
  name: string;
  Icon: IconType;
  description: string;
  illustrativePermission: string;
  snapshot: {
    initials: string;
    identifier: string;
    headline: string;
    metrics: ConnectionSnapshotMetric[];
    details: ConnectionSnapshotDetail[];
    activityLabel: string;
    activity: string;
    sections: ConnectionSnapshotSection[];
    source: ConnectionSnapshotSource;
  };
};

const connectionPlatforms: ConnectionPlatformDefinition[] = [
  { id: "linkedin", name: "LinkedIn", Icon: FaLinkedinIn, description: "Profile and experience context", illustrativePermission: "Profile and experience context", snapshot: { initials: "FM", identifier: "career-profile", headline: "Early-career technology professional", metrics: [{ label: "Connections", value: "320+" }, { label: "Followers", value: "410" }, { label: "Posts", value: "5" }], details: [{ label: "Profile focus", value: "Software, product, and career growth" }, { label: "Open to", value: "Graduate software and product roles" }, { label: "Location focus", value: "Pakistan · hybrid and remote" }], activityLabel: "Recent activity", activity: "Sharing a product-build reflection and next-step learning goals.", sections: [{ label: "Network snapshot", title: "Connection signals", items: ["320+ connections", "410 followers", "5 recent posts"] }, { label: "Interview context", title: "Topics worth exploring", items: ["Project ownership", "Career direction", "Professional communication"] }], source: { label: "Illustrative fallback", detail: "No external LinkedIn account connected" } } },
  { id: "indeed", name: "Indeed", Icon: SiIndeed, description: "Future job-search context", illustrativePermission: "Role and job-search context", snapshot: { initials: "FM", identifier: "career-profile", headline: "Entry-level opportunity search", metrics: [{ label: "Roles saved", value: "6" }, { label: "Match signals", value: "4" }, { label: "Work modes", value: "2" }], details: [{ label: "Role interests", value: "Software, product, and analytical pathways" }, { label: "Search preferences", value: "Hybrid and remote opportunities" }, { label: "Location input", value: "User-selected area only" }], activityLabel: "Opportunity view", activity: "A structured role-search view prepared for focused interview practice.", sections: [{ label: "Search profile", title: "Role preferences", items: ["Graduate software and product roles", "Hybrid and remote work modes", "Skills matched to the reviewed FutureMaker profile"] }], source: { label: "Illustrative fallback", detail: "No external Indeed account connected" } } },
  { id: "upwork", name: "Upwork", Icon: SiUpwork, description: "Freelance work context", illustrativePermission: "Freelance work context", snapshot: { initials: "FM", identifier: "career-profile", headline: "Project-based professional support", metrics: [{ label: "Work samples", value: "4" }, { label: "Categories", value: "3" }, { label: "Availability", value: "Open" }], details: [{ label: "Service focus", value: "Research, documentation, and product support" }, { label: "Engagement style", value: "Defined, milestone-led projects" }, { label: "Profile signal", value: "Portfolio-led discovery" }], activityLabel: "Work approach", activity: "Clear scope, practical communication, and delivery-focused collaboration.", sections: [{ label: "Freelance profile", title: "Services and work history", items: ["Research and documentation support", "Product and presentation assistance", "Milestone-led project delivery"] }], source: { label: "Illustrative fallback", detail: "No external Upwork account connected" } } },
  { id: "github", name: "GitHub", Icon: FaGithub, description: "Projects and code context", illustrativePermission: "Project and code context", snapshot: { initials: "FM", identifier: "career-profile", headline: "Portfolio and collaborative build context", metrics: [{ label: "Repositories", value: "8" }, { label: "Contributions", value: "214" }, { label: "Languages", value: "3" }], details: [{ label: "Primary languages", value: "TypeScript, Python, and SQL" }, { label: "Contribution focus", value: "Personal builds and collaboration" }, { label: "Technical signal", value: "Documented product decisions" }], activityLabel: "Contribution focus", activity: "Iterating on a small product feature with documented technical decisions.", sections: [{ label: "Build activity", title: "Repositories and contributions", items: ["8 illustrative repositories", "214 illustrative contributions this year", "Pinned builds can guide technical interview prompts"] }], source: { label: "Illustrative fallback", detail: "No external GitHub account connected" } } },
  { id: "fiverr", name: "Fiverr", Icon: SiFiverr, description: "Services and portfolio context", illustrativePermission: "Service and portfolio context", snapshot: { initials: "FM", identifier: "career-profile", headline: "Portfolio-led digital services", metrics: [{ label: "Active services", value: "3" }, { label: "Portfolio areas", value: "2" }, { label: "Delivery", value: "Milestone-led" }], details: [{ label: "Service categories", value: "Presentation, research, and digital support" }, { label: "Portfolio focus", value: "Clear, outcome-oriented client work" }, { label: "Availability", value: "Brief-led engagements" }], activityLabel: "Delivery preference", activity: "Defined briefs, staged handoff, and thoughtful presentation quality.", sections: [{ label: "Service profile", title: "Portfolio and delivery", items: ["Presentation and research services", "Outcome-oriented portfolio examples", "Clear brief-to-handoff workflow"] }], source: { label: "Illustrative fallback", detail: "No external Fiverr account connected" } } },
];

const emptyConnectionSelections: Record<ConnectionPlatform, boolean> = {
  linkedin: false,
  indeed: false,
  upwork: false,
  github: false,
  fiverr: false,
};

function getPersonalizationSettings(form: ProfileForm): PersonalizationSettings {
  return {
    personalizationEnabled: form.personalizationEnabled,
    jobRecommendationsEnabled: form.jobRecommendationsEnabled,
    professionalConnectionsEnabled: form.professionalConnectionsEnabled,
  };
}

type ResumeFieldEvidence = { confidence: number; sourceText: string };
export type ResumeSuggestions = {
  fullName: string; location: string; phone: string; contactEmail: string; linkedinUrl: string; portfolioUrl: string; age: number; education: string; degree: string; careerStatus: "" | "working" | "seeking";
  currentJob: string; company: string; lookingFor: string; careerField: string; targetRole: string; skills: string[]; experience: string;
  professionalSummary: string; certifications: ResumeCertificationCard[]; languages: ResumeLanguageCard[]; projects: ResumeProjectCard[]; verifiedDetails: ResumeVerifiedDetail[];
  fieldEvidence: Record<string, ResumeFieldEvidence>;
};

export type ResumeProjectCard = { name: string; summary: string; link: string; technologies: string[] };
export type ProjectCard = ResumeProjectCard & { id: string };
export type ResumeCertificationCard = { name: string; issuer: string; credentialId: string; issuedOn: string; link: string };
export type CertificationCard = ResumeCertificationCard & { id: string };
export type ResumeLanguageCard = { name: string; proficiency: "Native" | "Professional" | "Conversational" | "Basic" | "" };
export type LanguageCard = ResumeLanguageCard & { id: string };
export type ResumeVerifiedDetail = { category: "Achievement" | "Award" | "Coursework" | "Leadership" | "Volunteer" | "Publication" | "Training" | "Other"; title: string; detail: string };
export type VerifiedDetail = ResumeVerifiedDetail & { id: string };

const resumeFieldLabels: Record<string, string> = { fullName: "Full name", location: "Location", phone: "Phone", contactEmail: "Contact email", linkedinUrl: "LinkedIn", portfolioUrl: "Portfolio", age: "Age", education: "Education", degree: "Degree / program", careerStatus: "Current focus", currentJob: "Current role", company: "Company / organization", lookingFor: "Looking for", careerField: "Career field", targetRole: "Target role", skills: "Skills", experience: "Relevant experience", professionalSummary: "Professional summary", certifications: "Certifications", languages: "Languages", projects: "Projects", verifiedDetails: "Additional verified details" };

export function getPopulatedResumeSuggestionEntries(suggestions: ResumeSuggestions) {
  return Object.entries(resumeFieldLabels).filter(([key]) => {
    const value = (suggestions as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return value > 0;
    return typeof value === "string" && value.trim().length > 0;
  }).map(([key, label]) => ({ key, label }));
}

export function parseProjectCards(value: string): ProjectCard[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("Projects are not an array");
    return parsed.map((project, index) => {
      const source = project && typeof project === "object" && !Array.isArray(project) ? project as Record<string, unknown> : {};
      return { id: `project-${index}`, name: typeof source.name === "string" ? source.name.trim() : "", summary: typeof source.summary === "string" ? source.summary.trim() : "", link: typeof source.link === "string" ? source.link.trim() : "", technologies: splitSkillTags(Array.isArray(source.technologies) ? source.technologies.join(", ") : typeof source.technologies === "string" ? source.technologies : "") };
    }).filter((project) => project.name).slice(0, 8);
  } catch {
    return value.split(/(?:\n|;)+/).map((name, index) => name.trim()).filter(Boolean).slice(0, 8).map((name, index) => ({ id: `project-legacy-${index}`, name, summary: "", link: "", technologies: [] }));
  }
}

export function serializeProjectCards(cards: ProjectCard[]) {
  return JSON.stringify(cards.filter((card) => card.name.trim()).slice(0, 8).map(({ name, summary, link, technologies }) => ({ name: name.trim().slice(0, 140), summary: summary.trim().slice(0, 700), link: projectExternalHref(link).slice(0, 500), technologies: splitSkillTags(technologies.join(", ")).slice(0, 16) })));
}

export function parseCertificationCards(value: string): CertificationCard[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("Certifications are not an array");
    return parsed.map((certification, index) => {
      const source = certification && typeof certification === "object" && !Array.isArray(certification) ? certification as Record<string, unknown> : {};
      return { id: `certification-${index}`, name: typeof source.name === "string" ? source.name.trim() : "", issuer: typeof source.issuer === "string" ? source.issuer.trim() : "", credentialId: typeof source.credentialId === "string" ? source.credentialId.trim() : "", issuedOn: typeof source.issuedOn === "string" ? source.issuedOn.trim() : "", link: typeof source.link === "string" ? source.link.trim() : "" };
    }).filter((certification) => certification.name).slice(0, 12);
  } catch {
    return value.split(/(?:\n|;)+/).map((name, index) => name.trim()).filter(Boolean).slice(0, 12).map((name, index) => ({ id: `certification-legacy-${index}`, name, issuer: "", credentialId: "", issuedOn: "", link: "" }));
  }
}

export function serializeCertificationCards(cards: CertificationCard[]) {
  return JSON.stringify(cards.filter((card) => card.name.trim()).slice(0, 12).map(({ name, issuer, credentialId, issuedOn, link }) => ({ name: name.trim().slice(0, 140), issuer: issuer.trim().slice(0, 140), credentialId: credentialId.trim().slice(0, 100), issuedOn: issuedOn.trim().slice(0, 40), link: projectExternalHref(link).slice(0, 500) })));
}

export function parseLanguageCards(value: string): LanguageCard[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("Languages are not an array");
    return parsed.map((language, index) => {
      const source = language && typeof language === "object" && !Array.isArray(language) ? language as Record<string, unknown> : {};
      const proficiency = ["Native", "Professional", "Conversational", "Basic"].includes(source.proficiency as string) ? source.proficiency as LanguageCard["proficiency"] : "";
      return { id: `language-${index}`, name: typeof source.name === "string" ? source.name.trim() : "", proficiency };
    }).filter((language) => language.name).slice(0, 10);
  } catch {
    return splitSkillTags(value).slice(0, 10).map((name, index) => ({ id: `language-legacy-${index}`, name, proficiency: "" }));
  }
}

export function serializeLanguageCards(cards: LanguageCard[]) {
  return JSON.stringify(cards.filter((card) => card.name.trim()).slice(0, 10).map(({ name, proficiency }) => ({ name: name.trim().slice(0, 80), proficiency })));
}

export function parseVerifiedDetails(value: string): VerifiedDetail[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("Verified details are not an array");
    const categories = ["Achievement", "Award", "Coursework", "Leadership", "Volunteer", "Publication", "Training", "Other"] as const;
    return parsed.map((detail, index) => {
      const source = detail && typeof detail === "object" && !Array.isArray(detail) ? detail as Record<string, unknown> : {};
      const category = categories.includes(source.category as (typeof categories)[number]) ? source.category as VerifiedDetail["category"] : "Other";
      return { id: `verified-detail-${index}`, category, title: typeof source.title === "string" ? source.title.trim() : "", detail: typeof source.detail === "string" ? source.detail.trim() : "" };
    }).filter((detail) => detail.title && detail.detail).slice(0, 16);
  } catch {
    return [];
  }
}

export function serializeVerifiedDetails(details: VerifiedDetail[]) {
  return JSON.stringify(details.filter((detail) => detail.title.trim() && detail.detail.trim()).slice(0, 16).map(({ category, title, detail }) => ({ category, title: title.trim().slice(0, 120), detail: detail.trim().slice(0, 260) })));
}

export function projectExternalHref(link: string) {
  const value = link.trim();
  if (!value) return "";
  const candidate = value.startsWith("//") ? `https:${value}` : /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (!url.hostname || (url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".local")) return "";
    url.protocol = "https:";
    return url.toString();
  } catch {
    return "";
  }
}

function compactCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function replaceProfileWithResumeSuggestions(current: ProfileForm, suggestions: ResumeSuggestions): ProfileForm {
  return {
    ...current,
    fullName: suggestions.fullName ?? "",
    location: suggestions.location ?? "",
    phone: suggestions.phone ?? "",
    contactEmail: suggestions.contactEmail ?? "",
    linkedinUrl: suggestions.linkedinUrl ?? "",
    portfolioUrl: suggestions.portfolioUrl ?? "",
    age: suggestions.age ? String(suggestions.age) : "",
    education: suggestions.education ?? "",
    degree: suggestions.degree ?? "",
    careerStatus: suggestions.careerStatus ?? "",
    currentJob: suggestions.currentJob ?? "",
    company: suggestions.company ?? "",
    lookingFor: suggestions.lookingFor ?? "",
    careerField: suggestions.careerField ?? "",
    targetRole: suggestions.targetRole ?? "",
    skills: Array.isArray(suggestions.skills) ? suggestions.skills.join(", ") : "",
    experience: suggestions.experience ?? "",
    professionalSummary: suggestions.professionalSummary ?? "",
    certifications: serializeCertificationCards((suggestions.certifications ?? []).map((certification, index) => ({ ...certification, id: `resume-certification-${index}` }))),
    languages: serializeLanguageCards((suggestions.languages ?? []).map((language, index) => ({ ...language, id: `resume-language-${index}` }))),
    projects: serializeProjectCards((suggestions.projects ?? []).map((project, index) => ({ ...project, id: `resume-project-${index}` }))),
    verifiedDetails: serializeVerifiedDetails((suggestions.verifiedDetails ?? []).map((detail, index) => ({ ...detail, id: `resume-verified-detail-${index}` }))),
  };
}

export function splitSkillTags(value: string) {
  return Array.from(new Set(value.split(/[\n,•|]/).map((tag) => tag.trim()).filter(Boolean))).slice(0, 40);
}

export type ExperienceTimelineEntry = { id: string; title: string; organisation: string; location: string; period: string };

export function isCurrentExperience(entry: Pick<ExperienceTimelineEntry, "period">) {
  return /\b(?:present|current|ongoing|now)\b/i.test(entry.period);
}

function experienceEndSortValue(period: string) {
  const value = period.trim();
  const endingPeriod = value.split(/\s+(?:[-–—]|to)\s+/i).at(-1) ?? value;
  const yearMatches = Array.from(endingPeriod.matchAll(/\b(19|20)\d{2}\b/g));
  const year = Number(yearMatches.at(-1)?.[0] ?? 0);
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const lower = endingPeriod.toLowerCase();
  const month = Math.max(...monthNames.map((month, index) => lower.lastIndexOf(month) >= 0 ? index + 1 : 0));
  return year * 12 + month;
}

export function sortExperienceTimeline(entries: ExperienceTimelineEntry[]) {
  return entries.map((entry, index) => ({ entry, index })).sort((a, b) => {
    const aCurrent = isCurrentExperience(a.entry);
    const bCurrent = isCurrentExperience(b.entry);
    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
    const dateDifference = experienceEndSortValue(b.entry.period) - experienceEndSortValue(a.entry.period);
    return dateDifference || a.index - b.index;
  }).map(({ entry }) => entry);
}

export function parseExperienceTimeline(value: string): ExperienceTimelineEntry[] {
  return sortExperienceTimeline(value.split(/(?:\n|;)+/).map((entry) => entry.trim()).filter(Boolean).slice(0, 12).map((raw, index) => {
    const [headline = raw, locationAndPeriod = ""] = raw.split(/\s+[—–-]\s+(?=[^|]+\s+\|\s+)/, 2);
    const [location = "", period = ""] = locationAndPeriod.split(/\s+\|\s+/, 2);
    const [role = headline, organisation = ""] = headline.split(/\s+at\s+/i, 2);
    return { id: `timeline-${index}`, title: role.trim(), organisation: organisation.trim(), location: location.trim(), period: period.trim() };
  }));
}

export function serializeExperienceTimeline(entries: ExperienceTimelineEntry[]) {
  return entries.filter((entry) => entry.title.trim() || entry.organisation.trim() || entry.location.trim() || entry.period.trim()).map((entry) => {
    const headline = [entry.title.trim(), entry.organisation.trim() ? `at ${entry.organisation.trim()}` : ""].filter(Boolean).join(" ");
    const detail = [entry.location.trim(), entry.period.trim()].filter(Boolean).join(" | ");
    return [headline, detail ? `— ${detail}` : ""].filter(Boolean).join(" ");
  }).join("; ");
}

const blankForm: ProfileForm = {
  fullName: "", location: "", phone: "", contactEmail: "", linkedinUrl: "", portfolioUrl: "", age: "", education: "", degree: "", careerStatus: "", currentJob: "", company: "", lookingFor: "", careerField: "", targetRole: "", skills: "", experience: "", professionalSummary: "", certifications: "", languages: "", projects: "", verifiedDetails: "",
  personalizationEnabled: true, jobRecommendationsEnabled: true, professionalConnectionsEnabled: true,
};

function toNullable(value: string) {
  return value.trim() || null;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function resumeMimeTypeFor(file: File) {
  if (acceptedResumeTypes.includes(file.type as (typeof acceptedResumeTypes)[number])) return file.type as (typeof acceptedResumeTypes)[number];
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "pdf" ? "application/pdf" : extension === "doc" ? "application/msword" : extension === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : null;
}

function fileToBase64(file: File, onProgress: (progress: number) => void, registerReader: (reader: FileReader) => void) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    registerReader(reader);
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    reader.onerror = () => reject(new Error("The resume could not be read."));
    reader.onabort = () => reject(new Error("RESUME_UPLOAD_CANCELLED"));
    reader.onload = () => {
      onProgress(100);
      resolve(String(reader.result).split(",")[1] ?? "");
    };
    reader.readAsDataURL(file);
  });
}

export default function AccountDetails() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const profileQuery = trpc.careerProfile.get.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const latestSessionQuery = trpc.practicePreparation.getLatestSession.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const saveProfile = trpc.careerProfile.save.useMutation();
  const uploadResume = trpc.careerProfile.uploadResume.useMutation();
  const analyzeResume = trpc.careerProfile.analyzeResume.useMutation();
  const previewResume = trpc.careerProfile.previewResume.useMutation();
  const removeResume = trpc.careerProfile.removeResume.useMutation();
  const uploadProfilePhoto = trpc.careerProfile.uploadProfilePhoto.useMutation();
  const removeProfilePhoto = trpc.careerProfile.removeProfilePhoto.useMutation();
  const [form, setForm] = useState<ProfileForm>(blankForm);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"synced" | "saving" | "unsaved" | "error">("synced");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const isInitializedRef = useRef(false);
  const lastSavedPayloadRef = useRef<string>("");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUploadedResumeRef = useRef<{ contentBase64: string; mimeType: (typeof allowedResumeTypes)[number] } | null>(null);
  const resumeMetaBeforeSuggestionsRef = useRef<{
    name: string | null;
    size: number | null;
    mimeType: string | null;
    url: string | null;
  } | null>(null);

  const [resumeName, setResumeName] = useState<string | null>(null);
  const [resumeSize, setResumeSize] = useState<number | null>(null);
  const [resumeMimeType, setResumeMimeType] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeViewerOpen, setResumeViewerOpen] = useState(false);
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);
  const [resumeSuggestions, setResumeSuggestions] = useState<ResumeSuggestions | null>(null);
  const [resumeAnalysisStatus, setResumeAnalysisStatus] = useState<"idle" | "analyzing" | "retrying" | "complete" | "error">("idle");
  const [resumeLastCheckedAt, setResumeLastCheckedAt] = useState<Date | null>(null);
  const [resumeUploadProgress, setResumeUploadProgress] = useState(0);
  const [resumeUploadActive, setResumeUploadActive] = useState(false);
  const [formBeforeResumeSuggestions, setFormBeforeResumeSuggestions] = useState<ProfileForm | null>(null);
  const [savedPersonalizationSettings, setSavedPersonalizationSettings] = useState<PersonalizationSettings>(() => getPersonalizationSettings(blankForm));
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [connectionSelections, setConnectionSelections] = useState<Record<ConnectionPlatform, boolean>>(emptyConnectionSelections);
  const [connectionPendingPlatform, setConnectionPendingPlatform] = useState<ConnectionPlatform | null>(null);
  const [connectionPermissionPlatform, setConnectionPermissionPlatform] = useState<ConnectionPlatform | null>(null);
  const [connectionDetailsPlatform, setConnectionDetailsPlatform] = useState<ConnectionPlatform | null>(null);
  const [connectionDetailsPendingPlatform, setConnectionDetailsPendingPlatform] = useState<ConnectionPlatform | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const resumeReaderRef = useRef<FileReader | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/login?next=%2Faccount");
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) {
      const initialForm: ProfileForm = {
        ...blankForm,
        fullName: user?.name ?? "",
      };
      setForm(initialForm);
      lastSavedPayloadRef.current = JSON.stringify(initialForm);
      isInitializedRef.current = true;
      setAutoSaveStatus("synced");
      return;
    }

    const loadedForm: ProfileForm = {
      fullName: profile.fullName ?? user?.name ?? "",
      location: profile.location ?? "",
      phone: profile.phone ?? "",
      contactEmail: profile.contactEmail ?? "",
      linkedinUrl: profile.linkedinUrl ?? "",
      portfolioUrl: profile.portfolioUrl ?? "",
      age: profile.age ? String(profile.age) : "",
      education: profile.education ?? "",
      degree: profile.degree ?? "",
      careerStatus: profile.careerStatus === "working" || profile.careerStatus === "seeking" ? profile.careerStatus : "",
      currentJob: profile.currentJob ?? "",
      company: profile.company ?? "",
      lookingFor: profile.lookingFor ?? "",
      careerField: profile.careerField ?? "",
      targetRole: profile.targetRole ?? "",
      skills: profile.skills ?? "",
      experience: profile.experience ?? "",
      professionalSummary: profile.professionalSummary ?? "",
      certifications: profile.certifications ?? "",
      languages: profile.languages ?? "",
      projects: profile.projects ?? "",
      verifiedDetails: profile.verifiedDetails ?? "",
      personalizationEnabled: profile.personalizationEnabled,
      jobRecommendationsEnabled: profile.jobRecommendationsEnabled,
      professionalConnectionsEnabled: profile.professionalConnectionsEnabled,
    };

    setForm(loadedForm);
    setSavedPersonalizationSettings({
      personalizationEnabled: profile.personalizationEnabled,
      jobRecommendationsEnabled: profile.jobRecommendationsEnabled,
      professionalConnectionsEnabled: profile.professionalConnectionsEnabled,
    });
    lastSavedPayloadRef.current = JSON.stringify(loadedForm);
    isInitializedRef.current = true;
    setAutoSaveStatus("synced");

    setResumeName(profile.resumeName);
    setResumeSize(profile.resumeSize);
    setResumeMimeType(profile.resumeMimeType);
    setResumeUrl(profile.resumeUrl);
    setResumeViewerOpen(false);
    setProfilePhotoUrl(profile.profilePhotoUrl);
  }, [profileQuery.data, user?.name]);

  const essentialCount = useMemo(() => [form.fullName.trim(), form.education, form.careerStatus, form.targetRole.trim(), form.skills.trim()].filter(Boolean).length, [form]);
  const completion = Math.round((essentialCount / 5) * 100);
  const resumeBusy = resumeUploadActive || uploadResume.isPending || analyzeResume.isPending;
  const resumePopulatedEntries = useMemo(() => resumeSuggestions ? getPopulatedResumeSuggestionEntries(resumeSuggestions) : [], [resumeSuggestions]);
  const resumeEvidenceEntries = useMemo(() => {
    if (!resumeSuggestions) return [];
    return Object.entries(resumeSuggestions.fieldEvidence ?? {}).filter(([key, evidence]) => Boolean(evidence?.sourceText && (resumeSuggestions as Record<string, unknown>)[key])).map(([key, evidence]) => ({ key, label: resumeFieldLabels[key] ?? key, ...evidence }));
  }, [resumeSuggestions]);
  const setField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const hasUnsavedToggleChanges = form.personalizationEnabled !== savedPersonalizationSettings.personalizationEnabled || form.jobRecommendationsEnabled !== savedPersonalizationSettings.jobRecommendationsEnabled || form.professionalConnectionsEnabled !== savedPersonalizationSettings.professionalConnectionsEnabled;

  const save = async ({
    announce = true,
    formToSave = form,
    source = "manual",
  }: {
    announce?: boolean;
    formToSave?: ProfileForm;
    source?: "manual" | "auto";
  } = {}) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    setAutoSaveStatus("saving");
    try {
      const parsedAge = formToSave.age ? parseInt(formToSave.age, 10) : null;
      const safeAge = Number.isInteger(parsedAge) && parsedAge! >= 16 && parsedAge! <= 99 ? parsedAge : null;

      const safeEducation = educationValues.includes(formToSave.education as any)
        ? (formToSave.education as (typeof educationValues)[number])
        : null;

      const safeCareerStatus = careerStatusValues.includes(formToSave.careerStatus as any)
        ? (formToSave.careerStatus as (typeof careerStatusValues)[number])
        : null;

      const safeLookingFor = lookingForValues.includes(formToSave.lookingFor as any)
        ? (formToSave.lookingFor as (typeof lookingForValues)[number])
        : null;

      const safeSlice = (val: string, max: number) => {
        const trimmed = val ? val.trim() : "";
        return trimmed ? trimmed.slice(0, max) : null;
      };

      const result = await saveProfile.mutateAsync({
        fullName: safeSlice(formToSave.fullName, 160),
        location: safeSlice(formToSave.location, 160),
        phone: safeSlice(formToSave.phone, 64),
        contactEmail: safeSlice(formToSave.contactEmail, 320),
        linkedinUrl: safeSlice(formToSave.linkedinUrl, 500),
        portfolioUrl: safeSlice(formToSave.portfolioUrl, 500),
        age: safeAge,
        education: safeEducation,
        degree: safeSlice(formToSave.degree, 180),
        careerStatus: safeCareerStatus,
        currentJob: safeSlice(formToSave.currentJob, 180),
        company: safeSlice(formToSave.company, 180),
        lookingFor: safeLookingFor,
        careerField: safeSlice(formToSave.careerField, 120),
        targetRole: safeSlice(formToSave.targetRole, 180),
        skills: safeSlice(formToSave.skills, 2000),
        experience: safeSlice(formToSave.experience, 6000),
        professionalSummary: safeSlice(formToSave.professionalSummary, 1600),
        certifications: safeSlice(formToSave.certifications, 6000),
        languages: safeSlice(formToSave.languages, 2000),
        projects: safeSlice(formToSave.projects, 12000),
        verifiedDetails: safeSlice(formToSave.verifiedDetails, 6000),
        personalizationEnabled: formToSave.personalizationEnabled,
        jobRecommendationsEnabled: formToSave.jobRecommendationsEnabled,
        professionalConnectionsEnabled: formToSave.professionalConnectionsEnabled,
      });

      lastSavedPayloadRef.current = JSON.stringify(formToSave);
      setSavedPersonalizationSettings(getPersonalizationSettings(formToSave));
      setAutoSaveStatus("synced");
      setLastSavedAt(new Date());

      if (announce) {
        setFormBeforeResumeSuggestions(null);
        setResumeSuggestions(null);
        resumeMetaBeforeSuggestionsRef.current = null;
        toast.success(result.isComplete ? "Your FutureMaker details are ready & saved to database." : "Your account details have been saved to database.");
      }
      return true;
    } catch (error) {
      setAutoSaveStatus("error");
      if (announce || source === "manual") {
        toast.error(error instanceof Error ? error.message : "We could not save your account details.");
      }
      return false;
    }
  };

  // Debounced auto-save hook for real-time background sync
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (resumeSuggestions) {
      // Pause auto-save while user is reviewing resume suggestions so unconfirmed AI data isn't saved to DB
      return;
    }
    const currentPayload = JSON.stringify(form);
    if (currentPayload === lastSavedPayloadRef.current) {
      return;
    }

    setAutoSaveStatus("unsaved");
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      void save({ announce: false, formToSave: form, source: "auto" });
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [form, resumeSuggestions]);

  const openPractice = async () => {
    if (hasUnsavedToggleChanges) {
      const saved = await save({ announce: false });
      if (!saved) return;
      toast.success("Your personalization settings are saved. Opening practice…");
    }
    setLocation("/?screen=consent");
  };

  const runResumeAnalysis = async (
    status: "analyzing" | "retrying" = "analyzing",
    overridePayload?: { contentBase64?: string; mimeType?: (typeof allowedResumeTypes)[number] }
  ) => {
    setResumeAnalysisStatus(status);
    const payload = overridePayload ?? (lastUploadedResumeRef.current ?? undefined);
    try {
      const analysis = await analyzeResume.mutateAsync(payload);
      if (analysis.suggestions) {
        const suggestions = analysis.suggestions as ResumeSuggestions;
        if (getPopulatedResumeSuggestionEntries(suggestions).length === 0) {
          setResumeAnalysisStatus("error");
          setResumeLastCheckedAt(new Date());
          toast.error("Resume review needs attention", {
            description: "We could open this resume, but no profile details were identified. Your editable draft was left unchanged.",
            action: { label: "Retry", onClick: () => void runResumeAnalysis("retrying") },
          });
          return;
        }
        setFormBeforeResumeSuggestions((prev) => prev ?? form);
        setForm((current) => replaceProfileWithResumeSuggestions(current, suggestions));
        setResumeSuggestions(suggestions);
        setResumeAnalysisStatus("complete");
        setResumeLastCheckedAt(new Date());
        toast.success("Resume review ready", {
          description: `${getPopulatedResumeSuggestionEntries(suggestions).length} profile details and ${suggestions.skills.length} skills are in your editable draft. Save only after reviewing them.`,
          duration: Infinity,
          action: { label: "Keep draft", onClick: keepResumeSuggestions },
          cancel: { label: "Discard", onClick: () => void discardResumeSuggestions() },
        });
      } else if (analysis.aiMessage) {
        setResumeAnalysisStatus("error");
        setResumeLastCheckedAt(new Date());
        toast.error("Resume review needs attention", {
          description: analysis.aiMessage,
          action: { label: "Retry", onClick: () => void runResumeAnalysis("retrying") },
        });
      }
    } catch (analysisError) {
      setResumeAnalysisStatus("error");
      setResumeLastCheckedAt(new Date());
      toast.error("Resume review needs attention", {
        description: "FutureMaker could not analyze this resume right now. Your resume is saved securely.",
        action: { label: "Retry", onClick: () => void runResumeAnalysis("retrying") },
      });
    }
  };

  const handleResume = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const mimeType = resumeMimeTypeFor(file);
    if (!mimeType || file.size > 5 * 1024 * 1024) {
      toast.error("Upload a PDF, DOC, or DOCX resume smaller than 5 MB.");
      return;
    }
    try {
      setResumeUploadActive(true);
      setResumeUploadProgress(0);
      resumeMetaBeforeSuggestionsRef.current = {
        name: resumeName,
        size: resumeSize,
        mimeType: resumeMimeType,
        url: resumeUrl,
      };
      setFormBeforeResumeSuggestions((prev) => prev ?? form);
      const contentBase64 = await fileToBase64(file, setResumeUploadProgress, (reader) => { resumeReaderRef.current = reader; });
      resumeReaderRef.current = null;
      lastUploadedResumeRef.current = { contentBase64, mimeType };
      const result = await uploadResume.mutateAsync({ fileName: file.name, mimeType, contentBase64 });
      setResumeUploadActive(false);
      setResumeName(result.profile?.resumeName ?? file.name); setResumeSize(result.profile?.resumeSize ?? file.size); setResumeMimeType(result.profile?.resumeMimeType ?? mimeType); setResumeUrl(result.profile?.resumeUrl ?? null); closeResumePreview();
      toast.success("Resume uploaded securely. Starting AI review…");
      await runResumeAnalysis("analyzing", { contentBase64, mimeType });
    } catch (error) {
      resumeReaderRef.current = null;
      setResumeUploadActive(false);
      if (error instanceof Error && error.message === "RESUME_UPLOAD_CANCELLED") {
        setResumeUploadProgress(0);
        toast.message("Resume upload cancelled.");
      } else {
        toast.error(error instanceof Error ? error.message : "We could not upload that resume.");
      }
    }
  };

  const cancelResumeUpload = () => {
    resumeReaderRef.current?.abort();
  };

  const completeConnectionPlaceholder = (platform: ConnectionPlatform) => {
    if (connectionPendingPlatform || connectionDetailsPendingPlatform) return;
    const platformName = connectionPlatforms.find((item) => item.id === platform)?.name ?? "Connection";
    const wasSelected = connectionSelections[platform];
    setConnectionPendingPlatform(platform);
    window.setTimeout(() => {
      setConnectionSelections((current) => ({ ...current, [platform]: !current[platform] }));
      setConnectionPendingPlatform(null);
      toast.success(wasSelected ? `${platformName} selection removed` : `${platformName} is ready to view`, {
        description: wasSelected ? "This selection is no longer shown in your presentation view." : "Illustrative details are ready for your presentation view. No account data was accessed.",
      });
    }, 600);
  };

  const requestConnectionPlaceholder = (platform: ConnectionPlatform) => {
    if (connectionPendingPlatform || connectionDetailsPendingPlatform) return;
    if (connectionSelections[platform]) {
      completeConnectionPlaceholder(platform);
      return;
    }
    setConnectionPermissionPlatform(platform);
  };

  const continueConnectionAuthorization = () => {
    if (!connectionPermissionPlatform) return;
    const platform = connectionPermissionPlatform;
    setConnectionPermissionPlatform(null);
    completeConnectionPlaceholder(platform);
  };

  const openConnectionDetails = (platform: ConnectionPlatform) => {
    if (!connectionSelections[platform] || connectionPendingPlatform || connectionDetailsPendingPlatform) return;
    setConnectionDetailsPendingPlatform(platform);
    window.setTimeout(() => {
      setConnectionDetailsPendingPlatform(null);
      setConnectionDetailsPlatform(platform);
    }, 280);
  };

  const discardResumeSuggestions = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const revertedForm = formBeforeResumeSuggestions ?? form;
    setForm(revertedForm);
    lastSavedPayloadRef.current = JSON.stringify(revertedForm);

    const previousResume = resumeMetaBeforeSuggestionsRef.current;
    if (previousResume) {
      setResumeName(previousResume.name);
      setResumeSize(previousResume.size);
      setResumeMimeType(previousResume.mimeType);
      setResumeUrl(previousResume.url);
      if (!previousResume.url) {
        try {
          await removeResume.mutateAsync();
        } catch {
          // ignore background cleanup error
        }
      }
      resumeMetaBeforeSuggestionsRef.current = null;
    }

    setFormBeforeResumeSuggestions(null);
    setResumeSuggestions(null);
    setResumeAnalysisStatus("idle");

    // Persist the reverted form to database immediately
    await save({ announce: false, formToSave: revertedForm, source: "manual" });
    toast.dismiss();
    toast.info("Resume changes discarded. All previous details have been restored.");
  };

  const keepResumeSuggestions = () => {
    setFormBeforeResumeSuggestions(null);
    setResumeSuggestions(null);
    resumeMetaBeforeSuggestionsRef.current = null;
    toast.dismiss();
    toast.message("Resume suggestions kept in your editable draft. Save your account details to confirm them.");
  };

  const handleClearForm = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all form fields? This will reset your profile fields so you can enter fresh information."
    );
    if (!confirmed) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const clearedForm: ProfileForm = {
      fullName: "",
      location: "",
      phone: "",
      contactEmail: "",
      linkedinUrl: "",
      portfolioUrl: "",
      age: "",
      education: "",
      degree: "",
      careerStatus: "",
      currentJob: "",
      company: "",
      lookingFor: "",
      careerField: "",
      targetRole: "",
      skills: "",
      experience: "",
      professionalSummary: "",
      certifications: "",
      languages: "",
      projects: "",
      verifiedDetails: "",
      personalizationEnabled: form.personalizationEnabled,
      jobRecommendationsEnabled: form.jobRecommendationsEnabled,
      professionalConnectionsEnabled: form.professionalConnectionsEnabled,
    };

    setForm(clearedForm);
    setFormBeforeResumeSuggestions(null);
    setResumeSuggestions(null);
    setResumeAnalysisStatus("idle");
    resumeMetaBeforeSuggestionsRef.current = null;

    // Immediately save cleared form to cloud
    await save({ announce: false, formToSave: clearedForm, source: "manual" });
    toast.info("All form fields cleared. You can now enter fresh information.");
  };

  const closeResumePreview = () => {
    setResumeViewerOpen(false);
    setResumePreviewUrl(null);
  };

  const openResumePreview = async () => {
    try {
      const preview = await previewResume.mutateAsync();
      setResumePreviewUrl(preview.url);
      setResumeViewerOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not open this secure resume preview.");
    }
  };

  const removeCurrentResume = async () => {
    try {
      await removeResume.mutateAsync();
      setResumeName(null); setResumeSize(null); setResumeMimeType(null); setResumeUrl(null); closeResumePreview(); setResumeSuggestions(null); setResumeAnalysisStatus("idle"); setResumeLastCheckedAt(null); setResumeUploadProgress(0); setResumeUploadActive(false); setFormBeforeResumeSuggestions(null);
      toast.message("Resume removed from your account details.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not remove that resume.");
    }
  };

  const handleProfilePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!acceptedProfilePhotoTypes.includes(file.type as (typeof acceptedProfilePhotoTypes)[number]) || file.size > 2 * 1024 * 1024) {
      toast.error("Choose a JPEG, PNG, or WebP profile photo smaller than 2 MB.");
      return;
    }
    setCropFile(file);
  };

  const confirmProfilePhoto = async (file: File) => {
    try {
      const contentBase64 = await fileToBase64(file, () => undefined, () => undefined);
      const result = await uploadProfilePhoto.mutateAsync({ mimeType: "image/jpeg", contentBase64 });
      setProfilePhotoUrl(result.profile?.profilePhotoUrl ?? null);
      setCropFile(null);
      await profileQuery.refetch();
      toast.success("Profile photo updated securely.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not update that profile photo.");
    }
  };

  const removeCurrentProfilePhoto = async () => {
    try {
      await removeProfilePhoto.mutateAsync();
      setProfilePhotoUrl(null);
      await profileQuery.refetch();
      toast.message("Profile photo removed. Your initials will be shown instead.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not remove that profile photo.");
    }
  };

  const navigateFromNavbar = (destination: AccountNavDestination) => {
    if (destination === "home") setLocation("/");
    if (destination === "dashboard") setLocation("/dashboard");
    if (destination === "jobs") setLocation("/jobs");
    if (destination === "privacy") setLocation("/?screen=session");
    if (destination === "practice") {
      if (latestSessionQuery.data && (latestSessionQuery.data.levels?.length ?? 0) > 0) {
        setLocation("/?screen=question-plan");
      } else {
        setLocation("/?screen=consent");
      }
    }
  };

  const signOutFromNavbar = async () => {
    await logout();
    setLocation("/");
  };

  if (authLoading || !isAuthenticated) return <main className="ct-account-shell"><section className="ct-account-loading"><Loader2 size={20} /> Checking your secure account…</section></main>;
  if (profileQuery.isLoading) return <main className="ct-account-shell"><section className="ct-account-loading"><Loader2 size={20} /> Loading your saved preparation details…</section></main>;
  if (profileQuery.isError) return <main className="ct-account-shell"><section className="ct-account-state"><ShieldCheck size={21} /><h1>Your account is still protected.</h1><p>We could not load saved preparation details right now. Your sign-in is unaffected; please try again.</p><div><button className="ct-button" type="button" onClick={() => void profileQuery.refetch()}>Try again</button><button className="ct-button ct-button--secondary" type="button" onClick={() => setLocation("/")}>Back to home</button></div></section></main>;

  return (
    <main className="ct-account-shell ct-page-transition">
      <AccountNavigation
        userName={user?.name || "Your account"}
        profileImageUrl={profilePhotoUrl ?? undefined}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={navigateFromNavbar}
        onSignOut={signOutFromNavbar}
        activeDestination="account"
      />

      <section className="ct-account-hero" aria-labelledby="account-title">
        <div className="ct-account-hero-copy">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <p className="ct-home-eyebrow mb-0"><span /> Your account</p>
            {/* Global Live Sync Island Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#13131a]/85 border border-white/[0.08] backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] text-[11px] transition-all duration-300">
              {autoSaveStatus === "saving" ? (
                <>
                  <Loader2 size={12} className="text-amber-400 animate-spin" />
                  <span className="font-semibold text-amber-300">Saving to database…</span>
                </>
              ) : autoSaveStatus === "unsaved" ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                  </span>
                  <span className="font-semibold text-cyan-300">Auto-saving…</span>
                </>
              ) : autoSaveStatus === "error" ? (
                <>
                  <AlertCircle size={12} className="text-red-400" />
                  <span className="font-semibold text-red-400">Sync paused</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                  </span>
                  <Cloud size={12} className="text-emerald-400" />
                  <span className="font-semibold text-emerald-300">
                    Database Synced {lastSavedAt ? `· ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "· Cloud Active"}
                  </span>
                </>
              )}
            </div>
          </div>
          <h1 id="account-title">Your private preparation profile.</h1>
          <p>Upload your resume first and review the details that make your next interview answer more specific. Nothing is silently saved, shared, or turned into a hiring decision.</p>
          <div className="ct-profile-hero-note"><LockKeyhole size={14} /> Your profile is private by default and auto-saved in real time.</div>
        </div>
        <aside className="ct-profile-showcase ct-account-surface" aria-label="Profile photo and identity">
          <span className="ct-profile-photo-large">{profilePhotoUrl ? <img src={profilePhotoUrl} alt={`${user?.name || "Your"} profile`} /> : <UserRound size={48} />}</span>
          <strong>{user?.name || "Your account"}</strong><small>{user?.email || "Signed-in FutureMaker member"}</small><em><ShieldCheck size={13} /> Protected account</em>
          <div className="ct-account-photo-actions"><button className="ct-button ct-button--secondary ct-button--calm" type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadProfilePhoto.isPending}>{uploadProfilePhoto.isPending ? "Updating…" : <><ImagePlus size={15} /> {profilePhotoUrl ? "Replace photo" : "Add photo"}</>}</button>{profilePhotoUrl && <button className="ct-account-photo-remove" type="button" onClick={() => void removeCurrentProfilePhoto()} disabled={removeProfilePhoto.isPending}>{removeProfilePhoto.isPending ? "Removing…" : "Remove"}</button>}</div>
          <small className="ct-photo-format-note">JPEG, PNG, or WebP · up to 2 MB</small>
          <input ref={photoInputRef} className="ct-visually-hidden" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleProfilePhoto} />
        </aside>
      </section>
      {cropFile && <div className="ct-photo-cropper-overlay"><ProfilePhotoCropper file={cropFile} busy={uploadProfilePhoto.isPending} onCancel={() => setCropFile(null)} onConfirm={(file) => void confirmProfilePhoto(file)} /></div>}

      <section className="ct-account-progress ct-account-surface" aria-label="Career profile completion"><div><strong>Preparation profile</strong><span>{essentialCount} of 5 essentials</span></div><i><b style={{ width: `${completion}%` }} /></i><p>Adding your career direction helps keep future interview practice relevant to you.</p></section>
      <ProfessionalConnectionsPlaceholder selections={connectionSelections} pendingPlatform={connectionPendingPlatform} detailsPendingPlatform={connectionDetailsPendingPlatform} onToggle={requestConnectionPlaceholder} onViewDetails={openConnectionDetails} />
      <ConnectionPermissionDialog platform={connectionPermissionPlatform ? connectionPlatforms.find((item) => item.id === connectionPermissionPlatform) ?? null : null} onOpenChange={(open) => { if (!open) setConnectionPermissionPlatform(null); }} onContinue={continueConnectionAuthorization} />
      <ConnectionDetailsDialog platform={connectionDetailsPlatform ? connectionPlatforms.find((item) => item.id === connectionDetailsPlatform) ?? null : null} onOpenChange={(open) => { if (!open) setConnectionDetailsPlatform(null); }} />
      {profileQuery.data === null && <section className="ct-account-empty ct-account-surface" aria-live="polite"><CheckCircle2 size={17} /><p><strong>No saved preparation details yet.</strong> Upload your resume first, or continue manually below. Only details you review and save will be added to your account.</p></section>}
      <section className="ct-account-resume-priority ct-account-surface" aria-labelledby="resume-priority-title">
        <div className="ct-account-resume-priority-copy"><p className="ct-home-eyebrow"><span /> Start here</p><h2 id="resume-priority-title">Upload your resume first.</h2><p>FutureMaker can read the document and prepare your profile fields, so you do not have to type everything manually.</p><small>Your file remains connected only to your protected account. PDF, DOC, or DOCX · up to 5 MB.</small></div>
        {resumeUploadActive && <div className="ct-account-upload-progress" role="status" aria-live="polite"><div><span>Preparing secure upload</span><strong>{resumeUploadProgress}%</strong></div><i><b style={{ width: `${resumeUploadProgress}%` }} /></i><button className="ct-text-action" type="button" onClick={cancelResumeUpload}>Cancel upload</button></div>}
        {resumeName ? <div className="ct-account-resume-priority-file">
          <FileText size={20} />
          <div>
            <strong>{resumeName}</strong>
            <small>{uploadResume.isPending ? "Uploading securely…" : analyzeResume.isPending ? (resumeAnalysisStatus === "retrying" ? "Retrying AI review…" : "AI is reviewing your resume…") : "Uploaded securely · review the suggestions below"}</small>
            {resumeLastCheckedAt && <span className="ct-account-resume-status">{resumeAnalysisStatus === "complete" ? "AI review complete" : resumeAnalysisStatus === "error" ? "AI review needs attention" : "AI review in progress"} · Last checked {resumeLastCheckedAt.toLocaleString()}</span>}
            <div className="ct-account-resume-priority-actions">
              <button className="ct-account-file-preview" type="button" onClick={() => void openResumePreview()} disabled={previewResume.isPending} aria-haspopup="dialog">{previewResume.isPending ? "Opening…" : "Preview"}</button>
              <button className="ct-button ct-button--secondary" type="button" onClick={() => void runResumeAnalysis("retrying")} disabled={resumeBusy}>{resumeBusy ? "Processing…" : "Re-read AI"}</button>
              <button className="ct-button ct-button--secondary" type="button" onClick={() => inputRef.current?.click()} disabled={resumeBusy}>{resumeBusy ? "Processing…" : "Upload new"}</button>
              <button className="ct-account-file-remove" type="button" onClick={() => void removeCurrentResume()} disabled={removeResume.isPending || resumeBusy} aria-label="Remove resume">Remove</button>
            </div>
          </div>
        </div> : <button className="ct-button ct-account-resume-upload-button" type="button" onClick={() => inputRef.current?.click()} disabled={resumeBusy}>{resumeBusy ? <><Loader2 size={16} className="ct-spin" /> Reading resume…</> : <><Upload size={16} /> Upload resume</>}</button>}
        {resumeName && resumePreviewUrl && <Dialog open={resumeViewerOpen} onOpenChange={(open) => { if (!open) closeResumePreview(); else setResumeViewerOpen(true); }}><DialogContent className="ct-resume-preview-dialog" showCloseButton={false}><div className="ct-resume-viewer" role="document" aria-label={`Preview of ${resumeName}`}><div className="ct-resume-viewer-head"><div><span>Secure document preview</span><DialogTitle>{resumeName}</DialogTitle><DialogDescription className="ct-visually-hidden">Private preview of your uploaded resume.</DialogDescription></div><button type="button" onClick={closeResumePreview} aria-label="Close resume preview"><X size={16} /></button></div>{resumeMimeType === "application/pdf" ? <iframe title={`Preview of ${resumeName}`} src={resumePreviewUrl} /> : <div className="ct-resume-viewer-fallback"><FileText size={24} /><p>This file type is ready to open in a new browser tab.</p><a href={resumePreviewUrl} target="_blank" rel="noreferrer">Open document <ArrowRight size={15} /></a></div>}</div></DialogContent></Dialog>}
        <input ref={inputRef} className="ct-visually-hidden" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => void handleResume(event)} />
      </section>
      {resumeEvidenceEntries.length > 0 && <section className="ct-account-evidence ct-account-surface" aria-labelledby="resume-evidence-title"><div className="ct-account-evidence-head"><div><p className="ct-home-eyebrow"><span /> Source check</p><h2 id="resume-evidence-title">Review what the resume says.</h2></div><small>Confidence is a review cue, not a guarantee.</small></div><div className="ct-account-evidence-grid">{resumeEvidenceEntries.map((entry) => { const percentage = Math.round(entry.confidence * 100); const level = percentage >= 85 ? "High confidence" : percentage >= 60 ? "Review recommended" : "Needs review"; return <article key={entry.key}><div><strong>{entry.label}</strong><span className={percentage < 60 ? "is-low" : ""}>{level} · {percentage}%</span></div><i><b style={{ width: `${percentage}%` }} /></i><blockquote><mark>{entry.sourceText}</mark></blockquote></article>; })}</div></section>}

      <div className="ct-account-layout">
        <form
          className="ct-account-form"
          onSubmit={(event) => {
            event.preventDefault();
            setResumeSuggestions(null);
            setFormBeforeResumeSuggestions(null);
            resumeMetaBeforeSuggestionsRef.current = null;
            void save();
          }}
        >
          <section className="ct-account-card" aria-labelledby="account-about"><div className="ct-account-card-head"><span>01</span><div><h2 id="account-about">About you</h2><p>Basic details you choose to use in your preparation profile.</p></div></div><div className="ct-account-fields ct-account-fields--two"><Field label="Full name" value={form.fullName} onChange={(value) => setField("fullName", value)} required /><Field label="Location" value={form.location} onChange={(value) => setField("location", value)} placeholder="e.g., Lahore, Pakistan" /><Field label="Age" value={form.age} type="number" min="16" max="99" onChange={(value) => setField("age", value)} /><SelectField label="Education" value={form.education} onChange={(value) => setField("education", value)} options={educationValues} placeholder="Select education" /><Field label="Degree / program" value={form.degree} onChange={(value) => setField("degree", value)} placeholder="e.g., BS Computer Science" /></div></section>

          <section className="ct-account-card" aria-labelledby="account-contact"><div className="ct-account-card-head"><span>02</span><div><h2 id="account-contact">Contact &amp; links</h2><p>Only resume details you review here are saved to your private preparation profile.</p></div></div><div className="ct-account-fields ct-account-fields--two"><Field label="Phone" value={form.phone} type="tel" onChange={(value) => setField("phone", value)} placeholder="Optional" /><Field label="Contact email" value={form.contactEmail} type="email" onChange={(value) => setField("contactEmail", value)} placeholder="Optional" /><Field label="LinkedIn URL" value={form.linkedinUrl} type="url" onChange={(value) => setField("linkedinUrl", value)} placeholder="https://linkedin.com/in/…" /><Field label="Portfolio URL" value={form.portfolioUrl} type="url" onChange={(value) => setField("portfolioUrl", value)} placeholder="https://…" /></div></section>

          <section className="ct-account-card" aria-labelledby="account-direction"><div className="ct-account-card-head"><span>03</span><div><h2 id="account-direction">Career direction</h2><p>Review FutureMaker’s suggestions or add the details manually in your own words.</p></div></div><div className="ct-account-fields ct-account-fields--two"><SelectField label="Current focus" value={form.careerStatus} onChange={(value) => setField("careerStatus", value as ProfileForm["careerStatus"])} options={["working", "seeking"]} placeholder="Select current focus" optionLabels={{ working: "Currently working", seeking: "Seeking an opportunity" }} required /><SelectField label="Looking for" value={form.lookingFor} onChange={(value) => setField("lookingFor", value)} options={lookingForValues} placeholder="Select an option" /><Field label="Current role" value={form.currentJob} onChange={(value) => setField("currentJob", value)} placeholder="Optional" /><Field label="Company / organization" value={form.company} onChange={(value) => setField("company", value)} placeholder="Optional" /><Field label="Career field" value={form.careerField} onChange={(value) => setField("careerField", value)} placeholder="e.g., Software engineering" /><Field label="Target role" value={form.targetRole} onChange={(value) => setField("targetRole", value)} placeholder="e.g., Junior Software Engineer" required /></div><div className="ct-account-fields"><TextField label="Professional summary" value={form.professionalSummary} onChange={(value) => setField("professionalSummary", value)} placeholder="A concise summary from your resume." /><TextField label="Skills" value={form.skills} onChange={(value) => setField("skills", value)} placeholder="List tools, strengths, coursework, or skills you want to practice with." required /><TextField label="Relevant experience" value={form.experience} onChange={(value) => setField("experience", value)} placeholder="Current roles appear first; previous roles follow newest to oldest." /></div></section>

          <section className="ct-account-card" aria-labelledby="account-record"><div className="ct-account-card-head"><span>04</span><div><h2 id="account-record">Professional record</h2><p>Keep factual projects, credentials, language strengths, and additional verified details ready for targeted practice.</p></div></div><div className="ct-account-fields"><TextField label="Projects" value={form.projects} onChange={(value) => setField("projects", value)} placeholder="Resume projects, outcomes, or links you want to reference." /><CertificationCardsField value={form.certifications} onChange={(value) => setField("certifications", value)} /><LanguageCardsField value={form.languages} onChange={(value) => setField("languages", value)} /><VerifiedDetailsField value={form.verifiedDetails} onChange={(value) => setField("verifiedDetails", value)} hasResumeReview={Boolean(resumeSuggestions)} /></div></section>

          <section className="ct-account-card" aria-labelledby="account-controls"><div className="ct-account-card-head"><span>05</span><div><h2 id="account-controls">Personalization controls</h2><p>Choose how your own account details may guide future FutureMaker features.</p></div></div><ToggleRow title="Personalized coaching" description="Use your saved preparation profile to tailor practice prompts." checked={form.personalizationEnabled} onChange={(value) => setField("personalizationEnabled", value)} /><ToggleRow title="Job recommendations" description="Use the roles you select to inform future opportunity suggestions." checked={form.jobRecommendationsEnabled} onChange={(value) => setField("jobRecommendationsEnabled", value)} /><ToggleRow title="Professional connections" description="Allow details you later authorize through supported connections to improve relevance." checked={form.professionalConnectionsEnabled} onChange={(value) => setField("professionalConnectionsEnabled", value)} /></section>

          <div className="ct-account-save">
            <div className="flex flex-col gap-1" aria-live="polite">
              <div className="flex items-center gap-2">
                {autoSaveStatus === "saving" ? (
                  <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                    <Loader2 size={14} className="ct-spin text-amber-400" /> Saving changes to database…
                  </span>
                ) : autoSaveStatus === "unsaved" ? (
                  <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                    <span className="inline-block size-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> Auto-saving in a moment…
                  </span>
                ) : autoSaveStatus === "error" ? (
                  <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                    <AlertCircle size={14} className="text-red-400" /> Cloud sync paused · Click button to retry
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 size={14} className="text-emerald-400" /> All changes saved {lastSavedAt ? `(${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})` : "to cloud"}
                  </span>
                )}
              </div>
              <p aria-live="polite">{hasUnsavedToggleChanges ? <><Save size={15} /> Toggle preferences changed. Save them before you start practice.</> : <><LockKeyhole size={15} /> Your profile is private by default and belongs to your account.</>}</p>
            </div>
            <div className="ct-account-save-actions">
              <button
                className="ct-button ct-button--secondary ct-button--clear"
                type="button"
                onClick={() => void handleClearForm()}
                disabled={saveProfile.isPending || autoSaveStatus === "saving"}
                title="Clear all form fields to enter new information"
              >
                <Trash2 size={15} />
                <span>Clear form</span>
              </button>
              <button
                className={`ct-button ${autoSaveStatus === "unsaved" || hasUnsavedToggleChanges ? "is-unsaved" : ""}`}
                type="submit"
                disabled={saveProfile.isPending || autoSaveStatus === "saving"}
              >
                {saveProfile.isPending || autoSaveStatus === "saving" ? (
                  <>
                    <Loader2 size={16} className="ct-spin" /> Saving details…
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save account details
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <aside className="ct-account-sidebar"><section className="ct-account-card ct-account-status"><span><CheckCircle2 size={19} /></span><h2>Account status</h2><dl><div><dt>Sign-in method</dt><dd>{user?.loginMethod || "Managed sign-in"}</dd></div><div><dt>Member since</dt><dd>{formatDate(user?.createdAt)}</dd></div><div><dt>Last signed in</dt><dd>{formatDate(user?.lastSignedIn)}</dd></div></dl></section><section className="ct-account-card ct-account-next"><BriefcaseBusiness size={20} /><h2>Ready to practice?</h2><p>{hasUnsavedToggleChanges ? "Save your changed preferences first; FutureMaker will carry them into your next private practice flow." : "Return to your private preparation flow whenever you are ready."}</p><button className="ct-button ct-button--full" type="button" onClick={() => void openPractice()} disabled={saveProfile.isPending}>{saveProfile.isPending ? "Saving settings…" : hasUnsavedToggleChanges ? "Save & open practice" : <>Open practice <ArrowRight size={16} /></>}</button></section></aside>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required, min, max }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean; min?: string; max?: string }) {
  return <label className="ct-account-field"><span>{label}{required && <b> *</b>}</span><input type={type} value={value} min={min} max={max} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, value, onChange, options, placeholder, optionLabels, required }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; placeholder: string; optionLabels?: Record<string, string>; required?: boolean }) {
  return <label className="ct-account-field"><span>{label}{required && <b> *</b>}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{optionLabels?.[option] ?? option}</option>)}</select></label>;
}

function TextField({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  if (label === "Skills") return <SkillsTagField value={value} onChange={onChange} placeholder={placeholder} required={required} />;
  if (label === "Relevant experience") return <ExperienceTimelineField value={value} onChange={onChange} placeholder={placeholder} />;
  if (label === "Projects") return <ProjectCardsField value={value} onChange={onChange} />;
  return <label className="ct-account-field"><span>{label}{required && <b> *</b>}</span><textarea rows={4} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SkillsTagField({ value, onChange, placeholder, required }: { value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  const [draft, setDraft] = useState("");
  const tags = splitSkillTags(value);
  const commitDraft = () => {
    const candidates = splitSkillTags(draft);
    if (!candidates.length) return;
    const next = splitSkillTags([...tags, ...candidates].join(", "));
    onChange(next.join(", "));
    setDraft("");
  };
  const removeTag = (tag: string) => onChange(tags.filter((item) => item !== tag).join(", "));

  return <div className="ct-account-field ct-skills-field"><div className="ct-account-field-label"><span>Skills{required && <b> *</b>}</span><small>{tags.length ? `${tags.length} skills retained for targeted practice` : "Press Enter or comma to add"}</small></div><div className="ct-skill-tags" aria-label="Selected skills">{tags.map((tag) => <span key={tag} className="ct-skill-tag">{tag}<button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}><X size={13} /></button></span>)}<input value={draft} placeholder={tags.length ? "Add a skill" : placeholder} onChange={(event) => setDraft(event.target.value)} onBlur={commitDraft} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); commitDraft(); } if (event.key === "Backspace" && !draft && tags.length) removeTag(tags.at(-1)!); }} /></div></div>;
}

function ExperienceTimelineField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExperienceTimelineEntry | null>(null);
  const entries = parseExperienceTimeline(value);
  const emptyEntry = (): ExperienceTimelineEntry => ({ id: `timeline-new-${Date.now()}`, title: "", organisation: "", location: "", period: "" });
  const persist = (next: ExperienceTimelineEntry[]) => onChange(serializeExperienceTimeline(sortExperienceTimeline(next)));
  const beginAdd = () => { setEditingId("new"); setDraft(emptyEntry()); };
  const beginEdit = (entry: ExperienceTimelineEntry) => { setEditingId(entry.id); setDraft({ ...entry }); };
  const cancelEdit = () => { setEditingId(null); setDraft(null); };
  const saveEntry = () => {
    if (!draft || !draft.title.trim()) { toast.error("Add a role title before saving this experience entry."); return; }
    persist(editingId === "new" ? [...entries, draft] : entries.map((entry) => entry.id === editingId ? draft : entry));
    cancelEdit();
  };
  const deleteEntry = (id: string) => { persist(entries.filter((entry) => entry.id !== id)); if (editingId === id) cancelEdit(); };
  return <div className="ct-account-field ct-experience-field"><div className="ct-account-field-label"><span>Relevant experience</span><small>Current role first</small></div><div className="ct-experience-toolbar"><p>{entries.length ? "Active roles stay at the top; previous roles follow newest to oldest." : "Add roles, internships, projects, or volunteering one at a time."}</p><button className="ct-button ct-button--secondary ct-timeline-add" type="button" onClick={beginAdd}><Plus size={15} /> Add experience</button></div>{entries.length > 0 ? <ol className="ct-experience-timeline" aria-label="Experience timeline">{entries.map((entry) => <li key={entry.id} className={isCurrentExperience(entry) ? "is-current" : undefined}><i /><div className="ct-experience-timeline-content"><div><div className="ct-experience-title-row"><strong>{entry.title}</strong>{isCurrentExperience(entry) && <em className="ct-experience-current-badge">Current</em>}</div>{entry.organisation && <span>{entry.organisation}</span>}{(entry.location || entry.period) && <small>{[entry.location, entry.period].filter(Boolean).join(" · ")}</small>}</div><div className="ct-experience-actions"><button type="button" onClick={() => beginEdit(entry)} aria-label={`Edit ${entry.title}`}><Pencil size={14} /></button><button type="button" className="is-destructive" onClick={() => deleteEntry(entry.id)} aria-label={`Delete ${entry.title}`}><Trash2 size={14} /></button></div></div></li>)}</ol> : <div className="ct-experience-empty"><BriefcaseBusiness size={18} /><span>No timeline entries yet. Start with your most relevant experience.</span></div>}{draft && <fieldset className="ct-experience-entry-editor"><legend>{editingId === "new" ? "Add experience" : "Edit experience"}</legend><div className="ct-experience-entry-grid"><label><span>Role *</span><input value={draft.title} placeholder="e.g., Software Engineering Intern" onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label><span>Company / organization</span><input value={draft.organisation} placeholder="e.g., FutureMaker" onChange={(event) => setDraft({ ...draft, organisation: event.target.value })} /></label><label><span>Location</span><input value={draft.location} placeholder="e.g., Lahore" onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label><label><span>Period</span><input value={draft.period} placeholder="e.g., Jun 2025 – Present" onChange={(event) => setDraft({ ...draft, period: event.target.value })} /></label></div><div className="ct-experience-editor-actions"><button className="ct-button ct-timeline-save" type="button" onClick={saveEntry}><Save size={15} /> Save entry</button><button className="ct-button ct-button--secondary" type="button" onClick={cancelEdit}>Cancel</button></div></fieldset>}<p className="ct-experience-storage-note">Current roles sort first and previous roles sort newest to oldest. Each entry is saved privately only when you select <strong>Save account details</strong>.</p></div>;
}

function ProjectCardsField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProjectCard | null>(null);
  const [activeTechnology, setActiveTechnology] = useState<string | null>(null);
  const cards = parseProjectCards(value);
  const githubLinks = useMemo(() => cards.map((card) => projectExternalHref(card.link)).filter((link) => /https?:\/\/(?:www\.)?github\.com\//i.test(link)), [cards]);
  const githubMetadataQuery = trpc.careerProfile.githubMetadata.useQuery({ links: githubLinks }, { enabled: githubLinks.length > 0, staleTime: 30 * 60 * 1_000, retry: false });
  const githubMetadata = useMemo(() => new Map((githubMetadataQuery.data?.repositories ?? []).map((repository) => [repository.sourceLink, repository])), [githubMetadataQuery.data]);
  const technologies = useMemo(() => Array.from(new Map(cards.flatMap((card) => card.technologies).map((technology) => [technology.toLocaleLowerCase(), technology])).values()), [cards]);
  const visibleCards = activeTechnology ? cards.filter((card) => card.technologies.some((technology) => technology.toLocaleLowerCase() === activeTechnology)) : cards;
  const emptyCard = (): ProjectCard => ({ id: `project-new-${Date.now()}`, name: "", summary: "", link: "", technologies: [] });
  const persist = (next: ProjectCard[]) => onChange(serializeProjectCards(next));
  const beginAdd = () => { setEditingId("new"); setDraft(emptyCard()); };
  const beginEdit = (card: ProjectCard) => { setEditingId(card.id); setDraft({ ...card, technologies: [...card.technologies] }); };
  const cancelEdit = () => { setEditingId(null); setDraft(null); };
  const saveCard = () => {
    if (!draft || !draft.name.trim()) { toast.error("Add a project name before saving this card."); return; }
    persist(editingId === "new" ? [...cards, draft] : cards.map((card) => card.id === editingId ? draft : card));
    cancelEdit();
  };
  const deleteCard = (id: string) => { persist(cards.filter((card) => card.id !== id)); if (editingId === id) cancelEdit(); };

  return <div className="ct-account-field ct-projects-field"><div className="ct-account-field-label"><span>Projects</span><small>Cards with links &amp; stack</small></div><div className="ct-projects-toolbar"><p>{cards.length ? "Links open in a new tab; GitHub details are refreshed safely and cached briefly." : "Add projects from your resume, portfolio, coursework, or work history."}</p><button className="ct-button ct-button--secondary ct-project-add" type="button" onClick={beginAdd}><Plus size={15} /> Add project</button></div>{technologies.length > 0 && <div className="ct-project-filters" aria-label="Filter projects by technology"><button type="button" className={!activeTechnology ? "is-active" : ""} aria-pressed={!activeTechnology} onClick={() => setActiveTechnology(null)}>All projects <span>{cards.length}</span></button>{technologies.map((technology) => { const key = technology.toLocaleLowerCase(); const count = cards.filter((card) => card.technologies.some((item) => item.toLocaleLowerCase() === key)).length; return <button key={key} type="button" className={activeTechnology === key ? "is-active" : ""} aria-pressed={activeTechnology === key} onClick={() => setActiveTechnology(activeTechnology === key ? null : key)}>{technology} <span>{count}</span></button>; })}</div>}{cards.length > 0 ? <div className="ct-project-card-grid" aria-label="Project cards">{visibleCards.map((card) => { const href = projectExternalHref(card.link); const metadata = href ? githubMetadata.get(href) : undefined; return <article className="ct-project-card" key={card.id}><div className="ct-project-card-head"><div><strong>{card.name}</strong>{href && <a href={href} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open link</a>}</div><div className="ct-project-actions"><button type="button" onClick={() => beginEdit(card)} aria-label={`Edit ${card.name}`}><Pencil size={14} /></button><button type="button" className="is-destructive" onClick={() => deleteCard(card.id)} aria-label={`Delete ${card.name}`}><Trash2 size={14} /></button></div></div>{card.summary && <p>{card.summary}</p>}{metadata && <div className="ct-project-github-stats" aria-label={`${metadata.repository} GitHub statistics`}><span><Star size={12} aria-hidden="true" /> {compactCount(metadata.stars)} stars</span><span><GitFork size={12} aria-hidden="true" /> {compactCount(metadata.forks)} forks</span></div>}{card.technologies.length > 0 && <div className="ct-project-tech-stack" aria-label={`${card.name} technology stack`}>{card.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div>}</article>; })}</div> : <div className="ct-project-empty"><BriefcaseBusiness size={18} /><span>No project cards yet. Add a project with an explicit link and technology stack.</span></div>}{cards.length > 0 && visibleCards.length === 0 && <div className="ct-project-filter-empty"><span>No projects use this technology yet.</span><button type="button" onClick={() => setActiveTechnology(null)}>Show all projects</button></div>}{draft && <fieldset className="ct-project-editor"><legend>{editingId === "new" ? "Add project" : "Edit project"}</legend><div className="ct-project-editor-grid"><label><span>Project name *</span><input value={draft.name} placeholder="e.g., FutureMaker AI" onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Project link</span><input value={draft.link} type="url" placeholder="https://github.com/… or live URL" onChange={(event) => setDraft({ ...draft, link: event.target.value })} /></label></div><label className="ct-project-editor-summary"><span>Summary</span><textarea rows={3} value={draft.summary} placeholder="What the project does and the outcome you can discuss." onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label><label className="ct-project-editor-summary"><span>Technology stack</span><input value={draft.technologies.join(", ")} placeholder="e.g., React, TypeScript, MySQL" onChange={(event) => setDraft({ ...draft, technologies: splitSkillTags(event.target.value) })} /></label><div className="ct-project-editor-actions"><button className="ct-button ct-project-save" type="button" onClick={saveCard}><Save size={15} /> Save project</button><button className="ct-button ct-button--secondary" type="button" onClick={cancelEdit}>Cancel</button></div></fieldset>}<p className="ct-project-storage-note">Resume project cards replace this editable draft only after AI review. Select <strong>Save account details</strong> to persist them privately.</p></div>;
}

function CertificationCardsField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CertificationCard | null>(null);
  const cards = parseCertificationCards(value);
  const emptyCard = (): CertificationCard => ({ id: `certification-new-${Date.now()}`, name: "", issuer: "", credentialId: "", issuedOn: "", link: "" });
  const persist = (next: CertificationCard[]) => onChange(serializeCertificationCards(next));
  const cancelEdit = () => { setEditingId(null); setDraft(null); };
  const saveCard = () => {
    if (!draft || !draft.name.trim()) { toast.error("Add a credential name before saving this certification."); return; }
    persist(editingId === "new" ? [...cards, draft] : cards.map((card) => card.id === editingId ? draft : card));
    cancelEdit();
  };
  const deleteCard = (id: string) => { persist(cards.filter((card) => card.id !== id)); if (editingId === id) cancelEdit(); };
  return <div className="ct-account-field ct-qualification-field"><div className="ct-account-field-label"><span>Certifications</span><small>Issuer, ID, date &amp; link</small></div><div className="ct-qualification-toolbar"><p>{cards.length ? "Keep only credentials you can confidently discuss in an interview." : "Add credentials or courses explicitly listed on your resume."}</p><button className="ct-button ct-button--secondary ct-qualification-add" type="button" onClick={() => { setEditingId("new"); setDraft(emptyCard()); }}><Plus size={15} /> Add certification</button></div>{cards.length > 0 ? <div className="ct-qualification-grid">{cards.map((card) => { const href = projectExternalHref(card.link); return <article className="ct-qualification-card" key={card.id}><div className="ct-qualification-card-head"><Award size={17} /><div><strong>{card.name}</strong>{card.issuer && <span>{card.issuer}</span>}</div><div className="ct-project-actions"><button type="button" onClick={() => { setEditingId(card.id); setDraft({ ...card }); }} aria-label={`Edit ${card.name}`}><Pencil size={14} /></button><button type="button" className="is-destructive" onClick={() => deleteCard(card.id)} aria-label={`Delete ${card.name}`}><Trash2 size={14} /></button></div></div><div className="ct-qualification-meta">{card.issuedOn && <span>{card.issuedOn}</span>}{card.credentialId && <span>ID · {card.credentialId}</span>}{href && <a href={href} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Verify</a>}</div></article>; })}</div> : <div className="ct-qualification-empty"><Award size={18} /><span>No certifications yet. Add only credentials supported by your resume.</span></div>}{draft && <fieldset className="ct-qualification-editor"><legend>{editingId === "new" ? "Add certification" : "Edit certification"}</legend><div className="ct-qualification-editor-grid"><label><span>Credential name *</span><input value={draft.name} placeholder="e.g., AWS Certified Cloud Practitioner" onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Issuer</span><input value={draft.issuer} placeholder="e.g., Amazon Web Services" onChange={(event) => setDraft({ ...draft, issuer: event.target.value })} /></label><label><span>Credential ID</span><input value={draft.credentialId} placeholder="Optional" onChange={(event) => setDraft({ ...draft, credentialId: event.target.value })} /></label><label><span>Issued / expiry date</span><input value={draft.issuedOn} placeholder="e.g., Jun 2025" onChange={(event) => setDraft({ ...draft, issuedOn: event.target.value })} /></label></div><label className="ct-qualification-link"><span>Credential link</span><input value={draft.link} type="url" placeholder="https://credential-provider.example/…" onChange={(event) => setDraft({ ...draft, link: event.target.value })} /></label><div className="ct-project-editor-actions"><button className="ct-button ct-project-save" type="button" onClick={saveCard}><Save size={15} /> Save certification</button><button className="ct-button ct-button--secondary" type="button" onClick={cancelEdit}>Cancel</button></div></fieldset>}<p className="ct-project-storage-note">Credential records remain editable and are saved privately only when you select <strong>Save account details</strong>.</p></div>;
}

function LanguageCardsField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LanguageCard | null>(null);
  const cards = parseLanguageCards(value);
  const emptyCard = (): LanguageCard => ({ id: `language-new-${Date.now()}`, name: "", proficiency: "" });
  const persist = (next: LanguageCard[]) => onChange(serializeLanguageCards(next));
  const cancelEdit = () => { setEditingId(null); setDraft(null); };
  const saveCard = () => {
    if (!draft || !draft.name.trim()) { toast.error("Add a language name before saving this record."); return; }
    persist(editingId === "new" ? [...cards, draft] : cards.map((card) => card.id === editingId ? draft : card));
    cancelEdit();
  };
  const deleteCard = (id: string) => { persist(cards.filter((card) => card.id !== id)); if (editingId === id) cancelEdit(); };
  return <div className="ct-account-field ct-qualification-field"><div className="ct-account-field-label"><span>Languages</span><small>Proficiency when explicit</small></div><div className="ct-qualification-toolbar"><p>{cards.length ? "Language levels are optional—record them only when you can support them." : "Add languages from your resume, including a level only if it is stated."}</p><button className="ct-button ct-button--secondary ct-qualification-add" type="button" onClick={() => { setEditingId("new"); setDraft(emptyCard()); }}><Plus size={15} /> Add language</button></div>{cards.length > 0 ? <div className="ct-language-grid">{cards.map((card) => <article className="ct-language-card" key={card.id}><Languages size={17} /><div><strong>{card.name}</strong><span>{card.proficiency || "Level not specified"}</span></div><div className="ct-project-actions"><button type="button" onClick={() => { setEditingId(card.id); setDraft({ ...card }); }} aria-label={`Edit ${card.name}`}><Pencil size={14} /></button><button type="button" className="is-destructive" onClick={() => deleteCard(card.id)} aria-label={`Delete ${card.name}`}><Trash2 size={14} /></button></div></article>)}</div> : <div className="ct-qualification-empty"><Languages size={18} /><span>No languages yet. Add languages you explicitly use or have listed.</span></div>}{draft && <fieldset className="ct-qualification-editor"><legend>{editingId === "new" ? "Add language" : "Edit language"}</legend><div className="ct-qualification-editor-grid"><label><span>Language *</span><input value={draft.name} placeholder="e.g., Urdu" onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Proficiency</span><select value={draft.proficiency} onChange={(event) => setDraft({ ...draft, proficiency: event.target.value as LanguageCard["proficiency"] })}><option value="">Not specified</option><option value="Native">Native</option><option value="Professional">Professional</option><option value="Conversational">Conversational</option><option value="Basic">Basic</option></select></label></div><div className="ct-project-editor-actions"><button className="ct-button ct-project-save" type="button" onClick={saveCard}><Save size={15} /> Save language</button><button className="ct-button ct-button--secondary" type="button" onClick={cancelEdit}>Cancel</button></div></fieldset>}<p className="ct-project-storage-note">Language records remain editable and are saved privately only when you select <strong>Save account details</strong>.</p></div>;
}

function VerifiedDetailsField({ value, onChange, hasResumeReview }: { value: string; onChange: (value: string) => void; hasResumeReview: boolean }) {
  const details = parseVerifiedDetails(value);
  const removeDetail = (id: string) => onChange(serializeVerifiedDetails(details.filter((detail) => detail.id !== id)));
  return <div className="ct-account-field ct-verified-details-field"><div className="ct-account-field-label"><span>Additional verified details</span><small>Explicit resume facts only</small></div>{details.length > 0 ? <div className="ct-verified-details-grid" aria-label="Additional verified resume details">{details.map((detail) => <article className="ct-verified-detail-card" key={detail.id}><div><span>{detail.category}</span><strong>{detail.title}</strong></div><button type="button" className="is-destructive" onClick={() => removeDetail(detail.id)} aria-label={`Remove ${detail.title}`}><Trash2 size={14} /></button><p>{detail.detail}</p></article>)}</div> : <div className="ct-qualification-empty"><ShieldCheck size={18} /><span>{hasResumeReview ? "No separate extra facts were returned. The supported resume details are already represented in your education, experience, projects, credentials, and skills above." : "Additional awards, training, leadership, coursework, and achievements found in your resume will appear here for review."}</span></div>}<p className="ct-project-storage-note">These details are source-grounded and remain editable through review. Select <strong>Save account details</strong> to persist them privately.</p></div>;
}

function ToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="ct-account-toggle"><div><h3>{title}</h3><p>{description}</p></div><button type="button" role="switch" aria-label={`Toggle ${title}`} aria-checked={checked} className={checked ? "is-on" : ""} onClick={() => onChange(!checked)}><i /></button></div>;
}

function ProfessionalConnectionsPlaceholder({ selections, pendingPlatform, detailsPendingPlatform, onToggle, onViewDetails }: { selections: Record<ConnectionPlatform, boolean>; pendingPlatform: ConnectionPlatform | null; detailsPendingPlatform: ConnectionPlatform | null; onToggle: (platform: ConnectionPlatform) => void; onViewDetails: (platform: ConnectionPlatform) => void }) {
  const selectedCount = connectionPlatforms.filter((platform) => selections[platform.id]).length;
  return <section className="ct-account-connections ct-account-surface" aria-labelledby="account-connections-title">
    <div className="ct-account-connections-head"><div><p className="ct-home-eyebrow"><span /> Presentation setup</p><h2 id="account-connections-title">Professional connections</h2><p>Choose the platforms you may want to prepare for later. Resume upload stays private and works independently.</p></div><span className="ct-account-connections-state">{selectedCount ? `${selectedCount} ${selectedCount === 1 ? "connection" : "connections"} ready` : "No connections selected"}</span></div>
    <div className="ct-account-connections-grid">{connectionPlatforms.map((platform) => {
      const checked = selections[platform.id];
      const isPending = pendingPlatform === platform.id;
      const isDetailsPending = detailsPendingPlatform === platform.id;
      const controlsDisabled = Boolean(pendingPlatform || detailsPendingPlatform);
      return <article key={platform.id} className={`ct-account-connection is-${platform.id}${checked ? " is-selected" : ""}${isDetailsPending ? " is-opening-details" : ""}`} aria-busy={isDetailsPending || undefined}>
        {checked && <span className="ct-account-connection-hitarea"><button className="ct-account-connection-open" type="button" onClick={() => onViewDetails(platform.id)} aria-label={`Open ${platform.name} profile details`} disabled={controlsDisabled}><span className="ct-visually-hidden">Open {platform.name} profile details</span></button></span>}
        <span className="ct-account-connection-mark"><platform.Icon aria-hidden="true" data-testid={`connection-brand-${platform.id}`} /></span>
        <div className="ct-account-connection-copy"><h3>{platform.name}</h3><p>{platform.description}</p><small role="status" aria-live="polite">{isPending ? "Preparing connection…" : isDetailsPending ? "Opening profile details…" : checked ? "Ready to view" : "Set up later"}</small></div>
        <div className="ct-account-connection-actions">{checked && <button className="ct-connection-details-trigger" type="button" onClick={() => onViewDetails(platform.id)} aria-label={`View ${platform.name} profile details`} disabled={controlsDisabled}>{isDetailsPending ? <Loader2 className="ct-connection-details-spinner" size={15} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}</button>}<button type="button" role="switch" aria-label={`Toggle ${platform.name} connection setup`} aria-checked={checked} aria-busy={isPending} className={checked ? "is-on" : ""} onClick={() => onToggle(platform.id)} disabled={controlsDisabled}>{isPending ? <Loader2 className="ct-connection-spinner" size={16} aria-hidden="true" /> : <i />}</button></div>
      </article>;
    })}</div>
    <p className="ct-account-connections-note"><LockKeyhole size={14} /> This presentation flow does not sign in, connect an account, access platform data, or save a permission.</p>
  </section>;
}

function ConnectionPermissionDialog({ platform, onOpenChange, onContinue }: { platform: ConnectionPlatformDefinition | null; onOpenChange: (open: boolean) => void; onContinue: () => void }) {
  return <Dialog open={Boolean(platform)} onOpenChange={onOpenChange}><DialogContent className="ct-connection-permission-dialog"><div className={`ct-connection-permission-mark is-${platform?.id ?? "linkedin"}`}>{platform && <platform.Icon aria-hidden="true" />}</div><div><p className="ct-home-eyebrow"><span /> Authorization request</p><DialogTitle>Prepare {platform?.name ?? "platform"} details</DialogTitle><DialogDescription>This presentation flow does not sign you in, connect an account, access platform data, or save a permission. It prepares an illustrative profile view only.</DialogDescription></div><section className="ct-connection-permission-list" aria-label="Illustrative authorization scope"><strong>Illustrative profile context</strong><span><CheckCircle2 size={14} /> {platform?.illustrativePermission}</span><span><CheckCircle2 size={14} /> Interview-preparation context</span></section><div className="ct-connection-permission-actions"><button className="ct-button ct-button--secondary" type="button" onClick={() => onOpenChange(false)}>Cancel</button><button className="ct-button" type="button" onClick={onContinue}>Continue <ArrowRight size={15} /></button></div></DialogContent></Dialog>;
}

function ConnectionDetailsDialog({ platform, onOpenChange }: { platform: ConnectionPlatformDefinition | null; onOpenChange: (open: boolean) => void }) {
  const snapshot = platform?.snapshot;
  return <Dialog open={Boolean(platform)} onOpenChange={onOpenChange}><DialogContent className={`ct-connection-details-dialog is-${platform?.id ?? "linkedin"}`}>{platform && snapshot && <><div className="ct-connection-details-heading"><div className={`ct-connection-details-brand is-${platform.id}`}><platform.Icon aria-hidden="true" /></div><div><p className="ct-home-eyebrow"><span /> Illustrative profile snapshot</p><DialogTitle>{platform.name} profile details</DialogTitle><DialogDescription>Structured presentation content only. These values are not retrieved from an account.</DialogDescription></div></div><section className="ct-connection-profile-summary"><span aria-hidden="true">{snapshot.initials}</span><div><strong>{snapshot.identifier}</strong><p>{snapshot.headline}</p></div></section><section className="ct-connection-source-status" aria-label={`${platform.name} data source`}><div className="ct-connection-source-status-mark"><LockKeyhole size={14} aria-hidden="true" /></div><div><span>Data source</span><strong>{snapshot.source.label}</strong><p>{snapshot.source.detail}</p></div></section><dl className="ct-connection-snapshot-metrics">{snapshot.metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl><section className="ct-connection-snapshot-details" aria-label={`${platform.name} illustrative profile context`}>{snapshot.details.map((detail) => <div key={detail.label}><span>{detail.label}</span><strong>{detail.value}</strong></div>)}</section><div className="ct-connection-platform-sections" aria-label={`${platform.name} platform-specific context`}>{snapshot.sections.map((section) => <section className="ct-connection-platform-section" key={section.title}><div><span>{section.label}</span><strong>{section.title}</strong></div><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}</div><section className="ct-connection-snapshot-activity"><span>{snapshot.activityLabel}</span><p>{snapshot.activity}</p></section><footer className="ct-connection-details-footer"><p>Illustrative content for presentation. Authorized data can replace these fields when platform access is configured.</p><button className="ct-button ct-button--secondary" type="button" onClick={() => onOpenChange(false)}>Close</button></footer></>}</DialogContent></Dialog>;
}
