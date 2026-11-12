import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function ConfirmDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; dialog.current?.showModal(); return () => { dialog.current?.close(); opener?.focus(); }; }, []);
  return <dialog ref={dialog} aria-labelledby="confirm-title" onCancel={e => { e.preventDefault(); onClose(); }} className="confirm-dialog"><div className="flex items-center justify-between gap-4"><h2 id="confirm-title" className="text-lg font-bold">{title}</h2><button type="button" autoFocus aria-label="Close confirmation" onClick={onClose} className="p-2 rounded-lg"><X className="w-5 h-5" /></button></div>{children}</dialog>;
}
