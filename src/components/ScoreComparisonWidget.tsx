import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";

interface ScoreComparisonWidgetProps {
  sourcePreserved?: boolean;
  meaningChecked?: boolean;
  originalScore: number;
  tailoredScore: number;
  originalKeyword?: number;
  tailoredKeyword?: number;
  originalImpact?: number;
  tailoredImpact?: number;
  originalReadability?: number;
  tailoredReadability?: number;
}

export function ScoreComparisonWidget({
  sourcePreserved=false,
  meaningChecked=false,
  originalScore,
  tailoredScore,
  originalKeyword,
  tailoredKeyword,
  originalImpact,
  tailoredImpact,
  originalReadability,
  tailoredReadability,
}: ScoreComparisonWidgetProps) {
  const [showSubScores, setShowSubScores] = useState(false);
  const diff = Math.max(0, tailoredScore - originalScore);

  const hasSubScores =
    originalKeyword !== undefined &&
    tailoredKeyword !== undefined &&
    originalImpact !== undefined &&
    tailoredImpact !== undefined &&
    originalReadability !== undefined &&
    tailoredReadability !== undefined;

  return (
    <div className="bg-white rounded-xl border border-[#E7DEC8] p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: AI Badge and Context */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1E6A63] text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              {sourcePreserved ? "Original Content Preserved" : "AI-Assisted Rephrasing"}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-[#1E6A63]" />
              {sourcePreserved ? "Source-preserving PDF" : meaningChecked ? "Checked against original" : "Resume draft"}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#22302E]">
            Educational Match Score Comparison
          </h2>
          <p className="text-xs text-[#22302E]/70 max-w-xl">
            {sourcePreserved ? "The original content and score are retained. No AI rewriting improvement is claimed." : "Educational simulation of resume-to-job alignment."}
          </p>
        </div>

        {/* Right: Scores & Delta Indicator */}
        <div className="flex items-center gap-3 sm:gap-4 bg-[#FAF6EE] px-4 py-2.5 rounded-xl border border-[#E7DEC8] self-stretch md:self-auto justify-center sm:justify-start">
          {/* Original Score */}
          <div className="text-center">
            <span className="text-[10px] font-semibold text-[#22302E]/60 uppercase tracking-wider block">
              Original
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[#22302E]">
              {originalScore}%
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-[#22302E]/40 shrink-0" />

          {/* Tailored Score */}
          <div className="text-center">
            <span className="text-[10px] font-semibold text-[#1E6A63] uppercase tracking-wider block">
              Tailored
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#1E6A63]">
              {tailoredScore}%
            </span>
          </div>

          {/* Delta Badge */}
          {diff > 0 && (
            <div className="ml-1 sm:ml-2 pl-3 border-l border-[#E7DEC8]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E2725B] text-white shadow-xs">
                <TrendingUp className="w-3.5 h-3.5" />
                +{diff} Points
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Score Breakdown Toggle */}
      {hasSubScores && (
        <div className="pt-2 border-t border-[#E7DEC8]/60">
          <button
            type="button"
            onClick={() => setShowSubScores(!showSubScores)}
            className="text-xs font-semibold text-[#1E6A63] hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>
              {showSubScores ? "Hide Sub-Score Progression" : "View Detailed Sub-Score Progression (50% / 30% / 20%)"}
            </span>
            {showSubScores ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showSubScores && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Keyword Score */}
              <div className="p-3 bg-[#FAF6EE]/50 border border-[#E7DEC8] rounded-xl text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#22302E]/70 block">
                  Keyword Alignment (50%)
                </span>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#22302E]">{originalKeyword}%</span>
                  <ArrowRight className="w-3 h-3 text-[#22302E]/40" />
                  <span className="text-[#1E6A63]">{tailoredKeyword}%</span>
                </div>
              </div>

              {/* Bullet Impact */}
              <div className="p-3 bg-[#FAF6EE]/50 border border-[#E7DEC8] rounded-xl text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#22302E]/70 block">
                  Bullet Impact (30%)
                </span>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#22302E]">{originalImpact}%</span>
                  <ArrowRight className="w-3 h-3 text-[#22302E]/40" />
                  <span className="text-[#1E6A63]">{tailoredImpact}%</span>
                </div>
              </div>

              {/* Readability */}
              <div className="p-3 bg-[#FAF6EE]/50 border border-[#E7DEC8] rounded-xl text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#22302E]/70 block">
                  Readability (20%)
                </span>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#22302E]">{originalReadability}%</span>
                  <ArrowRight className="w-3 h-3 text-[#22302E]/40" />
                  <span className="text-[#1E6A63]">{tailoredReadability}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
