import React, { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  Edit3,
  RotateCcw,
  Printer,
  CheckCircle2,
  RefreshCw,
  Send,
  Building,
  Briefcase,
  AlertCircle,
  X,
} from "lucide-react";
import { CoverLetterResult, AnalysisResult, DocumentStyle, DEFAULT_DOCUMENT_STYLE } from "../types";
import { CoverLetterLatexEditor, type CoverLetterPdfHandle } from "./CoverLetterLatexEditor";
import { getApiHeaders } from "../utils/apiKey";

export function formatCurrentRuntimeDate(): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

export function ensureDynamicDateInMarkdown(markdown: string): string {
  const currentDate = formatCurrentRuntimeDate();
  // Dynamically replace any hardcoded date or past date like "October 26, 2023" with the current runtime date
  return markdown.replace(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,
    currentDate
  );
}

interface CoverLetterSectionProps {
  originalResumeText: string;
  jobDescription: string;
  analysis: AnalysisResult | null;
  coverLetter: CoverLetterResult | null;
  onCoverLetterGenerated: (result: CoverLetterResult) => void;
  onCoverLetterUpdated: (updatedMarkdown: string) => void;
}

export function CoverLetterSection({
  originalResumeText,
  jobDescription,
  analysis,
  coverLetter,
  onCoverLetterGenerated,
  onCoverLetterUpdated,
}: CoverLetterSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const pdfEditor = useRef<CoverLetterPdfHandle>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedLetter, setSavedLetter] = useState(
    coverLetter?.letter_markdown ? ensureDynamicDateInMarkdown(coverLetter.letter_markdown) : ""
  );
  const [draftLetter, setDraftLetter] = useState(
    coverLetter?.letter_markdown ? ensureDynamicDateInMarkdown(coverLetter.letter_markdown) : ""
  );
  const [preEditSnapshot, setPreEditSnapshot] = useState(
    coverLetter?.letter_markdown ? ensureDynamicDateInMarkdown(coverLetter.letter_markdown) : ""
  );
  const [isEditing, setIsEditing] = useState(false);
  const [draftStyle, setDraftStyle] = useState<DocumentStyle>(coverLetter?.document_style || { ...DEFAULT_DOCUMENT_STYLE });
  const [preEditStyle, setPreEditStyle] = useState<DocumentStyle>(coverLetter?.document_style || { ...DEFAULT_DOCUMENT_STYLE });
  const canvasEditorRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  // Sync state whenever coverLetter changes from parent
  useEffect(() => {
    if (coverLetter?.letter_markdown) {
      const formatted = coverLetter.letter_markdown;
      setSavedLetter(formatted);
      setDraftLetter(formatted);
      setPreEditSnapshot(formatted);
      setDraftStyle(coverLetter.document_style || { ...DEFAULT_DOCUMENT_STYLE });
      setPreEditStyle(coverLetter.document_style || { ...DEFAULT_DOCUMENT_STYLE });
    }
  }, [coverLetter?.letter_markdown]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          originalResumeText,
          jobDescription,
          analysisData: analysis,
        }),
      });

      const raw = await response.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error("Could not parse server response.");
      }

      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate matching cover letter.");
      }

      const generatedResult = data as CoverLetterResult;
      const formattedMarkdown = ensureDynamicDateInMarkdown(generatedResult.letter_markdown);
      const sanitizedResult: CoverLetterResult = {
        ...generatedResult,
        letter_markdown: formattedMarkdown,
        document_style: generatedResult.document_style || { ...DEFAULT_DOCUMENT_STYLE },
      };

      setSavedLetter(formattedMarkdown);
      setDraftLetter(formattedMarkdown);
      setPreEditSnapshot(formattedMarkdown);
      onCoverLetterGenerated(sanitizedResult);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Cover letter generation error:", err);
      setError(err.message || "An unexpected error occurred while generating the cover letter.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Start editing: snapshot complete saved state and populate draft
  const handleStartEditing = () => {
    const current = savedLetter || (coverLetter?.letter_markdown ? ensureDynamicDateInMarkdown(coverLetter.letter_markdown) : "");
    setPreEditSnapshot(current);
    setDraftLetter(current);
    const currentStyle = coverLetter?.document_style || { ...DEFAULT_DOCUMENT_STYLE };
    setPreEditStyle(currentStyle);
    setDraftStyle(currentStyle);
    setIsEditing(true);
  };

  // Typing modifies draft only; does NOT touch saved state or parent state
  const handleDraftChange = (e: React.FormEvent<HTMLDivElement>) => setDraftLetter(e.currentTarget.innerText);

  // Done Editing: commits draft -> saved letter (updates rendered preview, copy, PDF)
  const handleDoneEditing = () => {
    const committed = canvasEditorRef.current?.innerText || draftLetter;
    setSavedLetter(committed);
    setIsEditing(false);
    onCoverLetterGenerated({
      ...coverLetter!,
      letter_markdown: committed,
      document_style: draftStyle,
      letter_latex: undefined,
      compiled_latex: undefined,
      letter_pdf_base64: undefined,
    });
  };

  // Cancel: discards draft completely and restores preEditSnapshot
  const handleCancelEditing = () => {
    setDraftLetter(preEditSnapshot);
    setDraftStyle(preEditStyle);
    // savedLetter remains preEditSnapshot
    setIsEditing(false);
    if (savedLetter !== preEditSnapshot) {
      onCoverLetterUpdated(preEditSnapshot);
    }
  };

  const handleCopy = async () => {
    const textToCopy = savedLetter || coverLetter?.letter_markdown || "";
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy cover letter text:", err);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try { await pdfEditor.current?.downloadPdf(); }
    finally { setIsDownloadingPdf(false); }
  };

  const currentLetterText = savedLetter || coverLetter?.letter_markdown || "";
  const wordCount = currentLetterText.trim()
    ? currentLetterText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="bg-white rounded-xl border border-[#E7DEC8] shadow-xs overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-4 border-b border-[#E7DEC8] bg-[#FAF6EE]/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1E6A63]/10 text-[#1E6A63] flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#22302E]">
                Matching Tailored Cover Letter
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1E6A63] text-white px-2 py-0.5 rounded">
                Grounded Alignment
              </span>
            </div>
            <p className="text-[11px] text-[#22302E]/70">
              Presents your genuine credentials formatted as a targeted employer letter
            </p>
          </div>
        </div>

        {coverLetter && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-rose-50 text-rose-800 transition-colors cursor-pointer"
                  title="Discard changes and keep previous letter"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cancel</span>
                </button>

                <button
                  type="button"
                  onClick={handleDoneEditing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-xs transition-all cursor-pointer"
                  title="Save edits to letter and PDF export"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done Editing</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E7DEC8] text-[#22302E] hover:bg-[#FAF6EE] transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Letter</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white border border-[#E7DEC8] text-[#22302E] hover:bg-[#FAF6EE]"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#22302E]/70" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingPdf ? "Exporting..." : "Export Cover Letter PDF"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="p-1.5 rounded-lg text-xs text-[#22302E]/60 hover:text-[#1E6A63] hover:bg-[#FAF6EE] border border-transparent hover:border-[#E7DEC8] transition-colors cursor-pointer"
                  title="Regenerate Cover Letter"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-7">
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Generation Notice</p>
              <p className="text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Not yet generated state */}
        {!coverLetter && !isGenerating && (
          <div className="text-center py-10 px-4 max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#1E6A63]/10 text-[#1E6A63] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#22302E]">
                Generate a Matching Cover Letter
              </h4>
              <p className="text-xs text-[#22302E]/75 mt-1 leading-relaxed">
                Connect your authentic resume achievements directly to the employer's needs. Completely grounded in your real background with zero invented claims, and ready for instant PDF export.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Matching Cover Letter</span>
            </button>
          </div>
        )}

        {/* Loading state */}
        {isGenerating && (
          <div className="text-center py-12 space-y-3">
            <RefreshCw className="w-7 h-7 text-[#1E6A63] animate-spin mx-auto" />
            <p className="text-sm font-semibold text-[#22302E]">
              Drafting Grounded Cover Letter...
            </p>
            <p className="text-xs text-[#22302E]/60 max-w-md mx-auto">
              Synthesizing your authentic experience with the job posting requirements without embellishment.
            </p>
          </div>
        )}

        {/* Cover Letter Content */}
        {coverLetter && !isGenerating && (
          <div className="space-y-6">
            {/* Meta information tags */}
            <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-[#E7DEC8]">
              <div className="flex items-center gap-1.5 text-xs text-[#22302E]">
                <Building className="w-3.5 h-3.5 text-[#1E6A63]" />
                <span className="font-semibold text-[#22302E]">{coverLetter.company_name}</span>
              </div>
              <span className="text-[#E7DEC8]">|</span>
              <div className="flex items-center gap-1.5 text-xs text-[#22302E]">
                <Briefcase className="w-3.5 h-3.5 text-[#1E6A63]" />
                <span>{coverLetter.job_title}</span>
              </div>
              <span className="text-[#E7DEC8]">|</span>
              <span className="text-xs text-[#22302E]/70">
                To: {coverLetter.recipient_title}
              </span>
            </div>

            {/* Key Authentic Alignments */}
            {coverLetter.key_alignments && coverLetter.key_alignments.length > 0 && (
              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6A63] block mb-2">
                  Key Authentic Alignments Highlighted:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {coverLetter.key_alignments.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#22302E]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6A63] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editor or Rendered Document */}
            {isEditing ? (
              <div className="space-y-2">
                <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-[#E7DEC8] bg-white p-2 shadow-xs">
                  <span className="px-2 text-xs font-bold text-[#1E6A63]">Cover Letter Canvas</span>
                  <select aria-label="Cover letter font family" value={draftStyle.fontFamily} onChange={(e) => setDraftStyle((s) => ({ ...s, fontFamily: e.target.value as DocumentStyle["fontFamily"] }))} className="h-8 rounded-lg border border-[#E7DEC8] px-2 text-xs">
                    <option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option>
                  </select>
                  <select aria-label="Cover letter font size" value={draftStyle.fontSize} onChange={(e) => setDraftStyle((s) => ({ ...s, fontSize: Number(e.target.value) }))} className="h-8 rounded-lg border border-[#E7DEC8] px-2 text-xs">
                    {[9, 10, 11, 12, 13, 14].map((size) => <option key={size} value={size}>{size} pt</option>)}
                  </select>
                  <select aria-label="Cover letter line spacing" value={draftStyle.lineHeight} onChange={(e) => setDraftStyle((s) => ({ ...s, lineHeight: Number(e.target.value) }))} className="h-8 rounded-lg border border-[#E7DEC8] px-2 text-xs">
                    <option value={1.1}>Compact</option><option value={1.25}>1.25</option><option value={1.35}>1.35</option><option value={1.5}>1.5</option><option value={2}>Double</option>
                  </select>
                  <select aria-label="Cover letter paragraph spacing" value={draftStyle.paragraphSpacing} onChange={(e) => setDraftStyle((s) => ({ ...s, paragraphSpacing: Number(e.target.value) }))} className="h-8 rounded-lg border border-[#E7DEC8] px-2 text-xs">
                    <option value={4}>Tight</option><option value={8}>Normal</option><option value={12}>Relaxed</option><option value={16}>Wide</option>
                  </select>
                  <select aria-label="Cover letter page margins" value={draftStyle.pageMargin} onChange={(e) => setDraftStyle((s) => ({ ...s, pageMargin: Number(e.target.value) }))} className="h-8 rounded-lg border border-[#E7DEC8] px-2 text-xs">
                    <option value={36}>Narrow margins</option><option value={54}>Normal margins</option><option value={72}>Wide margins</option>
                  </select>
                  <span className="ml-auto text-[11px] text-[#22302E]/60">Click in the page and type like a document editor</span>
                </div>
                <div className="bg-[#D9D2C4] rounded-xl p-4 sm:p-8 flex items-start justify-center overflow-auto">
                  <div
                    ref={canvasEditorRef}
                    data-testid="cover-letter-document-page"
                    role="textbox"
                    aria-label="Editable cover letter canvas"
                    aria-multiline="true"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleDraftChange}
                    className="w-full max-w-[816px] min-h-[1056px] h-fit shrink-0 overflow-visible bg-white border border-[#DCD3C0] shadow-md outline-none focus:ring-2 focus:ring-[#1E6A63]/30 whitespace-pre-wrap break-words text-[#22302E]"
                    style={{ boxSizing: "border-box", backgroundColor: "#ffffff", minHeight: "1056px", height: "fit-content", fontFamily: draftStyle.fontFamily, fontSize: `${draftStyle.fontSize}pt`, lineHeight: draftStyle.lineHeight, padding: `${draftStyle.pageMargin}px` }}
                  >{draftLetter}</div>
                </div>
              </div>
            ) : (
              <button type="button" onClick={handleStartEditing} className="block w-full text-left bg-[#F3EFE6] border border-[#E7DEC8] rounded-xl p-4 sm:p-8 cursor-text" title="Click the document to edit">
                <div className="mx-auto max-w-[816px] min-h-[1056px] h-fit overflow-visible bg-white border border-[#DCD3C0] shadow-sm whitespace-pre-wrap break-words text-[#22302E]" style={{ boxSizing: "border-box", backgroundColor: "#ffffff", minHeight: "1056px", height: "fit-content", fontFamily: coverLetter.document_style?.fontFamily || DEFAULT_DOCUMENT_STYLE.fontFamily, fontSize: `${coverLetter.document_style?.fontSize || DEFAULT_DOCUMENT_STYLE.fontSize}pt`, lineHeight: coverLetter.document_style?.lineHeight || DEFAULT_DOCUMENT_STYLE.lineHeight, padding: `${coverLetter.document_style?.pageMargin || DEFAULT_DOCUMENT_STYLE.pageMargin}px` }}>
                  <div className="markdown-body space-y-4">
                  <Markdown>{savedLetter || coverLetter.letter_markdown}</Markdown>
                  </div>
                </div>
              </button>
            )}

            <CoverLetterLatexEditor ref={pdfEditor} letter={coverLetter} originalResume={originalResumeText}
              disabled={isEditing} onChange={onCoverLetterGenerated} />

            {/* Footer status */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#22302E]/70 pt-2 border-t border-[#E7DEC8]/60">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{wordCount} words</span>
                <span>· Editable cover letter</span>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isEditing || isDownloadingPdf}
                  className="text-xs font-bold text-[#1E6A63] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Cover Letter PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Non-blocking Cover Letter PDF Download Feedback Toast */}
      {pdfToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E6A63] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{pdfToast}</span>
        </div>
      )}
    </div>
  );
}
