import React from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BrainCircuit,
  Building2,
  Check,
  ChevronDown,
  Code2,
  ExternalLink,
  FileImage,
  FileText,
  Globe2,
  Info,
  Lightbulb,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { practiceProfileCategories, type PracticeProfileCategoryId } from "@shared/practiceContext";
import { normalizePublicHttpsUrl } from "@shared/publicUrl";
import BeautifulAnalysisLoader from "@/components/BeautifulAnalysisLoader";

/* ─── Constants ──────────────────────────────────────────────────────────── */
const maxFileBytes = 3 * 1024 * 1024;
const allowedTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const SESSION_KEY = "ct_company_prep_v2";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type LocalFile = { id: string; file: File };
type Brief = NonNullable<ReturnType<typeof trpc.practicePreparation.analyze.useMutation>["data"]>["brief"];
type SourceStatus = NonNullable<ReturnType<typeof trpc.practicePreparation.analyze.useMutation>["data"]>["sources"][number];
type AnalysisResult = {
  brief: Brief;
  sources: SourceStatus[];
  profileContextIncluded: boolean;
  accountContext: {
    includedCategoryIds: PracticeProfileCategoryId[];
    includedFieldCount: number;
    connectorContextIncluded: false;
    persisted: false;
  };
};
type PersistedState = {
  companyName: string;
  companyWebsite: string;
  targetRole: string;
  jobDescription: string;
  notes: string;
  links: string[];
  result: AnalysisResult | null;
  savedAt: number;
};

/* ─── Session persistence ────────────────────────────────────────────────── */
function loadSession(): PersistedState | null {
  try {
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") return null;
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (Date.now() - parsed.savedAt > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
function saveSession(state: PersistedState) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch { /* quota exceeded */ }
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fileKind(file: File) {
  return file.type.startsWith("image/") ? "Image" : file.type === "application/pdf" ? "PDF" : "Document";
}
function profileFieldCount(profile: Record<string, unknown> | null | undefined, fields: readonly string[]) {
  if (!profile) return 0;
  return fields.filter((f) => typeof profile[f] === "string" && String(profile[f]).trim()).length;
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

/** Collapsible section — uses existing ct-company-result-block + new ct-collapsible classes */
function Collapsible({
  label,
  icon,
  count,
  accent = "",
  defaultOpen = true,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  accent?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`ct-collapsible${accent ? ` ct-collapsible--${accent}` : ""}${open ? " is-open" : ""}`}
      data-state={open ? "open" : "closed"}
    >
      <button
        type="button"
        className="ct-collapsible-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ct-collapsible-icon">{icon}</span>
        <span className="ct-collapsible-label">{label}</span>
        {count !== undefined && <span className="ct-collapsible-count">{count}</span>}
        <span className="ct-collapsible-chevron"><ChevronDown size={15} /></span>
      </button>
      <div className="ct-collapsible-content" aria-hidden={!open}>
        <div className="ct-collapsible-content-inner">
          <div className="ct-collapsible-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Skill badges row */
function BadgeGroup({ items, variant }: { items: string[]; variant: "required" | "preferred" | "tech" }) {
  if (!items.length) return null;
  return (
    <div className="ct-badge-group">
      {items.map((s) => (
        <span key={s} className={`ct-badge ct-badge--${variant}`} title={s}>
          {s}
        </span>
      ))}
    </div>
  );
}

/** Source icon picker */
function SourceIcon({ kind }: { kind: string }) {
  if (kind === "website") return <Globe2 size={14} />;
  if (kind === "image") return <FileImage size={14} />;
  if (kind === "document") return <FileText size={14} />;
  if (kind === "job-details") return <Sparkles size={14} />;
  return <Link2 size={14} />;
}

/* ─── Result Panel ───────────────────────────────────────────────────────── */
function ResultPanel({
  result,
  companyName,
  targetRole,
  companyWebsite,
}: {
  result: AnalysisResult;
  companyName: string;
  targetRole: string;
  companyWebsite?: string;
}) {
  const { brief, sources } = result;
  const analyzedCount = sources.filter((s) => s.status === "analyzed").length;
  const totalSkills = brief.requiredSkills.length + brief.preferredSkills.length + brief.technologySignals.length;

  return (
    <section className="ct-company-result" aria-labelledby="ct-brief-title">

      {/* ── Unified Hero Card with Top-Left Ambient Glow ── */}
      <article className="ct-company-card ct-brief-hero-card">
        {/* Topline: Eyebrow on left, Analysis complete on right */}
        <div className="ct-brief-hero-topline">
          <div className="ct-company-card-kicker">
            <span className="ct-eyebrow-mark" />
            <span>Review before practice</span>
          </div>
          <span className="ct-company-result-badge">
            <Check size={13} />
            <span>Analysis complete</span>
          </span>
        </div>

        {/* Main Identity Row */}
        <div className="ct-brief-hero-main">
          <div className="ct-brief-company-avatar" aria-hidden="true">
            <Building2 size={28} />
          </div>
          <div className="ct-brief-hero-info">
            <h1 id="ct-brief-title" className="ct-brief-hero-title">
              {companyName}
            </h1>
            <div className="ct-brief-hero-chips">
              <span className="ct-brief-role-chip">
                <Target size={13} />
                <span>{targetRole}</span>
              </span>
              {companyWebsite && (
                <a
                  href={companyWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="ct-brief-site-chip"
                  title={`Visit ${companyWebsite}`}
                >
                  <Globe2 size={13} />
                  <span>{companyWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="ct-brief-hero-stats">
          <div className="ct-brief-hero-stat-item">
            <strong className="ct-brief-hero-stat-value">{result.accountContext.includedFieldCount}</strong>
            <span className="ct-brief-hero-stat-label">Profile fields used</span>
          </div>
          <div className="ct-brief-hero-stat-divider" aria-hidden="true" />
          <div className="ct-brief-hero-stat-item">
            <strong className="ct-brief-hero-stat-value">{analyzedCount}</strong>
            <span className="ct-brief-hero-stat-label">{analyzedCount === 1 ? "Source analyzed" : "Sources analyzed"}</span>
          </div>
          {totalSkills > 0 && (
            <>
              <div className="ct-brief-hero-stat-divider" aria-hidden="true" />
              <div className="ct-brief-hero-stat-item">
                <strong className="ct-brief-hero-stat-value">{totalSkills}</strong>
                <span className="ct-brief-hero-stat-label">Skills &amp; signals mapped</span>
              </div>
            </>
          )}
        </div>
      </article>

      {/* ── Company + Role summary ── */}
      <div className="ct-brief-summary-row">
        <div className="ct-brief-summary-block">
          <p className="ct-brief-summary-eyebrow"><Globe2 size={12} /> Company profile</p>
          <h3>{companyName}</h3>
          <p>{brief.companySummary}</p>
        </div>
        <div className="ct-brief-summary-block">
          <p className="ct-brief-summary-eyebrow"><Target size={12} /> Target role</p>
          <h3>{targetRole}</h3>
          <p>{brief.roleSummary}</p>
        </div>
      </div>

      {/* ── Skills & technologies grid ── */}
      {(brief.requiredSkills.length > 0 || brief.preferredSkills.length > 0 || brief.technologySignals.length > 0) && (
        <div className="ct-company-result-block">
          <div className="ct-company-result-heading">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={15} style={{ color: "var(--accent-light)" }} />
              <span>Skills &amp; technologies</span>
            </div>
            <span className="ct-company-result-count">
              {brief.requiredSkills.length + brief.preferredSkills.length + brief.technologySignals.length}
            </span>
          </div>
          <div className="ct-brief-skills-section">
            {brief.requiredSkills.length > 0 && (
              <div className="ct-brief-skills-block">
                <p className="ct-brief-skills-title"><Zap size={12} /> Required competencies</p>
                <BadgeGroup items={brief.requiredSkills} variant="required" />
              </div>
            )}
            {brief.preferredSkills.length > 0 && (
              <div className="ct-brief-skills-block">
                <p className="ct-brief-skills-title"><Star size={12} /> Preferred &amp; adjacent</p>
                <BadgeGroup items={brief.preferredSkills} variant="preferred" />
              </div>
            )}
            {brief.technologySignals.length > 0 && (
              <div className="ct-brief-skills-block">
                <p className="ct-brief-skills-title"><Code2 size={12} /> Technology signals</p>
                <BadgeGroup items={brief.technologySignals} variant="tech" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Collapsible sections ── */}
      <div className="ct-brief-collapsibles">
        <Collapsible label="Responsibilities" icon={<Award size={14} />} count={brief.responsibilities.length} accent="blue">
          {brief.responsibilities.length ? (
            <ul className="ct-brief-bullet-list">
              {brief.responsibilities.map((item) => (
                <li key={item}><span className="ct-brief-bullet-dot" />{item}</li>
              ))}
            </ul>
          ) : <p className="ct-brief-empty-note">No explicit responsibilities were available.</p>}
        </Collapsible>

        <Collapsible label="Interview themes" icon={<BrainCircuit size={14} />} count={brief.interviewThemes.length} accent="purple">
          {brief.interviewThemes.length ? (
            <ul className="ct-brief-bullet-list">
              {brief.interviewThemes.map((item) => (
                <li key={item}><span className="ct-brief-bullet-dot" />{item}</li>
              ))}
            </ul>
          ) : <p className="ct-brief-empty-note">No interview themes available yet.</p>}
        </Collapsible>

        <Collapsible label="Working-style signals" icon={<Lightbulb size={14} />} count={brief.workingStyleSignals.length} accent="green" defaultOpen={false}>
          {brief.workingStyleSignals.length ? (
            <ul className="ct-brief-bullet-list">
              {brief.workingStyleSignals.map((item) => (
                <li key={item}><span className="ct-brief-bullet-dot" />{item}</li>
              ))}
            </ul>
          ) : <p className="ct-brief-empty-note">No explicit working-style signals were found.</p>}
        </Collapsible>

        {brief.uncertaintyNotes.length > 0 && (
          <Collapsible label="Verify before relying" icon={<AlertCircle size={14} />} count={brief.uncertaintyNotes.length} accent="warn" defaultOpen={false}>
            <ul className="ct-brief-warn-list">
              {brief.uncertaintyNotes.map((item) => (
                <li key={item}><AlertCircle size={13} />{item}</li>
              ))}
            </ul>
          </Collapsible>
        )}

        {brief.sourceAttributions.length > 0 && (
          <Collapsible label="Strongest source signals" icon={<Sparkles size={14} />} count={brief.sourceAttributions.length} accent="orange" defaultOpen={false}>
            <div className="ct-brief-attr-list">
              {brief.sourceAttributions.map((item) => (
                <div className="ct-brief-attr-item" key={`${item.sourceLabel}-${item.support}`}>
                  <strong>{item.sourceLabel}</strong>
                  <p>{item.support}</p>
                </div>
              ))}
            </div>
          </Collapsible>
        )}
      </div>

      {/* ── Sources ── */}
      <section className="ct-company-sources" aria-labelledby="ct-sources-title" style={{ maxWidth: 1180 }}>
        <div className="ct-company-section-header">
          <div>
            <p className="ct-section-label">Traceable inputs</p>
            <h2 id="ct-sources-title" className="ct-company-section-title">What informed this brief</h2>
          </div>
          <span className="ct-company-source-count">{analyzedCount}/{sources.length} ready</span>
        </div>
        <div className="ct-company-source-list">
          {sources.map((source) => (
            <article
              className={`ct-company-source-item${source.status === "unavailable" ? " is-unavailable" : ""}`}
              key={`${source.label}-${source.url ?? source.detail}`}
            >
              <span className="ct-company-source-icon"><SourceIcon kind={source.kind} /></span>
              <div className="ct-company-source-copy">
                <strong>{source.label}</strong>
                <span>{source.detail}</span>
                {source.url && <a href={source.url} target="_blank" rel="noreferrer">Open <ExternalLink size={11} /></a>}
              </div>
              <span className={`ct-company-source-state${source.status === "unavailable" ? " is-unavailable" : ""}`}>
                {source.status === "unavailable" ? "Needs review" : "Included"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <p className="ct-company-privacy-line">
        <LockKeyhole size={14} />
        {result.profileContextIncluded
          ? `${result.accountContext.includedCategoryIds.length} selected account categories informed this brief; connector fixtures excluded.`
          : "No saved profile context was available for this analysis."}
        {" "}Nothing was persisted to the server.
      </p>
    </section>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
type CompanyPreparationProps = {
  onContinue: () => void;
  onActiveWorkChange?: (hasActiveWork: boolean) => void;
};

export default function CompanyPreparation({ onContinue, onActiveWorkChange }: CompanyPreparationProps) {
  const { theme } = useTheme();
  const profileQuery = trpc.careerProfile.get.useQuery(undefined, { retry: false });
  const analysis = trpc.practicePreparation.analyze.useMutation();

  const persisted = useMemo(() => loadSession(), []);

  const [companyName, setCompanyName] = useState(persisted?.companyName ?? "");
  const [companyWebsite, setCompanyWebsite] = useState(persisted?.companyWebsite ?? "");
  const [targetRole, setTargetRole] = useState(persisted?.targetRole ?? "");
  const [jobDescription, setJobDescription] = useState(persisted?.jobDescription ?? "");
  const [notes, setNotes] = useState(persisted?.notes ?? "");
  const [linkDraft, setLinkDraft] = useState("");
  const [companyWebsiteTouched, setCompanyWebsiteTouched] = useState(false);
  const [linkDraftTouched, setLinkDraftTouched] = useState(false);
  const [links, setLinks] = useState<string[]>(persisted?.links ?? []);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [validation, setValidation] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(persisted?.result ?? null);
  const [profileCategoryIds, setProfileCategoryIds] = useState<PracticeProfileCategoryId[]>([]);
  const [contextSelectionInitialized, setContextSelectionInitialized] = useState(false);

  const totalBytes = useMemo(() => files.reduce((sum, item) => sum + item.file.size, 0), [files]);
  const hasSource = Boolean(companyWebsite.trim() || jobDescription.trim() || notes.trim() || links.length || files.length);
  const profile = (profileQuery.data ?? null) as Record<string, unknown> | null;
  const availableProfileCategories = useMemo(
    () => practiceProfileCategories.map((cat) => ({ ...cat, fieldCount: profileFieldCount(profile, cat.fields) })),
    [profile],
  );
  const enabledProfileCategories = availableProfileCategories.filter((cat) => profileCategoryIds.includes(cat.id));
  const enabledProfileFieldCount = enabledProfileCategories.reduce((total, cat) => total + cat.fieldCount, 0);
  const defaultProfileCategoryIds = useMemo(
    () => availableProfileCategories.filter((cat) => cat.fieldCount > 0).map((cat) => cat.id),
    [availableProfileCategories],
  );
  const normalizedCompanyWebsite = normalizePublicHttpsUrl(companyWebsite);
  const normalizedLinkDraft = normalizePublicHttpsUrl(linkDraft);
  const profileSelectionChanged =
    contextSelectionInitialized &&
    (profileCategoryIds.length !== defaultProfileCategoryIds.length ||
      profileCategoryIds.some((id) => !defaultProfileCategoryIds.includes(id)));
  const hasActiveWork = Boolean(
    companyName.trim() || companyWebsite.trim() || targetRole.trim() ||
    jobDescription.trim() || notes.trim() || linkDraft.trim() ||
    links.length || files.length || result || profileSelectionChanged || analysis.isPending,
  );

  useEffect(() => {
    if (contextSelectionInitialized || profileQuery.isLoading) return;
    setProfileCategoryIds(defaultProfileCategoryIds);
    setContextSelectionInitialized(true);
  }, [contextSelectionInitialized, defaultProfileCategoryIds, profileQuery.isLoading]);

  useEffect(() => {
    onActiveWorkChange?.(hasActiveWork);
    return () => onActiveWorkChange?.(false);
  }, [hasActiveWork, onActiveWorkChange]);

  // Auto-save form + result to sessionStorage
  useEffect(() => {
    saveSession({ companyName, companyWebsite, targetRole, jobDescription, notes, links, result, savedAt: Date.now() });
  }, [companyName, companyWebsite, targetRole, jobDescription, notes, links, result]);

  const toggleProfileCategory = (id: PracticeProfileCategoryId) =>
    setProfileCategoryIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);

  const addLink = () => {
    const normalized = normalizePublicHttpsUrl(linkDraft.trim());
    setLinkDraftTouched(true);
    if (!normalized) { setSourceError("Enter a valid public domain or HTTP(S) URL before adding it."); return; }
    if (links.includes(normalized)) { setSourceError("That source is already in your preparation set."); return; }
    if (links.length >= 8) { setSourceError("Keep the preparation set to eight public links."); return; }
    setLinks((cur) => [...cur, normalized]);
    setLinkDraft(""); setLinkDraftTouched(false); setSourceError("");
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = Array.from(incoming);
    const invalid = next.find((f) => !allowedTypes.has(f.type) || f.size > maxFileBytes);
    if (invalid) { setSourceError(`${invalid.name} is not supported or is larger than 3 MB.`); return; }
    if (files.length + next.length > 4) { setSourceError("Keep up to four supporting files in one analysis."); return; }
    setFiles((cur) => [...cur, ...next.map((f) => ({ id: `${f.name}-${f.lastModified}-${Math.random()}`, file: f }))]);
    setSourceError("");
  };

  const reset = () => {
    setCompanyName(""); setCompanyWebsite(""); setCompanyWebsiteTouched(false); setTargetRole("");
    setJobDescription(""); setNotes(""); setLinkDraft(""); setLinkDraftTouched(false);
    setLinks([]); setFiles([]); setValidation(""); setSourceError(""); setResult(null);
    setProfileCategoryIds(defaultProfileCategoryIds); analysis.reset();
    sessionStorage.removeItem(SESSION_KEY);
  };

  const encodeFile = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });

  const submit = async () => {
    if (!companyName.trim() || !targetRole.trim()) { setValidation("Add the company name and target role before analysis."); return; }
    if (!hasSource) { setValidation("Add a company website, role description, link, note, or supporting file."); return; }
    if (companyWebsite.trim() && !normalizedCompanyWebsite) { setValidation("Use a valid public company domain or HTTP(S) URL."); return; }
    setValidation(""); setSourceError("");
    try {
      const encodedFiles = await Promise.all(
        files.map(async ({ file }) => ({
          name: file.name,
          mimeType: file.type as "application/pdf" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "image/jpeg" | "image/png" | "image/webp",
          contentBase64: await encodeFile(file),
        })),
      );
      const response = await analysis.mutateAsync({
        companyName: companyName.trim(), companyWebsite: normalizedCompanyWebsite,
        targetRole: targetRole.trim(), jobDescription: jobDescription.trim(),
        notes: notes.trim(), profileCategoryIds, links, files: encodedFiles,
      });
      setResult(response);
    } catch (error) {
      setValidation(error instanceof Error ? error.message : "Company and role analysis is unavailable right now. Please retry in a moment.");
    }
  };

  return (
    <main className="ct-view ct-view--wide ct-company-page" data-theme={theme}>

      {/* Hero */}
      <section className="ct-company-hero" aria-labelledby="company-prep-title">
        <div className="ct-company-hero-copy">
          <p className="ct-eyebrow"><span className="ct-eyebrow-mark" /> Company preparation</p>
          <h1 id="company-prep-title" className="ct-title ct-title--compact">Prepare for the company behind the interview.</h1>
          <p className="ct-lede">Bring the role and evidence you can access. FutureMaker turns your selected sources into a grounded preparation brief before tailored questions begin.</p>
          <div className="ct-company-trust-row">
            <span><LockKeyhole size={14} /> Account context stays private</span>
            <span><Info size={14} /> Illustrative connectors stay excluded</span>
          </div>
        </div>
        <aside className="ct-company-analysis-status" aria-label="Analysis boundary">
          <span className="ct-company-analysis-icon"><Sparkles size={17} /></span>
          <div>
            <span>Private analysis</span>
            <strong>Selected sources only</strong>
            <p>Your enabled Account groups and selected company material inform this brief. Nothing is saved.</p>
          </div>
          <ul>
            <li><Check size={13} /> Source-attributed</li>
            <li><Check size={13} /> Reviewable</li>
          </ul>
        </aside>
      </section>

      {/* Form or Result */}
      {!result ? (
        <div key="form-stage" className="ct-stage-transition">
          <section className="ct-company-layout" aria-label="Company preparation inputs">
            <div className="ct-company-main-column">

              {/* Step 01 — Account context */}
              <article className="ct-company-card ct-company-context-card">
                <div className="ct-company-card-kicker"><span className="ct-company-step">01</span><span>Account context</span></div>
                <div className="ct-company-context-heading">
                  <div>
                    <h2 className="ct-company-card-title">Use the profile you have reviewed.</h2>
                    <p className="ct-company-card-copy">Saved FutureMaker information is included by default. Turn off any category before analysis.</p>
                  </div>
                  <span className="ct-company-context-count">{enabledProfileCategories.length} groups · {enabledProfileFieldCount} fields</span>
                </div>
                {profileQuery.isLoading
                  ? <p className="ct-company-context-loading"><LoaderCircle size={15} className="ct-spin" /> Loading saved Account context…</p>
                  : (
                    <div className="ct-company-context-list">
                      {availableProfileCategories.map((cat) => {
                        const included = profileCategoryIds.includes(cat.id);
                        const available = cat.fieldCount > 0;
                        return (
                          <article className={`ct-company-context-item${included ? " is-included" : ""}${!available ? " is-empty" : ""}`} key={cat.id}>
                            <div>
                              <strong>{cat.label}</strong>
                              <p>{available ? `${cat.description} ${cat.fieldCount} saved ${cat.fieldCount === 1 ? "field" : "fields"} available.` : "No saved values in this category."}</p>
                            </div>
                            <button
                              className="ct-company-context-toggle"
                              type="button"
                              role="switch"
                              aria-checked={included}
                              aria-label={`${included ? "Exclude" : "Include"} ${cat.label} in this analysis`}
                              disabled={!available}
                              onClick={() => toggleProfileCategory(cat.id)}
                            >
                              <span aria-hidden="true" />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                <div className="ct-company-connector-exclusion">
                  <LockKeyhole size={15} />
                  <div>
                    <strong>Illustrative connector snapshots are excluded</strong>
                    <span>LinkedIn, Indeed, GitHub, Upwork, and Fiverr are not provider-connected and will not be sent to FutureMaker AI.</span>
                  </div>
                </div>
              </article>

              {/* Step 02 — Target */}
              <article className="ct-company-card">
                <div className="ct-company-card-kicker"><span className="ct-company-step">02</span><span>Target</span></div>
                <h2 className="ct-company-card-title">Where are you applying?</h2>
                <p className="ct-company-card-copy">Start with the company and role you want to rehearse for.</p>
                <div className="ct-company-field-grid">
                  <label className="ct-company-field" htmlFor="company-name">
                    <span>Company name <em>Required</em></span>
                    <input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Systems Limited" />
                  </label>
                  <label className="ct-company-field" htmlFor="target-role">
                    <span>Target role <em>Required</em></span>
                    <input id="target-role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Senior Software Engineer" />
                  </label>
                </div>
                <label className="ct-company-field" htmlFor="company-website">
                  <span>Company website <em>Public domain or URL</em></span>
                  <input id="company-website" type="text" inputMode="url" autoComplete="url" value={companyWebsite}
                    onChange={(e) => { setCompanyWebsite(e.target.value); setCompanyWebsiteTouched(false); }}
                    onBlur={() => setCompanyWebsiteTouched(true)} placeholder="company.com" />
                </label>
                {companyWebsiteTouched && companyWebsite.trim() && (
                  <p className={`ct-company-url-hint ${normalizedCompanyWebsite ? "is-valid" : "is-invalid"}`} role="status">
                    {normalizedCompanyWebsite
                      ? <><Check size={14} /> Secure destination: <strong>{normalizedCompanyWebsite}</strong></>
                      : <><AlertCircle size={14} /> Enter a public domain or HTTP(S) URL.</>}
                  </p>
                )}
                <label className="ct-company-field" htmlFor="job-description">
                  <span>Role description <em>Optional</em></span>
                  <textarea id="job-description" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste responsibilities, requirements, or the job post text…" />
                </label>
              </article>

              {/* Step 03 — Evidence */}
              <article className="ct-company-card">
                <div className="ct-company-card-kicker"><span className="ct-company-step">03</span><span>Evidence</span></div>
                <h2 className="ct-company-card-title">Add what you can verify.</h2>
                <p className="ct-company-card-copy">Add public pages, screenshots, or documents you want FutureMaker to analyze.</p>
                <div className="ct-company-link-add">
                  <label className="ct-company-field" htmlFor="public-source-link">
                    <span>Public source link <em>Domain or URL</em></span>
                    <input id="public-source-link" type="text" inputMode="url" autoComplete="url" value={linkDraft}
                      onChange={(e) => { setLinkDraft(e.target.value); setLinkDraftTouched(false); }}
                      onBlur={() => setLinkDraftTouched(true)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                      placeholder="careers.company.com/role" />
                  </label>
                  <button className="ct-icon-button" type="button" aria-label="Add public source link" onClick={addLink}><Plus size={18} /></button>
                </div>
                {linkDraftTouched && linkDraft.trim() && (
                  <p className={`ct-company-url-hint ${normalizedLinkDraft ? "is-valid" : "is-invalid"}`} role="status">
                    {normalizedLinkDraft
                      ? <><Check size={14} /> Secure destination: <strong>{normalizedLinkDraft}</strong></>
                      : <><AlertCircle size={14} /> Enter a public domain or HTTP(S) URL.</>}
                  </p>
                )}
                {links.length > 0 && (
                  <div className="ct-company-link-list">
                    {links.map((link) => (
                      <div className="ct-company-source-chip" key={link}>
                        <Link2 size={14} /><span>{link}</span>
                        <button type="button" aria-label={`Remove ${link}`} onClick={() => setLinks((cur) => cur.filter((l) => l !== link))}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="ct-company-upload">
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" multiple
                    onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />
                  <Upload size={17} />
                  <span><strong>Upload supporting evidence</strong><small>PDF, DOC, DOCX, JPG, PNG, or WebP · up to 3 MB each</small></span>
                  <ArrowRight size={16} />
                </label>
                {files.length > 0 && (
                  <div className="ct-company-file-list">
                    {files.map(({ id, file }) => (
                      <div className="ct-company-file-row" key={id}>
                        <span className="ct-company-file-icon">{file.type.startsWith("image/") ? <FileImage size={16} /> : <FileText size={16} />}</span>
                        <div><strong>{file.name}</strong><small>{fileKind(file)} · {formatBytes(file.size)}</small></div>
                        <button className="ct-text-action" type="button" aria-label={`Remove ${file.name}`}
                          onClick={() => setFiles((cur) => cur.filter((f) => f.id !== id))}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="ct-company-field" htmlFor="company-notes">
                  <span>Anything else to verify? <em>Optional</em></span>
                  <textarea id="company-notes" className="ct-company-textarea-short" value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add an email excerpt, hiring context, or product area…" />
                </label>
                <p className="ct-company-input-meta">
                  <span>{links.length} public links · {files.length} files · {formatBytes(totalBytes)} selected</span>
                  <span>Nothing is saved in this milestone</span>
                </p>
              </article>
            </div>

            {/* Sidebar */}
            <aside className="ct-company-side-column">
              <div className="ct-company-side-card">
                <span className="ct-company-side-icon"><Sparkles size={18} /></span>
                <p className="ct-section-label">Source-attributed output</p>
                <h3 className="ct-company-side-title">What FutureMaker prepares for you</h3>
                <p>FutureMaker extracts key responsibilities, competencies, interview themes, and working-style signals so your practice questions can reflect the actual organization.</p>
                <div className="ct-company-side-list">
                  <span><Check size={14} /> Core company &amp; role summary</span>
                  <span><Check size={14} /> Required &amp; preferred skill mapping</span>
                  <span><Check size={14} /> Source-grounded interview themes</span>
                  <span><Check size={14} /> Working-style and culture signals</span>
                  <span><Check size={14} /> Unverified claims marked for review</span>
                </div>
              </div>
              <article className="ct-company-profile-card">
                <span className="ct-company-profile-mark"><LockKeyhole size={16} /></span>
                <div>
                  <strong>Session-scoped analysis</strong>
                  <p>Your preparation brief is computed in this browser session. Nothing is shared or used for hiring decisions.</p>
                </div>
              </article>
            </aside>
          </section>
        </div>
      ) : (
        <div key="result-stage" className="ct-stage-transition">
          <ResultPanel
            result={result}
            companyName={companyName}
            targetRole={targetRole}
            companyWebsite={normalizedCompanyWebsite || companyWebsite}
          />
        </div>
      )}

      {/* Actions */}
      <div className="ct-company-actions">
        {result ? (
          <>
            <button className="ct-button ct-button--secondary" type="button" onClick={() => setResult(null)}>
              <ArrowLeft size={16} /> Edit sources
            </button>
            <button className="ct-button ct-button--secondary" type="button" onClick={submit} disabled={analysis.isPending}>
              <RefreshCw size={16} className={analysis.isPending ? "ct-spin" : ""} /> Re-run analysis
            </button>
            <button className="ct-button" type="button" onClick={onContinue}>
              Continue to tailored questions <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <button className="ct-button ct-button--secondary" type="button" onClick={reset}>Clear workspace</button>
            <button className="ct-button ct-button--wide" type="button" onClick={submit} disabled={analysis.isPending}>
              {analysis.isPending
                ? <><LoaderCircle size={16} className="ct-spin" /> Reading selected sources…</>
                : <>Analyze company &amp; role <ArrowRight size={16} /></>}
            </button>
          </>
        )}
      </div>

      {(validation || sourceError) && (
        <div className="ct-stage-transition my-3 w-full" role="alert">
          <article
            className="ct-company-card relative overflow-hidden w-full"
            style={{
              width: "100%",
              padding: "16px 20px",
              boxSizing: "border-box",
              borderColor: "color-mix(in srgb, var(--accent) 45%, var(--border))",
              background:
                "radial-gradient(400px circle at 0% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 65%), var(--surface-raised)",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 18%, var(--surface))",
                    color: "var(--accent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                  }}
                >
                  <AlertCircle size={17} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--accent)" }}
                  >
                    Analysis Notice
                  </h4>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
                    {validation || sourceError}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {(validation?.includes("retry") || sourceError?.includes("retry")) && (
                  <button
                    type="button"
                    className="ct-button ct-button--secondary"
                    onClick={submit}
                    disabled={analysis.isPending}
                    style={{ minHeight: 32, padding: "4px 12px", fontSize: 12 }}
                  >
                    <RefreshCw size={13} className={analysis.isPending ? "ct-spin" : ""} /> Retry
                  </button>
                )}
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                  onClick={() => {
                    setValidation("");
                    setSourceError("");
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </article>
        </div>
      )}
      {analysis.isPending && (
        <BeautifulAnalysisLoader
          companyName={companyName}
          targetRole={targetRole}
          sourceCount={links.length + (normalizedCompanyWebsite ? 1 : 0) + files.length}
          sources={[
            ...(normalizedCompanyWebsite ? [normalizedCompanyWebsite] : []),
            ...links,
            ...files.map((f) => f.file.name),
          ]}
        />
      )}
      <p className="ct-info-line"><LockKeyhole size={16} /> Public links are fetched only when you add them. FutureMaker does not crawl beyond your selected sources.</p>
    </main>
  );
}
