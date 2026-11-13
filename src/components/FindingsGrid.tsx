import { CheckCircle2, AlertTriangle, Lightbulb, Tag, GitCompareArrows } from "lucide-react";
import { RequirementMatch } from "../types";

interface FindingsGridProps {
  strengths: string[];
  matchingSkills: string[];
  missingSkills: string[];
  shortDescriptionWarning: boolean;
  exactMatches?: RequirementMatch[];
  semanticMatches?: RequirementMatch[];
  missingRequirements?: RequirementMatch[];
}

export function FindingsGrid({
  strengths,
  matchingSkills,
  missingSkills,
  shortDescriptionWarning,
  exactMatches = [],
  semanticMatches = [],
  missingRequirements = [],
}: FindingsGridProps) {
  return (
    <div className="space-y-6">
      {/* Short Job Description Alert (Conditional) */}
      {shortDescriptionWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">
              Short job description detected.
            </p>
            <p className="text-amber-800 leading-relaxed">
              Analysis is based on limited text, which may reduce keyword scoring depth. For more accurate ATS matching, paste the complete employer posting including qualifications and responsibilities.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E7DEC8] p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#E7DEC8]/70">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center"><GitCompareArrows className="w-4 h-4 text-sky-700" /></div>
          <div><h3 className="text-sm font-bold text-[#22302E]">Requirement Classification</h3><p className="text-[11px] text-[#22302E]/70">Exact evidence is separated from related experience and unsupported requirements.</p></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <MatchColumn title="Exact Match" tone="emerald" items={exactMatches} empty="No additional exact requirement matches classified." />
          <MatchColumn title="Semantic / Transferable Match" tone="sky" items={semanticMatches} empty="No defensible transferable matches found." />
          <MatchColumn title="Missing Requirement" tone="stone" items={missingRequirements} empty="No additional missing requirements classified." />
        </div>
      </div>

      {/* Two-Column Findings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column A: Identified Strengths & Matching Skills */}
        <div className="bg-white rounded-xl border border-[#E7DEC8] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#E7DEC8]/70">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#1E6A63]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#22302E]">
                  Identified Strengths & Matching Skills
                </h3>
                <p className="text-[11px] text-[#22302E]/70">
                  Qualifications found in both your resume and the posting
                </p>
              </div>
            </div>

            {/* Matching Skills Badges */}
            <div className="mt-4">
              <span className="text-[11px] font-semibold text-[#22302E]/60 uppercase tracking-wider block mb-2">
                Confirmed Keyword Overlap ({matchingSkills.length})
              </span>
              {matchingSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {matchingSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#1E6A63]" />
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#22302E]/60 italic">
                  No exact matching keywords identified yet.
                </p>
              )}
            </div>

            {/* Identified Strengths List */}
            <div className="mt-5">
              <span className="text-[11px] font-semibold text-[#22302E]/60 uppercase tracking-wider block mb-2">
                Key Strategic Strengths
              </span>
              <ul className="space-y-2.5">
                {strengths.map((strength, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 text-xs text-[#22302E] leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1E6A63] mt-1.5 shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-[#E7DEC8]/60 text-[11px] text-[#1E6A63] font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>These strengths provide high ATS signal and should be retained and highlighted.</span>
          </div>
        </div>

        {/* Column B: Missing or Weakly Represented Keywords */}
        <div className="bg-white rounded-xl border border-[#E7DEC8] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#E7DEC8]/70">
              <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
                <Tag className="w-4 h-4 text-stone-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#22302E]">
                  Missing or Weakly Represented Keywords
                </h3>
                <p className="text-[11px] text-[#22302E]/70">
                  Target job requirements not clearly evidenced in your resume
                </p>
              </div>
            </div>

            {/* Missing Skills Pill Tags */}
            <div className="mt-4">
              <span className="text-[11px] font-semibold text-[#22302E]/60 uppercase tracking-wider block mb-2">
                Requirements Missing from Resume ({missingSkills.length})
              </span>
              {missingSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {missingSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#22302E]/60 italic">
                  No critical missing keywords identified.
                </p>
              )}
            </div>

            {/* Educational Coaching Box */}
            <div className="mt-5 p-3.5 rounded-lg bg-[#FAF6EE] border border-[#E7DEC8]">
              <div className="flex items-start gap-2 text-xs text-[#22302E]">
                <Lightbulb className="w-4 h-4 text-[#1E6A63] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-[#1E6A63]">
                    ATS Integrity Principle:
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#22302E]/80">
                    If you have authentic experience with any of these items from class labs, personal projects, or internships, reframe your existing bullets to state them explicitly. If you do not have that experience, demonstrate it through a tailored project instead of claiming it in a real role.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-[#E7DEC8]/60 text-[11px] text-[#22302E]/70">
            Tailoring will align terminology where authentic coursework or projects support it.
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchColumn({ title, tone, items, empty }: { title: string; tone: "emerald" | "sky" | "stone"; items: RequirementMatch[]; empty: string }) {
  const classes = tone === "emerald" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : tone === "sky" ? "bg-sky-50 border-sky-200 text-sky-900" : "bg-stone-50 border-stone-200 text-stone-800";
  return <div className={`rounded-xl border p-4 ${classes}`}>
    <p className="text-[11px] font-bold uppercase tracking-wide">{title} ({items.length})</p>
    {items.length ? <div className="space-y-3 mt-3">{items.map((item, index) => <div key={`${item.requirement}-${index}`} className="text-xs leading-relaxed">
      <p className="font-semibold">{item.requirement}</p>
      {item.resume_evidence && <p className="mt-1 opacity-80"><span className="font-semibold">Resume evidence:</span> “{item.resume_evidence}”</p>}
      <p className="mt-1 opacity-80">{item.explanation}</p>
    </div>)}</div> : <p className="text-xs mt-3 opacity-70 italic">{empty}</p>}
  </div>;
}
