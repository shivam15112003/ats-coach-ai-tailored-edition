import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, Mic, MicOff, RefreshCcw, Send, Square, Volume2 } from "lucide-react";
import { InterviewAttempt, InterviewFeedback, InterviewSummary, InterviewType, RequirementMatch } from "../types";
import { getApiHeaders } from "../utils/apiKey";
import { microphoneContextProblem, microphoneProblem } from "../utils/voice";
import { downloadTextFile } from "../utils/workspace";
import { DEMO_INTERVIEW_FEEDBACK, DEMO_INTERVIEW_QUESTIONS } from "../data/demo";
import { playSpeech } from "../utils/speechPlayback";

interface Props { active?: boolean; demoMode?: boolean; latestResumeText: string; coverLetterText?: string; jobDescription: string; semanticMatches?: RequirementMatch[]; }
const TYPES: InterviewType[] = ["Behavioral", "Technical", "Resume / Project", "Mixed Mock Interview"];

export function InterviewCoach({ active = true, demoMode = false, latestResumeText, coverLetterText = "", jobDescription, semanticMatches = [] }: Props) {
  const [type, setType] = useState<InterviewType>("Mixed Mock Interview");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [history, setHistory] = useState<InterviewAttempt[]>([]);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [readQuestions, setReadQuestions] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.96);
  const [sessionContext, setSessionContext] = useState("");
  const [demoFinished, setDemoFinished] = useState(false);
  const recognitionRef = useRef<any>(null);
  const cancelPlayback = useRef<(() => void) | null>(null);
  const SpeechRecognition = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;
  const speechPlaybackAvailable = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
    cancelPlayback.current?.();
  }, []);

  const stopQuestionAudio = () => {
    cancelPlayback.current?.(); cancelPlayback.current = null;
    setSpeaking(false);
    setVoiceStatus("");
  };
  const speakQuestion = () => {
    if (!speechPlaybackAvailable || !question) return;
    stopQuestionAudio(); setSpeaking(true); setVoiceStatus("Starting question audio…");
    cancelPlayback.current = playSpeech(question, speechRate, { onStart: () => setVoiceStatus("Reading the interview question aloud…"), onEnd: () => { setSpeaking(false); setVoiceStatus(""); }, onError: message => { setSpeaking(false); setVoiceStatus(message); } });
  };

  const contextBody = { latestResumeText, coverLetterText, jobDescription, interviewType: type, semanticMatches };
  const contextSignature = JSON.stringify([latestResumeText, coverLetterText, jobDescription, type]);
  const contextChanged = Boolean(question && sessionContext && contextSignature !== sessionContext);
  useEffect(() => { if (!active) { stopQuestionAudio(); recognitionRef.current?.abort?.(); recognitionRef.current = null; setRecording(false); } }, [active]);
  useEffect(() => { if (active && readQuestions && question && !summary && !demoFinished) speakQuestion(); else stopQuestionAudio(); }, [question, active, readQuestions, speechRate, Boolean(summary), demoFinished]);
  const start = async () => {
    stopQuestionAudio();
    setLoading(true); setError(""); setSummary(null); setHistory([]); setFeedback(null); setAnswer(""); setAttemptNumber(1);
    setSessionContext(contextSignature);
    setDemoFinished(false);
    if (demoMode) { setQuestion(DEMO_INTERVIEW_QUESTIONS[type]); setLoading(false); return; }
    try { const response = await fetch("/api/interview/start", { method: "POST", headers: getApiHeaders(), body: JSON.stringify(contextBody) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setQuestion(data.question); }
    catch (e: any) { setError(e.message || "Could not start interview practice."); } finally { setLoading(false); }
  };
  const submit = async () => {
    if (!answer.trim() || contextChanged) return; stopQuestionAudio(); setLoading(true); setError("");
    const priorAttempt = history.filter(item => item.question === question).at(-1) || null;
    if (demoMode) { setFeedback(DEMO_INTERVIEW_FEEDBACK); setHistory(prev => [...prev, { question, answer, attempt: attemptNumber, feedback: DEMO_INTERVIEW_FEEDBACK }]); setLoading(false); return; }
    try { const response = await fetch("/api/interview/feedback", { method: "POST", headers: getApiHeaders(), body: JSON.stringify({ ...contextBody, question, answer, attempt: attemptNumber, priorAttempt, history }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); const nextFeedback: InterviewFeedback = data; setFeedback(nextFeedback); setHistory(prev => [...prev, { question, answer, attempt: attemptNumber, feedback: nextFeedback }]); }
    catch (e: any) { setError(e.message || "Could not evaluate this answer."); } finally { setLoading(false); }
  };
  const tryAgain = () => { if (contextChanged) return; stopQuestionAudio(); setAnswer(""); setFeedback(null); setAttemptNumber(value => value + 1); };
  const nextQuestion = () => { if (!feedback?.follow_up_question || contextChanged) return; stopQuestionAudio(); setQuestion(feedback.follow_up_question); setAnswer(""); setFeedback(null); setAttemptNumber(1); };
  const finish = async () => { stopQuestionAudio(); if (demoMode) { setDemoFinished(true); return; } setLoading(true); setError(""); try { const response = await fetch("/api/interview/summary", { method: "POST", headers: getApiHeaders(), body: JSON.stringify({ interviewType: type, history }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setSummary(data); } catch (e: any) { setError(e.message || "Could not prepare the summary."); } finally { setLoading(false); } };
  const startRecording = () => {
    if (!SpeechRecognition || recognitionRef.current) return;
    setError("");
    const contextError = microphoneContextProblem();
    if (contextError) { setError(contextError); return; }
    stopQuestionAudio();
    const recognition = new SpeechRecognition(); recognition.continuous = true; recognition.interimResults = false; recognition.lang = "en-US";
    recognition.onresult = (event: any) => { let transcript = ""; for (let i = event.resultIndex; i < event.results.length; i += 1) transcript += event.results[i][0].transcript; setAnswer(current => `${current}${current && transcript ? " " : ""}${transcript}`.trim()); };
    recognition.onstart = () => { setRecording(true); setVoiceStatus("Recording… Speak naturally, then stop and review the transcript."); };
    recognition.onend = () => { if (recognitionRef.current !== recognition) return; setRecording(false); setVoiceStatus(""); recognitionRef.current = null; };
    recognition.onerror = (event: any) => { if (recognitionRef.current !== recognition) return; setRecording(false); recognitionRef.current = null; setVoiceStatus(""); setError(microphoneProblem(event?.error)); };
    recognitionRef.current = recognition;
    setRecording(true); setVoiceStatus("Waiting for microphone permission… Choose Allow if prompted.");
    try { recognition.start(); } catch { recognitionRef.current = null; setRecording(false); setError("Voice recording could not start. You can continue in text mode."); }
  };
  const stopRecording = () => { if (!recognitionRef.current) return; recognitionRef.current.stop(); setRecording(false); setVoiceStatus("Finalizing transcript…"); };

  const previous = history.filter(item => item.question === question && item.attempt < attemptNumber).at(-1);
  return <section className="bg-white rounded-xl border border-[#E7DEC8] p-5 sm:p-6 shadow-xs space-y-5">
    {demoMode && <p className="demo-section-note">Sample demonstration · Questions and feedback are prepared examples. The example feedback does not evaluate your answer. Run live analysis to practice with personalized AI feedback.</p>}
    <div><h3 className="text-base font-bold text-[#22302E]">Personalized Interview Coach</h3><p className="text-xs text-[#22302E]/70 mt-1">Questions and follow-ups use your latest saved resume, job description, and grounded match analysis.</p></div>
    <div className="flex flex-wrap gap-2">{TYPES.map(item => <button type="button" disabled={Boolean(question) && !summary && !demoFinished} aria-pressed={type === item} key={item} onClick={() => setType(item)} className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${type === item ? "bg-[#1E6A63] text-white border-[#1E6A63]" : "bg-[#FAF6EE] border-[#E7DEC8]"}`}>{item}</button>)}</div>
    <div className="voice-settings"><label><input type="checkbox" checked={readQuestions} onChange={e => setReadQuestions(e.target.checked)} />Read new questions aloud</label><label>Speaking pace<select aria-label="Question speaking pace" value={speechRate} onChange={e => setSpeechRate(Number(e.target.value))}><option value={0.8}>Slower</option><option value={0.96}>Natural</option><option value={1.12}>Faster</option></select></label></div>
    {contextChanged && <p role="status" className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">Your application materials changed. Download these practice notes, then start a new interview to use the updated materials.</p>}
    {question && <div className="flex flex-wrap gap-2"><button type="button" disabled={loading || recording} onClick={() => { stopQuestionAudio(); setQuestion(""); setSummary(null); setFeedback(null); setHistory([]); setAnswer(""); setSessionContext(""); }} className="workspace-action"><RefreshCcw className="w-4 h-4" />New practice session</button><button type="button" className="workspace-action" onClick={() => downloadTextFile("ATS-Coach-Interview-Practice.txt", [`ATS Coach AI — ${type}`, "Educational practice notes. Review facts before sharing.", "", ...history.flatMap(item => [`Question: ${item.question}`, `Attempt ${item.attempt}`, item.answer, `What worked: ${item.feedback.worked_well.join("; ")}`, `What to improve: ${item.feedback.could_improve.join("; ")}`, `Suggestion: ${item.feedback.suggestion}`, ""]), ...(answer ? ["Current question:", question, "Current answer draft:", answer] : [])].join("\n"))}><Download className="w-4 h-4" />Download practice notes</button></div>}
    {demoFinished && <p role="status" className="demo-section-note">You have explored the sample practice flow. Download your notes, start a new sample, or run live analysis to get personalized AI feedback. No readiness score is assigned to this example.</p>}
    {!question && <button type="button" onClick={start} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E6A63] text-white text-xs font-bold disabled:opacity-50 cursor-pointer">{loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}{demoMode ? "Start sample interview" : "Start Personalized Interview"}</button>}
    {question && !summary && !demoFinished && <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[#FAF6EE] border border-[#E7DEC8]"><p className="text-[11px] uppercase tracking-wide font-bold text-[#1E6A63]">AI Question · Attempt {attemptNumber}</p><p className="text-sm font-semibold mt-2 leading-relaxed">{question}</p><div className="mt-3 flex flex-wrap items-center gap-2">{speechPlaybackAvailable ? (!speaking ? <button type="button" onClick={speakQuestion} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#D8CFBC] text-xs font-semibold cursor-pointer"><Volume2 className="w-4 h-4" />Hear Question</button> : <button type="button" onClick={stopQuestionAudio} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#D8CFBC] text-xs font-semibold cursor-pointer"><Square className="w-3.5 h-3.5" />Stop Audio</button>) : <span className="text-[11px] text-[#22302E]/60">Spoken-question playback is unavailable in this browser.</span>}</div></div>
      <label className="block"><span className="text-xs font-semibold">Candidate answer / editable transcript</span><textarea aria-label="Interview answer or editable transcript" value={answer} onChange={e => setAnswer(e.target.value)} rows={7} className="mt-2 w-full rounded-xl border border-[#D8CFBC] p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1E6A63]/30" placeholder="Type your answer, or record and review the transcript before submitting..." /></label>
      <div className="flex flex-wrap items-center gap-2">
        {SpeechRecognition ? <>{!recording ? <button type="button" onClick={startRecording} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E7DEC8] text-xs font-semibold cursor-pointer"><Mic className="w-4 h-4" />Start Recording</button> : <button type="button" onClick={stopRecording} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold cursor-pointer"><Square className="w-4 h-4" />Stop Recording</button>}</> : <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs"><MicOff className="w-4 h-4" />Voice recognition unavailable — text mode active</span>}
        <button type="button" onClick={submit} disabled={!answer.trim() || loading || recording || contextChanged} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E6A63] text-white text-xs font-bold disabled:opacity-50 cursor-pointer">{loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Submit Answer</button>
      </div>
      {voiceStatus && <p aria-live="polite" className="text-xs font-medium text-[#1E6A63]">{voiceStatus}</p>}
      <details className="text-xs text-[#22302E]/70"><summary className="cursor-pointer">How to enable microphone access</summary><p className="mt-2">In Chrome, open the controls beside the address bar → Site settings → Microphone → Allow, then reload. In Windows Settings → Privacy &amp; security → Microphone, enable Microphone access and Let desktop apps access your microphone. If an embedded preview blocks recording, open the published app in a separate browser tab.</p></details>
      {feedback && <div className="space-y-4 border-t border-[#E7DEC8] pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FeedbackList title="What Worked Well" items={feedback.worked_well} tone="emerald" /><FeedbackList title="What Could Improve" items={feedback.could_improve} tone="amber" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FeedbackText title="Why" text={feedback.why} /><FeedbackText title="Suggestion" text={feedback.suggestion} /></div>
        {previous && <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs"><p className="font-bold text-sky-900">Attempt {previous.attempt} vs Attempt {attemptNumber}</p><p className="mt-1 text-sky-800">Previous suggestion: {previous.feedback.suggestion}</p><p className="mt-1 text-sky-800">Current suggestion: {feedback.suggestion}</p></div>}
        <div className="p-3 rounded-xl bg-violet-50 border border-violet-200"><p className="text-[11px] font-bold uppercase text-violet-800">Dynamic Follow-Up</p><p className="text-sm mt-1">{feedback.follow_up_question}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={tryAgain} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E7DEC8] text-xs font-semibold cursor-pointer"><RefreshCcw className="w-4 h-4" />Try Again</button><button type="button" onClick={nextQuestion} className="px-3.5 py-2 rounded-xl bg-[#1E6A63] text-white text-xs font-bold cursor-pointer">Answer Follow-Up</button><button type="button" onClick={finish} className="px-3.5 py-2 rounded-xl bg-[#22302E] text-white text-xs font-bold cursor-pointer">End Session & View Summary</button></div>
      </div>}
    </div>}
    {summary && <InterviewSummaryView summary={summary} />}
    {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">{error}</div>}
  </section>;
}

function FeedbackList({ title, items, tone }: { title: string; items: string[]; tone: "emerald" | "amber" }) { return <div className={`p-4 rounded-xl border ${tone === "emerald" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}><p className="text-[11px] font-bold uppercase">{title}</p><ul className="mt-2 space-y-1">{items.map((item, index) => <li key={index} className="text-xs">• {item}</li>)}</ul></div>; }
function FeedbackText({ title, text }: { title: string; text: string }) { return <div className="p-4 rounded-xl border border-[#E7DEC8]"><p className="text-[11px] font-bold uppercase text-[#22302E]/60">{title}</p><p className="text-xs leading-relaxed mt-2">{text}</p></div>; }
function InterviewSummaryView({ summary }: { summary: InterviewSummary }) { const scores = [["Communication", summary.communication], ["Relevance", summary.relevance], ["Behavioral structure", summary.behavioral_structure], ["Technical explanation", summary.technical_explanation], ["Specificity", summary.specificity]] as const; return <div className="space-y-4"><div><h4 className="font-bold">Interview Session Summary</h4><p className="text-xs text-[#22302E]/70">Educational Interview Readiness Estimate — not a hiring or offer probability.</p></div><div className="grid grid-cols-2 md:grid-cols-5 gap-3">{scores.map(([label, score]) => <div key={label} className="p-3 rounded-xl bg-[#FAF6EE] border border-[#E7DEC8] text-center"><p className="text-xl font-bold text-[#1E6A63]">{score}</p><p className="text-[10px] mt-1">{label}</p></div>)}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FeedbackList title="Strongest Areas" items={summary.strongest_areas} tone="emerald" /><FeedbackList title="Areas to Improve" items={summary.areas_to_improve} tone="amber" /></div><FeedbackText title="Recommended Next Practice Focus" text={summary.recommended_next_focus} /></div>; }
