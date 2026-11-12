import type { ActiveScreen, AnalysisResult, CoverLetterResult, DocumentStyle, RequirementMatch, TailoringResult } from "../types";

export interface Workspace {
  format: "ats-coach-workspace";
  version: 1;
  savedAt: string;
  name: string;
  resumeText: string;
  originalText: string;
  resumePdf: string | null;
  resumeFileName: string | null;
  jobDescription: string;
  analysis: AnalysisResult | null;
  tailoring: TailoringResult | null;
  coverLetter: CoverLetterResult | null;
  screen: ActiveScreen;
  demo: boolean;
  checks: { facts: boolean; formatting: boolean; downloaded: boolean };
}
export const EMPTY_CHECKS = { facts: false, formatting: false, downloaded: false };
export const MAX_WORKSPACE_BYTES = 30 * 1024 * 1024;
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("This is not a valid ATS Coach AI workspace.");
  return value as Record<string, unknown>;
};
const text = (value: unknown, max = 200_000): string => {
  if (typeof value !== "string" || value.length > max) throw new Error("The workspace contains an invalid or oversized text field.");
  return value;
};
const texts = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length > 200) throw new Error("The workspace contains an invalid list.");
  return value.map(item => text(item, 10_000));
};
const score = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) throw new Error("The workspace contains an invalid educational score.");
  return value;
};
const documentStyle = (value: unknown): DocumentStyle | undefined => {
  if (value == null) return undefined;
  const s = object(value);
  if (!["Arial", "Georgia", "Times New Roman"].includes(String(s.fontFamily))) throw new Error("A saved document uses an unsupported font.");
  const bounded = (v: unknown, min: number, max: number) => { if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new Error("A saved document has invalid formatting."); return v; };
  return { fontFamily: s.fontFamily as DocumentStyle["fontFamily"], fontSize: bounded(s.fontSize, 8, 24), lineHeight: bounded(s.lineHeight, 1, 3), paragraphSpacing: bounded(s.paragraphSpacing, 0, 40), pageMargin: bounded(s.pageMargin, 20, 100) };
};
const pdf = (value: unknown): string | undefined => {
  if (value == null || value === "") return undefined;
  const raw = text(value, 24_000_000);
  if (!raw.startsWith("JVBERi0") || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw new Error("A PDF in this workspace is invalid.");
  return raw;
};
const matches = (value: unknown): RequirementMatch[] => {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 200) throw new Error("The workspace contains invalid requirement evidence.");
  return value.map(item => {
    const row = object(item);
    if (!["exact", "semantic", "missing"].includes(String(row.classification))) throw new Error("The workspace contains an invalid evidence classification.");
    return { requirement: text(row.requirement, 5000), explanation: text(row.explanation, 10_000), ...(typeof row.resume_evidence === "string" ? { resume_evidence: text(row.resume_evidence, 10_000) } : {}), classification: row.classification as RequirementMatch["classification"] };
  });
};

export function parseWorkspace(raw: string): Workspace {
  if (new TextEncoder().encode(raw).length > MAX_WORKSPACE_BYTES) throw new Error("Choose a workspace smaller than 30 MB.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Choose an ATS Coach AI workspace JSON file."); }
  const data = object(parsed);
  if (data.format !== "ats-coach-workspace" || data.version !== 1) throw new Error("This file is not a supported ATS Coach AI workspace.");
  let analysis: AnalysisResult | null = null;
  if (data.analysis != null) {
    const a = object(data.analysis);
    analysis = { overall_score: score(a.overall_score), keyword_score: score(a.keyword_score), impact_score: score(a.impact_score), readability_score: score(a.readability_score), strengths: texts(a.strengths), matching_skills: texts(a.matching_skills), missing_skills: texts(a.missing_skills), short_description_warning: a.short_description_warning === true, exact_matches: matches(a.exact_matches), semantic_matches: matches(a.semantic_matches), missing_requirements: matches(a.missing_requirements) };
  }
  let tailoring: TailoringResult | null = null;
  if (data.tailoring != null) {
    const t = object(data.tailoring);
    if (t.generation_mode != null && !["source_preserved", "ai_rephrased", "ai_final"].includes(String(t.generation_mode))) throw new Error("The saved document has an invalid generation mode.");
    if (!analysis) throw new Error("The saved document is missing its diagnosis.");
    const changes = t.changes_explanation;
    if (!Array.isArray(changes) || changes.length > 200) throw new Error("The saved document has invalid explanations.");
    tailoring = { tailored_resume_markdown: text(t.tailored_resume_markdown), new_overall_score: score(t.new_overall_score), new_keyword_score: score(t.new_keyword_score ?? analysis.keyword_score), new_impact_score: score(t.new_impact_score ?? analysis.impact_score), new_readability_score: score(t.new_readability_score ?? analysis.readability_score), changes_explanation: changes.map(item => { const c = object(item); return { original_phrase: text(c.original_phrase, 10_000), tailored_phrase: text(c.tailored_phrase, 10_000), rationale: text(c.rationale, 10_000) }; }), general_coaching_tip: text(t.general_coaching_tip, 20_000), ...(t.generation_mode === "source_preserved" ? { generation_mode: "source_preserved" as const } : { generation_mode: "ai_rephrased" as const }), ...(typeof t.generation_notice === "string" ? { generation_notice: text(t.generation_notice, 10_000) } : {}), ...(pdf(t.tailored_pdf_base64) ? { tailored_pdf_base64: pdf(t.tailored_pdf_base64) } : {}) };
    tailoring.generation_mode = t.generation_mode as TailoringResult["generation_mode"];
    tailoring.tailored_resume_style = documentStyle(t.tailored_resume_style);
    // Imported executable LaTeX and arbitrary style objects are never trusted.
    // Plain text is converted through the app's existing escaped template.
  }
  let coverLetter: CoverLetterResult | null = null;
  if (data.coverLetter != null) {
    const c = object(data.coverLetter);
    coverLetter = { letter_markdown: text(c.letter_markdown), recipient_title: text(c.recipient_title, 500), company_name: text(c.company_name, 500), job_title: text(c.job_title, 500), key_alignments: texts(c.key_alignments) };
    coverLetter.document_style = documentStyle(c.document_style);
  }
  const checks = data.checks && typeof data.checks === "object" ? data.checks as Record<string, unknown> : {};
  return { format: "ats-coach-workspace", version: 1, savedAt: text(data.savedAt, 100), name: text(data.name, 120), resumeText: text(data.resumeText), originalText: text(data.originalText), resumePdf: pdf(data.resumePdf) ?? null, resumeFileName: data.resumeFileName == null ? null : text(data.resumeFileName, 300), jobDescription: text(data.jobDescription), analysis, tailoring, coverLetter, screen: tailoring ? 3 : analysis ? 2 : 1, demo: data.demo === true, checks: { facts: checks.facts === true, formatting: checks.formatting === true, downloaded: checks.downloaded === true } };
}

export function downloadTextFile(name: string, value: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function safeFileName(value: string) { return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 70).replace(/^-|-$/g, "") || "ATS-Coach-Application"; }
