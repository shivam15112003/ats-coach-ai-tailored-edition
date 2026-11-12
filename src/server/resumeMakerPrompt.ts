/** Adapted from resume_and_cover_maker.py:8408-8779.
 * Retains the structured resume schema and presentation goals. Removes fixed
 * applicant overrides, inferred coursework/skills, forced metrics/leadership,
 * fixed employers/experience counts, and promises of commercial ATS scores.
 */
import {Type} from "@google/genai";
const str={type:Type.STRING};
const strings={type:Type.ARRAY,items:str};
const object=(properties:Record<string,any>)=>({type:Type.OBJECT,properties,required:Object.keys(properties)});
const array=(properties:Record<string,any>)=>({type:Type.ARRAY,items:object(properties)});
export const RESUME_MAKER_SCHEMA=object({
 header:object({name:str,phone:str,email:str,github_url:str,linkedin_url:str,portfolio_url:str}),
 summary:str,
 education:array({degree:str,institution:str,location:str,date:str,gpa:str,coursework:str}),
 skills:strings,
 projects:array({title:str,timeframe:str,tools:str,bullets:strings}),
 experience:array({title:str,company:str,location:str,date:str,bullets:strings}),
 certifications:strings,extracurriculars:strings,
 other_sections:array({title:str,items:strings}),
});
export const RESUME_MAKER_PROMPT=`You are generating a tailored resume for a specific job, using the uploaded candidate resume as the only source of candidate facts.
Your primary goals:
- Improve relevance, clarity, and readability for both ATS parsing and human readers.
- Keep everything truthful and consistent with the original resume.
- Return the same structured resume object used by the resume maker, never a formatted prose document.

ATS PARSING AND MATCHING:
- Use job-description terminology only when it truthfully describes the original candidate's demonstrated background.
- Prefer important requirements over company marketing language. Never add a missing qualification to satisfy the job.
- Put supported terms naturally in summary, skills, experience, projects, certifications, and coursework. No hidden repetition or keyword stuffing.
- Acronym expansions and synonymous wording are allowed only when they preserve exact technical meaning.
- Use plain text in JSON fields: no Markdown, HTML, tables, LaTeX, or decorative formatting. The original resume maker's LaTeX formatters supply the layout.

SOURCE-ONLY FACTUAL RULES OVERRIDE EVERY STYLE OR LENGTH TARGET:
- Preserve actual names, contact details, institutions, degrees, GPAs, courses, employers, roles, dates, project identities, tools, certifications, and achievements.
- Never invent numbers, metrics, percentages, years of experience, credentials, leadership, responsibilities, outcomes, soft skills, awards, courses, or projects.
- Different wording is allowed when facts, meaning, units, direction, scope, and responsibility remain equivalent. 'Increased to 82%' must not become 'increased by 82%' or '92%'. Training a model must not become training people.
- A job description is not evidence of candidate experience. Plausibility is not evidence. Skills elsewhere in the resume are not proof of their use in a specific project or role.
- If a field is absent, use an empty string or empty array. Never use placeholders. Do not inject personal details from examples, prior applicants, or defaults.

STRUCTURED RESUME CONTENT:
- HEADER: copy the uploaded candidate's name, phone, email, and profile URLs only. No fixed applicant email or profile overrides.
- EDUCATION: preserve EVERY real education entry. Copy dates, GPA, and coursework exactly when present; never infer courses or apply a fixed institution/GPA rule.
- SUMMARY: write two concise source-grounded sentences, normally 28-38 words, fitting 2-3 PDF lines. Synthesize actual background even if the original has no summary. Do not invent expertise, credentials, graduation status, or metrics.
- SKILLS: include only demonstrated skills; prioritize relevant ones. A 'Category: item, item' string may retain original categories. Do not force Communication, Leadership, or domain-specific categories for all candidates.
- EXPERIENCE: preserve actual job titles, employers, locations, dates, and meaning. Keep every substantive source role; do not force a fixed number of jobs. Prefer 3-4 concise points when source facts support them.
- PROJECTS: select 3 projects with 4 points each OR 4 projects with 3 points each when the source provides enough real projects and distinct contributions. Otherwise use only available evidence; never create a project or duplicate facts to reach a quota. Preserve project names. Return timeframe as supplied, or empty when absent. Do not invent a repository link.
- BULLETS: prefer concise single statements, around 14-20 words when possible. Use specific verbs that preserve responsibility. Keep every supplied metric and its meaning; a valid technical contribution needs no invented number. Never truncate a result merely to make one line.
- CERTIFICATIONS: include only earned certifications explicitly listed. Recommendations are not earned credentials.
- OTHER SECTIONS: preserve relevant source publications, licenses, volunteering, languages, or other content with their original headings; this must work for any profession, not just software or robotics.
- Prefer one readable page without deleting required facts or shrinking below readable sizes. Truth and completeness take priority over a page or bullet quota.

FINAL CHECK: compare each field and bullet against the original; check every number, date, percentage, responsibility, and entity. Wording may improve; factual meaning must stay unchanged. Return only the schema-conforming JSON object.`;
