import { useEffect, useRef, useState } from "react";
import { microphoneContextProblem, microphoneProblem } from "../utils/voice";
import { playSpeech } from "../utils/speechPlayback";

export function useVoice() {
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const recognition = useRef<any>(null);
  const cancelPlayback = useRef<(() => void) | null>(null);
  const Recognition = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;
  const playbackAvailable = typeof window !== "undefined" && "speechSynthesis" in window;
  useEffect(() => () => { recognition.current?.abort(); cancelPlayback.current?.(); }, []);
  const stopAudio = () => { cancelPlayback.current?.(); cancelPlayback.current = null; setSpeaking(false); setStatus(""); };
  const speak = (text: string) => {
    if (!playbackAvailable || !text.trim() || recognition.current) return;
    stopAudio(); setError("");
    setSpeaking(true); setStatus("Starting question audio…");
    cancelPlayback.current = playSpeech(text, 0.96, { onStart: () => setStatus("Reading aloud…"), onEnd: () => { setSpeaking(false); setStatus(""); }, onError: message => { setSpeaking(false); setStatus(""); setError(message); } });
  };
  const record = (onTranscript: (text: string) => void) => {
    if (recognition.current) return;
    stopAudio(); setError("");
    const contextError = microphoneContextProblem();
    if (contextError) { setError(contextError); return; }
    if (!Recognition) { setError("Speech recognition is unavailable in this browser. Try desktop Chrome or continue typing."); return; }
    const session = new Recognition();
    session.lang = "en-US"; session.continuous = true; session.interimResults = false;
    session.onresult = (event: any) => {
      const segments: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index++) if (event.results[index].isFinal) segments.push(event.results[index][0].transcript);
      if (segments.length) onTranscript(segments.join(" "));
    };
    session.onstart = () => setStatus("Recording… Stop and review your transcript before submitting.");
    session.onend = () => { if (recognition.current === session) { recognition.current = null; setRecording(false); setStatus(""); } };
    session.onerror = (event: any) => { if (recognition.current === session) { recognition.current = null; setRecording(false); } setError(microphoneProblem(event.error)); setStatus(""); };
    recognition.current = session; setRecording(true); setStatus("Waiting for microphone permission… Choose Allow if prompted.");
    try { session.start(); } catch (event: any) { recognition.current = null; setRecording(false); setStatus(""); setError(microphoneProblem(event.name)); }
  };
  const stopRecording = () => { if (!recognition.current) return; recognition.current.stop(); setStatus("Finalizing transcript…"); };
  const cancelRecording = () => { recognition.current?.abort(); recognition.current = null; setRecording(false); setStatus(""); };
  return { recording, speaking, status, error, playbackAvailable, recognitionAvailable: !!Recognition, speak, stopAudio, record, stopRecording, cancelRecording };
}
