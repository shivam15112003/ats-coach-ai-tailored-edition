import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  Sparkles,
  ArrowRight,
  FileCode2,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  KeyRound,
  Edit3,
} from "lucide-react";
import { SAMPLE_RESUME, SAMPLE_JOB_DESCRIPTION } from "../sampleData";
import { ResumeDocumentEditor } from "./ResumeDocumentEditor";
import { parseTextToResumeDocument, resumeDocumentToText } from "../utils/resumeDocumentParser";
import { DEFAULT_DOCUMENT_STYLE, DocumentStyle } from "../types";

interface InputSectionProps {
  resumeText: string;
  setResumeText: (text: string) => void;
  resumePdfBase64: string | null;
  setResumePdfBase64: (base64: string | null) => void;
  resumeFileName: string | null;
  setResumeFileName: (name: string | null) => void;
  jobDescription: string;
  setJobDescription: (text: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  error: string | null;
  onOpenApiKeyModal?: () => void;
}

export function InputSection({
  resumeText,
  setResumeText,
  resumePdfBase64,
  setResumePdfBase64,
  resumeFileName,
  setResumeFileName,
  jobDescription,
  setJobDescription,
  onAnalyze,
  isAnalyzing,
  error,
  onOpenApiKeyModal,
}: InputSectionProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "text">(
    resumePdfBase64 ? "upload" : "text"
  );
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [showExtractedPreview, setShowExtractedPreview] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [resumeDocumentStyle, setResumeDocumentStyle] = useState<DocumentStyle>(DEFAULT_DOCUMENT_STYLE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resumeWords = resumeText.trim()
    ? resumeText.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const jobDescWords = jobDescription.trim()
    ? jobDescription.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const hasResumeContent = Boolean(
    (resumePdfBase64 && resumeFileName) || resumeWords >= 15
  );
  const hasJobDescContent = jobDescWords >= 10;
  const canAnalyze = hasResumeContent && hasJobDescContent && !isAnalyzing && !fileError && !isExtractingPdf;

  const extractPdfContent = async (base64Data: string) => {
    setIsExtractingPdf(true);
    try {
      const res = await fetch("/api/extract-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumePdfBase64: base64Data }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to extract text from PDF.");
      }
      const data = await res.json();
      if (data.text) {
        setResumeText(data.text);
      }
    } catch (err: any) {
      console.warn("Client PDF preview extraction notice:", err.message);
      // Even if extraction preview warns (e.g. specialized font encoding), server multimodal fallback handles it on analyze
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setFileError(null);

    // 0-byte file check
    if (file.size === 0) {
      setFileError("This file is empty. Please upload a resume containing text.");
      return;
    }

    // Max 20MB check
    if (file.size > 20 * 1024 * 1024) {
      setFileError("File is too large. Please upload a PDF or text file under 20MB.");
      return;
    }

    const fileNameLower = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || fileNameLower.endsWith(".pdf");
    const isText = file.type.startsWith("text/") || fileNameLower.endsWith(".txt") || fileNameLower.endsWith(".md");

    if (!isPdf && !isText) {
      setFileError("Unsupported file type (" + file.name + "). Please upload a PDF (.pdf) or text file (.txt, .md).");
      return;
    }

    if (isPdf) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Data URL format: "data:application/pdf;base64,..."
        const base64Data = result.split(",")[1];
        setResumePdfBase64(base64Data);
        setResumeFileName(file.name);
        setActiveTab("upload");
        extractPdfContent(base64Data);
      };
      reader.onerror = () => {
        setFileError("Failed to read the file. Please try uploading again.");
      };
      reader.readAsDataURL(file);
    } else {
      // Plain text or markdown
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (!text || !text.trim()) {
          setFileError("This file is empty. Please upload a resume containing text.");
          return;
        }
        setResumeText(text);
        setResumeDocumentStyle(DEFAULT_DOCUMENT_STYLE);
        setResumePdfBase64(null);
        setResumeFileName(file.name);
        setActiveTab("text");
      };
      reader.onerror = () => {
        setFileError("Failed to read the file. Please try uploading again.");
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleClearResume = () => {
    setFileError(null);
    setResumeText("");
    setResumePdfBase64(null);
    setResumeFileName(null);
    setResumeDocumentStyle(DEFAULT_DOCUMENT_STYLE);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLoadSampleResume = () => {
    setFileError(null);
    setResumeText(SAMPLE_RESUME);
    setResumePdfBase64(null);
    setResumeFileName("sample_student_resume_anonymized.txt");
    setResumeDocumentStyle(DEFAULT_DOCUMENT_STYLE);
    setActiveTab("text");
  };

  const handleLoadSampleJob = () => {
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
  };

  const handleLoadBothSamples = () => {
    handleLoadSampleResume();
    handleLoadSampleJob();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 border border-[#E7DEC8] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#22302E]">
          <Sparkles className="w-4 h-4 text-[#1E6A63]" />
          <span>Need a quick test? Load realistic candidate and job samples in one click:</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadBothSamples}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E6A63]/10 hover:bg-[#1E6A63]/20 text-[#1E6A63] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1E6A63]" />
            Load Anonymized Sample Pair
          </button>
        </div>
      </div>

      {/* Two-Column Input Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Resume Input */}
        <div className="bg-white rounded-xl border border-[#E7DEC8] p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E7DEC8]/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1E6A63]/10 flex items-center justify-center text-[#1E6A63]">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#22302E]">
                  1. Candidate Resume
                </h3>
                <p className="text-[11px] text-[#22302E]/70">
                  Upload PDF or paste raw text
                </p>
              </div>
            </div>

            {/* Switch tabs: Upload vs Paste */}
            <div className="flex items-center bg-[#FAF6EE] p-0.5 rounded-lg border border-[#E7DEC8]">
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === "text"
                    ? "bg-white text-[#1E6A63] shadow-xs font-semibold"
                    : "text-[#22302E]/70 hover:text-[#22302E]"
                }`}
              >
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === "upload"
                    ? "bg-white text-[#1E6A63] shadow-xs font-semibold"
                    : "text-[#22302E]/70 hover:text-[#22302E]"
                }`}
              >
                Upload PDF
              </button>
            </div>
          </div>

          {/* Tab 1: Upload PDF Zone */}
          {activeTab === "upload" && (
            <div className="flex-1 flex flex-col justify-between">
              {resumePdfBase64 && resumeFileName ? (
                <div className="space-y-3 mb-4">
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-[#1E6A63]">
                        <FileCode2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#22302E] truncate max-w-[200px] sm:max-w-xs">
                          {resumeFileName}
                        </p>
                        <p className="text-[11px] text-emerald-800">
                          {isExtractingPdf ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-700">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Parsing and extracting text from PDF...
                            </span>
                          ) : resumeWords >= 15 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                              <CheckCircle2 className="w-3 h-3 text-[#1E6A63]" />
                              Extracted {resumeWords} words successfully
                            </span>
                          ) : (
                            "PDF attached and ready for ATS evaluation"
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {resumeText && !isExtractingPdf && (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowExtractedPreview(!showExtractedPreview)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E]/70 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Inspect the parsed text"
                          >
                            {showExtractedPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{showExtractedPreview ? "Hide" : "Inspect Text"}</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleClearResume}
                        className="p-1.5 text-[#22302E]/50 hover:text-[#E2725B] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Extracted Text Preview */}
                  {showExtractedPreview && resumeText && (
                    <div className="bg-[#FAF6EE]/70 border border-[#E7DEC8] rounded-xl p-3.5 text-xs text-[#22302E] space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-[#E7DEC8] pb-1.5">
                        <span className="font-bold text-[11px] uppercase tracking-wider text-[#1E6A63]">
                          Extracted Resume Text ({resumeWords} words)
                        </span>
                        <span className="text-[11px]">Read-only PDF text</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed bg-white p-3 rounded-lg border border-[#E7DEC8]">
                        {resumeText}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[260px] ${
                    isDragging
                      ? "border-[#1E6A63] bg-[#1E6A63]/5 scale-[0.99]"
                      : "border-[#E7DEC8] hover:border-[#1E6A63]/60 bg-[#FAF6EE]/50 hover:bg-[#FAF6EE]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-xl bg-[#1E6A63]/10 text-[#1E6A63] flex items-center justify-center mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#22302E] mb-1">
                    Drag and drop your resume PDF here
                  </p>
                  <p className="text-xs text-[#22302E]/65 max-w-xs mb-3">
                    Or click to browse from your computer (PDF, TXT, or MD format)
                  </p>
                  <span className="inline-block text-[11px] text-[#1E6A63] font-medium bg-white px-2.5 py-1 rounded-md border border-[#E7DEC8]">
                    Supported: PDF (up to 20MB)
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[#E7DEC8]/60 mt-4">
                <button
                  type="button"
                  onClick={handleLoadSampleResume}
                  className="text-xs font-medium text-[#1E6A63] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Anonymized Sample Resume
                </button>
                {resumeFileName && (
                  <button
                    type="button"
                    onClick={handleClearResume}
                    className="text-xs text-[#E2725B] hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Paste Raw Text Zone */}
          {activeTab === "text" && (
            <div className="flex-1 flex flex-col justify-between">
              <textarea
                value={resumeText}
                readOnly={Boolean(resumePdfBase64)}
                aria-label={resumePdfBase64 ? "Uploaded PDF text (read-only)" : "Resume text"}
                onChange={(e) => {
                  if (resumePdfBase64) return;
                  setFileError(null);
                  setResumeText(e.target.value);
                }}
                placeholder="Paste the candidate resume text here (including Education, Technical Skills, Projects, and Experience bullets)..."
                className="w-full flex-1 min-h-[260px] p-3.5 text-xs font-mono bg-[#FAF6EE]/40 border border-[#E7DEC8] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1E6A63]/30 focus:border-[#1E6A63] text-[#22302E] leading-relaxed resize-y placeholder:text-[#22302E]/40"
              />

              <div className="flex items-center justify-between pt-3 border-t border-[#E7DEC8]/60 mt-3 text-xs text-[#22302E]/70">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleResume}
                    className="font-medium text-[#1E6A63] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Load Anonymized Sample Resume
                  </button>
                  {resumeText && !resumePdfBase64 && (
                    <>
                      <span>• {resumeText.trim().split(/\s+/).length} words</span>
                      <button
                        type="button"
                        onClick={() => setShowVisualEditor(true)}
                        className="ml-2 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#1E6A63] transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Edit resume visually like Google Docs / Word"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#1E6A63]" />
                        <span>Edit Document</span>
                      </button>
                    </>
                  )}
                </div>
                {resumeText && (
                  <button
                    type="button"
                    onClick={handleClearResume}
                    className="text-[#E2725B] hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Target Job Description */}
        <div className="bg-white rounded-xl border border-[#E7DEC8] p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E7DEC8]/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E2725B]/10 flex items-center justify-center text-[#E2725B]">
                <FileCode2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#22302E]">
                  2. Target Job Description
                </h3>
                <p className="text-[11px] text-[#22302E]/70">
                  Paste the employer requirements and responsibilities
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLoadSampleJob}
              className="text-xs font-medium text-[#1E6A63] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              Load Sample Job
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description here (e.g. responsibilities, required qualifications, nice-to-haves, tools)..."
              className="w-full flex-1 min-h-[260px] p-3.5 text-xs font-sans bg-[#FAF6EE]/40 border border-[#E7DEC8] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1E6A63]/30 focus:border-[#1E6A63] text-[#22302E] leading-relaxed resize-y placeholder:text-[#22302E]/40"
            />

            <div className="flex items-center justify-between pt-3 border-t border-[#E7DEC8]/60 mt-3 text-xs text-[#22302E]/70">
              <div className="flex items-center gap-2">
                <span>{jobDescWords} words</span>
                {jobDescWords > 0 && jobDescWords < 100 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <AlertCircle className="w-3 h-3" />
                    Short text (&lt; 100 words)
                  </span>
                )}
                {jobDescWords >= 100 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Check className="w-3 h-3" />
                    Good length for deep analysis
                  </span>
                )}
              </div>
              {jobDescription && (
                <button
                  type="button"
                  onClick={() => setJobDescription("")}
                  className="text-[#E2725B] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {fileError && (
        <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div><p className="font-semibold">File Upload Notice</p><p className="text-rose-700 mt-0.5">{fileError}</p></div>
        </div>
      )}

      {/* Error Message if any */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Analysis Notice</p>
            <p className="text-rose-700 mt-0.5">{error}</p>
            {onOpenApiKeyModal && (
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
              >
                <KeyRound className="w-3.5 h-3.5 text-rose-700" />
                Configure Optional Gemini API Key
              </button>
            )}
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 border border-[#E7DEC8] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="text-xs text-[#22302E]/75">
          {!hasResumeContent && !hasJobDescContent && (
            <span>Please provide both a resume (minimum 15 words) and a target job description (minimum 10 words) to begin.</span>
          )}
          {hasResumeContent && !hasJobDescContent && (
            <span>
              Resume ready ({resumeWords > 0 ? `${resumeWords} words` : "PDF attached"}). {jobDescWords > 0 && jobDescWords < 10 ? `Job description needs at least 10 words (currently ${jobDescWords}).` : "Please paste the target job description above."}
            </span>
          )}
          {!hasResumeContent && hasJobDescContent && (
            <span>
              Job description ready ({jobDescWords} words). {resumeWords > 0 && resumeWords < 15 ? `Resume needs at least 15 words (currently ${resumeWords}).` : "Please upload or paste a resume above."}
            </span>
          )}
          {hasResumeContent && hasJobDescContent && (
            <span className="text-emerald-800 font-medium">
              Ready to evaluate alignment against keyword overlap, readability, and bullet impact.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
            canAnalyze
              ? "bg-[#1E6A63] text-white hover:bg-[#17524C] hover:shadow-md cursor-pointer"
              : "bg-[#22302E]/20 text-[#22302E]/50 cursor-not-allowed"
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Analyzing Job Alignment...</span>
            </>
          ) : (
            <>
              <span>Analyze Match</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Visual Document Editor Modal for Input Section */}
      {showVisualEditor && !resumePdfBase64 && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl w-full my-auto">
            <ResumeDocumentEditor
              document={{ ...parseTextToResumeDocument(resumeText), style: resumeDocumentStyle }}
              documentType="original"
              onSave={(updatedDoc) => {
                setResumeText(resumeDocumentToText(updatedDoc));
                setResumeDocumentStyle(updatedDoc.style || DEFAULT_DOCUMENT_STYLE);
                setShowVisualEditor(false);
              }}
              onCancel={() => setShowVisualEditor(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
