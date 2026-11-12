/** Queue one spoken prompt and return a cancellation handle for tab switches. */
export function playSpeech(text: string, rate: number, events: { onStart: () => void; onEnd: () => void; onError: (message: string) => void }): () => void {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  let done = false;
  let started = false;
  const timeout = window.setTimeout(() => {
    if (done || started) return;
    done = true;
    synth.cancel();
    events.onError("Question audio did not start. Check your speakers and browser sound settings, then try Hear Question again. The written text remains available.");
  }, 6000);
  const finish = () => { done = true; window.clearTimeout(timeout); };
  utterance.lang = "en-US";
  utterance.rate = rate;
  const voices = synth.getVoices();
  const voice = voices.find(v => /^en[-_]US/i.test(v.lang) && v.localService) || voices.find(v => /^en/i.test(v.lang));
  if (voice) utterance.voice = voice;
  utterance.onstart = () => { if (!done) { started = true; window.clearTimeout(timeout); events.onStart(); } };
  utterance.onend = () => { if (!done) { finish(); events.onEnd(); } };
  utterance.onerror = event => { if (!done) { finish(); if (event.error === "canceled" || event.error === "interrupted") events.onEnd(); else events.onError("Audio could not play. Check your speakers and browser sound settings, or continue with the written text."); } };
  synth.cancel();
  synth.resume();
  synth.speak(utterance);
  synth.resume();
  // Retaining the utterance with this handle also keeps event callbacks alive.
  return () => { const wasDone = done; finish(); utterance.onstart = null; utterance.onend = null; utterance.onerror = null; if (!wasDone) synth.cancel(); };
}
