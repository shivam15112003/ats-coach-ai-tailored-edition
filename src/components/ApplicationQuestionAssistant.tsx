import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Clipboard, Download, HelpCircle, LoaderCircle, AlertTriangle, Mic, Square, Volume2 } from "lucide-react";
import { useVoice } from "../hooks/useVoice";
import { ApplicationAnswerResult } from "../types";
import { getApiHeaders } from "../utils/apiKey";
import { downloadTextFile } from "../utils/workspace";
import { demoApplicationAnswer } from "../data/demo";

interface Props {
  active?: boolean;
  demoMode?: boolean;
  latestResumeText: string;
  coverLetterText?: string;
  jobDescription: string;
}

const EXAMPLES = ["Why are you interested in this role?", "Describe your experience with Python.", "Tell us about a relevant project.", "What experience do you have with robotics?"];

export function ApplicationQuestionAssistant({ active = true, demoMode = false, latestResumeText, coverLetterText = "", jobDescription }: Props) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ApplicationAnswerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const voice = useVoice();
  const [copied, setCopied] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => { if (!active) { voice.stopAudio(); voice.cancelRecording(); } }, [active]);
  useEffect(() => { setResult(null); request.current?.abort(); }, [latestResumeText, coverLetterText, jobDescription]);
  useEffect(() => { setResult(null); }, [question, answerDraft]);
  useEffect(() => () => request.current?.abort(), []);
  const voiceButton = "inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E7DEC8] text-xs font-semibold disabled:opacity-50 cursor-pointer";

  const generate = async () => {
    if (!question.trim() || voice.recording) return;
    voice.stopAudio();
    if (demoMode) { setError(""); setResult(demoApplicationAnswer(question, latestResumeText)); return; }
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 120000);
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/application-answer", { method: "POST", signal: controller.signal, headers: getApiHeaders(), body: JSON.stringify({ question, answerDraft, latestResumeText, coverLetterText, jobDescription }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate a grounded answer.");
      if (!controller.signal.aborted) setResult(data);
    } catch (e: any) { setError(controller.signal.aborted ? "The request stopped. Your question and draft are preserved." : e.message || "Could not generate a grounded answer."); }
    finally { clearTimeout(timeout); if (request.current === controller) { request.current = null; setLoading(false); } }
  };

  return <section className="bg-white rounded-xl border border-[#E7DEC8] p-5 sm:p-6 shadow-xs space-y-5">
    {demoMode && <p className="demo-section-note">Sample demonstration · Prepared answers are available for the Python and relevant-project examples. Use live analysis for AI responses to your own materials.</p>}
    <div><h3 className="text-base font-bold text-[#22302E]">Application Question Assistant</h3><p className="text-xs text-[#22302E]/70 mt-1">Answers use the latest saved resume, cover letter, and target job. Unsupported details are never guessed.</p></div>
    <div className="flex flex-wrap gap-2">{EXAMPLES.map(example => <button type="button" disabled={loading} key={example} onClick={() => setQuestion(example)} className="px-3 py-1.5 rounded-lg border border-[#E7DEC8] bg-[#FAF6EE] text-xs hover:border-[#1E6A63]/40 cursor-pointer">{example}</button>)}</div>
    <label className="block"><span className="text-xs font-semibold">Application question</span><textarea disabled={loading} aria-label="Application question" value={question} onChange={e => setQuestion(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#D8CFBC] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6A63]/30" placeholder="Paste an application question..." /></label>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={!question.trim() || voice.recording || !voice.playbackAvailable} onClick={() => voice.speak(question)} className={voiceButton}><Volume2 className="w-4 h-4" />Hear Question</button>
      <button type="button" disabled={voice.recording || loading} onClick={() => voice.record(text => setQuestion(current => `${current} ${text}`.trim()))} className={voiceButton}><Mic className="w-4 h-4" />Dictate Question</button>
    </div>
    <label className="block"><span className="text-xs font-semibold">Your answer / editable voice transcript (optional)</span><textarea disabled={loading} aria-label="Application answer or editable transcript" value={answerDraft} onChange={e => setAnswerDraft(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-[#D8CFBC] p-3 text-sm leading-relaxed" placeholder="Type or dictate your answer, review the text, then generate a grounded suggestion..." /></label>
    <div className="flex flex-wrap gap-2">
      {voice.recording ? <button type="button" onClick={voice.stopRecording} className={voiceButton}><Square className="w-4 h-4" />Stop Recording</button> : <button type="button" disabled={loading} onClick={() => voice.record(text => setAnswerDraft(current => `${current} ${text}`.trim()))} className={voiceButton}><Mic className="w-4 h-4" />Record Answer</button>}
      {voice.speaking && <button type="button" onClick={voice.stopAudio} className={voiceButton}><Square className="w-4 h-4" />Stop Audio</button>}
    </div>
    {voice.status && <p role="status" className="text-xs text-[#1E6A63]">{voice.status}</p>}
    {voice.error && <p role="alert" className="text-xs text-rose-800">{voice.error}</p>}
    <details className="text-xs text-[#22302E]/70"><summary className="cursor-pointer">How to enable microphone access</summary><p className="mt-2">Open the app directly in Chrome. Beside the address bar, open Site settings, set Microphone to Allow, then reload. On Windows, also enable Settings → Privacy &amp; security → Microphone → Microphone access and Let desktop apps access your microphone. Embedded previews may block recording; use the published app in its own tab.</p><p className="mt-2">Browser speech recognition may use an online speech service. Review your transcript before sending it to Gemini.</p></details>
    <button type="button" onClick={generate} disabled={!question.trim() || loading || voice.recording} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E6A63] text-white text-xs font-bold disabled:opacity-50 cursor-pointer">{loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}{demoMode ? "View sample answer" : "Generate Grounded Answer"}</button>
    {error && <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">{error}</div>}
    {loading && <button type="button" onClick={() => request.current?.abort()} className={voiceButton}>Cancel request</button>}
    {result && <div className="space-y-3">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${result.status === "grounded" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-900 border border-amber-200"}`}>{result.status === "grounded" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{result.grounding_label}{result.status === "grounded" ? " ✓" : ""}</div>
      <label className="block"><span className="text-xs font-semibold">Editable suggested answer</span><textarea aria-label="Editable suggested application answer" value={result.answer} onChange={e => setResult({ ...result, answer: e.target.value })} rows={8} className="mt-2 w-full rounded-xl border border-[#D8CFBC] p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1E6A63]/30" /></label>
      <button type="button" disabled={!result.answer.trim() || voice.recording || !voice.playbackAvailable} onClick={() => voice.speak(result.answer)} className={voiceButton}><Volume2 className="w-4 h-4" />Hear Answer</button>
      {result.evidence.length > 0 && <div><p className="text-[11px] font-bold uppercase tracking-wide text-[#22302E]/60">Grounding evidence</p><ul className="mt-2 space-y-1">{result.evidence.map((evidence, index) => <li key={index} className="text-xs text-[#22302E]/75">“{evidence}”</li>)}</ul></div>}
      <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(result.answer); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setError("Copy was unavailable. Select the answer text or download it instead."); } }} className={voiceButton}>{copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}{copied ? "Copied" : "Copy Edited Answer"}</button><button type="button" className={voiceButton} onClick={() => downloadTextFile("ATS-Coach-Application-Answer.txt", `${question}\n\n${result.answer}\n\nEvidence:\n${result.evidence.join("\n")}`)}><Download className="w-4 h-4" />Download answer</button><span className="ml-auto text-xs text-[#52615D]">{result.answer.trim().split(/\s+/).filter(Boolean).length} words · review before sharing</span></div>
    </div>}
  </section>;
}
