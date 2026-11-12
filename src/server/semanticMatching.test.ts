import test from "node:test";
import assert from "node:assert/strict";
import { classifyRequirementMatches, evidenceIsGrounded, unsupportedHardTechnology } from "./semanticMatching";

test("classifies autonomous perception as related rather than exact", () => {
  const resume = "Built a computer vision pipeline for robotic object detection.";
  const job = "Experience developing autonomous perception systems.";
  const result = classifyRequirementMatches({}, resume, job);
  assert.equal(result.exact.length, 0);
  assert.equal(result.semantic.length, 1);
  assert.match(result.semantic[0].explanation, /does not establish explicit/i);
});

test("keeps Kubernetes Terraform and Apache Spark missing", () => {
  const resume = "Built Python data services and SQL dashboards.";
  const job = "Requires Kubernetes, Terraform, and Apache Spark.";
  const result = classifyRequirementMatches({
    semantic_matches: [
      { requirement: "Kubernetes", resume_evidence: "Python data services", explanation: "Both are infrastructure related." },
      { requirement: "Terraform", resume_evidence: "Python data services", explanation: "Both automate systems." },
      { requirement: "Apache Spark", resume_evidence: "SQL dashboards", explanation: "Both relate to data." },
    ],
  }, resume, job);
  assert.equal(result.semantic.length, 0);
  assert.deepEqual(result.missing.map((item) => item.requirement), ["Kubernetes", "Terraform", "Apache Spark"]);
});

test("rejects unsupported application-answer technology and fabricated evidence", () => {
  const context = "Python, React, PostgreSQL";
  assert.equal(unsupportedHardTechnology("How many years of Kubernetes experience?", context), "Kubernetes");
  assert.equal(evidenceIsGrounded(["Python"], context), true);
  assert.equal(evidenceIsGrounded(["Kubernetes"], context), false);
});
