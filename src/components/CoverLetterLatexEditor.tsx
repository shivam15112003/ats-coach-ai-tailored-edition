import { PdfPreview } from "./PdfPreview";
import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { CoverLetterResult, DocumentStyle, DEFAULT_DOCUMENT_STYLE } from "../types";

export interface CoverLetterPdfHandle { downloadPdf: () => Promise<void> }
type Props = { letter: CoverLetterResult; originalResume: string; onChange: (letter: CoverLetterResult) => void; disabled?: boolean };

function applyStyleToLatex(source: string, style: DocumentStyle): string {
  let next = source;
  const size = Math.min(12, Math.max(9, Math.round(style.fontSize)));
  next = next.replace(/\\documentclass\[(?:9|10|11|12)pt\]\{article\}/, `\\documentclass[${size}pt]{article}`);
  next = next.replace(/\\usepackage\[margin=[^\]]+\]\{geometry\}/, `\\usepackage[margin=${(style.pageMargin / 72).toFixed(2)}in]{geometry}`);
  next = next.replace(/\\setlength\{\\parskip\}\{[^}]+\}/, `\\setlength{\\parskip}{${(style.paragraphSpacing / 16).toFixed(2)}em}`);
  next = next.replace(/\\linespread\{[^}]+\}\s*/g, "");
  next = next.replace("\\begin{document}", `\\linespread{${style.lineHeight.toFixed(2)}}\\selectfont\n\\begin{document}`);
  if (style.fontFamily === "Arial") {
    next = next.replace("\\usepackage{lmodern}", "\\usepackage{helvet}\n\\renewcommand{\\familydefault}{\\sfdefault}");
  } else if (style.fontFamily === "Times New Roman") {
    next = next.replace("\\usepackage{lmodern}", "\\usepackage{mathptmx}");
  }
  return next;
}

export const CoverLetterLatexEditor = forwardRef<CoverLetterPdfHandle, Props>(function CoverLetterLatexEditor({ letter, originalResume, onChange, disabled }, ref) {
  const source = letter.letter_latex ?? "";
  const [preparing, setPreparing] = useState(false);
  const current = useRef(source); current.current = source;
  const latestLetter = useRef(letter); latestLetter.current = letter;
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    if (letter.letter_latex !== undefined) { setPreparing(false); return; }
    const controller = new AbortController(); setPreparing(true);
    (async () => {
      try {
        const response = await fetch("/api/render-cover-letter", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ letterMarkdown: letter.letter_markdown, originalResumeText: originalResume }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Could not prepare the cover letter.");
        const styledSource = applyStyleToLatex(data.latexSource, letter.document_style || DEFAULT_DOCUMENT_STYLE);
        if (!controller.signal.aborted) onChange({ ...latestLetter.current, letter_latex: styledSource, compiled_latex: undefined, letter_pdf_base64: undefined });
      } catch (error) {
        if (!controller.signal.aborted) setMessage({ error: true, text: error instanceof Error ? error.message : "Could not prepare the letter source." });
      } finally { if (!controller.signal.aborted) setPreparing(false); }
    })();
    return () => controller.abort();
  }, [letter.letter_markdown, originalResume, letter.letter_latex, letter.document_style]);

  const ready = letter.compiled_latex === source && !!letter.letter_pdf_base64;

  async function compile(): Promise<string | null> {
    if (inFlight.current || disabled || preparing || !source.trim()) return null;
    const snapshot = source; inFlight.current = true; setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/compile-latex", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latexSource: snapshot }) });
      const data = await response.json();
      if (!response.ok || !data.success || !data.pdfBase64) throw new Error([data.error || "Compilation failed.", data.logExcerpt].filter(Boolean).join("\n"));
      if (!active.current || current.current !== snapshot) return null;
      const compiled = data.latexSource || snapshot;
      onChange({ ...latestLetter.current, letter_latex: compiled, compiled_latex: compiled, letter_pdf_base64: data.pdfBase64 });
      setMessage({ error: false, text: `PDF ready (${data.pages || 1} page(s)).` });
      return data.pdfBase64;
    } catch (error) {
      if (active.current && current.current === snapshot) setMessage({ error: true, text: error instanceof Error ? error.message : "Could not reach the compiler." });
      return null;
    } finally { inFlight.current = false; if (active.current) setBusy(false); }
  }

  async function downloadPdf() {
    const pdf = ready ? letter.letter_pdf_base64 : await compile();
    if (!pdf) return;
    const bytes = Uint8Array.from(atob(pdf), c => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a"); link.href = url; link.download = "Cover_Letter.pdf"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useImperativeHandle(ref, () => ({ downloadPdf }));
  const button = "px-3 py-2 text-xs font-semibold rounded-lg border border-[#E7DEC8] disabled:opacity-50";
  return <section className="space-y-3 border-t border-[#E7DEC8] pt-5" aria-label="Cover letter LaTeX and PDF">
    <details><summary className="cursor-pointer font-bold text-sm text-[#22302E]">Advanced LaTeX &amp; PDF</summary><div className="space-y-3 mt-3"><p className="text-xs text-[#22302E]/70">Canvas edits and formatting controls rebuild this source before PDF export.</p>
    <label htmlFor="cover-letter-latex" className="block text-xs font-semibold">Cover letter LaTeX source</label>
    <textarea id="cover-letter-latex" value={source} spellCheck={false} disabled={disabled || preparing} onChange={e => { current.current = e.target.value; setMessage(null); onChange({ ...letter, letter_latex: e.target.value, compiled_latex: undefined, letter_pdf_base64: undefined }); }}
      className="w-full min-h-[300px] rounded-lg bg-[#202020] text-white p-4 text-xs font-mono leading-relaxed" />
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button + " bg-[#1E6A63] text-white"} disabled={busy || disabled || preparing || !source.trim()} onClick={() => void compile()}>{busy ? "Compiling..." : "Compile Cover Letter to PDF"}</button>
      <button type="button" className={button} disabled={busy || disabled || preparing || !source.trim()} onClick={() => void downloadPdf()}>Download Cover Letter PDF</button>
    </div>
    {message && <pre role={message.error ? "alert" : "status"} className={"whitespace-pre-wrap text-xs p-3 rounded-lg " + (message.error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800")}>{message.text}</pre>}
    {ready ? <PdfPreview title="Compiled Cover Letter PDF" base64={letter.letter_pdf_base64!} className="w-full h-[650px] border border-[#E7DEC8] rounded-lg" /> :
      <p className="p-6 bg-[#FAF6EE] text-sm text-center rounded-lg">{busy ? "Compiling your cover letter..." : "Compile the current source to preview your cover letter PDF."}</p>}
    </div></details>
  </section>;
});
