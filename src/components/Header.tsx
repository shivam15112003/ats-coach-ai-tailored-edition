import { useState, useEffect } from "react";
import { ActiveScreen } from "../types";
import { ArrowUpRight, BookOpen, Check, Settings2 } from "lucide-react";
import { hasStoredApiKey, subscribeToApiKeyChanges } from "../utils/apiKey";
import { openAppGuide } from "./GettingStarted";
interface Props { currentScreen: ActiveScreen; onNavigate: (screen: ActiveScreen) => void; canNavigateToScreen2: boolean; canNavigateToScreen3: boolean; onOpenApiKeyModal: () => void; }
export function Header({ currentScreen, onNavigate, canNavigateToScreen2, canNavigateToScreen3, onOpenApiKeyModal }: Props) {
  const [hasCustomKey, setHasCustomKey] = useState(false);
  useEffect(() => { setHasCustomKey(hasStoredApiKey()); return subscribeToApiKeyChanges(() => setHasCustomKey(hasStoredApiKey())); }, []);
  return <header className="site-header"><div className="header-inner"><div className="brand"><span className="brand-icon"><BookOpen className="w-5 h-5" /></span><div><h1>ATS Coach <span>AI</span></h1><p>Experience into focus.</p></div></div><nav aria-label="Analysis Progress" className="main-progress">{([{ n: 1, title: "Prepare", enabled: true }, { n: 2, title: "Understand", enabled: canNavigateToScreen2 }, { n: 3, title: "Workspace", enabled: canNavigateToScreen3 }] as const).map(step => <button type="button" key={step.n} disabled={!step.enabled} aria-current={currentScreen === step.n ? "step" : undefined} onClick={() => onNavigate(step.n)}><span>{currentScreen > step.n && step.enabled ? <Check className="w-3.5 h-3.5" /> : step.n}</span>{step.title}</button>)}</nav><div className="header-actions"><button type="button" className="header-demo" onClick={() => openAppGuide("overview")}>See the app<ArrowUpRight className="w-3.5 h-3.5" /></button><button type="button" onClick={onOpenApiKeyModal} aria-label={hasCustomKey ? "AI connection settings, personal key active" : "AI connection settings"} title="Optional personal Gemini API key" className="header-settings"><Settings2 className="w-4 h-4" /><span>AI settings</span>{hasCustomKey && <i aria-label="Personal key active" />}</button></div></div></header>;
}
