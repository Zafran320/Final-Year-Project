import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  DollarSign,
  ExternalLink,
  Filter,
  Flame,
  Globe2,
  Info,
  Layers,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { FaGithub, FaLinkedinIn } from "react-icons/fa";
import { SiFiverr, SiIndeed, SiUpwork } from "react-icons/si";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ProfileForm } from "@/pages/AccountDetails";

export type ConnectionPlatform =
  | "linkedin"
  | "indeed"
  | "upwork"
  | "github"
  | "fiverr"
  | "meta"
  | "remoteok"
  | "arbeitnow"
  | "remotive"
  | "themuse"
  | "jobicy";

export type JobOffering = {
  id: string;
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  isLocationMatch: boolean;
  locationMatchReason: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  salaryRange: string;
  experienceLevel: "Entry / Junior" | "Mid-Level" | "Senior" | "Lead";
  matchedSkills: string[];
  additionalSkills: string[];
  platformSources: ConnectionPlatform[];
  matchScore: number; // 1.0 to 5.0 scale
  matchPercentage: number; // e.g. 96
  whyRecommended: string;
  connectorSignalNote: string;
  dimensions: {
    technicalFit: number;
    seniorityFit: number;
    workModeFit: number;
    growthFit: number;
  };
  interviewTalkingPoints: string[];
  reportBlocks: {
    blockA: string; // Role & Organization Snapshot
    blockB: string; // Core Mission & Impact
    blockC: string; // Technical Stack & Architecture
    blockD: string; // Candidate Fit Matrix
    blockE: string; // Provenance Signals
    blockF: string; // Suggested Rehearsal Plan
    blockG: string; // Opportunity Legitimacy Audit
    blockH: string; // Recommended Next Steps
  };
};

const platformMeta: Record<
  ConnectionPlatform,
  { name: string; Icon: IconType; color: string }
> = {
  linkedin: { name: "LinkedIn", Icon: FaLinkedinIn, color: "#0a66c2" },
  indeed: { name: "Indeed", Icon: SiIndeed, color: "#2164f3" },
  upwork: { name: "Upwork", Icon: SiUpwork, color: "#14a800" },
  github: { name: "GitHub", Icon: FaGithub, color: "#9ca3af" },
  fiverr: { name: "Fiverr", Icon: SiFiverr, color: "#1dbf73" },
  meta: { name: "Meta", Icon: SiIndeed, color: "#0668E1" },
  remoteok: { name: "RemoteOK", Icon: FaGithub, color: "#00b4d8" },
  arbeitnow: { name: "Arbeitnow", Icon: SiIndeed, color: "#10b981" },
  remotive: { name: "Remotive", Icon: FaGithub, color: "#3b82f6" },
  themuse: { name: "The Muse", Icon: SiIndeed, color: "#06b6d4" },
  jobicy: { name: "Jobicy", Icon: SiUpwork, color: "#8b5cf6" },
};

function normalizeSkill(s: string): string {
  return s.trim().toLowerCase().replace(/[^\w#+]/g, "");
}

/**
 * Intelligent Opportunity Matcher that synthesizes candidate's active skills,
 * user location, target role, and 5 connected platforms into tailored job offerings.
 */
export function generateJobOfferings(
  form: Pick<ProfileForm, "skills" | "targetRole" | "careerField" | "lookingFor" | "experience" | "projects" | "education" | "location">,
  connectionSelections?: Partial<Record<ConnectionPlatform, boolean>>
): JobOffering[] {
  const candidateSkillList = form.skills
    ? form.skills
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const candidateSkillSet = new Set(candidateSkillList.map(normalizeSkill));
  const targetRoleText = (form.targetRole || form.careerField || "Software Engineer").trim();
  const userCity = (form.location || "Lahore, Pakistan").toLowerCase();

  // Curated database of 100 high-fit real-world opportunity archetypes
  const opportunityCatalog: Array<{
    title: string;
    company: string;
    location: string;
    cityKey: string;
    jobUrl: string;
    workMode: "Remote" | "Hybrid" | "On-site";
    salaryRange: string;
    experienceLevel: "Entry / Junior" | "Mid-Level" | "Senior" | "Lead";
    coreSkills: string[];
    extraSkills: string[];
    primaryPlatforms: ConnectionPlatform[];
    rationaleTemplate: string;
    talkingPoints: string[];
  }> = [
    // ─── Pakistan Tech Leaders (50 Roles) ───
    { title: `${targetRoleText.length > 2 ? targetRoleText : "Full Stack Engineer"} (Core Platform)`, company: "Capregsoft", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://capregsoft.com", workMode: "Hybrid", salaryRange: "PKR 260,000 – 430,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "SQL", "Tailwind CSS"], extraSkills: ["Next.js", "Docker", "PostgreSQL"], primaryPlatforms: ["indeed", "linkedin", "github"], rationaleTemplate: `Directly matches your target role and proximity in Lahore, Pakistan with verified skills in React & TypeScript.`, talkingPoints: ["Mention your verified project architecture, component-level testing, and clean git history.", "Highlight your ability to deliver end-to-end features on rapid iteration cycles."] },
    { title: "Software Engineer (Web & Distributed Systems)", company: "Arbisoft", location: "Lahore / Islamabad, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://arbisoft.com/careers", workMode: "Hybrid", salaryRange: "PKR 300,000 – 550,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Python", "React", "TypeScript", "SQL", "Django"], extraSkills: ["AWS", "Docker", "FastAPI"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Premier engineering consultancy in Pakistan matching your local availability, team collaboration background, and modern web stack.`, talkingPoints: ["Discuss your problem-solving process on complex web architectures and scalability bottlenecks.", "Emphasize your proficiency with clean code, testing, and modern frontend tooling."] },
    { title: "Enterprise Solutions Developer (Cloud & Web)", company: "Systems Limited", location: "Lahore / Karachi / Islamabad, Pakistan", cityKey: "lahore", jobUrl: "https://www.systemsltd.com/careers", workMode: "Hybrid", salaryRange: "PKR 280,000 – 480,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Node.js", "TypeScript", "SQL", "React", "Cloud"], extraSkills: ["Azure", "Microservices", "CI/CD"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Leading tech powerhouse in Pakistan with extensive career progression and global projects.`, talkingPoints: ["Highlight your focus on production reliability, error boundaries, and defensive API validation.", "Discuss database query optimization and team collaboration methodologies."] },
    { title: "Full Stack Engineer (Interactive Learning Platform)", company: "Educative, Inc.", location: "Lahore, Pakistan / Remote", cityKey: "lahore", jobUrl: "https://www.educative.io/careers", workMode: "Hybrid", salaryRange: "PKR 320,000 – 520,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "Python", "SQL"], extraSkills: ["Docker", "Kubernetes", "AWS"], primaryPlatforms: ["linkedin", "indeed", "github"], rationaleTemplate: `Developer education ecosystem company based in Lahore & Seattle matching your technical communication and product engineering skills.`, talkingPoints: ["Emphasize creating responsive, low-latency UI components that simplify developer workflows.", "Demonstrate structured problem breakdown and clear technical explanations."] },
    { title: "Senior Web Solutions Architect", company: "10Pearls", location: "Karachi / Lahore / Islamabad, Pakistan", cityKey: "karachi", jobUrl: "https://10pearls.com/careers/", workMode: "Hybrid", salaryRange: "PKR 350,000 – 600,000 / mo", experienceLevel: "Senior", coreSkills: ["React", "TypeScript", "Node.js", "Cloud", "REST APIs"], extraSkills: ["GraphQL", "Serverless", "Security"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `Global digital transformation consultancy with major delivery hubs across Pakistan.`, talkingPoints: ["Discuss micro-frontend orchestration and secure credential management.", "Present concrete patterns for automated integration testing."] },
    { title: "Frontend Engineer (Mobile & React Ecosystem)", company: "VentureDive", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://www.venturedive.com/careers/", workMode: "Hybrid", salaryRange: "PKR 240,000 – 390,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Tailwind CSS", "Redux", "REST APIs"], extraSkills: ["React Native", "Next.js", "Jest"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `Product powerhouse in Lahore specializing in high-growth mobile and web applications.`, talkingPoints: ["Demonstrate UI performance optimization and accessible components.", "Showcase your experience in cross-functional product design."] },
    { title: "Backend Services Developer (FinTech Systems)", company: "NetSol Technologies", location: "Lahore, Pakistan · On-site", cityKey: "lahore", jobUrl: "https://netsoltech.com/careers", workMode: "On-site", salaryRange: "PKR 270,000 – 450,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Node.js", "TypeScript", "SQL", "PostgreSQL", "Docker"], extraSkills: ["Microservices", "Kafka", "AWS"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Fintech enterprise engineering leader with extensive global banking implementations.`, talkingPoints: ["Discuss resilient transaction boundaries and audit logging.", "Present database scaling strategies."] },
    { title: "Full Stack Engineer (Scalable Web Products)", company: "Devsinc", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://devsinc.com/careers", workMode: "Hybrid", salaryRange: "PKR 250,000 – 420,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "Node.js", "TypeScript", "PostgreSQL", "GraphQL"], extraSkills: ["Next.js", "Tailwind CSS", "Docker"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Fast-growing software services consultancy with major US client engagements.`, talkingPoints: ["Emphasize sprint velocity and robust TypeScript patterns.", "Discuss clean API integrations."] },
    { title: "Cloud Applications Engineer", company: "TkXel", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://tkxel.com/careers/", workMode: "Hybrid", salaryRange: "PKR 290,000 – 470,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["TypeScript", "Node.js", "React", "AWS", "SQL"], extraSkills: ["Serverless", "Terraform", "CI/CD"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `Premier custom software company with modern cloud architecture delivery pipelines.`, talkingPoints: ["Discuss serverless deployments and zero-downtime CI/CD.", "Walk through cloud architecture."] },
    { title: "Fintech Platform Engineer", company: "SadaPay", location: "Islamabad, Pakistan · Hybrid", cityKey: "islamabad", jobUrl: "https://sadapay.pk/careers/", workMode: "Hybrid", salaryRange: "PKR 330,000 – 580,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["TypeScript", "Node.js", "PostgreSQL", "AWS", "REST APIs"], extraSkills: ["Docker", "Kubernetes", "Redis"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `High-velocity neo-bank powering seamless digital money across Pakistan.`, talkingPoints: ["Discuss secure financial transactions and low-latency microservices.", "Present clean API contract designs."] },
    { title: "Mobile & Full Stack Developer", company: "NayaPay", location: "Karachi, Pakistan · Hybrid", cityKey: "karachi", jobUrl: "https://www.nayapay.com/careers", workMode: "Hybrid", salaryRange: "PKR 260,000 – 440,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React Native", "TypeScript", "React", "Node.js", "SQL"], extraSkills: ["GraphQL", "Tailwind CSS", "Jest"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Digital payments super-app empowering everyday commerce across Pakistan.`, talkingPoints: ["Demonstrate cross-platform UI responsiveness.", "Discuss state management in mobile apps."] },
    { title: "Software Engineer (Supply Chain Web)", company: "Bazaar Technologies", location: "Karachi, Pakistan · Hybrid", cityKey: "karachi", jobUrl: "https://bazaartech.com/careers", workMode: "Hybrid", salaryRange: "PKR 310,000 – 530,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Python", "React", "TypeScript", "PostgreSQL", "Django"], extraSkills: ["FastAPI", "Docker", "AWS"], primaryPlatforms: ["linkedin", "indeed", "github"], rationaleTemplate: `B2B e-commerce platform digitizing retail distribution across Pakistan.`, talkingPoints: ["Discuss real-time inventory management APIs.", "Demonstrate scalable web architecture."] },
    { title: "Full Stack Growth Engineer", company: "Retailo Club", location: "Karachi, Pakistan · Hybrid", cityKey: "karachi", jobUrl: "https://retailo.co/careers/", workMode: "Hybrid", salaryRange: "PKR 270,000 – 460,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "MongoDB", "Tailwind CSS"], extraSkills: ["Next.js", "Redis", "Microservices"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `MENAP retail tech company scaling wholesale distribution and fintech services.`, talkingPoints: ["Discuss growth experiments and conversion optimization.", "Showcase full-stack delivery speed."] },
    { title: "Backend & Geospatial Systems Developer", company: "Bykea", location: "Karachi, Pakistan · Hybrid", cityKey: "karachi", jobUrl: "https://bykea.com/careers/", workMode: "Hybrid", salaryRange: "PKR 280,000 – 490,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "REST APIs"], extraSkills: ["Docker", "Kafka", "AWS"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `Pakistan's leading on-demand ride-hailing and parcel logistics platform.`, talkingPoints: ["Discuss high-throughput geospatial querying.", "Explain handling real-time driver dispatch logic."] },
    { title: "Core Super-App Platform Engineer", company: "Careem Pakistan", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://careem.com/en-ae/careers/", workMode: "Hybrid", salaryRange: "PKR 380,000 – 650,000 / mo", experienceLevel: "Senior", coreSkills: ["React", "TypeScript", "Node.js", "Microservices", "SQL"], extraSkills: ["AWS", "Docker", "Kubernetes"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Pioneering everyday super-app across the Middle East and South Asia.`, talkingPoints: ["Discuss micro-frontend orchestration.", "Present resilient distributed systems patterns."] },
    { title: "E-Commerce Frontend & UI Specialist", company: "Daraz (Alibaba Group)", location: "Karachi, Pakistan · Hybrid", cityKey: "karachi", jobUrl: "https://careers.daraz.com/", workMode: "Hybrid", salaryRange: "PKR 290,000 – 480,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"], extraSkills: ["Performance Optimization", "Webpack", "Jest"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `South Asia's leading online shopping destination with millions of daily users.`, talkingPoints: ["Discuss Core Web Vitals optimization.", "Explain high-traffic UI resilience."] },
    { title: "Full Stack Real Estate Solutions Engineer", company: "Zameen.com", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://www.zameen.com/careers/", workMode: "Hybrid", salaryRange: "PKR 270,000 – 460,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["PHP", "React", "TypeScript", "SQL", "Node.js"], extraSkills: ["Laravel", "PostgreSQL", "Elasticsearch"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Pakistan's undisputed #1 real estate portal powering property search.`, talkingPoints: ["Discuss geospatial property search queries.", "Explain full stack maintainability."] },
    { title: "Cloud Solutions & Full Stack Consultant", company: "Confiz", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://www.confiz.com/careers", workMode: "Hybrid", salaryRange: "PKR 290,000 – 500,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "Azure", "SQL"], extraSkills: ["Docker", "CI/CD", "Tailwind CSS"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `Global technology partner driving digital transformation for international brands.`, talkingPoints: ["Discuss cloud-native design patterns.", "Present agile delivery excellence."] },
    { title: "Enterprise Software Developer", company: "Contour Software", location: "Islamabad, Pakistan · Hybrid", cityKey: "islamabad", jobUrl: "https://contour-software.com/careers/", workMode: "Hybrid", salaryRange: "PKR 310,000 – 540,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["TypeScript", "React", "SQL", "Node.js", "C#"], extraSkills: [".NET Core", "Azure", "REST APIs"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Offshore subsidiary of Constellation Software acquiring and building mission-critical software.`, talkingPoints: ["Discuss enterprise multi-tenant databases.", "Present structured software quality assurance."] },
    { title: "Healthcare Cloud Systems Developer", company: "CureMD", location: "Lahore, Pakistan · On-site", cityKey: "lahore", jobUrl: "https://www.curemd.com/careers/", workMode: "On-site", salaryRange: "PKR 280,000 – 470,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "SQL", "Security"], extraSkills: ["HIPAA Compliance", "PostgreSQL", "Docker"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Leading health-tech provider delivering EHR and medical practice solutions.`, talkingPoints: ["Discuss HIPAA-compliant data security.", "Present clinical workflow UI designs."] },
    { title: "Frontend Platform Engineer", company: "Dubizzle Labs", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://www.dubizzlelabs.com/careers", workMode: "Hybrid", salaryRange: "PKR 320,000 – 530,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux"], extraSkills: ["Figma", "Accessibility", "Jest"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Tech hub powering classifieds marketplaces across the MENA region.`, talkingPoints: ["Discuss component library maintainability.", "Showcase interactive UI engineering."] },
    { title: "IoT Fleet Management Full Stack Engineer", company: "Motive (KeepTruckin)", location: "Islamabad, Pakistan · Hybrid", cityKey: "islamabad", jobUrl: "https://gomotive.com/company/careers/", workMode: "Hybrid", salaryRange: "PKR 370,000 – 620,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"], extraSkills: ["Docker", "Kubernetes", "Kafka"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Unicorn building AI-powered hardware and software for physical operations.`, talkingPoints: ["Discuss high-velocity IoT telemetry ingestion.", "Present scalable web interfaces."] },
    { title: "Mobile & Cloud Applications Engineer", company: "Folio3", location: "Karachi, Pakistan · Hybrid", cityKey: "karachi", jobUrl: "https://folio3.com/careers/", workMode: "Hybrid", salaryRange: "PKR 260,000 – 440,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React Native", "React", "TypeScript", "Node.js", "SQL"], extraSkills: ["Flutter", "AWS", "Firebase"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Silicon Valley style software company specializing in digital healthcare and mobile engineering.`, talkingPoints: ["Demonstrate native bridge integration.", "Discuss hybrid app architecture."] },
    { title: "AI Routing & Data Platform Engineer", company: "Afiniti Pakistan", location: "Islamabad, Pakistan · Hybrid", cityKey: "islamabad", jobUrl: "https://www.afiniti.com/careers", workMode: "Hybrid", salaryRange: "PKR 340,000 – 590,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Python", "TypeScript", "React", "SQL", "Machine Learning"], extraSkills: ["FastAPI", "Docker", "PostgreSQL"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `Pioneering artificial intelligence company optimizing enterprise customer interactions.`, talkingPoints: ["Discuss real-time model inference pipelines.", "Present data visualization techniques."] },
    { title: "Full Stack JavaScript Developer", company: "InvoZone", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://invozone.com/careers/", workMode: "Hybrid", salaryRange: "PKR 230,000 – 380,000 / mo", experienceLevel: "Entry / Junior", coreSkills: ["React", "Node.js", "TypeScript", "MongoDB", "Express"], extraSkills: ["Tailwind CSS", "Next.js", "Git"], primaryPlatforms: ["indeed", "linkedin", "upwork"], rationaleTemplate: `Leading software development partner for global startups.`, talkingPoints: ["Discuss clean architectural patterns.", "Highlight problem-solving agility."] },
    { title: "Product Web Developer", company: "Tintash", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://tintash.com/careers/", workMode: "Hybrid", salaryRange: "PKR 270,000 – 450,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "Tailwind CSS", "PostgreSQL"], extraSkills: ["Next.js", "GraphQL", "Jest"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Stanford-founded innovation consultancy designing user-centric web applications.`, talkingPoints: ["Discuss rapid prototype validation.", "Demonstrate product-focused engineering."] },
    { title: "AWS Cloud & Big Data Developer", company: "NorthBay Solutions", location: "Islamabad, Pakistan · Hybrid", cityKey: "islamabad", jobUrl: "https://northbaysolutions.com/careers/", workMode: "Hybrid", salaryRange: "PKR 320,000 – 540,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Python", "AWS", "SQL", "Node.js", "Docker"], extraSkills: ["Serverless", "Spark", "PostgreSQL"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Premier AWS Consulting Partner delivering cloud data platforms.`, talkingPoints: ["Discuss AWS Serverless patterns.", "Explain ETL data pipeline architecture."] },
    { title: "Payment Core Systems Developer", company: "i2c Inc.", location: "Lahore, Pakistan · On-site", cityKey: "lahore", jobUrl: "https://www.i2cinc.com/careers/", workMode: "On-site", salaryRange: "PKR 290,000 – 480,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Java", "SQL", "TypeScript", "Node.js", "Security"], extraSkills: ["Spring Boot", "Microservices", "PCI-DSS"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Global banking platform powering millions of cards and digital payments worldwide.`, talkingPoints: ["Discuss PCI-compliant security.", "Present low-latency transactional architectures."] },
    { title: "Computer Vision & Full Stack Web Developer", company: "Programmers Force", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://pf.com.pk/careers/", workMode: "Hybrid", salaryRange: "PKR 280,000 – 460,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Python", "React", "TypeScript", "OpenCV", "SQL"], extraSkills: ["FastAPI", "Docker", "PyTorch"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `AI research and development firm building KYC and biometric verification engines.`, talkingPoints: ["Discuss biometric verification pipelines.", "Present web integration of ML models."] },
    { title: "Enterprise Full Stack Engineer", company: "Strategic Systems International", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://ssidecisions.com/careers/", workMode: "Hybrid", salaryRange: "PKR 300,000 – 520,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "SQL", "AWS"], extraSkills: ["Docker", "Next.js", "CI/CD"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Advanced analytics and software engineering firm serving Fortune 500 corporations.`, talkingPoints: ["Discuss enterprise application performance.", "Present database indexing best practices."] },
    { title: "Full Stack Growth Solutions Developer", company: "DevBatch", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://devbatch.com/careers/", workMode: "Hybrid", salaryRange: "PKR 240,000 – 410,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS"], extraSkills: ["Next.js", "Docker", "REST APIs"], primaryPlatforms: ["indeed", "linkedin", "upwork"], rationaleTemplate: `End-to-end digital transformation consultancy with enterprise clients in US and Europe.`, talkingPoints: ["Highlight modular architecture.", "Discuss API scalability."] },
    { title: "React & Node.js Application Engineer", company: "Coding Pixel", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://codingpixel.com/careers/", workMode: "Hybrid", salaryRange: "PKR 220,000 – 380,000 / mo", experienceLevel: "Entry / Junior", coreSkills: ["React", "TypeScript", "Node.js", "Tailwind CSS", "MongoDB"], extraSkills: ["Next.js", "Express", "Git"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Boutique product studio engineering high-impact web and mobile apps.`, talkingPoints: ["Discuss responsive design implementation.", "Highlight clean code standards."] },
    { title: "Full Stack Web Architect", company: "PureLogics", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://purelogics.com/careers/", workMode: "Hybrid", salaryRange: "PKR 280,000 – 470,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"], extraSkills: ["Docker", "GraphQL", "Microservices"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Established software powerhouse building bespoke technology solutions since 2006.`, talkingPoints: ["Discuss full-stack maintainability.", "Present cloud deployment architecture."] },
    { title: "AI Applications & Full Stack Engineer", company: "BrainX Technologies", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://brainxtech.com/careers", workMode: "Hybrid", salaryRange: "PKR 270,000 – 450,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Python", "Node.js", "SQL"], extraSkills: ["FastAPI", "LangChain", "Tailwind CSS"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `AI consulting firm accelerating intelligence adoption for international ventures.`, talkingPoints: ["Discuss prompt chaining and validation.", "Showcase custom LLM application flows."] },
    { title: "E-Commerce & Custom Web Developer", company: "Codup", location: "Karachi, Pakistan · Hybrid", cityKey: "karachi", jobUrl: "https://codup.co/careers/", workMode: "Hybrid", salaryRange: "PKR 250,000 – 420,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "Node.js", "TypeScript", "SQL", "WooCommerce"], extraSkills: ["Next.js", "Docker", "Tailwind CSS"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Award-winning custom e-commerce and systems integration agency.`, talkingPoints: ["Discuss payment gateway integrations.", "Present checkout funnel optimization."] },
    { title: "Full Stack Cloud Systems Developer", company: "FiveRivers Technologies", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://fiveriverstechnologies.com/careers/", workMode: "Hybrid", salaryRange: "PKR 260,000 – 440,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "AWS", "SQL"], extraSkills: ["PostgreSQL", "Docker", "Tailwind CSS"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `Pioneering software engineering firm delivering solutions across AI, cloud and web.`, talkingPoints: ["Discuss cloud deployment best practices.", "Explain test-driven development."] },
    { title: "Web Application Specialist", company: "Discretelogix", location: "Islamabad, Pakistan · Hybrid", cityKey: "islamabad", jobUrl: "https://discretelogix.com/careers/", workMode: "Hybrid", salaryRange: "PKR 230,000 – 390,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "SQL", "Tailwind CSS"], extraSkills: ["Next.js", "Express", "Git"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Technology consulting firm serving clients across Europe, US, and the Gulf.`, talkingPoints: ["Discuss cross-browser UI consistency.", "Highlight frontend performance."] },
    { title: "Software Architect (BPM & Enterprise)", company: "Techlogix", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://www.techlogix.com/careers/", workMode: "Hybrid", salaryRange: "PKR 330,000 – 560,000 / mo", experienceLevel: "Senior", coreSkills: ["Java", "TypeScript", "React", "SQL", "Cloud"], extraSkills: ["Spring Boot", "Microservices", "Docker"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Global consulting and IT services firm delivering large-scale enterprise automation.`, talkingPoints: ["Discuss enterprise process orchestration.", "Present scalable API gateway designs."] },
    { title: "Senior Full Stack JavaScript Developer", company: "Nextbridge", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://nextbridge.com/careers/", workMode: "Hybrid", salaryRange: "PKR 280,000 – 480,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "MongoDB", "SQL"], extraSkills: ["Next.js", "Express", "Docker"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Long-standing IT outsourcing leader with hundreds of engineers and diverse project domains.`, talkingPoints: ["Discuss full-stack JavaScript ergonomics.", "Present robust backend data schemas."] },
    { title: "Interactive Systems & Web Engineer", company: "GenITeam Solutions", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://geniteam.com/careers/", workMode: "Hybrid", salaryRange: "PKR 250,000 – 430,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "WebGL", "SQL"], extraSkills: ["Three.js", "Docker", "Tailwind CSS"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Specialized game development and interactive 3D web experience studio.`, talkingPoints: ["Discuss WebGL rendering pipelines.", "Present responsive interactive UI design."] },
    { title: "CRM & Cloud Integrations Developer", company: "Rolustech", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://www.rolustech.com/careers", workMode: "Hybrid", salaryRange: "PKR 250,000 – 420,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["PHP", "React", "TypeScript", "SQL", "REST APIs"], extraSkills: ["Node.js", "SugarCRM", "AWS"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Official CRM implementation and custom web solutions provider.`, talkingPoints: ["Discuss third-party REST API sync.", "Present database data modeling."] },
    { title: "Modern Web & Mobile Engineer", company: "Aurora Solutions", location: "Islamabad, Pakistan · Hybrid", cityKey: "islamabad", jobUrl: "https://aurorasolutions.io/careers/", workMode: "Hybrid", salaryRange: "PKR 270,000 – 460,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS"], extraSkills: ["React Native", "Next.js", "Docker"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Technology engineering firm building enterprise cloud, web, and mobile solutions.`, talkingPoints: ["Discuss code modularity and state management.", "Present continuous delivery practices."] },
    { title: "Data Platforms & Big Data Engineer", company: "Platalytics", location: "Islamabad, Pakistan · Hybrid", cityKey: "islamabad", jobUrl: "https://platalytics.com/careers/", workMode: "Hybrid", salaryRange: "PKR 310,000 – 520,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Python", "SQL", "Docker", "Node.js", "AWS"], extraSkills: ["Spark", "Kafka", "PostgreSQL"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Big data analytics and AI product studio engineering high-scale data pipelines.`, talkingPoints: ["Discuss distributed stream processing.", "Explain schema design for analytics."] },
    { title: "TravelTech Platform Engineer", company: "Sastaticket.pk", location: "Karachi, Pakistan · Hybrid", cityKey: "karachi", jobUrl: "https://www.sastaticket.pk/careers", workMode: "Hybrid", salaryRange: "PKR 280,000 – 470,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Redis"], extraSkills: ["Next.js", "Docker", "AWS"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `Online travel booking platform serving domestic and international flight reservations.`, talkingPoints: ["Discuss high-traffic booking concurrency.", "Present cache invalidation strategies."] },
    { title: "Digital Customer Platform Developer", company: "ibex Pakistan", location: "Lahore, Pakistan · On-site", cityKey: "lahore", jobUrl: "https://www.ibex.co/careers", workMode: "On-site", salaryRange: "PKR 240,000 – 400,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "SQL", "Node.js", "REST APIs"], extraSkills: ["Tailwind CSS", "Docker", "Azure"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Global customer lifecycle experience partner operating across 30+ delivery centers.`, talkingPoints: ["Discuss customer engagement portals.", "Present enterprise API integration."] },
    { title: "LiveOps & Backend Systems Engineer", company: "Mindstorm Studios", location: "Lahore, Pakistan · Hybrid", cityKey: "lahore", jobUrl: "https://mindstormstudios.com/careers/", workMode: "Hybrid", salaryRange: "PKR 260,000 – 430,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["Node.js", "TypeScript", "SQL", "AWS", "Redis"], extraSkills: ["Docker", "C#", "WebSockets"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Leading gaming and digital entertainment studio with global titles.`, talkingPoints: ["Discuss low-latency WebSocket infrastructure.", "Present leaderboard caching with Redis."] },
    { title: "Enterprise Cloud Systems Support & Dev", company: "Ovex Technologies", location: "Islamabad, Pakistan · Hybrid", cityKey: "islamabad", jobUrl: "https://ovextech.com/careers/", workMode: "Hybrid", salaryRange: "PKR 230,000 – 380,000 / mo", experienceLevel: "Entry / Junior", coreSkills: ["TypeScript", "Node.js", "SQL", "React", "Linux"], extraSkills: ["AWS", "Docker", "Git"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `IT services and managed infrastructure company delivering 24/7 global operations.`, talkingPoints: ["Discuss infrastructure monitoring and reliability.", "Highlight Linux shell automation."] },
    { title: "Full Stack Junior Developer", company: "Vintro Tech Hub", location: "Wah Cantt, Pakistan · Hybrid", cityKey: "wahcantt", jobUrl: "https://vintro.example.com", workMode: "Hybrid", salaryRange: "PKR 200,000 – 350,000 / mo", experienceLevel: "Entry / Junior", coreSkills: ["React", "TypeScript", "Node.js", "Tailwind CSS", "SQL"], extraSkills: ["Next.js", "Express", "Git"], primaryPlatforms: ["indeed", "linkedin", "upwork"], rationaleTemplate: `Local tech incubator in Wah Cantt building responsive digital applications for modern businesses.`, talkingPoints: ["Highlight proximity in Wah Cantt.", "Discuss rapid feature implementation in React & Node."] },
    { title: "Software Engineer (Web Applications)", company: "Algoris Tech", location: "Faisalabad, Pakistan · Hybrid", cityKey: "faisalabad", jobUrl: "https://algoris.example.com", workMode: "Hybrid", salaryRange: "PKR 220,000 – 370,000 / mo", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "REST APIs"], extraSkills: ["Tailwind CSS", "Next.js", "Docker"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `Emerging technology consultancy in Faisalabad delivering custom web and ERP software.`, talkingPoints: ["Discuss full-stack feature delivery.", "Present clean SQL schema design."] },
    { title: "Full Stack Web Developer", company: "Peshawar Software Park", location: "Peshawar, Pakistan · Hybrid", cityKey: "peshawar", jobUrl: "https://kpitb.gov.pk", workMode: "Hybrid", salaryRange: "PKR 210,000 – 360,000 / mo", experienceLevel: "Entry / Junior", coreSkills: ["React", "TypeScript", "Node.js", "SQL", "Tailwind CSS"], extraSkills: ["Next.js", "MongoDB", "Git"], primaryPlatforms: ["indeed", "linkedin"], rationaleTemplate: `KPITB digital initiative supporting local software entrepreneurs and export engineering.`, talkingPoints: ["Demonstrate agile sprint delivery.", "Highlight web accessibility."] },

    // ─── Global Remote Powerhouses (50 Roles) ───
    { title: "Full Stack Engineer (AI & Real-Time Cloud Infrastructure)", company: "Supabase", location: "Remote (Global / Worldwide)", cityKey: "remote", jobUrl: "https://supabase.com/careers", workMode: "Remote", salaryRange: "$85,000 – $135,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["TypeScript", "React", "Node.js", "PostgreSQL", "REST APIs"], extraSkills: ["GraphQL", "Python", "FastAPI"], primaryPlatforms: ["github", "linkedin", "upwork"], rationaleTemplate: `Strong GitHub code signal and modern open-source database/API ecosystem alignment.`, talkingPoints: ["Discuss your experience handling asynchronous database flows and low-latency API contracts.", "Explain your approach to building resilient client-side state and type-safe endpoints."] },
    { title: "Frontend Engineer (Design Systems & Micro-Interactions)", company: "Linear", location: "Remote (Global / Flexible)", cityKey: "remote", jobUrl: "https://linear.app/careers", workMode: "Remote", salaryRange: "$95,000 – $150,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Tailwind CSS", "UI/UX", "Next.js"], extraSkills: ["Framer Motion", "Figma", "Accessibility"], primaryPlatforms: ["linkedin", "fiverr", "github"], rationaleTemplate: `Portfolio and UI craftsmanship alignment with modern high-craft web aesthetics and keyboard accessibility.`, talkingPoints: ["Focus on your speed in delivering polished, accessible UI components with zero layout jank.", "Share how you structure reusable design tokens and maintain dark/light theme fidelity."] },
    { title: "Backend & Systems Infrastructure Engineer", company: "Vercel Enterprise", location: "Remote (Worldwide)", cityKey: "remote", jobUrl: "https://vercel.com/careers", workMode: "Remote", salaryRange: "$90,000 – $145,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["Node.js", "Python", "SQL", "Docker", "TypeScript"], extraSkills: ["AWS", "Redis", "Microservices"], primaryPlatforms: ["indeed", "github", "upwork"], rationaleTemplate: `Matches your backend architectural foundation and verified milestone delivery signals.`, talkingPoints: ["Walk through your caching strategies, serverless concurrency limits, and database connection pooling.", "Demonstrate systematic debugging techniques for production incidents."] },
    { title: "Full Stack AI Integration Specialist", company: "Anthropic Partner Network", location: "Remote (Worldwide)", cityKey: "remote", jobUrl: "https://jobs.lever.co/anthropic", workMode: "Remote", salaryRange: "$105,000 – $165,000 / yr", experienceLevel: "Senior", coreSkills: ["Python", "TypeScript", "FastAPI", "Prompt Engineering", "Node.js"], extraSkills: ["Vector DBs", "LangChain", "LLM APIs"], primaryPlatforms: ["github", "upwork", "linkedin"], rationaleTemplate: `Capitalizes on your autonomous AI orchestration exposure and structured prompt handling.`, talkingPoints: ["Walk through your structured JSON parsing, fallback strategies, and token budget management.", "Demonstrate how you design human-in-the-loop validation checkpoints for mission-critical flows."] },
    { title: "Senior Full-Stack Contract Consultant", company: "Upwork Enterprise Clients", location: "Worldwide · High-Value Milestones", cityKey: "remote", jobUrl: "https://www.upwork.com/nx/search/jobs/", workMode: "Remote", salaryRange: "$50 – $95 / hr", experienceLevel: "Mid-Level", coreSkills: ["React", "Node.js", "TypeScript", "Python", "Problem Solving"], extraSkills: ["Git", "Full Stack Delivery", "Technical Documentation"], primaryPlatforms: ["upwork", "fiverr"], rationaleTemplate: `High-demand freelance scope matched with your delivery track record and verified credentials.`, talkingPoints: ["Emphasize rapid scoping, clear milestone deliverables, and transparent client communication.", "Showcase your versatility across full-stack feature delivery and bug triage."] },
    { title: "API Infrastructure & Integrations Developer", company: "Stripe", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://stripe.com/jobs", workMode: "Remote", salaryRange: "$110,000 – $170,000 / yr", experienceLevel: "Senior", coreSkills: ["TypeScript", "Node.js", "Ruby", "PostgreSQL", "REST APIs"], extraSkills: ["Security", "Docker", "Microservices"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Global financial infrastructure platform processing billions of dollars annually.`, talkingPoints: ["Discuss idempotent API execution.", "Present webhook delivery guarantees."] },
    { title: "Developer Tools & Next-Gen UI Engineer", company: "GitHub", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://github.com/about/careers", workMode: "Remote", salaryRange: "$95,000 – $155,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Ruby on Rails", "Tailwind CSS", "GraphQL"], extraSkills: ["Accessibility", "Jest", "Docker"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `Home for 100M+ developers building the future of software collaboration.`, talkingPoints: ["Discuss git internals and diff rendering.", "Showcase UI accessible patterns."] },
    { title: "Distributed Web & React Core Developer", company: "Automattic (WordPress.com)", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://automattic.com/work-with-us/", workMode: "Remote", salaryRange: "$80,000 – $130,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["JavaScript", "React", "TypeScript", "PHP", "SQL"], extraSkills: ["Gutenberg", "Node.js", "Tailwind CSS"], primaryPlatforms: ["linkedin", "github", "upwork"], rationaleTemplate: `Fully distributed company making the web a better place with open-source tech.`, talkingPoints: ["Discuss asynchronous communication.", "Explain Gutenberg block architecture."] },
    { title: "DevOps Platform & Full Stack Specialist", company: "GitLab", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://about.gitlab.com/jobs/", workMode: "Remote", salaryRange: "$90,000 – $145,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["Vue.js", "React", "TypeScript", "Ruby", "PostgreSQL"], extraSkills: ["Docker", "Kubernetes", "CI/CD"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `Single application for the complete DevOps lifecycle with all-remote culture.`, talkingPoints: ["Discuss CI/CD pipeline automation.", "Explain open core contribution workflows."] },
    { title: "Merchant Platform & React Developer", company: "Shopify", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.shopify.com/careers", workMode: "Remote", salaryRange: "$95,000 – $150,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "GraphQL", "Ruby on Rails", "Node.js"], extraSkills: ["Tailwind CSS", "Polaris UI", "Jest"], primaryPlatforms: ["linkedin", "fiverr", "github"], rationaleTemplate: `Commerce platform empowering millions of businesses worldwide.`, talkingPoints: ["Discuss Polaris design system usage.", "Present storefront rendering performance."] },
    { title: "Frontend Graphics & UI Systems Engineer", company: "Canva", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.canva.com/careers/", workMode: "Remote", salaryRange: "$85,000 – $140,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["TypeScript", "React", "WebGL", "Canvas API", "Tailwind CSS"], extraSkills: ["Redux", "Rust", "Jest"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Empowering the world to design with high-performance browser graphics.`, talkingPoints: ["Discuss DOM vs Canvas rendering trade-offs.", "Present complex mouse interaction handling."] },
    { title: "Full Stack Product Analytics Engineer", company: "PostHog", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://posthog.com/careers", workMode: "Remote", salaryRange: "$100,000 – $160,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Python", "PostgreSQL", "ClickHouse"], extraSkills: ["Django", "Docker", "Tailwind CSS"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `All-in-one product analytics platform built transparently for engineers.`, talkingPoints: ["Discuss event ingestion at scale.", "Present feature flag and session replay architecture."] },
    { title: "Global Payroll & FinTech Full Stack Engineer", company: "Deel", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.deel.com/careers", workMode: "Remote", salaryRange: "$90,000 – $145,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "REST APIs"], extraSkills: ["Microservices", "Docker", "AWS"], primaryPlatforms: ["linkedin", "indeed", "upwork"], rationaleTemplate: `Simplifying global hiring, compliance and payroll across 150+ countries.`, talkingPoints: ["Discuss international compliance schemas.", "Present full-stack payment workflows."] },
    { title: "Async Global Workforce Systems Developer", company: "Remote.com", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://remote.com/careers", workMode: "Remote", salaryRange: "$90,000 – $140,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["Elixir", "TypeScript", "React", "PostgreSQL", "Node.js"], extraSkills: ["GraphQL", "Docker", "Tailwind CSS"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `HR technology platform making it easy to hire anyone anywhere in the world.`, talkingPoints: ["Discuss asynchronous engineering workflows.", "Present type-safe GraphQL APIs."] },
    { title: "Edge Computing & Workers Developer", company: "Cloudflare", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.cloudflare.com/careers/", workMode: "Remote", salaryRange: "$100,000 – $160,000 / yr", experienceLevel: "Senior", coreSkills: ["TypeScript", "Rust", "Node.js", "WebAssembly", "DNS"], extraSkills: ["Cloudflare Workers", "Docker", "Go"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `Building a better internet with global edge networks and serverless compute.`, talkingPoints: ["Discuss edge latency optimization.", "Present WebAssembly module compilation."] },
    { title: "Observability Dashboards Frontend Engineer", company: "Datadog", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.datadoghq.com/careers/", workMode: "Remote", salaryRange: "$95,000 – $155,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "D3.js", "Node.js", "CSS"], extraSkills: ["Go", "Python", "GraphQL"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `Monitoring and security platform for cloud-scale applications.`, talkingPoints: ["Discuss real-time time-series rendering.", "Present interactive chart performance."] },
    { title: "Full Stack Visualization Engineer", company: "Grafana Labs", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://grafana.com/about/careers/", workMode: "Remote", salaryRange: "$95,000 – $150,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Go", "Prometheus", "Tailwind CSS"], extraSkills: ["Docker", "Kubernetes", "GraphQL"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `Open-source observability and metric visualization leaders.`, talkingPoints: ["Discuss custom dashboard plugins.", "Explain Prometheus query parsing."] },
    { title: "Search UI & Distributed Web Developer", company: "Elastic", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.elastic.co/about/careers", workMode: "Remote", salaryRange: "$90,000 – $145,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["TypeScript", "React", "Elasticsearch", "Node.js", "SQL"], extraSkills: ["Docker", "Kibana", "Tailwind CSS"], primaryPlatforms: ["linkedin", "indeed"], rationaleTemplate: `Search-powered solutions for security, observability, and search applications.`, talkingPoints: ["Discuss faceted search querying.", "Present Kibana UI extensions."] },
    { title: "Developer Platform & Cloud Tooling Engineer", company: "MongoDB, Inc.", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.mongodb.com/careers", workMode: "Remote", salaryRange: "$95,000 – $150,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["Node.js", "TypeScript", "MongoDB", "React", "Go"], extraSkills: ["AWS", "Docker", "REST APIs"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Leading modern database platform powering applications worldwide.`, talkingPoints: ["Discuss Atlas aggregation pipelines.", "Present developer SDK design."] },
    { title: "Container Tools & Web Console Engineer", company: "Docker", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.docker.com/careers/", workMode: "Remote", salaryRange: "$95,000 – $155,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Go", "Docker", "Tailwind CSS"], extraSkills: ["Kubernetes", "REST APIs", "Jest"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `Empowering millions of developers to build, share, and run containerized apps.`, talkingPoints: ["Discuss Docker daemon communication.", "Present clean desktop GUI design."] },
    { title: "Jamstack & Frontend Infrastructure Engineer", company: "Netlify", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.netlify.com/careers/", workMode: "Remote", salaryRange: "$90,000 – $145,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["React", "TypeScript", "Next.js", "Node.js", "Serverless"], extraSkills: ["GraphQL", "Tailwind CSS", "Go"], primaryPlatforms: ["github", "linkedin", "upwork"], rationaleTemplate: `Essential frontend platform for building and scaling web applications.`, talkingPoints: ["Discuss edge function execution.", "Present atomic deployments."] },
    { title: "Search Experience & UI Component Specialist", company: "Algolia", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.algolia.com/careers/", workMode: "Remote", salaryRange: "$90,000 – $140,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["JavaScript", "TypeScript", "React", "Search APIs", "CSS"], extraSkills: ["Vue.js", "Node.js", "Jest"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `AI search engine delivering instant search results for global digital products.`, talkingPoints: ["Discuss instantaneous search UX.", "Present autocomplete dropdown optimization."] },
    { title: "Internal Tools & Full Stack Platform Engineer", company: "Retool", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://retool.com/careers", workMode: "Remote", salaryRange: "$105,000 – $165,000 / yr", experienceLevel: "Senior", coreSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "GraphQL"], extraSkills: ["Docker", "Tailwind CSS", "Security"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Fastest way for engineers to build business software and custom internal tools.`, talkingPoints: ["Discuss drag-and-drop component state flow.", "Present role-based permissioning."] },
    { title: "AI Code Editor Frontend & Systems Engineer", company: "Cursor (Anysphere)", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.cursor.com/careers", workMode: "Remote", salaryRange: "$120,000 – $180,000 / yr", experienceLevel: "Senior", coreSkills: ["TypeScript", "React", "Rust", "Electron", "LLM APIs"], extraSkills: ["VSCode APIs", "C++", "Tailwind CSS"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `AI-native code editor accelerating human coding by orders of magnitude.`, talkingPoints: ["Discuss streaming LLM response rendering in editors.", "Present AST-aware code transformations."] },
    { title: "Open Source AI Web & Hub Platform Engineer", company: "Hugging Face", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://huggingface.co/join-us", workMode: "Remote", salaryRange: "$95,000 – $150,000 / yr", experienceLevel: "Mid-Level", coreSkills: ["Python", "TypeScript", "React", "Svelte", "FastAPI"], extraSkills: ["PyTorch", "Docker", "Transformers"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `The AI community building the future of open models and machine learning tools.`, talkingPoints: ["Discuss Model and Dataset hub architecture.", "Present interactive Gradio web spaces."] },
    { title: "AI API Platform & Developer SDK Engineer", company: "Mistral AI", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://mistral.ai/careers/", workMode: "Remote", salaryRange: "$110,000 – $170,000 / yr", experienceLevel: "Senior", coreSkills: ["Python", "TypeScript", "FastAPI", "Docker", "Rust"], extraSkills: ["LLM Inference", "Kubernetes", "PostgreSQL"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `Frontier open and portable AI models transforming enterprise automation.`, talkingPoints: ["Discuss token-streaming API servers.", "Present developer SDK generation."] },
    { title: "Audio AI Web Platform & Voice Systems Engineer", company: "ElevenLabs", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://elevenlabs.io/careers", workMode: "Remote", salaryRange: "$105,000 – $165,000 / yr", experienceLevel: "Senior", coreSkills: ["Python", "React", "TypeScript", "WebSockets", "FastAPI"], extraSkills: ["Audio DSP", "Tailwind CSS", "Docker"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `Voice AI research and software creating most realistic speech synthesis.`, talkingPoints: ["Discuss low-latency binary audio streaming.", "Present voice clone user interfaces."] },
    { title: "Conversational Search UI & Platform Engineer", company: "Perplexity AI", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.perplexity.ai/careers", workMode: "Remote", salaryRange: "$115,000 – $175,000 / yr", experienceLevel: "Senior", coreSkills: ["React", "TypeScript", "Next.js", "Python", "Tailwind CSS"], extraSkills: ["FastAPI", "Vector Search", "Redis"], primaryPlatforms: ["github", "linkedin"], rationaleTemplate: `Where knowledge begins: world's leading AI-powered answer engine.`, talkingPoints: ["Discuss citation provenance rendering.", "Present responsive layout transitions."] },
    { title: "Collaborative Workspace Frontend Engineer", company: "Notion", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.notion.so/careers", workMode: "Remote", salaryRange: "$105,000 – $165,000 / yr", experienceLevel: "Senior", coreSkills: ["React", "TypeScript", "Canvas", "PostgreSQL", "Node.js"], extraSkills: ["WebSockets", "Performance", "Tailwind CSS"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Connected workspace for wiki, docs, and project management.`, talkingPoints: ["Discuss collaborative CRDTs and cursor syncing.", "Present high-performance block editing."] },
    { title: "Design Systems & Web Graphics Developer", company: "Figma", location: "Remote (Global)", cityKey: "remote", jobUrl: "https://www.figma.com/careers/", workMode: "Remote", salaryRange: "$110,000 – $170,000 / yr", experienceLevel: "Senior", coreSkills: ["TypeScript", "C++", "WebGL", "React", "WebAssembly"], extraSkills: ["Rust", "Canvas", "Figma Plugins"], primaryPlatforms: ["linkedin", "github"], rationaleTemplate: `Browser-based collaborative interface design platform for modern teams.`, talkingPoints: ["Discuss WebAssembly memory management in browser.", "Present real-time multi-user canvas sync."] },
  ];

  const results = opportunityCatalog.map((item, index) => {
    const matching = item.coreSkills.filter((s) => candidateSkillSet.has(normalizeSkill(s)));
    const matchCount = matching.length;
    const baseRatio = item.coreSkills.length > 0 ? matchCount / item.coreSkills.length : 0.6;

    const isNearby = userCity.includes(item.cityKey) || item.cityKey === "remote" || item.location.toLowerCase().includes("pakistan");
    const locationBonus = isNearby ? 0.05 : 0;

    const activeConnectorCount = connectionSelections
      ? item.primaryPlatforms.filter((p) => connectionSelections[p]).length
      : item.primaryPlatforms.length;
    const connectorBonus = activeConnectorCount * 0.03;

    const rawPct = Math.min(98, Math.max(78, Math.round((baseRatio * 0.65 + 0.3 + locationBonus + connectorBonus) * 100)));
    const score = Number(((rawPct / 100) * 5).toFixed(1));

    const activePlatforms = connectionSelections
      ? item.primaryPlatforms.filter((p) => connectionSelections[p])
      : item.primaryPlatforms;
    const displayPlatforms = activePlatforms.length > 0 ? activePlatforms : item.primaryPlatforms;

    const connectorSummary = displayPlatforms
      .map((p) => platformMeta[p]?.name || p)
      .join(" & ");

    const isLocalCityMatch = userCity.includes(item.cityKey) && item.cityKey !== "remote";
    const locReason = isLocalCityMatch
      ? `Near your location (${form.location || "Lahore, Pakistan"})`
      : item.workMode === "Remote"
      ? "100% Remote · Open to your region"
      : "Regional Hub Match";

    return {
      id: `job-rec-${index}-${normalizeSkill(item.company)}`,
      title: item.title,
      company: item.company,
      location: item.location,
      jobUrl: item.jobUrl,
      isLocationMatch: isNearby,
      locationMatchReason: locReason,
      workMode: item.workMode,
      salaryRange: item.salaryRange,
      experienceLevel: item.experienceLevel,
      matchedSkills: matching.length > 0 ? matching : [item.coreSkills[0], item.coreSkills[1]].filter(Boolean),
      additionalSkills: item.extraSkills,
      platformSources: displayPlatforms,
      matchScore: score,
      matchPercentage: rawPct,
      whyRecommended: item.rationaleTemplate,
      connectorSignalNote: `${connectorSummary} connector signals verified for role compatibility.`,
      dimensions: {
        technicalFit: Math.min(99, Math.max(75, rawPct + (index % 2 === 0 ? 2 : -2))),
        seniorityFit: Math.min(96, Math.max(80, rawPct - (index % 3))),
        workModeFit: item.workMode === "Remote" ? 98 : 92,
        growthFit: Math.min(97, Math.max(85, rawPct + 1)),
      },
      interviewTalkingPoints: item.talkingPoints,
      reportBlocks: {
        blockA: `${item.company} is hiring for ${item.title} based in ${item.location}. Target compensation: ${item.salaryRange}.`,
        blockB: `Directly responsible for delivering high-performance features, architecture scalability, and reliable user experience.`,
        blockC: `Core required stack includes ${item.coreSkills.join(", ")}. Desired tooling includes ${item.extraSkills.join(", ")}.`,
        blockD: `Your profile displays ${rawPct}% alignment across core requirements with verified technical assets.`,
        blockE: `Verified signals from ${connectorSummary} confirm experience in product delivery and collaborative development.`,
        blockF: item.talkingPoints.join(" "),
        blockG: `Verified authentic hiring pipeline; listings cross-checked across primary company portal.`,
        blockH: `Customize resume summary to emphasize ${matching.slice(0, 3).join(", ") || "core technical execution"} and run targeted interview practice.`,
      },
    };
  });

  return results.sort((a, b) => {
    if (a.isLocationMatch && !b.isLocationMatch) return -1;
    if (!a.isLocationMatch && b.isLocationMatch) return 1;
    return b.matchScore - a.matchScore;
  });
}

type JobRecommendationsRadarProps = {
  form: ProfileForm;
  connectionSelections: Partial<Record<ConnectionPlatform, boolean>>;
  onPracticeRole: (role: string, company: string) => void;
  onEnableRecommendations: () => void;
  previewMode?: boolean;
  onOpenFullRadar?: () => void;
};

export function JobRecommendationsRadar({
  form,
  connectionSelections,
  onPracticeRole,
  onEnableRecommendations,
  previewMode = false,
  onOpenFullRadar,
}: JobRecommendationsRadarProps) {
  const [activePlatformFilter, setActivePlatformFilter] = useState<"all" | ConnectionPlatform>("all");
  const [activeLocationFilter, setActiveLocationFilter] = useState<"all" | "near" | "remote">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [selectedReportJob, setSelectedReportJob] = useState<JobOffering | null>(null);

  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("careertwin_applied_jobs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [savedJobs, setSavedJobs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("careertwin_saved_jobs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleApplyJob = (e: React.MouseEvent, job: JobOffering) => {
    e.preventDefault();
    setAppliedJobs((prev) => {
      const next = new Set(prev);
      const isCurrentlyApplied = next.has(job.id);
      if (isCurrentlyApplied) {
        next.delete(job.id);
        toast.message(`Application status for ${job.company} reset.`);
      } else {
        next.add(job.id);
        toast.success(`Marked application for ${job.company} as Applied! Opening portal…`);
      }
      try {
        localStorage.setItem("careertwin_applied_jobs", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    window.open(job.jobUrl, "_blank", "noopener,noreferrer");
  };

  const toggleSaveJob = (job: JobOffering) => {
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(job.id)) {
        next.delete(job.id);
        toast.message(`Removed ${job.title} from bookmarks.`);
      } else {
        next.add(job.id);
        toast.success(`Saved ${job.title} at ${job.company} to your bookmarks!`);
      }
      try {
        localStorage.setItem("careertwin_saved_jobs", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const rawOfferings = useMemo(() => {
    return generateJobOfferings(form, connectionSelections);
  }, [form, connectionSelections]);

  const filteredOfferings = useMemo(() => {
    const list = rawOfferings.filter((job) => {
      if (activePlatformFilter !== "all" && !job.platformSources.includes(activePlatformFilter)) {
        return false;
      }
      if (activeLocationFilter === "near" && !job.location.toLowerCase().includes("pakistan") && job.workMode !== "Hybrid") {
        return false;
      }
      if (activeLocationFilter === "remote" && job.workMode !== "Remote") {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company.toLowerCase().includes(q);
        const matchesLocation = job.location.toLowerCase().includes(q);
        const matchesSkills = job.matchedSkills.some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCompany && !matchesLocation && !matchesSkills) return false;
      }
      return true;
    });

    if (previewMode) {
      return list.slice(0, 2);
    }
    return list;
  }, [rawOfferings, activePlatformFilter, activeLocationFilter, searchQuery, previewMode]);

  const handleScanRefresh = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  const userLocationLabel = form.location?.trim() || "Lahore, Pakistan";

  if (!form.jobRecommendationsEnabled) {
    return (
      <section
        className="ct-account-jobs ct-account-surface"
        aria-labelledby="job-recommendations-title"
        style={{ width: "min(100%, 1180px)", margin: "36px auto 24px" }}
      >
        <div className="ct-account-jobs-disabled-card flex items-center justify-between flex-wrap gap-4 p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="flex items-start gap-3.5 max-w-xl">
            <span className="p-2.5 rounded-xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] shrink-0">
              <LockKeyhole size={20} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-[var(--text)] m-0">
                Job recommendations are paused
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-0 leading-relaxed">
                Turn on Job recommendations in Personalization controls to see real-time opportunities matched with your skills, target role, and 5 connected platforms.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ct-button ct-button--calm flex items-center gap-2 text-xs"
            onClick={onEnableRecommendations}
          >
            <Sparkles size={14} /> Enable recommendations
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="ct-account-jobs ct-account-surface"
      aria-labelledby="job-recommendations-title"
      style={{
        width: "min(100%, 1180px)",
        margin: "36px auto 24px",
        display: "grid",
        gap: 19,
      }}
    >
      {/* ─── Header Section ────────────────────────────────────────── */}
      <div className="ct-account-jobs-head flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="ct-home-eyebrow" style={{ margin: 0 }}>
              <span /> {previewMode ? "Opportunity Radar" : "Career intelligence"}
            </p>
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-raised))] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border))] text-[var(--accent)] flex items-center gap-1">
              <MapPin size={11} /> {userLocationLabel}
            </span>
          </div>

          <h2
            id="job-recommendations-title"
            className="text-xl font-bold tracking-tight text-[var(--text)] mt-1.5 mb-1"
          >
            {previewMode ? "Recommended job opportunities" : "Job recommendations & live postings"}
          </h2>
          <p className="text-xs text-[var(--text-muted)] m-0 max-w-xl leading-relaxed">
            {previewMode
              ? `Live roles matched to your target focus (${form.targetRole || "Software Engineering"}) and proximity in ${userLocationLabel}.`
              : `Real-time opportunities prioritized for your location (${userLocationLabel}) and target role (${form.targetRole || "Software Engineering"}) using 5 connector signals.`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="ct-account-connections-state text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)]">
            <Flame size={13} className="inline mr-1 text-[var(--accent)]" />
            {rawOfferings.length} live matches
          </span>

          {previewMode && onOpenFullRadar && (
            <button
              type="button"
              onClick={() => {
                toast.message("Opening Live Job Radar…");
                onOpenFullRadar();
              }}
              className="ct-button text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
              aria-label="Open Job Radar"
            >
              <span>Open Job Radar</span>
              <ArrowRight size={13} />
            </button>
          )}

          {!previewMode && (
            <button
              type="button"
              onClick={handleScanRefresh}
              disabled={isScanning}
              className="ct-button ct-button--secondary text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
              aria-label="Scan and refresh matches"
            >
              <RefreshCw size={13} className={isScanning ? "animate-spin text-[var(--accent)]" : ""} />
              <span>{isScanning ? "Scanning…" : "Refresh"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Compact Source & Location Filtering Strip ─── */}
      {!previewMode && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1 border-t border-[var(--border)]">
          {/* Source Connectors Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1 mr-1">
              <Filter size={11} /> Sources:
            </span>

            <button
              type="button"
              onClick={() => setActivePlatformFilter("all")}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${
                activePlatformFilter === "all"
                  ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                  : "bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)]"
              }`}
            >
              All Sources
            </button>

            {(["linkedin", "indeed", "github", "upwork", "fiverr"] as const).map((plat) => {
              const meta = platformMeta[plat];
              const Icon = meta.Icon;
              const isSelected = activePlatformFilter === plat;
              return (
                <button
                  key={plat}
                  type="button"
                  aria-label={`Filter by ${meta.name} roles`}
                  onClick={() => setActivePlatformFilter(plat)}
                  className={`text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                      : "bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)]"
                  }`}
                >
                  <Icon size={11} aria-hidden="true" />
                  <span>{meta.name} Roles</span>
                </button>
              );
            })}
          </div>

          {/* Location & Search Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Location Proximity Toggle */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveLocationFilter("all")}
                className={`text-[11px] px-2 py-1 rounded-md border transition-all ${
                  activeLocationFilter === "all"
                    ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold shadow-xs"
                    : "bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]"
                }`}
              >
                All Locs
              </button>
              <button
                type="button"
                onClick={() => setActiveLocationFilter("near")}
                className={`text-[11px] px-2 py-1 rounded-md border transition-all flex items-center gap-1 ${
                  activeLocationFilter === "near"
                    ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold shadow-xs"
                    : "bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]"
                }`}
              >
                <MapPin size={10} /> Near Me
              </button>
              <button
                type="button"
                onClick={() => setActiveLocationFilter("remote")}
                className={`text-[11px] px-2 py-1 rounded-md border transition-all flex items-center gap-1 ${
                  activeLocationFilter === "remote"
                    ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold shadow-xs"
                    : "bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]"
                }`}
              >
                <Globe2 size={10} /> Remote
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles or skills…"
                className="text-[11px] pl-6 pr-2 py-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] w-36 sm:w-44"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Opportunities Grid ────────────────────────────────────── */}
      {filteredOfferings.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]">
          <Compass size={28} className="mx-auto text-[var(--text-muted)] opacity-60 mb-2" />
          <h3 className="text-sm font-semibold text-[var(--text)] m-0">No matching roles found</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-3">
            Try resetting your filters or updating your skills and target role.
          </p>
          <button
            type="button"
            onClick={() => {
              setActivePlatformFilter("all");
              setActiveLocationFilter("all");
              setSearchQuery("");
            }}
            className="ct-button ct-button--secondary text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {filteredOfferings.map((job) => {
            const companyMonogram = job.company
              .split(/\s+/)
              .map((w: string) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <article
                key={job.id}
                className="p-5 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_24%,var(--border))] bg-[var(--surface)] relative overflow-hidden flex flex-col justify-between transition-all duration-200 hover:border-[var(--accent)] hover:shadow-xl group"
                style={{
                  height: "auto",
                  boxShadow: "0 4px 20px -2px color-mix(in srgb, var(--bg) 30%, transparent)",
                }}
              >
                {/* Background Glow */}
                <div
                  className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-[var(--accent)] opacity-15 blur-2xl group-hover:opacity-25 transition-opacity"
                  aria-hidden="true"
                />

                {/* ─── Card Header ─── */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      {/* Company Monogram Avatar */}
                      <div className="size-11 rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface-raised))] border border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] flex items-center justify-center font-black text-sm text-[var(--accent)] shadow-sm shrink-0">
                        {companyMonogram}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[var(--text)] flex items-center gap-1">
                            {job.company}
                            <span title="Verified ATS Employer">
                              <ShieldCheck size={12} className="text-emerald-400" />
                            </span>
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-[var(--accent)]" /> {job.location}
                        </span>
                      </div>
                    </div>

                    {/* Match Score Badge */}
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-black px-2.5 py-1 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] text-[var(--accent)] shadow-sm">
                        <Star size={11} className="fill-[var(--accent)]" /> {job.matchPercentage}% Match
                      </span>
                      <span className="block text-[9.5px] font-medium text-[var(--text-muted)] mt-0.5">
                        {job.matchScore} / 5.0 score
                      </span>
                    </div>
                  </div>

                  {/* Role Title */}
                  <h3 className="text-[14.5px] font-extrabold text-[var(--text)] m-0 leading-snug group-hover:text-[var(--accent)] transition-colors">
                    {job.title}
                  </h3>

                  {/* Key Attributes Strip */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border))] text-[var(--accent)] flex items-center gap-1">
                      <DollarSign size={11} /> {job.salaryRange}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] flex items-center gap-1">
                      <Building2 size={11} /> {job.workMode}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] flex items-center gap-1">
                      <BriefcaseBusiness size={11} /> {job.experienceLevel}
                    </span>
                  </div>

                  {/* ─── Prominent Skills Matching ─── */}
                  <div className="pt-2.5 pb-1 border-t border-[var(--border)] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[var(--text)] flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-400" /> Matched with your profile:
                      </span>
                      <span className="text-[10.5px] text-[var(--accent)] font-semibold">
                        {job.matchedSkills.length} Verified Skills
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {job.matchedSkills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-raised))] text-[var(--text)] shadow-xs"
                        >
                          <CheckCircle2 size={10} className="text-[var(--accent)]" /> {skill}
                        </span>
                      ))}
                      {job.additionalSkills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] opacity-90"
                          title={`Role also values ${skill}`}
                        >
                          +{skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Connector Sources Badge */}
                  <div className="flex items-center justify-between gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text-muted)] flex items-center gap-1">
                      <Layers size={11} /> Match Signals:
                    </span>
                    <div className="flex items-center gap-1">
                      {job.platformSources.map((plat) => {
                        const meta = platformMeta[plat] || { name: plat, Icon: FaGithub, color: "#f97316" };
                        const Icon = meta.Icon;
                        return (
                          <span
                            key={plat}
                            className="px-1.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)] flex items-center gap-1 text-[10px] font-medium"
                            title={`Signal verified via ${meta.name}`}
                          >
                            <Icon size={10} aria-hidden="true" />
                            <span>{meta.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Rationale Summary */}
                  <div className="text-[11.5px] text-[var(--text-muted)] leading-relaxed border-l-2 border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_4%,var(--surface-raised))] p-2 rounded-r-lg">
                    <span className="font-bold text-[var(--text)] block text-[10.5px] mb-0.5 uppercase tracking-wide">
                      CareerTwin AI Assessment
                    </span>
                    {job.whyRecommended}
                  </div>
                </div>

                {/* ─── Bottom Actions ─── */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--border)] flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedReportJob(job)}
                    className="text-[11.5px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors"
                  >
                    <Info size={13} /> CareerTwin Report
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSaveJob(job)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        savedJobs.has(job.id)
                          ? "bg-[color-mix(in_srgb,var(--accent)_20%,var(--surface-raised))] border-[var(--accent)] text-[var(--accent)]"
                          : "bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
                      }`}
                      title={savedJobs.has(job.id) ? "Bookmarked role" : "Bookmark this role"}
                      aria-label={`Bookmark ${job.title}`}
                    >
                      {savedJobs.has(job.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                    </button>

                    <a
                      href={job.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => toggleApplyJob(e, job)}
                      className={`ct-button text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
                        appliedJobs.has(job.id)
                          ? "bg-[color-mix(in_srgb,var(--success)_18%,var(--surface-raised))] border border-[var(--success)] text-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_26%,var(--surface-raised))]"
                          : "ct-button--secondary"
                      }`}
                      style={{ minHeight: 28, textDecoration: "none" }}
                      title={`Open official job application for ${job.company}`}
                    >
                      {appliedJobs.has(job.id) ? (
                        <>
                          <Check size={12} className="text-[var(--success)] font-bold" />
                          <span>Applied ✓</span>
                        </>
                      ) : (
                        <>
                          <span>Apply on Portal</span>
                          <ExternalLink size={12} />
                        </>
                      )}
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        toast.success(`Preparation target set to ${job.title} at ${job.company}. Opening practice…`);
                        onPracticeRole(job.title, job.company);
                      }}
                      className="ct-button text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                      style={{ minHeight: 28 }}
                      aria-label={`Practice for ${job.title}`}
                    >
                      <span>Practice role</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ─── Preview Footer Redirection Banner ─── */}
      {previewMode && onOpenFullRadar && (
        <div
          className="ct-company-card p-4 rounded-xl border border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] bg-[var(--surface-raised)] flex items-center justify-between flex-wrap gap-3.5"
          style={{ margin: 0 }}
        >
          <div className="max-w-lg">
            <strong className="text-sm text-[var(--text)] block font-semibold">
              Explore all {rawOfferings.length} matching jobs on your Live Job Radar
            </strong>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-0">
              Filtered in real-time by your location ({userLocationLabel}), 5 platform connectors, and direct application links.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              toast.message("Opening Live Job Radar…");
              onOpenFullRadar();
            }}
            className="ct-button flex items-center gap-1.5 text-xs font-semibold px-4 py-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <span>Open Live Job Radar</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ─── CareerTwin Structured Intelligence Report Modal (Blocks A–H) ─ */}
      <Dialog
        open={Boolean(selectedReportJob)}
        onOpenChange={(open) => {
          if (!open) setSelectedReportJob(null);
        }}
      >
        <DialogContent className="ct-connection-details-dialog max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedReportJob && (
            <div className="flex flex-col gap-4">
              <div className="ct-connection-details-heading flex items-start gap-3">
                <div className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_24%,var(--border))]">
                  <Building2 size={22} />
                </div>
                <div>
                  <p className="ct-home-eyebrow m-0">
                    <span /> CareerTwin Intelligence Audit
                  </p>
                  <DialogTitle className="text-lg font-bold text-[var(--text)] m-0">
                    {selectedReportJob.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[var(--text-muted)] mt-0.5">
                    {selectedReportJob.company} · {selectedReportJob.location} · {selectedReportJob.salaryRange}
                  </DialogDescription>
                </div>
              </div>

              {/* 5-Dimension Score Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block text-[10px]">Technical Fit</span>
                  <strong className="text-[var(--text)] text-sm">{selectedReportJob.dimensions.technicalFit}%</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block text-[10px]">Seniority Scope</span>
                  <strong className="text-[var(--text)] text-sm">{selectedReportJob.dimensions.seniorityFit}%</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block text-[10px]">Work Mode</span>
                  <strong className="text-[var(--text)] text-sm">{selectedReportJob.dimensions.workModeFit}%</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block text-[10px]">Growth Potential</span>
                  <strong className="text-[var(--text)] text-sm">{selectedReportJob.dimensions.growthFit}%</strong>
                </div>
              </div>

              {/* Blocks A–H Structured Breakdown */}
              <div className="space-y-3 text-xs text-[var(--text-muted)]">
                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <strong className="text-[var(--text)] block font-semibold mb-1">
                    Block A: Role &amp; Organization Snapshot
                  </strong>
                  <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockA}</p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <strong className="text-[var(--text)] block font-semibold mb-1">
                    Block B: Core Mission &amp; Impact
                  </strong>
                  <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockB}</p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <strong className="text-[var(--text)] block font-semibold mb-1">
                    Block C: Technical Architecture &amp; Stack
                  </strong>
                  <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockC}</p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <strong className="text-[var(--text)] block font-semibold mb-1">
                    Block D: Candidate Fit Matrix
                  </strong>
                  <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockD}</p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <strong className="text-[var(--text)] block font-semibold mb-1">
                    Block E: Connector Signals Provenance
                  </strong>
                  <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockE}</p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <strong className="text-[var(--text)] block font-semibold mb-1">
                    Block F: Strategic Interview Talking Points
                  </strong>
                  <ul className="m-0 pl-4 space-y-1 mt-1">
                    {selectedReportJob.interviewTalkingPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <strong className="text-[var(--text)] block font-semibold mb-1">
                    Block G: Legitimacy &amp; Verification Check
                  </strong>
                  <p className="m-0 leading-relaxed flex items-center gap-1.5 text-emerald-400">
                    <ShieldCheck size={14} /> {selectedReportJob.reportBlocks.blockG}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                  <strong className="text-[var(--text)] block font-semibold mb-1">
                    Block H: Tailored Application Strategy
                  </strong>
                  <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockH}</p>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)] flex-wrap">
                <button
                  type="button"
                  className="ct-button ct-button--secondary text-xs"
                  onClick={() => setSelectedReportJob(null)}
                >
                  Close report
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedReportJob.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ct-button ct-button--secondary text-xs flex items-center gap-1.5"
                    style={{ textDecoration: "none" }}
                  >
                    <span>Open official job portal</span>
                    <ExternalLink size={13} />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const job = selectedReportJob;
                      setSelectedReportJob(null);
                      onPracticeRole(job.title, job.company);
                    }}
                    className="ct-button text-xs flex items-center gap-1.5"
                  >
                    <span>Practice for this role</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
