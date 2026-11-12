import test from "node:test";
import assert from "node:assert/strict";
import { parseWorkspace, type Workspace } from "./workspace";
import { DEMO_ANALYSIS, demoApplicationAnswer } from "../data/demo";
import { SAMPLE_RESUME } from "../sampleData";

const saved = (): Workspace => ({ format: "ats-coach-workspace", version: 1, savedAt: "2026-11-09T00:00:00Z", name: "A role", resumeText: "An original resume", originalText: "The preserved baseline", resumePdf: null, resumeFileName: null, jobDescription: "Target role", analysis: DEMO_ANALYSIS, tailoring: { tailored_resume_markdown: "Reviewed document text", tailored_resume_latex: "UNTRUSTED EXECUTABLE SOURCE", new_overall_score: 90, generation_mode: "source_preserved", changes_explanation: [], general_coaching_tip: "Keep your evidence", tailored_resume_style: { fontFamily: "Georgia", fontSize: 12, lineHeight: 1.4, paragraphSpacing: 9, pageMargin: 48 } }, coverLetter: null, screen: 3, demo: false, checks: { facts: true, formatting: false, downloaded: false } });

test("workspace round-trip preserves reviewed text, original baseline, evidence, and safe formatting", () => {
  const actual = parseWorkspace(JSON.stringify(saved()));
  assert.equal(actual.originalText, "The preserved baseline");
  assert.equal(actual.tailoring?.tailored_resume_markdown, "Reviewed document text");
  assert.equal(actual.tailoring?.tailored_resume_style?.fontFamily, "Georgia");
  assert.equal(actual.analysis?.semantic_matches?.[0].classification, "semantic");
  assert.equal(actual.checks.facts, true);
  assert.equal(actual.screen, 3);
  assert.equal(actual.tailoring?.tailored_resume_latex, undefined);
});
test("import whitelists fields instead of restoring credentials or executable source", () => {
  const actual = parseWorkspace(JSON.stringify({ ...saved(), apiKey: "MUST-NOT-RESTORE", __proto__: { injected: true }, coverLetter: { letter_markdown: "Letter", recipient_title: "Manager", company_name: "Company", job_title: "Role", key_alignments: [], compiled_latex: "UNTRUSTED" } }));
  assert.equal(Object.hasOwn(actual, "apiKey"), false);
  assert.equal(Object.hasOwn(actual, "injected"), false);
  assert.equal(actual.coverLetter?.compiled_latex, undefined);
});
test("invalid shape, unsupported version, non-finite scores and invalid evidence fail before state replacement", () => {
  for (const bad of [null, [], { ...saved(), version: 5 }, { ...saved(), analysis: { ...DEMO_ANALYSIS, overall_score: 101 } }, { ...saved(), analysis: { ...DEMO_ANALYSIS, exact_matches: [{ requirement: "x", classification: "invented", explanation: "x" }] } }, { ...saved(), tailoring: { ...saved().tailoring, tailored_resume_style: { fontFamily: "url(attack)", fontSize: 12 } } }]) assert.throws(() => parseWorkspace(JSON.stringify(bad)));
});
test("restoration derives navigation from available content and rejects orphan documents", () => {
  assert.equal(parseWorkspace(JSON.stringify({ ...saved(), screen: 3, tailoring: null, analysis: null })).screen, 1);
  assert.throws(() => parseWorkspace(JSON.stringify({ ...saved(), analysis: null })));
  assert.throws(() => parseWorkspace(JSON.stringify({ ...saved(), resumePdf: "not a PDF" })));
});
test("sample answers withhold prepared claims if supporting source text was removed", () => {
  assert.equal(demoApplicationAnswer("Describe your experience with Python.", SAMPLE_RESUME.replace("Automated Study Group Matcher | Python, Flask, SQLite", "Study Group Matcher")).status, "needs_info");
  assert.equal(demoApplicationAnswer("Tell us about a relevant project.", SAMPLE_RESUME.replace("Used PostgreSQL to store listing information and user details", "")).status, "needs_info");
  assert.equal(demoApplicationAnswer("Describe your experience with Python.").status, "grounded");
  assert.equal(demoApplicationAnswer("Describe your experience with Python.", "No evidence of that experience").status, "needs_info");
  assert.equal(demoApplicationAnswer("Tell us about a relevant project.", "No projects provided").evidence.length, 0);
  assert.equal(demoApplicationAnswer("What experience do you have with robotics?").status, "needs_info");
});
