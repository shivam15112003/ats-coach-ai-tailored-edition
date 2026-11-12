import { test } from "node:test";
import assert from "node:assert/strict";
import { projectLayoutIssue, RESUME_CONTENT_RULES, sourceOnlyIssue, summaryNeedsReview, summaryEvidenceIssue } from "./resumeRequirements";
function resume(projects: number, bullets: number) {
  return "Sample Candidate\nACADEMIC PROJECTS\n" + Array.from({length:projects}, (_, i) =>
    `Project ${i+1} | Python |\n` + Array.from({length:bullets}, (_, j) => `- Supported contribution ${i+1} step ${j+1}.`).join("\n")).join("\n");
}
test("accepts 3 projects with 4 points and 4 projects with 3 points", () => {
  assert.equal(projectLayoutIssue(resume(4,4),resume(3,4)), null);
  assert.equal(projectLayoutIssue(resume(4,4),resume(4,3)), null);
});
test("requests correction when supported projects or bullets are dropped", () => {
  assert.match(projectLayoutIssue(resume(4,4),resume(2,3))!, /3 projects with 4/);
  assert.match(projectLayoutIssue(resume(4,4),resume(3,3))!, /3 projects with 4/);
});
test("preserves a source with only two projects instead of requiring invention", () => {
  assert.equal(projectLayoutIssue(resume(2,3),resume(2,3)), null);
  assert.match(RESUME_CONTENT_RULES, /take priority over word, project, and bullet targets/);
});
test("rejects invented project names even when the count is correct", () => {
  assert.match(projectLayoutIssue(resume(3,4),resume(3,4).replace('Project 3 |','Imaginary Project |'))!, /absent from the original/);
});

const original = `Sample Candidate
SUMMARY
Engineering graduate working with laboratory measurements.
EDUCATION
Sample University | MS Robotics | 2026 |
EXPERIENCE
Engineer | Sample Lab | 2025 |
- Wrote Python scripts for laboratory measurements.
TECHNICAL SKILLS
Languages: Python
ACADEMIC PROJECTS
Navigation | Python |
- Tested waypoint navigation in simulation.
Dashboard | Python |
- Displayed sensor measurements for laboratory users.`;
test("accepts exact original factual content", () => assert.equal(sourceOnlyIssue(original,original), null));
test("rejects invented metrics, technologies, employers, and GPA", () => {
  assert.match(sourceOnlyIssue(original,original.replace('Wrote Python scripts','Improved efficiency by 35% using Python scripts'))!, /Unsupported experience/);
  assert.match(sourceOnlyIssue(original,original.replace('Languages: Python','Languages: Python, TensorFlow'))!, /Unsupported skill/);
  assert.match(sourceOnlyIssue(original,original.replace('Sample Lab','New Employer'))!, /Unsupported experience/);
  assert.match(sourceOnlyIssue(original,original.replace('MS Robotics | 2026 |','MS Robotics | 2026 |\nGPA: 4.0/4'))!, /Unsupported education/);
});
test("routes new summary wording to review while keeping experience extractive", () => {
  const tailored=original.replace('Engineering graduate working with laboratory measurements.','Develops Python tools for laboratory measurements.');
  assert.equal(sourceOnlyIssue(original,tailored),null);
  assert.equal(summaryNeedsReview(original,'Develops Python tools for laboratory measurements.'),true);
  assert.match(sourceOnlyIssue(original,original.replace('Wrote Python scripts for laboratory measurements.','Wrote Python scripts to optimize performance.'))!, /Unsupported experience/);
});

test("rejects moving an existing achievement to a different project", () => {
  const swapped=original.replace('- Tested waypoint navigation in simulation.','- Displayed sensor measurements for laboratory users.');
  assert.match(sourceOnlyIssue(original,swapped)!, /original project/);
});

test("allows a grounded new summary when the original has no summary section", () => {
  const noSummary=original.replace('SUMMARY\nEngineering graduate working with laboratory measurements.\n','');
  const summary='Develops Python tools for laboratory measurements and tests navigation in simulation.';
  const tailored=noSummary.replace('Sample Candidate\n','Sample Candidate\nSUMMARY\n'+summary+'\n');
  assert.equal(sourceOnlyIssue(noSummary,tailored),null);
  assert.equal(summaryNeedsReview(noSummary,summary),true);
  assert.equal(summaryEvidenceIssue(noSummary,summary,{
    supported:true, unsupported_claims:[], evidence_quotes:[
      'Wrote Python scripts for laboratory measurements.',
      'Tested waypoint navigation in simulation.',
    ],
  }),null);
});

test("rejects a summary audit with unsupported claims or invented references", () => {
  const summary='Award-winning expert with ten years of robotics experience.';
  assert.match(summaryEvidenceIssue(original,summary,{supported:false,unsupported_claims:['Ten years are not established'],evidence_quotes:[]})!, /unsupported claims/);
  assert.match(summaryEvidenceIssue(original,summary,{supported:true,unsupported_claims:[],evidence_quotes:['Invented quote.']})!, /does not quote/);
  assert.match(summaryEvidenceIssue(original,summary,null)!, /no valid/);
  assert.match(summaryEvidenceIssue(original,summary,{supported:true,unsupported_claims:[],evidence_quotes:[]})!, /missing/);
});

test("does not require an extra review for absent or verbatim source summaries", () => {
  assert.equal(summaryNeedsReview(original,''),false);
  assert.equal(summaryNeedsReview(original,'Engineering graduate working with laboratory measurements.'),false);
  assert.equal(summaryEvidenceIssue(original,'Engineering graduate working with laboratory measurements.',null),null);
});
