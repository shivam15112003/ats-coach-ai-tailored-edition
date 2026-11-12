export interface AnalysisResult {
  overall_score: number;
  keyword_score: number;
  impact_score: number;
  readability_score: number;
  strengths: string[];
  matching_skills: string[];
  missing_skills: string[];
  exact_matches?: RequirementMatch[];
  semantic_matches?: RequirementMatch[];
  missing_requirements?: RequirementMatch[];
  short_description_warning: boolean;
  extracted_resume_text?: string;
}

export interface RequirementMatch {
  requirement: string;
  resume_evidence?: string;
  explanation: string;
  classification: "exact" | "semantic" | "missing";
}

export interface ApplicationAnswerResult {
  status: "grounded" | "needs_info";
  answer: string;
  evidence: string[];
  grounding_label: "Grounded in Resume" | "Additional Information Needed";
}

export type InterviewType = "Behavioral" | "Technical" | "Resume / Project" | "Mixed Mock Interview";

export interface InterviewFeedback {
  worked_well: string[];
  could_improve: string[];
  why: string;
  suggestion: string;
  follow_up_question: string;
}

export interface InterviewAttempt {
  question: string;
  answer: string;
  attempt: number;
  feedback: InterviewFeedback;
}

export interface InterviewSummary {
  communication: number;
  relevance: number;
  behavioral_structure: number;
  technical_explanation: number;
  specificity: number;
  strongest_areas: string[];
  areas_to_improve: string[];
  recommended_next_focus: string;
}

export interface ChangeExplanation {
  original_phrase: string;
  tailored_phrase: string;
  rationale: string;
}

export interface TailoringResult {
  generation_mode?: "ai_rephrased" | "ai_final" | "source_preserved";
  generation_notice?: string;
  resume_structure?: import("./utils/resumeLatex").ResumeSectionData;
  new_overall_score: number;
  new_keyword_score?: number;
  new_impact_score?: number;
  new_readability_score?: number;
  tailored_resume_markdown: string;
  tailored_resume_latex?: string;
  tailored_pdf_base64?: string;
  tailored_resume_style?: DocumentStyle;
  pdf_pages?: number;
  pdf_page_size?: string;
  changes_explanation: ChangeExplanation[];
  general_coaching_tip: string;
}

export interface CoverLetterResult {
  letter_latex?: string;
  compiled_latex?: string;
  letter_pdf_base64?: string;
  recipient_title: string;
  company_name: string;
  job_title: string;
  letter_markdown: string;
  key_alignments: string[];
  document_style?: DocumentStyle;
}

export type ActiveScreen = 1 | 2 | 3;

export interface ResumeItem {
  id: string;
  title: string;
  organization: string;
  date: string;
  location: string;
  bullets: string[];
}

export interface ResumeSkillCategory {
  id: string;
  category: string;
  items: string;
}

export interface ResumeSection {
  id: string;
  title: string;
  type: "items" | "skills" | "text";
  items?: ResumeItem[];
  skillsList?: ResumeSkillCategory[];
  content?: string;
}

export interface ResumeDocument {
  name: string;
  contactLine: string;
  summary?: string;
  sections: ResumeSection[];
  style?: DocumentStyle;
}

export interface DocumentStyle {
  fontFamily: "Arial" | "Georgia" | "Times New Roman";
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  pageMargin: number;
}

export const DEFAULT_DOCUMENT_STYLE: DocumentStyle = {
  fontFamily: "Arial",
  fontSize: 11,
  lineHeight: 1.35,
  paragraphSpacing: 8,
  pageMargin: 44,
};

