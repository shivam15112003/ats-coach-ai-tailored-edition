import { parseResumeToStructure } from "../utils/resumeLatex";

export const RESUME_CONTENT_RULES = [
  "ONE-PAGE CONTENT AND PROJECT REQUIREMENTS:",
  "SUMMARY LENGTH: Write a compact summary of 28-38 words, usually two short sentences, to occupy 2-3 rendered PDF lines. Prioritize the most relevant demonstrated facts. Do not pad with generic traits or invent facts to reach the length.",
  "HEADER: Keep the original candidate name and supplied contact details at the top. Never remove, rename, or replace them. Do not invent contact details absent from the original.",
  "OMIT MISSING DETAILS: If a name, contact, date, location, GPA, coursework, skill, certification, project, or outcome is absent from the original, leave it absent. No placeholders, fabricated metrics, inferred credentials, or new sections with invented content. A SUMMARY may be newly written from clearly supported resume facts, even when the original has no summary section. A technology appearing in Skills is not proof it was used in a specific project or job. Omit empty fields, keeping pipe positions empty where needed. These factual rules take priority over word, project, and bullet targets.",
  "Use the full printable page with substantive, source-backed content. Target approximately 500-600 words when the source supports it; avoid a short half-page resume and avoid filler or repeated claims.",
  "Include exactly 3 relevant projects with 4 distinct bullets EACH, or exactly 4 relevant projects with 3 distinct bullets EACH (12 project bullets total). Prefer 3 x 4 for depth; use 4 x 3 when four source-backed projects are relevant.",
  "MEANING-PRESERVING TAILORING: Rephrase any section for clarity and relevance when the meaning and every factual detail remain equivalent to the original. Words, grammar, format, and bullet structure may change. Numbers, percentages, dates, units, degree and role facts, employers, project identity, tool associations, responsibility, scope, and results must remain unchanged. Never invent facts or elevate ownership. A summary can synthesize supported evidence. If the source lacks enough projects or distinct facts, preserve available evidence rather than fabricating content.",
  "Project bullets should usually be 14-20 words, focused on the actual contribution, methods, and supported results. Keep 3-4 concise bullets per substantial experience role. Preserve education, dates, GPA, and relevant skills.",
  "PARSER FORMAT: use plain section headings SUMMARY, EDUCATION, EXPERIENCE, TECHNICAL SKILLS, ACADEMIC PROJECTS. Do not wrap names, titles, or fields in markdown bold or italics.",
  "Each education header must be School | Degree | Dates | Location. Add separate GPA: and Relevant Coursework: lines only if those details appear in the original. Each experience header must be Role | Company | Dates | Location. Each project header must be Project name | Technologies | Dates (dates may be empty). Use a separate '- ' line for EACH bullet. Never combine two projects in a single header or a single bullet. Preserve original project names exactly.",
].join("\n");

export function projectLayoutIssue(original: string, tailored: string): string | null {
  const sourceProjects = parseResumeToStructure(original).projects;
  const projects = parseResumeToStructure(tailored).projects;
  const normalized = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const originalFacts = normalized(original);
  if (projects.some(p => p.name && !originalFacts.includes(normalized(p.name))))
    return "A project name is absent from the original resume. Keep original project names and omit unsupported projects.";
  if (new Set(projects.map(p => normalized(p.name))).size !== projects.length)
    return "Do not duplicate or rename the same source project to satisfy the project count.";
  if (projects.some(p => new Set(p.bullets.map(normalized)).size !== p.bullets.length))
    return "Each project bullet must describe a distinct supported fact; do not repeat bullets to fill space.";
  const valid = (projects.length === 3 && projects.every(p => p.bullets.length === 4)) ||
    (projects.length === 4 && projects.every(p => p.bullets.length === 3));
  if (valid) return null;
  // Never require invented projects or duplicated claims when source evidence is insufficient.
  const sourceSupportsLayout = (sourceProjects.length >= 3 && sourceProjects.filter(p => p.bullets.length >= 4).length >= 3) ||
    (sourceProjects.length >= 4 && sourceProjects.filter(p => p.bullets.length >= 3).length >= 4);
  return sourceSupportsLayout
    ? "Use 3 projects with 4 distinct source-backed bullets each, or 4 projects with 3 each. The original resume provides enough project evidence; do not omit it."
    : null;
}


/** Reject factual text that cannot be found in the submitted resume. */
export function sourceOnlyIssue(original: string, tailored: string): string | null {
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}+#@]/gu, "");
  const source = normalize(original);
  const data = parseResumeToStructure(tailored);
  const originalData = parseResumeToStructure(original);
  const fields: Array<[string, string]> = [
    ["name", data.name],
    ...data.contacts.map(c => ["contact", c.text] as [string, string]),
    ...data.education.flatMap(e => [e.school,e.degree,e.dates,e.location,e.gpa || "",e.coursework || ""].map(v => ["education",v] as [string,string])),
    ...data.experience.flatMap(e => [e.role,e.company,e.dates,e.location,...e.bullets].map(v => ["experience",v] as [string,string])),
    ...data.projects.flatMap(p => [p.name,...p.bullets].map(v => ["project",v] as [string,string])),
    ...data.skills.flatMap(s => s.items.split(/[,;]+/).map(v => ["skill",v] as [string,string])),
    ...data.projects.flatMap(p => p.techStack.split(/[,;]+/).map(v => ["project technology",v] as [string,string])),
    ...data.certifications.map(v => ["certification",v] as [string,string]),
    ...data.extracurricular.map(v => ["activity",v] as [string,string]),
  ];
  for (const [label, value] of fields) {
    if (value.trim() && !source.includes(normalize(value))) return `Unsupported ${label}: copy exact wording from the original resume or omit the missing detail.`;
  }
  for (const p of data.projects) {
    const match = originalData.projects.find(o => normalize(o.name) === normalize(p.name));
    if (match && p.bullets.some(b => !normalize(match.bullets.join(" ")).includes(normalize(b))))
      return "A project bullet was moved from a different context. Keep each bullet with its original project.";
    if (match && p.techStack.split(/[,;]+/).some(tool => tool.trim() && !normalize(match.techStack + " " + match.bullets.join(" ")).includes(normalize(tool))))
      return "A technology is not supported for this project. Do not infer tool usage from the general skills section.";
  }
  for (const e of data.experience) {
    const match = originalData.experience.find(o => (!e.role || normalize(o.role) === normalize(e.role)) && (!e.company || normalize(o.company) === normalize(e.company)));
    if (originalData.experience.length && !match)
      return "A role and employer were combined without source support. Preserve the original role and employer pairing.";
    if (match && [e.dates, e.location].some(value => value && !normalize([match.dates,match.location].join(" ")).includes(normalize(value))))
      return "A date or location is absent from this role. Omit the missing detail instead of borrowing it from another entry.";
    if (match && e.bullets.some(b => !normalize(match.bullets.join(" ")).includes(normalize(b))))
      return "An experience bullet was moved from a different role. Keep each bullet with its original employer and role.";
  }
  return null;
}


export function summaryNeedsReview(original: string, summary: string): boolean {
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  return Boolean(summary.trim()) && !normalize(original).includes(normalize(summary));
}

/** Validate the summary audit and its quoted evidence; semantic support is audited separately. */
export function summaryEvidenceIssue(original: string, summary: string, audit: unknown): string | null {
  if (!summaryNeedsReview(original, summary)) return null;
  if (!audit || typeof audit !== "object" || Array.isArray(audit)) return "The generated summary has no valid source evidence audit.";
  const result = audit as { supported?: unknown; unsupported_claims?: unknown; evidence_quotes?: unknown };
  if (result.supported !== true || !Array.isArray(result.unsupported_claims) || result.unsupported_claims.length)
    return "The generated summary contains unsupported claims. Rewrite it using only facts demonstrated in the original resume.";
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  const source = normalize(original);
  if (!Array.isArray(result.evidence_quotes) || !result.evidence_quotes.length ||
      result.evidence_quotes.some(quote => typeof quote !== "string" || !quote.trim() || !source.includes(normalize(quote))))
    return "The summary evidence is missing or does not quote the original resume. Do not invent references.";
  return null;
}
