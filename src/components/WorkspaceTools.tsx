import { useRef, useState } from "react";
import { Check, CheckCheck, Download, FileCheck2, FolderOpen, HelpCircle, Save, Sparkles } from "lucide-react";
import { downloadTextFile, MAX_WORKSPACE_BYTES, parseWorkspace, safeFileName, type Workspace } from "../utils/workspace";
import { openAppGuide } from "./GettingStarted";

interface Props { workspace: Workspace; busy: boolean; onNameChange: (name: string) => void; onImport: (workspace: Workspace) => void; onChecksChange: (checks: Workspace["checks"]) => void; onLive: () => void; }
export function WorkspaceTools({ workspace, busy, onNameChange, onImport, onChecksChange, onLive }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const ready = Boolean(workspace.resumeText.trim() || workspace.resumePdf || workspace.jobDescription.trim());
  const save = () => { setError(""); downloadTextFile(`${safeFileName(workspace.name)}.ats-workspace.json`, JSON.stringify(workspace, null, 2), "application/json"); setMessage("Workspace download started. Keep this file to reopen your application later."); };
  const importFile = async (file?: File) => {
    if (!file) return;
    setReading(true); setError(""); setMessage("");
    try { if (file.size > MAX_WORKSPACE_BYTES) throw new Error("Choose a workspace smaller than 30 MB."); onImport(parseWorkspace(await file.text())); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not open that workspace."); }
    finally { setReading(false); if (input.current) input.current.value = ""; }
  };
  const completed = [Boolean(workspace.analysis), Boolean(workspace.tailoring), Boolean(workspace.coverLetter), ...Object.values(workspace.checks)].filter(Boolean).length;
  const notes = () => {
    const a = workspace.analysis;
    downloadTextFile(`${safeFileName(workspace.name)}-preparation-notes.txt`, [`ATS COACH AI — ${workspace.name || "Application preparation"}`, workspace.demo ? "LABELLED SAMPLE DEMONSTRATION" : "Application preparation notes", "", "Target role", workspace.jobDescription.split("\n").slice(0, 3).join("\n"), "", ...(a ? [`Educational match estimate: ${a.overall_score}/100. This does not predict hiring decisions.`, "", "Evidence to review", ...a.exact_matches?.map(item => `${item.requirement}: ${item.resume_evidence || item.explanation}`) || [], "", "Related experience", ...a.semantic_matches?.map(item => `${item.requirement}: ${item.resume_evidence || item.explanation}`) || [], "", "Missing requirements", ...a.missing_skills] : ["Run a diagnosis to include its evidence."]), "", `Facts checked: ${workspace.checks.facts ? "Yes" : "Not yet"}`, `Final PDF formatting checked: ${workspace.checks.formatting ? "Yes" : "Not yet"}`, `Approved files downloaded: ${workspace.checks.downloaded ? "Yes" : "Not yet"}`, "", "Review all content before sharing. Educational estimates do not guarantee interviews or employment."].join("\n"));
  };
  return <section aria-label="Application workspace tools" className="workspace-tools">
    <div className="workspace-toolbar">
      <div className="min-w-0 flex-1"><label htmlFor="workspace-name" className="workspace-label">{workspace.demo ? "SAMPLE WORKSPACE" : "YOUR APPLICATION WORKSPACE"}</label><input id="workspace-name" value={workspace.name} maxLength={120} onChange={e => onNameChange(e.target.value)} placeholder="Name this application, e.g. Software Engineer at Nexus" className="workspace-name" /></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => openAppGuide("guide")} className="workspace-action"><HelpCircle className="w-4 h-4" /><span>How to use</span></button><button type="button" disabled={busy || reading} onClick={() => input.current?.click()} className="workspace-action"><FolderOpen className="w-4 h-4" />{reading ? "Opening…" : "Open workspace"}</button><button type="button" disabled={busy || !ready} onClick={save} className="workspace-action workspace-save"><Save className="w-4 h-4" />Save workspace</button></div>
      <input ref={input} type="file" accept=".json,application/json" aria-label="Open saved ATS Coach workspace" className="hidden" onChange={e => void importFile(e.target.files?.[0])} />
    </div>
    {workspace.demo && <div className="sample-notice"><Sparkles className="w-4 h-4 shrink-0" /><p><strong>Interactive sample.</strong> The example diagnosis and documents are prepared from anonymized sample data. Live AI actions are labelled separately.</p><button type="button" disabled={busy} onClick={onLive}>Run live analysis<Check className="w-3.5 h-3.5" /></button></div>}
    <div className="workspace-meta"><p><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1E6A63] mr-2" />Changes stay in this tab. Save a workspace before closing or reloading.</p><details><summary><CheckCheck className="w-4 h-4" />Preparation checklist <span>{completed}/6</span></summary><div className="checklist-content"><div className="checklist-status"><FileCheck2 className="w-4 h-4" /><span>{workspace.analysis ? "Diagnosis available" : "Compare your resume with the target role"}</span><span>{workspace.analysis ? "Ready" : "Next"}</span></div><div className="checklist-status"><FileCheck2 className="w-4 h-4" /><span>{workspace.tailoring ? "Resume document available" : "Prepare your resume document"}</span><span>{workspace.tailoring ? "Ready" : "Next"}</span></div><div className="checklist-status"><FileCheck2 className="w-4 h-4" /><span>{workspace.coverLetter ? "Cover letter available" : "Prepare a matching cover letter"}</span><span>{workspace.coverLetter ? "Ready" : "Next"}</span></div>{([['facts','I checked names, dates, claims, and evidence.'],['formatting','I reviewed the final PDF formatting.'],['downloaded','I downloaded the files I approve.']] as const).map(([key,label]) => <label className="checklist-check" key={key}><input type="checkbox" checked={workspace.checks[key]} onChange={e => onChecksChange({ ...workspace.checks, [key]: e.target.checked })} />{label}</label>)}<button type="button" className="workspace-action" onClick={notes}><Download className="w-4 h-4" />Download preparation notes</button><p className="text-xs text-[#52615D]">This checklist tracks your preparation, not your likelihood of being hired.</p></div></details></div>
    <p className="text-xs text-[#52615D]">Workspace files save inputs, diagnosis, documents, formatting, and checklist. Download application answers and interview notes separately from their sections.</p>
    {message && <p role="status" className="workspace-feedback">{message}</p>}{error && <p role="alert" className="workspace-error">{error}</p>}
  </section>;
}
