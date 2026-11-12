import React from "react";
import { ResumeDocument } from "../types";

interface ResumeDocumentViewProps {
  document: ResumeDocument;
  scale?: number;
  className?: string;
}

function renderFormattedText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-[#111A19]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={idx} className="italic text-[#374146]">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function ResumeDocumentView({
  document,
  className = "",
}: ResumeDocumentViewProps) {
  return (
    <div
      className={`bg-white text-[#22302E] shadow-sm border border-[#E7DEC8] rounded-sm p-7 sm:p-10 font-sans mx-auto transition-all ${className}`}
      style={{
        maxWidth: "800px",
        minHeight: "960px",
        fontFeatureSettings: '"tnum" 1',
      }}
    >
      {/* 1. Candidate Name */}
      <div className="text-center mb-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#1E292E]">
          {document.name || "Candidate Name"}
        </h1>
      </div>

      {/* 2. Contact Information */}
      {document.contactLine && (
        <div className="text-center text-xs sm:text-[13px] text-[#465055] font-normal mb-5 leading-relaxed">
          {document.contactLine.split("|").map((item, idx, arr) => (
            <React.Fragment key={idx}>
              <span className="inline-block px-1.5">{item.trim()}</span>
              {idx < arr.length - 1 && <span className="text-[#A0AAB0]">|</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* 3. Optional Summary */}
      {document.summary && (
        <div className="mb-5 text-xs sm:text-sm text-[#2D373C] leading-relaxed">
          {renderFormattedText(document.summary)}
        </div>
      )}

      {/* 4. Sections */}
      <div className="space-y-5">
        {document.sections.map((section) => (
          <div key={section.id} className="space-y-2.5">
            {/* Section Header with Horizontal Rule */}
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1E6A63]">
                {section.title}
              </h2>
              <div className="h-[1px] bg-[#D4DDD8] mt-1 mb-2.5" />
            </div>

            {/* Content: Text / Summary */}
            {section.type === "text" && section.content && (
              <p className="text-xs sm:text-sm text-[#2D373C] leading-relaxed whitespace-pre-line">
                {renderFormattedText(section.content)}
              </p>
            )}

            {/* Content: Skills List */}
            {section.type === "skills" && section.skillsList && (
              <div className="space-y-1 text-xs sm:text-[13px] leading-relaxed">
                {section.skillsList.map((skill) => (
                  <div key={skill.id} className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-bold text-[#1E292E] shrink-0">
                      {skill.category}:
                    </span>
                    <span className="text-[#374146]">{renderFormattedText(skill.items)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Content: Item Entries (Experience, Education, Projects, etc.) */}
            {section.items && (
              <div className="space-y-4">
                {section.items.map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    {/* Item Heading: Left Title/Org & Right Date/Location */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 text-xs sm:text-sm">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="font-bold text-[#1E292E]">
                          {item.title}
                        </span>
                        {item.organization && (
                          <span className="text-[#4A555A] italic">
                            {item.title ? `— ${item.organization}` : item.organization}
                          </span>
                        )}
                      </div>

                      <div className="text-left sm:text-right shrink-0 text-xs text-[#526066]">
                        {item.date && (
                          <span className="font-medium">{item.date}</span>
                        )}
                        {item.location && (
                          <span className="text-[#64747B] ml-2 italic">
                            {item.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bullets */}
                    {item.bullets.length > 0 && (
                      <ul className="space-y-1 text-xs sm:text-[13px] text-[#2D373C] leading-relaxed pl-4 list-disc marker:text-[#1E6A63]">
                        {item.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="pl-0.5">
                            {renderFormattedText(bullet)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
