import { ArrowDown, ArrowRight, Check, FileText, GraduationCap, Layers3, MessageSquareText, Mic2, Play, ScanSearch } from "lucide-react";
import { openAppGuide } from "./GettingStarted";

export function WelcomeHero({ onDemo, hasInputs }: { onDemo: () => void; hasInputs: boolean }) {
  const focusInputs = () => {
    const input = document.querySelector<HTMLElement>('[aria-label="Resume text"]');
    document.getElementById("application-inputs")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    input?.focus({ preventScroll: true });
  };
  return <section aria-labelledby="welcome-title" className="welcome-hero">
    <div className="hero-copy">
      <p className="eyebrow"><span className="w-2 h-2 rounded-full bg-[#BDDFCB]" /> Your application preparation workspace</p>
      <h2 id="welcome-title">Your experience.<br /><span>A clearer next step.</span></h2>
      <p className="hero-description">Understand the match, shape your documents, and practice the conversation. Bring your experience into focus with ATS Coach AI.</p>
      <div className="hero-actions">
        <button type="button" onClick={hasInputs ? focusInputs : onDemo} className="hero-primary">{hasInputs ? "Continue my application" : "Explore the interactive sample"}<ArrowRight className="w-4 h-4" /></button>
        <button type="button" onClick={() => openAppGuide("overview")} className="hero-secondary"><Play className="w-4 h-4" />Watch the overview</button>
      </div>
      <button type="button" onClick={focusInputs} className="hero-text-action">{hasInputs ? "Review my resume and target role" : "Start with my own resume"}<ArrowDown className="w-4 h-4" /></button>
      <p className="hero-audience">For job seekers, career coaches, university programs, and product demonstrations.</p>
    </div>
    <div className="hero-journey" aria-label="Four ways to prepare">
      <div className="hero-journey-heading"><Layers3 className="w-5 h-5" /><span>One role. A more complete preparation.</span></div>
      {[{ icon: ScanSearch, name: "Understand the match", detail: "See exact evidence, related experience, and gaps." }, { icon: FileText, name: "Make the documents yours", detail: "Edit your resume and a matching cover letter." }, { icon: MessageSquareText, name: "Prepare grounded answers", detail: "Turn your materials into responses you can review." }, { icon: Mic2, name: "Practice with text and voice", detail: "Hear questions. Refine your answers. Review feedback." }].map(({ icon: Icon, name, detail }, index) => <div className="journey-row" key={name}><span className="journey-icon"><Icon className="w-5 h-5" /></span><div><h3>{name}</h3><p>{detail}</p></div><span className="journey-number">0{index + 1}</span></div>)}
      <div className="hero-journey-footer"><Check className="w-4 h-4" /><span>You review the facts and choose what to share.</span><GraduationCap className="w-5 h-5" /></div>
    </div>
  </section>;
}
