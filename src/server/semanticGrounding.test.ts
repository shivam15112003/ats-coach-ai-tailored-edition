import {test} from "node:test";
import assert from "node:assert/strict";
import {semanticReviewIssue,ResumeClaim} from "./semanticGrounding";
const original="Developed a model that increased the score to 82% using Python.";
const claim:ResumeClaim={id:0,section:"experience",context:"Engineer | Sample Lab",text:"Built a Python model, raising the score to 82 percent."};
const review={checks:[{id:0,supported:true,reason:"Equivalent facts and meaning",source_quotes:[original]}]};
test("accepts equivalent phrasing and percent formatting",()=>assert.equal(semanticReviewIssue(original,[claim],review),null));
test("rejects changed numbers even if an audit incorrectly says supported",()=>assert.match(semanticReviewIssue(original,[{...claim,text:claim.text.replace('82','92')}],review)!,/number/));
test("rejects a change from increased to 82% to increased by 82%",()=>assert.match(semanticReviewIssue(original,[{...claim,text:"Increased the score by 82%."}],{checks:[{...review.checks[0],supported:false,reason:"By 82% changes the original outcome of to 82%"}]})!,/changes or adds facts/));
test("rejects invented evidence and missing claim audits",()=>{
 assert.match(semanticReviewIssue(original,[claim],{checks:[{...review.checks[0],source_quotes:['A fabricated quote']} ]})!,/number|evidence/);
 assert.match(semanticReviewIssue(original,[claim],{checks:[]})!,/Not every/);
});

test("rejects to-versus-by percentage changes even when the audit says supported",()=>assert.match(semanticReviewIssue(original,[{...claim,text:"Increased the score by 82 percent."}],review)!,/percentage meaning/));

test("does not mistake 8.2 percent evidence for an invented 82 percent quote",()=>assert.match(semanticReviewIssue(original.replace('82%','8.2%'),[claim],review)!,/evidence/));
