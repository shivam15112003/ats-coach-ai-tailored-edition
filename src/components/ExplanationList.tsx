import React, { useState, useMemo } from "react";
import { ChangeExplanation } from "../types";
import {
  GraduationCap,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Copy,
  Check,
  Filter,
} from "lucide-react";

interface ExplanationListProps {
  explanations: ChangeExplanation[];
  generalCoachingTip: string;
}

type CategoryType = "all" | "keyword" | "impact" | "clarity";

function getCategory(item: ChangeExplanation): CategoryType {
  const text = (item.rationale + " " + item.tailored_phrase).toLowerCase();
  if (/keyword|align|skill|term|terminology|require|match/i.test(text)) return "keyword";
  if (/impact|action verb|verb|result|metric|quantif|active|reframe/i.test(text)) return "impact";
  return "clarity";
}

export function ExplanationList({
  explanations,
  generalCoachingTip,
}: ExplanationListProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const categorizedList = useMemo(() => {
    return explanations.map((item, index) => ({
      item,
      originalIndex: index,
      category: getCategory(item),
    }));
  }, [explanations]);

  const filteredList = useMemo(() => {
    return categorizedList.filter(({ item, category }) => {
      const matchesCategory = selectedCategory === "all" || category === selectedCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.original_phrase.toLowerCase().includes(q) ||
        item.tailored_phrase.toLowerCase().includes(q) ||
        item.rationale.toLowerCase().includes(q)
      );
    });
  }, [categorizedList, selectedCategory, searchQuery]);

  const handleCopyPhrase = async (phrase: string, index: number) => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy phrase:", err);
    }
  };

  const counts = useMemo(() => {
    return {
      all: explanations.length,
      keyword: categorizedList.filter(c => c.category === "keyword").length,
      impact: categorizedList.filter(c => c.category === "impact").length,
      clarity: categorizedList.filter(c => c.category === "clarity").length,
    };
  }, [explanations, categorizedList]);

  return (
    <div className="space-y-6">
      {/* General Coaching Tip Banner */}
      {generalCoachingTip && (
        <div className="bg-gradient-to-r from-emerald-50 via-[#FAF6EE] to-amber-50 border border-[#E7DEC8] rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[#1E6A63] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6A63]">
                Core ATS Strategy Principle
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#22302E]">
                Recruiter & ATS Alignment Takeaway
              </h3>
              <p className="text-xs sm:text-sm text-[#22302E]/85 leading-relaxed">
                {generalCoachingTip}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#22302E] flex items-center gap-2">
            <span>What Changed & Why: Phrasing Transformations</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1E6A63]/10 text-[#1E6A63]">
              {explanations.length} Detailed Rewrites
            </span>
          </h3>
          <p className="text-xs text-[#22302E]/70 mt-0.5">
            Inspect the exact ATS and recruiter logic applied to each bullet point.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#22302E]/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transformations..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E7DEC8] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E6A63] text-[#22302E]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E7DEC8] pb-3">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            selectedCategory === "all"
              ? "bg-[#1E6A63] text-white shadow-2xs"
              : "bg-white border border-[#E7DEC8] text-[#22302E]/75 hover:bg-[#FAF6EE]"
          }`}
        >
          All ({counts.all})
        </button>

        {counts.keyword > 0 && (
          <button
            type="button"
            onClick={() => setSelectedCategory("keyword")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              selectedCategory === "keyword"
                ? "bg-[#1E6A63] text-white shadow-2xs"
                : "bg-white border border-[#E7DEC8] text-[#22302E]/75 hover:bg-[#FAF6EE]"
            }`}
          >
            Keyword Alignment ({counts.keyword})
          </button>
        )}

        {counts.impact > 0 && (
          <button
            type="button"
            onClick={() => setSelectedCategory("impact")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              selectedCategory === "impact"
                ? "bg-[#1E6A63] text-white shadow-2xs"
                : "bg-white border border-[#E7DEC8] text-[#22302E]/75 hover:bg-[#FAF6EE]"
            }`}
          >
            Action Verbs & Impact ({counts.impact})
          </button>
        )}

        {counts.clarity > 0 && (
          <button
            type="button"
            onClick={() => setSelectedCategory("clarity")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              selectedCategory === "clarity"
                ? "bg-[#1E6A63] text-white shadow-2xs"
                : "bg-white border border-[#E7DEC8] text-[#22302E]/75 hover:bg-[#FAF6EE]"
            }`}
          >
            Clarity & Precision ({counts.clarity})
          </button>
        )}
      </div>

      {/* Transformation Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-[#E7DEC8] text-xs text-[#22302E]/60">
            No transformations found matching "{searchQuery}".
          </div>
        ) : (
          filteredList.map(({ item, originalIndex, category }) => {
            const isCopied = copiedIndex === originalIndex;

            const badgeLabel =
              category === "keyword"
                ? "Keyword Alignment"
                : category === "impact"
                ? "Action Verb & Impact"
                : "Clarity & Precision";

            return (
              <div
                key={originalIndex}
                className="bg-white rounded-xl border border-[#E7DEC8] p-5 sm:p-6 shadow-xs hover:border-[#1E6A63]/40 transition-all"
              >
                <div className="flex items-center justify-between gap-3 mb-3.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E6A63]">
                    <span className="w-5 h-5 rounded-full bg-[#1E6A63]/10 text-[#1E6A63] flex items-center justify-center text-[11px]">
                      {originalIndex + 1}
                    </span>
                    Bullet Transformation #{originalIndex + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      {badgeLabel}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopyPhrase(item.tailored_phrase, originalIndex)}
                      className="p-1 text-xs text-[#22302E]/60 hover:text-[#1E6A63] rounded hover:bg-[#FAF6EE] transition-colors cursor-pointer"
                      title="Copy tailored bullet"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Before vs After Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Phrasing */}
                  <div className="p-3.5 sm:p-4 rounded-lg bg-rose-50/40 border border-rose-200/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                        Before (Original Phrasing)
                      </span>
                      <span className="text-[10px] text-rose-600 font-medium">Passive / Baseline</span>
                    </div>
                    <p className="text-xs text-[#22302E]/85 leading-relaxed italic">
                      "{item.original_phrase}"
                    </p>
                  </div>

                  {/* Tailored Phrasing */}
                  <div className="p-3.5 sm:p-4 rounded-lg bg-emerald-50/40 border border-emerald-200/70">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E6A63]">
                        After (ATS Optimized Phrasing)
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Targeted & Grounded
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#22302E] leading-relaxed">
                      "{item.tailored_phrase}"
                    </p>
                  </div>
                </div>

                {/* Recruiter & ATS Rationale */}
                <div className="mt-4 pt-3.5 border-t border-[#E7DEC8]/60 bg-[#FAF6EE]/50 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3.5 rounded-b-xl">
                  <div className="flex items-start gap-2.5 text-xs text-[#22302E]">
                    <GraduationCap className="w-4 h-4 text-[#1E6A63] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#1E6A63] block sm:inline sm:mr-1.5">
                        Recruiter & ATS Rationale:
                      </span>
                      <span className="text-[#22302E]/85 leading-relaxed">
                        {item.rationale}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
