import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Download, Play, X } from "lucide-react";
import guide from "../data/gettingStarted.json";
import overview from "../data/appOverview.json";

const SEEN_KEY = "ats-coach-guide-v2-dismissed";
const MEDIA_VERSION = "5";
type Collection = "overview" | "guide";
type Format = "video" | "slides";
type Chapter = { title: string; subtitle: string; narration: string; steps?: string[] };

export function openAppGuide(collection: Collection = "overview") {
  window.dispatchEvent(new CustomEvent("ats-coach-open-guide", { detail: collection }));
}

export function GettingStarted({ hideLauncher = false }: { hideLauncher?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [welcome, setWelcome] = useState(() => { try { return localStorage.getItem(SEEN_KEY) !== "yes"; } catch { return true; } });
  const [collection, setCollection] = useState<Collection>("overview");
  const [format, setFormat] = useState<Format>("video");
  const [slide, setSlide] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const chapters: Chapter[] = collection === "overview" ? overview : guide;
  const current = chapters[slide];
  const root = collection === "overview" ? "/overview" : "/guide";
  const videoUrl = `${root}/${collection === "overview" ? "ats-coach-overview" : "ats-coach-walkthrough"}.mp4?v=${MEDIA_VERSION}`;
  const deckUrl = `${root}/${collection === "overview" ? "ats-coach-overview" : "ats-coach-getting-started"}.pptx?v=${MEDIA_VERSION}`;
  const pdfUrl = `${root}/${collection === "overview" ? "ats-coach-overview" : "ats-coach-getting-started"}.pdf?v=${MEDIA_VERSION}`;
  const title = collection === "overview" ? "App overview" : "How-to walkthrough";
  const dismiss = () => { setWelcome(false); try { localStorage.setItem(SEEN_KEY, "yes"); } catch { /* Help stays available without storage. */ } };
  const changeCollection = (next: Collection) => { video.current?.pause(); setSlide(0); setVideoFailed(false); setCollection(next); };
  const show = (next: Collection, nextFormat: Format = "video") => { opener.current = document.activeElement as HTMLElement; changeCollection(next); setFormat(nextFormat); setOpen(true); dismiss(); };
  const close = () => { video.current?.pause(); setOpen(false); };
  useEffect(() => { const listener = (event: Event) => show((event as CustomEvent).detail === "guide" ? "guide" : "overview"); window.addEventListener("ats-coach-open-guide", listener); return () => window.removeEventListener("ats-coach-open-guide", listener); }, []);
  useEffect(() => {
    if (open) { dialog.current?.showModal(); const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; dialog.current?.close(); opener.current?.focus(); }; }
  }, [open]);
  useEffect(() => { video.current?.pause(); }, [format]);
  return <>
    <div className={hideLauncher ? "hidden" : "max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4"}>
      {welcome ? <section aria-label="Welcome guide" className="rounded-xl border border-[#D8CFBC] bg-white p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48"><h2 className="text-sm font-bold">New to ATS Coach AI?</h2><p className="text-xs mt-1 text-[#22302E]/70">See what the app does, then follow the step-by-step walkthrough. Both include slides you can download.</p></div>
        <button type="button" onClick={() => show("overview")} className="inline-flex items-center gap-2 rounded-lg bg-[#1E6A63] text-white px-3 py-2 text-xs font-semibold"><Play className="w-4 h-4" />App overview</button>
        <button type="button" onClick={() => show("guide")} className="inline-flex items-center gap-2 rounded-lg border border-[#D8CFBC] px-3 py-2 text-xs font-semibold"><Play className="w-4 h-4" />Watch walkthrough</button>
        <button type="button" onClick={() => show("guide", "slides")} className="inline-flex items-center gap-2 rounded-lg border border-[#D8CFBC] px-3 py-2 text-xs font-semibold"><BookOpen className="w-4 h-4" />View slides</button>
        <button type="button" onClick={dismiss} aria-label="Dismiss welcome guide" className="p-2"><X className="w-4 h-4" /></button>
      </section> : <button type="button" onClick={() => show("overview")} className="inline-flex items-center gap-2 rounded-lg border border-[#D8CFBC] bg-white px-3 py-2 text-xs font-semibold text-[#1E6A63]"><BookOpen className="w-4 h-4" />App overview & how to use · Videos & slides</button>}
    </div>
    <dialog ref={dialog} aria-labelledby="guide-title" onCancel={event => { event.preventDefault(); close(); }} className="m-auto w-[min(960px,calc(100%-2rem))] max-h-[90dvh] overflow-y-auto rounded-2xl p-0 border border-[#D8CFBC] bg-[#FAF6EE] text-[#22302E] shadow-2xl backdrop:bg-black/60">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-[#E7DEC8]"><h2 id="guide-title" className="font-bold">Explore ATS Coach AI</h2><button type="button" autoFocus onClick={close} aria-label="Close getting started guide" className="p-2 rounded-lg hover:bg-[#EAE2CE]"><X className="w-5 h-5" /></button></div>
      <div className="p-4 sm:p-6 space-y-4">
        <div role="group" aria-label="Choose a video or presentation" className="grid sm:grid-cols-2 gap-3">{(["overview", "guide"] as const).map(item => <button type="button" aria-pressed={collection === item} key={item} onClick={() => changeCollection(item)} className={`p-3 rounded-xl text-left border ${collection === item ? "border-[#1E6A63] bg-[#E4EFEB]" : "border-[#D8CFBC] bg-white"}`}><span className="block text-sm font-bold">{item === "overview" ? "App overview" : "How-to walkthrough"}</span><span className="block text-xs mt-1 text-[#22302E]/70">{item === "overview" ? "For users and clients: what the app does and how it helps." : "Follow the real app screens, numbered highlights, and microphone setup."}</span></button>)}</div>
        <div role="group" aria-label="Guide format" className="flex gap-2">{(["video", "slides"] as const).map(item => <button type="button" aria-pressed={format === item} key={item} onClick={() => setFormat(item)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${format === item ? "bg-[#1E6A63] text-white" : "bg-white border border-[#D8CFBC]"}`}>{item === "video" ? "Watch video" : "View slides"}</button>)}</div>
        <p className="text-xs text-[#52615D]">{collection === "overview" ? "1 minute 43 seconds · 8 slides · Product introduction for users and clients" : "3 minutes 17 seconds · 13 slides · Complete app walkthrough"}</p>
        {format === "video" ? <section aria-label={`${title} video`} className="space-y-3">
          <video key={collection} ref={video} controls playsInline preload="metadata" poster={`${root}/slide-01.png?v=${MEDIA_VERSION}`} onError={() => setVideoFailed(true)} className="w-full aspect-video rounded-xl bg-[#1E6A63]" aria-label={`Narrated ATS Coach AI ${title.toLowerCase()}`}><source src={videoUrl} type="video/mp4" /><track kind="captions" src={`${root}/captions.vtt?v=${MEDIA_VERSION}`} srcLang="en" label="English" default />Your browser does not support video playback. Use the slides below.</video>
          {videoFailed && <p role="alert" className="text-sm">Video could not load. <button type="button" className="underline" onClick={() => setFormat("slides")}>View the slides instead</button>.</p>}
          <p className="text-xs text-[#22302E]/70">Narrated video with English captions. Pause, seek, or turn captions on in the player. Nothing plays automatically.</p>
          <details className="text-sm"><summary className="cursor-pointer font-semibold">Read video transcript</summary><div className="mt-3 space-y-3">{chapters.map(item => <p key={item.title}><strong>{item.title}. </strong>{item.narration}</p>)}</div></details>
        </section> : <section aria-label={`${title} slides`} className="space-y-3">
          <img src={`${root}/slide-${String(slide + 1).padStart(2, "0")}.png?v=${MEDIA_VERSION}`} alt={`${current.title}. ${current.subtitle}. ${(current.steps ?? []).join(" ")}`} className="w-full aspect-video rounded-xl" />
          <div className="flex items-center justify-between gap-2"><button type="button" aria-label="Previous guide slide" disabled={slide === 0} onClick={() => setSlide(value => value - 1)} className="p-2 rounded-lg border border-[#D8CFBC] disabled:opacity-40"><ChevronLeft className="w-5 h-5" /></button><p aria-live="polite" className="text-sm">Slide {slide + 1} of {chapters.length}</p><button type="button" aria-label="Next guide slide" disabled={slide === chapters.length - 1} onClick={() => setSlide(value => value + 1)} className="p-2 rounded-lg border border-[#D8CFBC] disabled:opacity-40"><ChevronRight className="w-5 h-5" /></button></div>
          <label className="block text-xs font-semibold">Jump to a topic<select aria-label="Guide topic" value={slide} onChange={event => setSlide(Number(event.target.value))} className="mt-1 block w-full rounded-lg p-2 bg-white border border-[#D8CFBC]">{chapters.map((item, index) => <option key={item.title} value={index}>{index + 1}. {item.title}</option>)}</select></label>
        </section>}
        <div className="flex flex-wrap gap-4 text-sm text-[#1E6A63] font-semibold border-t border-[#E7DEC8] pt-4"><a href={deckUrl} download className="inline-flex items-center gap-2"><Download className="w-4 h-4" />Download {title.toLowerCase()} PowerPoint</a><a href={pdfUrl} download className="inline-flex items-center gap-2"><Download className="w-4 h-4" />Download slides as PDF</a><a href={videoUrl} download className="inline-flex items-center gap-2"><Download className="w-4 h-4" />Download {title.toLowerCase()} video</a></div>
      </div>
    </dialog>
  </>;
}
