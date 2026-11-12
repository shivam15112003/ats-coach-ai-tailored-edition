import { ShieldAlert, GraduationCap } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-[#E7DEC8] bg-[#FAF6EE] mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#1E6A63]/10 flex items-center justify-center text-[#1E6A63]">
              <GraduationCap className="w-4 h-4" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#22302E]">
              <span className="font-semibold text-[#1E6A63]">ATS Coach AI</span> — Built by{" "}
              <span className="font-semibold text-[#22302E]">Shivam Sharma, Arizona State University</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#22302E]/70 max-w-xl">
            <ShieldAlert className="w-4 h-4 text-[#E2725B] shrink-0" />
            <p className="text-[11px] sm:text-xs leading-relaxed">
              Educational prototype. Not professional career, legal, or employment advice. ATS Coach AI provides simulated evaluation metrics for educational study only.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
