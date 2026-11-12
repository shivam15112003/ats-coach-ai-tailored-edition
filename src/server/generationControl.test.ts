import {test} from "node:test";
import assert from "node:assert/strict";
import {boundedGeneration, GenerationTimeoutError, unsupportedArchitected} from "./generationControl";

test("accepts architected when that exact verb already appears in the original", () => {
  assert.equal(unsupportedArchitected("Architected a multi-agent AI framework.","Architected a multi-agent AI framework."),false);
  assert.equal(unsupportedArchitected("- ARCHITECTED monitoring tools.","Architected monitoring tools."),false);
});
test("still rejects architected added to a developed-only source", () => {
  assert.equal(unsupportedArchitected("Developed monitoring tools.","Architected monitoring tools."),true);
});
test("times out a provider that never resolves and signals cancellation", async () => {
  let signal: AbortSignal | undefined;
  await assert.rejects(boundedGeneration(s => {signal=s; return new Promise(()=>{});},20),GenerationTimeoutError);
  assert.equal(signal?.aborted,true);
});
test("forwards user cancellation even if the provider ignores it", async () => {
  const parent=new AbortController();
  const result=boundedGeneration(()=>new Promise(()=>{}),1000,parent.signal);
  parent.abort(new Error("User cancelled"));
  await assert.rejects(result,/User cancelled/);
});
test("does not start work with an exhausted deadline", async () => {
  let started=false;
  await assert.rejects(boundedGeneration(async()=>{started=true;},0),GenerationTimeoutError);
  assert.equal(started,false);
});
