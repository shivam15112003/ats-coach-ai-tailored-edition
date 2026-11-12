import test from "node:test";
import assert from "node:assert/strict";
import { playSpeech } from "./speechPlayback";

test("speech playback retains its prompt, resumes the queue, and ignores stale cancellation", () => {
  const previousWindow = (globalThis as any).window;
  const previousUtterance = (globalThis as any).SpeechSynthesisUtterance;
  let queued: any, timer: (() => void) | undefined, cancellations = 0, resumed = 0, started = 0, ended = 0;
  const errors: string[] = [];
  (globalThis as any).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
  (globalThis as any).window = { setTimeout: (callback: () => void) => { timer = callback; return 1; }, clearTimeout: () => {}, speechSynthesis: { getVoices: () => [{ lang: "en-US", localService: true }], cancel: () => { cancellations++; }, resume: () => { resumed++; }, speak: (value: any) => { queued = value; } } };
  try {
    const events = { onStart: () => { started++; }, onEnd: () => { ended++; }, onError: (message: string) => errors.push(message) };
    const cancel = playSpeech("A question", 0.8, events);
    assert.equal(queued.text, "A question"); assert.equal(queued.rate, 0.8); assert.equal(resumed, 2);
    queued.onstart(); timer?.(); assert.equal(started, 1); assert.equal(errors.length, 0);
    queued.onend(); assert.equal(ended, 1);
    const before = cancellations; cancel(); assert.equal(cancellations, before, "A finished prompt must not cancel another component's audio");
    const cancelPending = playSpeech("Another question", 1, events);
    timer?.(); assert.match(errors[0], /did not start/);
    cancelPending();
    const cancelActive = playSpeech("Third question", 1, events);
    const prompt = queued; cancelActive(); assert.equal(prompt.onstart, null); assert.equal(prompt.onerror, null);
  } finally { (globalThis as any).window = previousWindow; (globalThis as any).SpeechSynthesisUtterance = previousUtterance; }
});
