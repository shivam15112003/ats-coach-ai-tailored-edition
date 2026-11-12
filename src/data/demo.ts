import type { AnalysisResult, ApplicationAnswerResult, CoverLetterResult, InterviewFeedback, InterviewType, TailoringResult } from "../types";
import { SAMPLE_RESUME } from "../sampleData";
import { parseTextToResumeDocument } from "../utils/resumeDocumentParser";
import { generateResumePdfDataUri } from "../utils/pdfExport";
import { buildLatexFromStructure, parseResumeToStructure } from "../utils/resumeLatex";

// A labelled example for demonstrations, never presented as a live AI response.
// The input and evidence come from the app's existing anonymized sample.
export const DEMO_ANALYSIS: AnalysisResult = {
  overall_score: 90, keyword_score: 95, impact_score: 80, readability_score: 90,
  strengths: ["Experience with the listed React, Node.js, Express, and PostgreSQL stack.", "Computer science coursework and full-stack projects.", "Peer tutoring and university web support experience."],
  matching_skills: ["JavaScript", "TypeScript", "React", "Node.js", "Express", "PostgreSQL", "Git", "GitHub", "Jest"],
  missing_skills: ["Agile methodology", "CI/CD pipelines", "AWS/GCP deployment"], short_description_warning: false,
  exact_matches: [{ requirement: "React, Node.js, and Express", resume_evidence: "Frameworks & Libraries: React, Node.js, Express, Tailwind CSS, Jest", explanation: "These tools are explicitly listed in the sample resume.", classification: "exact" }, { requirement: "PostgreSQL", resume_evidence: "Used PostgreSQL to store listing information and user details", explanation: "The project includes direct PostgreSQL evidence.", classification: "exact" }, { requirement: "JavaScript and TypeScript", resume_evidence: "Languages: Python, JavaScript, TypeScript, Java, C++, SQL, HTML5, CSS3", explanation: "Both languages are explicitly listed.", classification: "exact" }],
  semantic_matches: [{ requirement: "REST API design", resume_evidence: "Built the backend server with Express to handle user signups, listings, and messages", explanation: "Backend experience is related evidence; the original text does not explicitly state REST API design.", classification: "semantic" }],
  missing_requirements: ["Agile sprint environment", "CI/CD deployment pipelines", "AWS/GCP deployment"].map(requirement => ({ requirement, explanation: "This requirement is not explicitly supported by the sample resume.", classification: "missing" as const })),
};
export function createDemoTailoring(): TailoringResult {
  const latex = buildLatexFromStructure(parseResumeToStructure(SAMPLE_RESUME));
  return { generation_mode: "source_preserved", tailored_resume_markdown: SAMPLE_RESUME, tailored_resume_latex: latex, tailored_pdf_base64: generateResumePdfDataUri(parseTextToResumeDocument(SAMPLE_RESUME)).split(",")[1], new_overall_score: 90, new_keyword_score: 95, new_impact_score: 80, new_readability_score: 90, changes_explanation: [], general_coaching_tip: "This interactive example keeps the sample resume's original wording. Review evidence and edit deliberately." };
}
export const DEMO_COVER_LETTER: CoverLetterResult = {
  recipient_title: "Hiring Manager", company_name: "Nexus Tech Innovations", job_title: "Junior Software Engineer (Full Stack)", key_alignments: ["React, Node.js, Express, and PostgreSQL", "University web support", "Python and Java peer tutoring"],
  letter_markdown: "Alex Morgan\nTempe, AZ | [Contact Redacted - Privacy Safe]\n\nHiring Manager\nNexus Tech Innovations\n\nDear Hiring Manager,\n\nI am applying for the Junior Software Engineer (Full Stack) role. My computer science studies and university projects include React, Node.js, Express, and PostgreSQL.\n\nFor the Campus Resource Exchange Platform, I worked on a web application for university students to exchange textbooks and course supplies. I built the backend server with Express to handle user signups, listings, and messages, and used PostgreSQL to store listing information and user details.\n\nAs an Undergraduate Peer Computing Tutor, I assisted lower-division computer science students with debugging Python and Java programming assignments. My university web support work also included updating departmental web pages and fixing responsive layout bugs.\n\nThank you for considering my application.\n\nSincerely,\nAlex Morgan",
};

export function demoApplicationAnswer(question: string, resumeText = SAMPLE_RESUME): ApplicationAnswerResult {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  const grounded = (answer: string, evidence: string[]): ApplicationAnswerResult => evidence.every(quote => normalize(resumeText).includes(normalize(quote)))
    ? { status: "grounded", grounding_label: "Grounded in Resume", answer, evidence }
    : { status: "needs_info", grounding_label: "Additional Information Needed", answer: "The prepared example no longer matches your edited materials. Run live analysis to prepare an answer grounded in the updated resume.", evidence: [] };
  if (/python/i.test(question)) return grounded("I assisted 40+ lower-division computer science students weekly with debugging Python and Java programming assignments. I also developed a tool that pairs students based on schedule availability and course sections, using Python, Flask, and SQLite.", ["Assisted 40+ lower-division computer science students weekly with debugging Python and Java programming assignments", "Automated Study Group Matcher | Python, Flask, SQLite", "Developed a tool that pairs students based on schedule availability and course sections"]);
  if (/relevant project|campus|project experience/i.test(question)) return grounded("I worked on a web application for university students to exchange textbooks and course supplies. I built the backend server with Express to handle user signups, listings, and messages, and used PostgreSQL to store listing information and user details.", ["Worked on a web application for university students to exchange textbooks and course supplies", "Built the backend server with Express to handle user signups, listings, and messages", "Used PostgreSQL to store listing information and user details"]);
  return { status: "needs_info", grounding_label: "Additional Information Needed", answer: "This interactive example includes prepared answers for the Python and relevant-project questions. Choose one of those examples, or run live analysis to use AI with your own materials and question. No unsupported experience is supplied by this demo.", evidence: [] };
}
export const DEMO_INTERVIEW_QUESTIONS: Record<InterviewType, string> = {
  "Behavioral": "Tell me about a time you helped someone understand a difficult technical concept in your peer computing tutor role.",
  "Technical": "In your Campus Resource Exchange Platform, how did the Express backend and PostgreSQL database work together?",
  "Resume / Project": "Walk me through your Automated Study Group Matcher project and explain your own contribution.",
  "Mixed Mock Interview": "Walk me through the Campus Resource Exchange Platform. What did you build, and how did you test it?",
};
export const DEMO_INTERVIEW_FEEDBACK: InterviewFeedback = {
  worked_well: ["In live practice, feedback would identify strengths in your submitted answer.", "Use the sample resume's project details to make your contribution specific."],
  could_improve: ["Explain your own action, then describe a result you can support.", "Avoid adding metrics or technologies that are not in your materials."],
  why: "This is prepared example feedback for exploring the interface. It is not an evaluation of the answer you typed or recorded.",
  suggestion: "For this sample, discuss the Express backend, the PostgreSQL data, or the API testing with Postman. Describe only work supported by the resume.",
  follow_up_question: "The sample resume mentions testing API routes with Postman. What did that testing involve?",
};
