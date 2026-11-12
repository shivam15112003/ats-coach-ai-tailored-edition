import { Info, HelpCircle } from "lucide-react";

interface ScoreCardProps {
  overallScore: number;
  keywordScore: number;
  impactScore: number;
  readabilityScore: number;
}

export function ScoreCard({
  overallScore,
  keywordScore,
  impactScore,
  readabilityScore,
}: ScoreCardProps) {
  // SVG Circular progress calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, overallScore));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 75) return "#1E6A63"; // Deep teal
    if (score >= 50) return "#D97706"; // Amber
    return "#E2725B"; // Terracotta
  };

  const getScoreBadge = (score: number) => {
    if (score >= 75) {
      return { label: "Strong Foundation", bg: "bg-emerald-50 text-[#1E6A63] border-emerald-200" };
    }
    if (score >= 55) {
      return { label: "Moderate Alignment", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    }
    return { label: "Needs Targeted Tailoring", bg: "bg-rose-50 text-rose-800 border-rose-200" };
  };

  const badge = getScoreBadge(clampedScore);

  return (
    <div className="bg-white rounded-xl border border-[#E7DEC8] p-6 sm:p-7 shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left: Circular Score Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center text-center pb-6 md:pb-0 md:border-r border-[#E7DEC8]/70">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background Ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#EAE2CE"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Progress Ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={getScoreColor(clampedScore)}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold tracking-tight text-[#22302E]">
                {clampedScore}
              </span>
              <span className="text-xs font-semibold text-[#22302E]/60 uppercase tracking-wider">
                out of 100
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-1 text-center">
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.bg}`}
            >
              {badge.label}
            </span>
            <h3 className="text-sm font-bold text-[#22302E]">
              Simulated Educational Match Score
            </h3>
          </div>
        </div>

        {/* Right: Sub-score Breakdown */}
        <div className="md:col-span-7 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-[#22302E] uppercase tracking-wider">
                Sub-Score Breakdown
              </h4>
              <span className="text-[11px] text-[#22302E]/60">
                Formula: 50% Keyword + 30% Impact + 20% Readability
              </span>
            </div>
          </div>

          {/* Sub-score 1: Keyword Alignment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#22302E] flex items-center gap-1.5">
                Keyword Alignment
                <span className="text-[10px] font-normal text-[#22302E]/60">(50% weight)</span>
              </span>
              <span className="font-bold text-[#22302E]">{keywordScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#FAF6EE] rounded-full overflow-hidden border border-[#E7DEC8]">
              <div
                className="h-full rounded-full transition-all duration-800 bg-[#1E6A63]"
                style={{ width: `${Math.max(4, Math.min(100, keywordScore))}%` }}
              />
            </div>
            <p className="text-[11px] text-[#22302E]/70">
              Overlap of core hard skills, frameworks, and job terminology.
            </p>
          </div>

          {/* Sub-score 2: Bullet Impact */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#22302E] flex items-center gap-1.5">
                Bullet Impact & Action Verbs
                <span className="text-[10px] font-normal text-[#22302E]/60">(30% weight)</span>
              </span>
              <span className="font-bold text-[#22302E]">{impactScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#FAF6EE] rounded-full overflow-hidden border border-[#E7DEC8]">
              <div
                className="h-full rounded-full transition-all duration-800 bg-[#1E6A63]/85"
                style={{ width: `${Math.max(4, Math.min(100, impactScore))}%` }}
              />
            </div>
            <p className="text-[11px] text-[#22302E]/70">
              Use of active verbs, measurable context, and result framing over passive tasks.
            </p>
          </div>

          {/* Sub-score 3: Readability */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#22302E] flex items-center gap-1.5">
                Readability & Structure
                <span className="text-[10px] font-normal text-[#22302E]/60">(20% weight)</span>
              </span>
              <span className="font-bold text-[#22302E]">{readabilityScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#FAF6EE] rounded-full overflow-hidden border border-[#E7DEC8]">
              <div
                className="h-full rounded-full transition-all duration-800 bg-[#1E6A63]/70"
                style={{ width: `${Math.max(4, Math.min(100, readabilityScore))}%` }}
              />
            </div>
            <p className="text-[11px] text-[#22302E]/70">
              Clean section hierarchy, concise bullets, and absence of dense paragraphs.
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Simulation Disclaimer */}
      <div className="mt-6 pt-4 border-t border-[#E7DEC8]/70 flex items-start gap-2.5 text-xs text-[#22302E]/75">
        <Info className="w-4 h-4 text-[#1E6A63] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#22302E] font-medium">Educational simulation metric:</strong> Simulated educational match score. ATS Coach AI provides an estimate to demonstrate alignment principles; this is not an official commercial ATS algorithm or employment guarantee. Simulation metric for learning purposes only; not an actual employer decision or hiring guarantee.
        </p>
      </div>
    </div>
  );
}
