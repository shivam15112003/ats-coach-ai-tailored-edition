import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { PrivacyNotice } from "./components/PrivacyNotice";
import { InputSection } from "./components/InputSection";
import { ScoreCard } from "./components/ScoreCard";
import { FindingsGrid } from "./components/FindingsGrid";
import { ScoreComparisonWidget } from "./components/ScoreComparisonWidget";
import { ExplanationList } from "./components/ExplanationList";
import { LoadingState } from "./components/LoadingState";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { GettingStarted } from "./components/GettingStarted";
import { WelcomeHero } from "./components/WelcomeHero";
import { WorkspaceTools } from "./components/WorkspaceTools";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DEMO_ANALYSIS, DEMO_COVER_LETTER, createDemoTailoring } from "./data/demo";
import { SAMPLE_RESUME, SAMPLE_JOB_DESCRIPTION } from "./sampleData";
import { EMPTY_CHECKS, downloadTextFile, safeFileName, type Workspace } from "./utils/workspace";
import { buildLatexFromStructure, parseResumeToStructure } from "./utils/resumeLatex";
import { requestTailoring } from "./utils/requestTailoring";
import { getApiHeaders } from "./utils/apiKey";
import { ActiveScreen, AnalysisResult, TailoringResult, CoverLetterResult, DocumentStyle } from "./types";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Edit3,
  FileText,
  Mail,
  MessageSquareText,
  Mic2,
} from "lucide-react";

const ComparisonView = lazy(() => import("./components/ComparisonView").then(module => ({ default: module.ComparisonView })));
const CoverLetterSection = lazy(() => import("./components/CoverLetterSection").then(module => ({ default: module.CoverLetterSection })));
const ApplicationQuestionAssistant = lazy(() => import("./components/ApplicationQuestionAssistant").then(module => ({ default: module.ApplicationQuestionAssistant })));
const InterviewCoach = lazy(() => import("./components/InterviewCoach").then(module => ({ default: module.InterviewCoach })));

async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {
    throw new Error(fallbackMessage);
  }
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" && data.error.trim() ? data.error : fallbackMessage);
  }
  if (!data || typeof data !== "object") throw new Error(fallbackMessage);
  return data as T;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>(1);
  const [resumeText, setResumeText] = useState("");
  const [uploadedBaselineText, setUploadedBaselineText] = useState("");
  const [resumePdfBase64, setResumePdfBase64] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [tailoring, setTailoring] = useState<TailoringResult | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null);
  const [screen3Tab, setScreen3Tab] = useState<"resume" | "cover_letter" | "application_qa" | "interview">("resume");
  const [isRefreshingGrounding, setIsRefreshingGrounding] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoringRetryNotice,setTailoringRetryNotice]=useState<string | null>(null);
  const tailoringRequest = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [inputsChanged, setInputsChanged] = useState(false);
  const [checks, setChecks] = useState({ ...EMPTY_CHECKS });
  const [pendingWorkspace, setPendingWorkspace] = useState<Workspace | null>(null);
  const [pendingDemo, setPendingDemo] = useState(false);
  const [previousWorkspace, setPreviousWorkspace] = useState<Workspace | null>(null);
  const analysisRequest = useRef<AbortController | null>(null);
  const busy = isAnalyzing || isTailoring;
  useEffect(() => () => { analysisRequest.current?.abort(); tailoringRequest.current?.abort(); }, []);
  useEffect(() => { if (!resumeText && !resumePdfBase64 && !jobDescription) return; const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener("beforeunload", beforeUnload); return () => window.removeEventListener("beforeunload", beforeUnload); }, [Boolean(resumeText || resumePdfBase64 || jobDescription)]);
  const inputChanged = () => { if (analysis && !inputsChanged) setPreviousWorkspace(workspace); setInputsChanged(Boolean(analysis)); setChecks({ ...EMPTY_CHECKS }); setDemoMode(false); };
  const workspace: Workspace = { format: "ats-coach-workspace", version: 1, savedAt: new Date().toISOString(), name: workspaceName, resumeText, originalText: inputsChanged ? resumeText : uploadedBaselineText || resumeText, resumePdf: resumePdfBase64, resumeFileName, jobDescription, analysis: inputsChanged ? null : analysis, tailoring: inputsChanged ? null : tailoring, coverLetter: inputsChanged ? null : coverLetter, screen: currentScreen, demo: demoMode, checks };
  const applyWorkspace = (saved: Workspace) => {
    analysisRequest.current?.abort(); tailoringRequest.current?.abort();
    setResumeText(saved.resumeText); setUploadedBaselineText(saved.originalText); setResumePdfBase64(saved.resumePdf); setResumeFileName(saved.resumeFileName); setJobDescription(saved.jobDescription); setAnalysis(saved.analysis);
    const document = saved.tailoring ? { ...saved.tailoring, tailored_resume_latex: buildLatexFromStructure(parseResumeToStructure(saved.tailoring.tailored_resume_markdown)) } : null;
    setTailoring(document); setCoverLetter(saved.coverLetter); setWorkspaceName(saved.name); setChecks(saved.checks); setDemoMode(saved.demo); setInputsChanged(false); setCurrentScreen(saved.screen); setScreen3Tab("resume"); setError(null); setPendingWorkspace(null); setIsAnalyzing(false); setIsTailoring(false); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openWorkspace = (saved: Workspace) => { if (resumeText || resumePdfBase64 || jobDescription || tailoring) setPendingWorkspace(saved); else applyWorkspace(saved); };
  const loadDemo = () => {
    analysisRequest.current?.abort(); tailoringRequest.current?.abort();
    setResumeText(SAMPLE_RESUME); setUploadedBaselineText(SAMPLE_RESUME); setResumePdfBase64(null); setResumeFileName("Anonymized sample resume"); setJobDescription(SAMPLE_JOB_DESCRIPTION); setAnalysis(DEMO_ANALYSIS); setTailoring(createDemoTailoring()); setCoverLetter(DEMO_COVER_LETTER); setWorkspaceName("Nexus · Software Engineer · Sample"); setDemoMode(true); setInputsChanged(false); setChecks({ ...EMPTY_CHECKS }); setCurrentScreen(2); setScreen3Tab("resume"); setError(null); setPendingDemo(false); setIsAnalyzing(false); setIsTailoring(false); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const requestDemo = () => { if (resumeText || resumePdfBase64 || jobDescription) setPendingDemo(true); else loadDemo(); };

  // Analyze Match Action
  const handleAnalyzeMatch = async () => {
    const controller = new AbortController();
    analysisRequest.current?.abort(); analysisRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 180000);
    setError(null);
    setIsAnalyzing(true);
    setCurrentScreen(1);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const response = await fetch("/api/analyze-match", {
        method: "POST",
        headers: getApiHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          resumeText,
          resumePdfBase64,
          jobDescription,
        }),
      });

      const data = await readApiJson<AnalysisResult>(response, "The AI service is temporarily busy. Please try again in a moment.");
      if (analysisRequest.current !== controller || controller.signal.aborted) return;
      setDemoMode(false);
      setAnalysis(data);
      setInputsChanged(false); setTailoring(null); setCoverLetter(null); setChecks({ ...EMPTY_CHECKS }); setScreen3Tab("resume");

      const resolvedText = data.extracted_resume_text || resumeText;

      // If text was extracted from PDF and resumeText was empty, update resumeText
      if (data.extracted_resume_text && (!resumeText || resumePdfBase64)) {
        setResumeText(data.extracted_resume_text);
      }

      // Preserve baseline original upload
      if (resolvedText) {
        setUploadedBaselineText(resolvedText);
      }

      setCurrentScreen(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Analysis error:", err);
      if (analysisRequest.current === controller) setError(controller.signal.aborted ? "Analysis stopped. Your inputs are preserved; you can try again." : err.message || "An unexpected error occurred during resume analysis.");
    } finally {
      clearTimeout(timeout);
      if (analysisRequest.current === controller) { analysisRequest.current = null; setIsAnalyzing(false); }
    }
  };

  // Generate Tailored Resume Action
  const handleGenerateTailoredResume = async () => {
    if (!analysis) return;
    if (demoMode) { setTailoring(current => current || createDemoTailoring()); setCurrentScreen(3); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setError(null);
    setIsTailoring(true);
    setTailoringRetryNotice(null);
    const controller = new AbortController();
    tailoringRequest.current?.abort();
    tailoringRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(new DOMException("Generation timed out", "TimeoutError")), 600000);

    try {
      const originalText = resumeText || analysis.extracted_resume_text || "";
      const data=await requestTailoring({originalResumeText:originalText,jobDescription,analysisData:analysis,resumePdfBase64},getApiHeaders(),controller.signal,setTailoringRetryNotice);
      if (tailoringRequest.current !== controller || controller.signal.aborted) return;
      setTailoring(data);
      setCurrentScreen(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      if (tailoringRequest.current === controller) {
        setError(controller.signal.aborted
          ? controller.signal.reason?.name === "TimeoutError"
            ? "Generation took too long. Your resume and job description are preserved; please retry."
            : "Generation cancelled. Your inputs are preserved."
          : err.message || "An unexpected error occurred during resume tailoring.");
      }
    } finally {
      clearTimeout(timeout);
      if (tailoringRequest.current === controller) {
        tailoringRequest.current = null;
        setIsTailoring(false);
      }
    }
  };

  const refreshAnalysisFromLatestResume = async (latestText: string) => {
    setIsRefreshingGrounding(true);
    try {
      const response = await fetch("/api/analyze-match", { method: "POST", headers: getApiHeaders(), body: JSON.stringify({ resumeText: latestText, resumePdfBase64: null, jobDescription }) });
      const data = await readApiJson<AnalysisResult>(response, "Could not refresh grounded matching.");
      setAnalysis(data);
    } catch (refreshError) { console.warn("Latest-resume grounding refresh failed:", refreshError); }
    finally { setIsRefreshingGrounding(false); }
  };

  const handleTailoredResumeChange = (newText: string, newLatex?: string, newPdf?: string, newStyle?: DocumentStyle) => {
    if (tailoring) {
      const textChanged = newText !== tailoring.tailored_resume_markdown;
      setTailoring({
        ...tailoring,
        tailored_resume_markdown: newText,
        ...(newLatex !== undefined ? { tailored_resume_latex: newLatex } : {}),
        ...(newPdf !== undefined ? { tailored_pdf_base64: newPdf } : {}),
        ...(newStyle !== undefined ? { tailored_resume_style: newStyle } : {}),
      });
      if (textChanged && !demoMode) void refreshAnalysisFromLatestResume(newText);
      if (textChanged) setChecks({ ...EMPTY_CHECKS });
    }
  };

  const [showResetSessionModal, setShowResetSessionModal] = useState(false);

  // Request or confirm reset of entire session
  const handleRequestResetSession = () => {
    if (analysis || tailoring || resumeText || resumePdfBase64) {
      setShowResetSessionModal(true);
    } else {
      executeResetSession();
    }
  };

  const executeResetSession = () => {
    analysisRequest.current?.abort(); tailoringRequest.current?.abort();
    setCurrentScreen(1);
    setResumeText("");
    setUploadedBaselineText("");
    setResumePdfBase64(null);
    setResumeFileName(null);
    setJobDescription("");
    setAnalysis(null);
    setTailoring(null);
    setCoverLetter(null);
    setScreen3Tab("resume");
    setError(null);
    setShowResetSessionModal(false);
    setWorkspaceName(""); setDemoMode(false); setInputsChanged(false); setChecks({ ...EMPTY_CHECKS }); setIsAnalyzing(false); setIsTailoring(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell min-h-screen flex flex-col bg-[#FAF6EE] text-[#22302E]">
      <a className="skip-link" href="#main-content">Skip to application workspace</a>
      {/* Permanent Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          if (busy) return;
          setError(null);
          setCurrentScreen(screen);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        canNavigateToScreen2={Boolean(analysis) && !inputsChanged && !busy}
        canNavigateToScreen3={Boolean(tailoring) && !inputsChanged && !busy}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

        <GettingStarted hideLauncher />
      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentScreen === 1 && !busy && <WelcomeHero onDemo={requestDemo} hasInputs={Boolean(resumeText || resumePdfBase64 || jobDescription)} />}
        <WorkspaceTools workspace={workspace} busy={busy} onNameChange={setWorkspaceName} onImport={openWorkspace} onChecksChange={setChecks} onLive={() => void handleAnalyzeMatch()} />
        {/* ================= SCREEN 1: INPUT & SETUP ================= */}
        {currentScreen === 1 && !isAnalyzing && (
          <div id="application-inputs" className="space-y-6 scroll-mt-32">
            {inputsChanged && <div role="status" className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900"><p>Your inputs changed. Run Analyze Match again to update the diagnosis and documents for these materials.</p>{previousWorkspace && <button type="button" className="mt-3 underline font-semibold" onClick={() => downloadTextFile(`${safeFileName(previousWorkspace.name)}-previous.ats-workspace.json`, JSON.stringify(previousWorkspace, null, 2), "application/json")}>Save the previous workspace before replacing its results</button>}</div>}
            {/* Privacy notice banner above input fields */}
            <PrivacyNotice />

            {/* Input form */}
            <InputSection
              resumeText={resumeText}
              setResumeText={text => { setResumeText(text); inputChanged(); }}
              resumePdfBase64={resumePdfBase64}
              setResumePdfBase64={pdf => { setResumePdfBase64(pdf); inputChanged(); }}
              resumeFileName={resumeFileName}
              setResumeFileName={setResumeFileName}
              jobDescription={jobDescription}
              setJobDescription={text => { setJobDescription(text); inputChanged(); }}
              onAnalyze={handleAnalyzeMatch}
              isAnalyzing={isAnalyzing}
              error={error}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            />
          </div>
        )}

        {/* Loading Screen 1 -> Screen 2 */}
        {isAnalyzing && (
          <div className="py-12">
            <LoadingState stage="analyzing" onCancel={() => analysisRequest.current?.abort()} />
          </div>
        )}

        {/* ================= SCREEN 2: INITIAL MATCH ANALYSIS ================= */}
        {currentScreen === 2 && !isTailoring && analysis && (
          <div className="space-y-6">
            {/* Navigation back and title */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#22302E]">
                  Simulated Match Diagnosis
                </h2>
                <p className="text-xs sm:text-sm text-[#22302E]/70">
                  Step 2 of 3: Review baseline scoring, skill gaps, and keyword alignment.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentScreen(1)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Inputs
                </button>

                <button
                  type="button"
                  onClick={handleGenerateTailoredResume}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {demoMode ? "Open sample workspace" : "Generate Tailored Resume"}
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </div>

            {/* Error display if tailoring failed */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Generation Notice</p>
                  <p className="text-rose-700 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Educational Match Score Card */}
            <ScoreCard
              overallScore={analysis.overall_score}
              keywordScore={analysis.keyword_score}
              impactScore={analysis.impact_score}
              readabilityScore={analysis.readability_score}
            />

            {/* Findings Grid */}
            <FindingsGrid
              strengths={analysis.strengths || []}
              matchingSkills={analysis.matching_skills || []}
              missingSkills={analysis.missing_skills || []}
              shortDescriptionWarning={Boolean(analysis.short_description_warning)}
              exactMatches={analysis.exact_matches || []}
              semanticMatches={analysis.semantic_matches || []}
              missingRequirements={analysis.missing_requirements || []}
            />

            {/* Bottom Actions for Screen 2 */}
            <div className="bg-white/80 border border-[#E7DEC8] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="text-xs text-[#22302E]/75">
                <span className="font-semibold text-[#22302E]">Next Step:</span> Tailor your bullet points using active phrasing and natural keyword alignment while strictly preserving factual truth.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentScreen(1)}
                  className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
                >
                  Edit Inputs
                </button>
                <button
                  type="button"
                  onClick={handleGenerateTailoredResume}
                  className="w-1/2 sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {demoMode ? "Open sample workspace" : "Generate Tailored Resume"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Screen 2 -> Screen 3 */}
        {isTailoring && (
          <div className="py-12">
            <LoadingState stage="tailoring" retryNotice={tailoringRetryNotice} onCancel={() => tailoringRequest.current?.abort(new DOMException("Generation cancelled", "AbortError"))} />
          </div>
        )}

        {/* ================= SCREEN 3: TAILORED RESUME & EDUCATIONAL BREAKDOWN ================= */}
        {currentScreen === 3 && tailoring && analysis && (
          <div className="space-y-6">
            {/* Header controls for Screen 3 */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#22302E]">
                  Your application workspace
                </h2>
                <p className="text-xs sm:text-sm text-[#22302E]/70">
                  Review your documents, prepare application answers, and practice your interview.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentScreen(2)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Diagnosis
                </button>
                <button
                  type="button"
                  onClick={handleRequestResetSession}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#E2725B]/10 hover:bg-[#E2725B]/20 text-[#E2725B] border border-[#E2725B]/30 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Start New Session
                </button>
              </div>
            </div>

            {/* Score Comparison Widget with Sub-score Progression */}
            <details className="score-details"><summary>View educational score comparison</summary><ScoreComparisonWidget
              sourcePreserved={tailoring.generation_mode === "source_preserved"}
              meaningChecked={tailoring.generation_mode === "ai_rephrased"}
              originalScore={analysis.overall_score}
              tailoredScore={tailoring.new_overall_score}
              originalKeyword={analysis.keyword_score}
              tailoredKeyword={tailoring.new_keyword_score}
              originalImpact={analysis.impact_score}
              tailoredImpact={tailoring.new_impact_score}
              originalReadability={analysis.readability_score}
              tailoredReadability={tailoring.new_readability_score}
            /></details>

            {/* Document Navigation Tabs: Tailored Resume vs Matching Cover Letter */}
            <div role="group" aria-label="Application workspace sections" className="workspace-sections flex flex-wrap items-center gap-2 border-b border-[#E7DEC8] pb-1">
              <button
                type="button"
                onClick={() => setScreen3Tab("resume")}
                aria-pressed={screen3Tab === "resume"}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  screen3Tab === "resume"
                    ? "bg-white text-[#1E6A63] border-t-2 border-x border-[#E7DEC8] border-t-[#1E6A63] shadow-2xs"
                    : "text-[#22302E]/70 hover:text-[#22302E] hover:bg-white/50"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Resume</span>
              </button>

              <button
                type="button"
                onClick={() => setScreen3Tab("cover_letter")}
                aria-pressed={screen3Tab === "cover_letter"}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  screen3Tab === "cover_letter"
                    ? "bg-white text-[#1E6A63] border-t-2 border-x border-[#E7DEC8] border-t-[#1E6A63] shadow-2xs"
                    : "text-[#22302E]/70 hover:text-[#22302E] hover:bg-white/50"
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Cover letter</span>
                {coverLetter && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>

              <button type="button" onClick={() => setScreen3Tab("application_qa")} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${screen3Tab === "application_qa" ? "bg-white text-[#1E6A63] border-t-2 border-x border-[#E7DEC8] border-t-[#1E6A63] shadow-2xs" : "text-[#22302E]/70 hover:text-[#22302E] hover:bg-white/50"}`}><MessageSquareText className="w-4 h-4" /><span>Application Q&amp;A</span></button>
              <button type="button" onClick={() => setScreen3Tab("interview")} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${screen3Tab === "interview" ? "bg-white text-[#1E6A63] border-t-2 border-x border-[#E7DEC8] border-t-[#1E6A63] shadow-2xs" : "text-[#22302E]/70 hover:text-[#22302E] hover:bg-white/50"}`}><Mic2 className="w-4 h-4" /><span>Interview Coach</span></button>
            </div>

            {isRefreshingGrounding && <div role="status" className="text-xs text-[#1E6A63] font-semibold">Refreshing semantic grounding from the latest saved resume…</div>}

            {tailoring.generation_notice && <div role="alert" className={`p-4 rounded-xl border text-sm ${tailoring.generation_mode === "source_preserved" ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-900"}`}>{tailoring.generation_notice}</div>}
            {/* Tab 1: Side-by-Side Comparison Workspace (Editable + PDF Export) */}
            <Suspense fallback={<p role="status" className="p-5 rounded-xl bg-white border border-[#E7DEC8] text-sm text-[#1E6A63]">Loading your document workspace…</p>}>
            <div hidden={screen3Tab !== "resume"}>
              <ComparisonView
                originalResumeText={resumeText || analysis.extracted_resume_text || ""}
                originalPdfBase64={resumePdfBase64}
                uploadedBaselineOriginalText={uploadedBaselineText || resumeText || analysis.extracted_resume_text || ""}
                generationMode={tailoring.generation_mode}
                tailoredResumeMarkdown={tailoring.tailored_resume_markdown}
                tailoredResumeLatex={tailoring.tailored_resume_latex}
                tailoredPdfBase64={tailoring.tailored_pdf_base64}
                tailoredResumeStyle={tailoring.tailored_resume_style}
                onTailoredResumeChange={handleTailoredResumeChange}
              />
            </div>

            {/* Tab 2: Matching Cover Letter Section (Editable + PDF Export) */}
            <div hidden={screen3Tab !== "cover_letter"}>
              <CoverLetterSection
                originalResumeText={resumeText || analysis.extracted_resume_text || ""}
                jobDescription={jobDescription}
                analysis={analysis}
                coverLetter={coverLetter}
                onCoverLetterGenerated={(result) => setCoverLetter(result)}
                onCoverLetterUpdated={(updated) => {
                  if (coverLetter) {
                    setCoverLetter({ ...coverLetter, letter_markdown: updated, letter_latex: undefined, compiled_latex: undefined, letter_pdf_base64: undefined });
                  }
                }}
              />
            </div>

            <div hidden={screen3Tab !== "application_qa"}><ApplicationQuestionAssistant active={screen3Tab === "application_qa"} demoMode={demoMode} latestResumeText={tailoring.tailored_resume_markdown} coverLetterText={coverLetter?.letter_markdown} jobDescription={jobDescription} /></div>
            <div hidden={screen3Tab !== "interview"}><InterviewCoach active={screen3Tab === "interview"} demoMode={demoMode} latestResumeText={tailoring.tailored_resume_markdown} coverLetterText={coverLetter?.letter_markdown} jobDescription={jobDescription} semanticMatches={analysis.semantic_matches || []} /></div>
            </Suspense>

            {/* What Changed and Why Section (Educational Insight Breakdown) */}
            {tailoring.generation_mode !== "source_preserved" && <ExplanationList
              explanations={tailoring.changes_explanation || []}
              generalCoachingTip={tailoring.general_coaching_tip || ""}
            />}

            {/* Bottom Actions for Screen 3 */}
            <div className="bg-white/80 border border-[#E7DEC8] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#22302E]">
                  Keep the work you want to share
                </p>
                <p className="text-xs text-[#22302E]/70">
                  Review the facts and final PDFs, then download your approved files and save the workspace.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentScreen(2)}
                  className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
                >
                  Review Match Scores
                </button>
                <button
                  type="button"
                  onClick={handleRequestResetSession}
                  className="w-1/2 sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-xs transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Start New Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {(pendingDemo || pendingWorkspace) && <ConfirmDialog title={pendingDemo ? "Explore the sample workspace?" : "Open this saved workspace?"} onClose={() => { setPendingDemo(false); setPendingWorkspace(null); }}><p className="mt-4 text-sm leading-relaxed text-[#52615D]">This replaces the materials in your current tab. Download your current workspace first if you want to keep it.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" className="workspace-action" onClick={() => downloadTextFile(`${safeFileName(workspace.name)}.ats-workspace.json`, JSON.stringify(workspace, null, 2), "application/json")}>Save current workspace</button><button type="button" className="workspace-action" onClick={() => { setPendingDemo(false); setPendingWorkspace(null); }}>Cancel</button><button type="button" className="workspace-action workspace-save" onClick={() => pendingDemo ? loadDemo() : pendingWorkspace && applyWorkspace(pendingWorkspace)}>Replace current workspace</button></div></ConfirmDialog>}

      {/* Confirmation Modal for Reset Session */}
      {showResetSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E7DEC8] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#22302E]">
                  Start a New Session?
                </h3>
                <p className="text-xs text-[#22302E]/70 leading-relaxed">
                  This will clear your current resume, target job description, ATS match scores, tailored resume, and cover letter so you can start fresh. Are you sure?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E7DEC8]">
              <button
                type="button"
                onClick={() => setShowResetSessionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
              >
                Keep Current Session
              </button>
              <button
                type="button"
                onClick={executeResetSession}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-xs transition-colors cursor-pointer"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional Gemini API Key Configuration Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      {/* Permanent Footer */}
      <Footer />
    </div>
  );
}
