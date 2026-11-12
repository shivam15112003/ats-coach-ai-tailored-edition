import {PdfPreview} from "./PdfPreview";
import React, { useState, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  Sparkles,
  FileText,
  Code2,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Columns,
  ChevronDown,
  ChevronUp,
  Edit3,
} from "lucide-react";
import { ResumeDocument, DocumentStyle, DEFAULT_DOCUMENT_STYLE } from "../types";
import {
  parseTextToResumeDocument,
  resumeDocumentToText,
} from "../utils/resumeDocumentParser";
import { buildLatexFromStructure, parseResumeToStructure, removeEmptyLatexLists, restoreOriginalLatexHeader, applyResumePresentation } from "../utils/resumeLatex";
import { exportResumeToPdf, generateResumePdfDataUri } from "../utils/pdfExport";
import { ResumeDocumentEditor } from "./ResumeDocumentEditor";

interface ComparisonViewProps {
  generationMode?: "ai_rephrased" | "ai_final" | "source_preserved";
  originalResumeText: string;
  originalPdfBase64?: string | null;
  uploadedBaselineOriginalText?: string;
  tailoredResumeMarkdown: string;
  tailoredResumeLatex?: string;
  tailoredPdfBase64?: string | null;
  tailoredResumeStyle?: DocumentStyle;
  onTailoredResumeChange?: (newMarkdown: string, newLatex?: string, newPdfBase64?: string, newStyle?: DocumentStyle) => void;
}

export function ComparisonView({
  generationMode,
  originalResumeText,
  originalPdfBase64,
  uploadedBaselineOriginalText,
  tailoredResumeMarkdown,
  tailoredResumeLatex = "",
  tailoredPdfBase64 = null,
  tailoredResumeStyle,
  onTailoredResumeChange,
}: ComparisonViewProps) {
  // Documents
  const [originalDoc, setOriginalDoc] = useState<ResumeDocument>(() =>
    parseTextToResumeDocument(uploadedBaselineOriginalText || originalResumeText)
  );
  const [tailoredDoc, setTailoredDoc] = useState<ResumeDocument>(() =>
    ({ ...parseTextToResumeDocument(tailoredResumeMarkdown), style: tailoredResumeStyle || { ...DEFAULT_DOCUMENT_STYLE } })
  );
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  useEffect(() => {
    if (!showVisualEditor) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [showVisualEditor]);

  // Keep the uploaded PDF and extracted text as the original resume views.
  const [originalViewMode, setOriginalViewMode] = useState<"raw" | "pdf">(
    originalPdfBase64 ? "pdf" : "raw"
  );

  // Show the template source alongside its compiled output.
  const [showAdvancedLatex, setShowAdvancedLatex] = useState(false);
  const [latexSource, setLatexSource] = useState(() => tailoredResumeLatex || buildLatexFromStructure(parseResumeToStructure(tailoredResumeMarkdown)));
  const compileRequest = useRef(0);
  const lastCompiledBody = useRef<string | null>(null);
  const [compiledPdf, setCompiledPdf] = useState<string | null>(tailoredPdfBase64);
  const [compiledSource, setCompiledSource] = useState<string | null>(tailoredPdfBase64 ? tailoredResumeLatex : null);
  const [isCompilingLatex, setIsCompilingLatex] = useState(false);
  const [latexMessage, setLatexMessage] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync when props change
  useEffect(() => {
    setOriginalDoc(parseTextToResumeDocument(uploadedBaselineOriginalText || originalResumeText));
  }, [originalResumeText, uploadedBaselineOriginalText]);

  useEffect(() => {
    setTailoredDoc({ ...parseTextToResumeDocument(tailoredResumeMarkdown), style: tailoredResumeStyle || { ...DEFAULT_DOCUMENT_STYLE } });
  }, [tailoredResumeMarkdown, tailoredResumeStyle]);

  const handleSaveVisualEdits = (updatedDoc: ResumeDocument) => {
    const updatedText = resumeDocumentToText(updatedDoc);
    const pdfDataUri = generateResumePdfDataUri(updatedDoc);
    const pdfBase64 = pdfDataUri.split(",")[1] || "";
    const updatedLatex = buildLatexFromStructure(parseResumeToStructure(updatedText));
    setTailoredDoc(updatedDoc);
    setLatexSource(updatedLatex);
    setCompiledPdf(pdfBase64);
    setCompiledSource(updatedLatex);
    onTailoredResumeChange?.(updatedText, updatedLatex, pdfBase64, updatedDoc.style || { ...DEFAULT_DOCUMENT_STYLE });
    setShowVisualEditor(false);
    showToast("Canvas edits saved and PDF preview updated");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ================= ORIGINAL RESUME HANDLERS =================
  const handleDownloadOriginalPdf = () => {
    const filename = `${(originalDoc.name || "Original").replace(/[^a-zA-Z0-9_-]/g, "_")}_Original_Resume.pdf`;
    if (originalPdfBase64) {
      const bytes = Uint8Array.from(atob(originalPdfBase64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else exportResumeToPdf(originalDoc, filename);
    showToast("Original Resume PDF downloaded");
  };

  // ================= TAILORED RESUME HANDLERS =================
  const handleDownloadTailoredPdf = async () => {
    const pdf = compiledSource === latexSource && compiledPdf ? compiledPdf : await handleCompileLatexSource();
    if (!pdf) return;
    const bytes = Uint8Array.from(atob(pdf), char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(tailoredDoc.name || "Candidate").replace(/[^a-zA-Z0-9_-]/g, "_")}_Tailored_Resume.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Compiled LaTeX PDF downloaded");
  };

  const handleCopyTailoredText = async () => {
    try {
      const text = resumeDocumentToText(tailoredDoc);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Resume text copied to clipboard");
    } catch {
      showToast("Could not copy text to clipboard");
    }
  };

  const compileSource = async (inputSource: string): Promise<string | null> => {
    const source = inputSource.includes("% Original Python maker:") ? inputSource : applyResumePresentation(removeEmptyLatexLists(inputSource), parseResumeToStructure(tailoredResumeMarkdown).summary);
    setLatexSource(source);
    const request = ++compileRequest.current;
    setIsCompilingLatex(true);
    setLatexMessage(null);
    try {
      const res = await fetch("/api/compile-latex", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latexSource: source }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.pdfBase64) {
        throw new Error([data.error || "Compilation failed.", data.logExcerpt].filter(Boolean).join("\n"));
      }
      if (request !== compileRequest.current) return null;
      lastCompiledBody.current = tailoredResumeMarkdown;
      setCompiledPdf(data.pdfBase64);
      const compiledLatex = typeof data.latexSource === "string" ? data.latexSource : source;
      setLatexSource(compiledLatex);
      setCompiledSource(compiledLatex);
      if (compiledLatex !== tailoredResumeLatex) onTailoredResumeChange?.(tailoredResumeMarkdown, compiledLatex, data.pdfBase64);
      setLatexMessage({ type: "success", text: `LaTeX compiled successfully (${data.pages || 1} page(s)). Preview and download are ready. ${data.warning || ""}` });
      return data.pdfBase64;
    } catch (error) {
      if (request !== compileRequest.current) return null;
      setLatexMessage({ type: "error", text: error instanceof Error ? error.message : "Could not reach the compiler. Please try again." });
      return null;
    } finally {
      if (request === compileRequest.current) setIsCompilingLatex(false);
    }
  };

  const handleCompileLatexSource = () => compileSource(latexSource);

  useEffect(() => {
    let source = tailoredResumeLatex || buildLatexFromStructure(parseResumeToStructure(tailoredResumeMarkdown));
    if (!source.includes("% Original Python maker:") && (lastCompiledBody.current !== tailoredResumeMarkdown || source !== compiledSource)) {
      source = restoreOriginalLatexHeader(source, uploadedBaselineOriginalText || originalResumeText);
    }
    if (!source.includes("% Original Python maker:")) source = applyResumePresentation(source, parseResumeToStructure(tailoredResumeMarkdown).summary);
    setLatexSource(source);
    if (source === compiledSource && compiledPdf) return;
    setCompiledPdf(null);
    setLatexMessage(null);
    const timer = setTimeout(() => { void compileSource(source); }, 500);
    return () => { clearTimeout(timer); compileRequest.current++; };
  }, [tailoredResumeMarkdown, tailoredResumeLatex]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E6A63] text-white px-4 py-3 rounded-xl shadow-lg border border-[#17524C] flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Workspace Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E7DEC8] shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF6EE] text-[#1E6A63] text-xs font-bold border border-[#E7DEC8]">
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side Document Comparison</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#22302E]/60">
            <span>·</span>
            <span>Compare the original, edit your canvas, and review the PDF.</span>
          </div>
        </div>

        {/* Global Quick Actions */}
        <div className="flex flex-wrap min-w-0 max-w-full items-center gap-2">
          <button
            type="button"
            onClick={() => setShowVisualEditor(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1E6A63]/10 border border-[#1E6A63]/30 text-[#1E6A63] hover:bg-[#1E6A63]/15 transition-colors cursor-pointer"
            title="Edit the formatted resume directly"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Resume Canvas</span>
          </button>
          <button
            type="button"
            onClick={handleCopyTailoredText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
            title="Copy tailored resume text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#22302E]/70" />}
            <span>{copied ? "Copied" : "Copy Tailored Text"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTailoredPdf}
            disabled={isCompilingLatex || !latexSource.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-xs transition-all cursor-pointer"
            title="Download Tailored Resume as ATS-Compliant PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Tailored PDF</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5 text-[#22302E]/70" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {showVisualEditor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-5xl w-full my-auto">
            <ResumeDocumentEditor
              document={tailoredDoc}
              documentType="tailored"
              onSave={handleSaveVisualEdits}
              onCancel={() => setShowVisualEditor(false)}
              onResetToBaseline={() => {
                setTailoredDoc({ ...parseTextToResumeDocument(tailoredResumeMarkdown), style: tailoredResumeStyle || { ...DEFAULT_DOCUMENT_STYLE } });
              }}
              baselineLabel="Restore AI Version"
            />
          </div>
        </div>
      )}

      {/* ================= SIDE-BY-SIDE RESUME PANES ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ================= LEFT PANE: ORIGINAL RESUME ================= */}
        <div className="bg-white rounded-xl border border-[#E7DEC8] flex flex-col shadow-xs overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[#E7DEC8] bg-[#FAF6EE]/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-[#22302E]">
                    Original Resume
                  </h3>
                  <span className="text-[10px] font-medium text-stone-500">Uploaded Baseline · Read-only</span>
                </div>
                <p className="text-[10px] text-[#22302E]/60">
                  Document baseline used for ATS scoring and factual grounding
                </p>
              </div>
            </div>

            {/* Read-only view switcher */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-[#FAF6EE] p-0.5 rounded-lg border border-[#E7DEC8]">
                {originalPdfBase64 && (
                  <button
                    type="button"
                    onClick={() => setOriginalViewMode("pdf")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      originalViewMode === "pdf"
                        ? "bg-white text-[#1E6A63] shadow-2xs font-bold"
                        : "text-[#22302E]/60 hover:text-[#22302E]"
                    }`}
                    title="Exact original PDF"
                  >
                    Original PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOriginalViewMode("raw")}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    originalViewMode === "raw"
                      ? "bg-white text-[#1E6A63] shadow-2xs font-bold"
                      : "text-[#22302E]/60 hover:text-[#22302E]"
                  }`}
                  title="Raw plain text"
                >
                  Text
                </button>
              </div>


            </div>
          </div>

          {/* Original Resume Document Content */}
          <div className="flex-1 bg-[#F9F6F0] p-4 sm:p-6 min-h-[660px] max-h-[720px] overflow-y-auto custom-scrollbar flex flex-col">
            {originalViewMode === "pdf" && originalPdfBase64 && (
              <div className="w-full h-full min-h-[620px] rounded border border-[#E7DEC8] bg-white overflow-hidden shadow-xs">
                <PdfPreview
                  base64={originalPdfBase64}
                  title="Original PDF Document"
                  className="w-full h-full min-h-[620px]"
                />
              </div>
            )}

            {(originalViewMode === "raw" || !originalPdfBase64) && (
              <div className="bg-white p-5 rounded-lg border border-[#E7DEC8] font-mono text-xs text-[#22302E] leading-relaxed whitespace-pre-wrap select-text">
                {uploadedBaselineOriginalText || originalResumeText}
              </div>
            )}
          </div>

          {/* Footer of Left Pane */}
          <div className="px-5 py-2.5 bg-[#FAF6EE]/50 border-t border-[#E7DEC8] text-xs text-[#22302E]/70 flex items-center justify-between">
            <span>Read-only original</span>

            <button
              type="button"
              onClick={handleDownloadOriginalPdf}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E6A63] hover:underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Original PDF</span>
            </button>
          </div>
        </div>

        {/* ================= RIGHT PANE: TAILORED RESUME ================= */}
        <div className="bg-white rounded-xl border-2 border-[#1E6A63]/30 flex flex-col shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[#E7DEC8] bg-[#1E6A63]/5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1E6A63] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-[#1E6A63]">
                    Tailored Resume
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1E6A63] text-white px-2 py-0.5 rounded shadow-2xs">{generationMode === "source_preserved" ? "SOURCE-PRESERVED" : "AI-GENERATED"}</span>
                </div>
                <p className="text-[10px] text-[#22302E]/70">
                  Targeted keyword alignment & bullet impact preserving factual truth
                </p>
              </div>
            </div>


          </div>

          {/* Tailored Resume Document Content */}
          <div className="flex-1 bg-[#F9F6F0] p-4 sm:p-6 min-h-[660px] max-h-[720px] overflow-y-auto custom-scrollbar flex flex-col">
            {compiledPdf && compiledSource === latexSource ? (
              <PdfPreview base64={compiledPdf} title="Compiled Tailored Resume PDF" className="w-full min-h-[620px] flex-1 bg-white" />
            ) : (
              <div className="m-auto text-center text-sm text-stone-600 space-y-3">
                <p>{isCompilingLatex ? "Compiling your LaTeX resume…" : "Compile the LaTeX source below to preview your updated resume."}</p>
                <button type="button" onClick={handleCompileLatexSource} disabled={isCompilingLatex || !latexSource.trim()} className="px-4 py-2 bg-[#1E6A63] text-white rounded-lg disabled:opacity-50">Compile to PDF</button>
              </div>
            )}
          </div>

          {/* Footer of Right Pane */}
          <div className="px-5 py-2.5 bg-[#1E6A63]/5 border-t border-[#E7DEC8] text-xs text-[#22302E]/70 flex items-center justify-between">
            <span>Edit text and formatting with Edit Resume Canvas</span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyTailoredText}
                className="text-[11px] font-semibold text-stone-600 hover:text-[#22302E] cursor-pointer"
              >
                {copied ? "Copied!" : "Copy Text"}
              </button>

              <button
                type="button"
                onClick={handleDownloadTailoredPdf}
            disabled={isCompilingLatex || !latexSource.trim()}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E6A63] hover:underline cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Tailored PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= OPTIONAL ADVANCED LATEX / OVERLEAF EXPORT (COLLAPSIBLE) ================= */}
      <div className="bg-white rounded-xl border border-[#E7DEC8] p-4 shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvancedLatex(!showAdvancedLatex)}
          className="w-full flex items-center justify-between text-left text-xs sm:text-sm font-bold text-[#22302E]/80 hover:text-[#1E6A63] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-stone-500" />
            <span>LaTeX Source & PDF</span>
            <span className="text-[11px] font-normal text-stone-500 hidden sm:inline">
              Edit the source, compile, and download your PDF.
            </span>
          </div>
          {showAdvancedLatex ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </button>

        {showAdvancedLatex && (
          <div className="mt-4 pt-4 border-t border-[#E7DEC8] space-y-3 animate-in fade-in duration-150">
            <p className="text-xs text-stone-600 leading-relaxed">
              Your AI resume uses the saved LaTeX template. The preview and downloaded PDF are compiled from the source below.
            </p>

            {latexMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  latexMessage.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-stone-100 border border-stone-200 text-stone-700"
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <pre className="whitespace-pre-wrap font-sans">{latexMessage.text}</pre>
              </div>
            )}

            <div className="relative">
              <textarea
                value={latexSource}
                onChange={(e) => { compileRequest.current++; setIsCompilingLatex(false); setLatexSource(e.target.value); setLatexMessage(null); }}
                aria-label="Resume LaTeX source"
                spellCheck={false}
                rows={10}
                className="w-full font-mono text-xs bg-[#1E1E1E] text-stone-200 p-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#1E6A63] leading-relaxed"
                placeholder="LaTeX code..."
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-stone-500">
                UTF-8 LaTeX Source · Overleaf Compatible
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(latexSource);
                    showToast("LaTeX source copied");
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-stone-50 text-stone-700 cursor-pointer"
                >
                  Copy LaTeX Source
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([latexSource], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "resume.tex";
                    link.click();
                    URL.revokeObjectURL(url);
                    showToast("resume.tex downloaded");
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-stone-50 text-stone-700 cursor-pointer"
                >
                  Download .tex File
                </button>

                <button
                  type="button"
                  onClick={handleCompileLatexSource}
                  disabled={isCompilingLatex || !latexSource.trim()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-stone-800 hover:bg-stone-900 text-white cursor-pointer"
                >
                  {isCompilingLatex ? "Compiling..." : "Compile to PDF"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
