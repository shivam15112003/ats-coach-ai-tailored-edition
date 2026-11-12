import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { promisify } from "node:util";
import { execFile, execFileSync } from "node:child_process";
import { removeEmptyLatexLists, applyResumeLayout, applyResumePresentation } from "../utils/resumeLatex";
import type {ResumeSectionData} from '../utils/resumeLatex';
import {MAKER_SPACING,makerBlockGaps,makerContentProfiles} from './resumePageFit';
import {cloudLatexCompiler,portableLatex} from './cloudLatex';
export { formatResumeSummary, applyResumePresentation, buildSourcePreservingLatex, preserveOriginalHeader, restoreOriginalLatexHeader, renderResumeHeader, applyResumeLayout, removeEmptyLatexLists, buildLatexFromStructure, parseResumeToStructure, RESUME_TEX_TEMPLATE, escapeLatex } from "../utils/resumeLatex";

export function resolveLatexCompiler(): string | undefined {
  const candidates = [process.env.PDFLATEX_PATH,
    path.join(process.env.LOCALAPPDATA || "", "Programs", "MiKTeX", "miktex", "bin", "x64", "pdflatex.exe"),
    path.join(process.env.ProgramFiles || "", "MiKTeX", "miktex", "bin", "x64", "pdflatex.exe"),
    "pdflatex"];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore", timeout: 5000, windowsHide: true });
      return candidate;
    } catch { /* Try the next installed location. */ }
  }
}

const execFileAsync = promisify(execFile);

export async function compileLatex(latexSource: string, options: { fitToPage?: boolean; resumeData?:ResumeSectionData; deadline?: number; signal?: AbortSignal } = {}): Promise<{
  success: boolean; pdfBase64?: string; pages?: number; pageSize?: string;
  error?: string; logExcerpt?: string; latexSource?: string; warning?: string; summaryLines?: number;
}> {
  if (!latexSource.trim()) return { success: false, error: "Enter LaTeX source before compiling." };
  latexSource = portableLatex(applyResumePresentation(removeEmptyLatexLists(latexSource)));
  let compiler:string;
  let tectonic=false;
  try{
    const installed=process.env.TECTONIC_PATH?undefined:resolveLatexCompiler();
    compiler=installed||await cloudLatexCompiler();tectonic=!installed;
  }catch(error){return {success:false,error:error instanceof Error?error.message:'Cloud PDF compiler could not start.'};}
  const deadline = Math.min(options.deadline ?? Infinity, Date.now() + 120000);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ats-latex-"));
  try {
    const env = { ...process.env, openin_any: "p", openout_any: "p" };
    const run = async (source: string) => {
      if (Date.now() >= deadline) throw new Error("PDF compilation timed out. Please retry with shorter content.");
      options.signal?.throwIfAborted();
      fs.writeFileSync(path.join(tmpDir, "resume.tex"), source, "utf8");
      await execFileAsync(compiler, tectonic?["--keep-logs","--keep-intermediates","--untrusted","resume.tex"]:["-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", "resume.tex"], {
        cwd: tmpDir, env, timeout: Math.min(tectonic?90000:15000, deadline - Date.now()), signal: options.signal, windowsHide: true,
      });
      const log = fs.readFileSync(path.join(tmpDir, "resume.log"), "utf8");
      const pages = Number(log.match(/Output written on .*?\((\d+) pages?/)?.[1] || log.match(/Output written on .*?\((\d+) pages?,/)?.[1] || 1);
      const overflow = [...log.matchAll(/Overfull \\hbox \(([0-9.]+)pt too wide\)/g)].some(m => Number(m[1]) > 0.5);
      const summaryLines = Number(log.match(/ATS_SUMMARY_LINES=(\d+)/)?.[1] || 0);
      return { pages, overflow, summaryLines };
    };
    let finalSource = latexSource;
    let warning: string | undefined;
    if (options.fitToPage && latexSource.includes("% ATS Coach: automatic one-page layout")) {
      // Port of compile_resume_one_page_autofit / compile_resume_one_page.
      let fitting: string | undefined;
      const profiles=options.resumeData?makerContentProfiles(options.resumeData):[{source:latexSource,minLineSpread:0}];
      const tried=new Set<string>();
      let lastPages=0;
      for(const profile of profiles){
        for(const [spread,gap] of MAKER_SPACING){
          if(spread<profile.minLineSpread)continue;
          const source=portableLatex(makerBlockGaps(applyResumeLayout(profile.source,spread,1),gap));
          // Adjacent profiles can render identically for a small source resume.
          if(tried.has(source))continue;
          tried.add(source);
          const result=await run(source);lastPages=result.pages;
          finalSource=source;
          // As in the maker, horizontal overflow does not imply a second page.
          if(result.pages===1){fitting=source;break;}
        }
        if(fitting)break;
      }
      const onePageFit=Boolean(fitting);
      if(!fitting){fitting=finalSource;warning=`The resume is ${lastPages} pages after the resume maker's one-page fitting steps. Shorten long bullet wording and compile again.`;}
      let low = 1, high = 1.12;
      const fittingBase=fitting;
      for (let step = 0; step < (onePageFit ? 5 : 0); step++) {
        const scale = (low + high) / 2;
        const spread=Number(fittingBase.match(/\\linespread\{([0-9.]+)\}/)?.[1]||.97);
        const source = applyResumeLayout(fittingBase, spread, scale);
        const result = await run(source);
        if (result.pages === 1 && !result.overflow) { low = scale; fitting = source; }
        else high = scale;
      }
      finalSource = fitting;
    }
    const { pages, summaryLines } = await run(finalSource);
    const pdf = fs.readFileSync(path.join(tmpDir, "resume.pdf"));
    return { success: true, pdfBase64: pdf.toString("base64"), pages, pageSize: "612 x 792 pts (letter)", latexSource: finalSource, warning, summaryLines };

  } catch (error: any) {
    const logPath = path.join(tmpDir, "resume.log");
    const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : String(error.stdout || error.message);
    const lines = log.split("\n");
    const index = lines.findIndex(line => line.startsWith("!"));
    return { success: false, error: "LaTeX compilation failed. Check the source and compiler details below.",
      logExcerpt: (index >= 0 ? lines.slice(index, index + 12) : lines.slice(-20)).join("\n").trim() };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
