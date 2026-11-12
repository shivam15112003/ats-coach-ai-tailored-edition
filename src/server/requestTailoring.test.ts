import {test} from "node:test";
import assert from "node:assert/strict";
import {requestTailoring} from "../utils/requestTailoring";
test("shows the failure reason and automatically sends a strict retry",async()=>{
 const calls:any[]=[];const notices:string[]=[];
 const fetcher=(async(_:unknown,options:any)=>{
  calls.push(JSON.parse(options.body));
  return calls.length===1?new Response(JSON.stringify({retryable:true,error:'Changed 82% to 92%'}),{status:422}):new Response(JSON.stringify({generation_mode:'ai_rephrased',tailored_resume_markdown:'Checked resume'}));
 }) as typeof fetch;
 const result=await requestTailoring({originalResumeText:'score to 82%'},{},new AbortController().signal,r=>notices.push(r),fetcher);
 assert.equal(calls.length,2);assert.equal(calls[1].strictRetry,true);
 assert.equal(calls[1].previousFailure,'Changed 82% to 92%');
 assert.deepEqual(notices,['Changed 82% to 92%']);assert.equal(result.generation_mode,'ai_rephrased');
});
test("returns a source-preserving PDF after the strict retry instead of throwing away the result",async()=>{
 let calls=0;
 const fetcher=(async()=>++calls===1?new Response(JSON.stringify({retryable:true,error:'Unsupported new claim'}),{status:422}):new Response(JSON.stringify({generation_mode:'source_preserved',tailored_pdf_base64:'JVBERi0=',generation_notice:'Original content preserved'}))) as typeof fetch;
 const result=await requestTailoring({},{},new AbortController().signal,()=>{},fetcher);
 assert.equal(result.generation_mode,'source_preserved');assert.ok(result.tailored_pdf_base64);
});

test("two rejected drafts trigger a third AI result without another gate",async()=>{
 const calls:any[]=[];const notices:string[]=[];
 const fetcher=(async(_:unknown,options:any)=>{const body=JSON.parse(options.body);calls.push(body);return calls.length<3?new Response(JSON.stringify({retryable:true,error:'Meaning mismatch '+calls.length}),{status:422}):new Response(JSON.stringify({generation_mode:'ai_final',tailored_resume_markdown:'Third AI draft',tailored_pdf_base64:'JVBERi0='}));}) as typeof fetch;
 const result=await requestTailoring({},{},new AbortController().signal,r=>notices.push(r),fetcher);
 assert.deepEqual(calls.map(c=>c.attempt),[1,2,3]);assert.equal(calls[2].finalAttempt,true);assert.equal(notices.length,2);assert.equal(result.generation_mode,'ai_final');
});
