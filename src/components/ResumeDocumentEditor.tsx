import React, { useState, useEffect, useRef } from "react";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  List,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  RotateCcw,
  Download,
  FileText,
  AlertCircle,
} from "lucide-react";
import { ResumeDocument, DocumentStyle, DEFAULT_DOCUMENT_STYLE } from "../types";
import { cloneResumeDocument } from "../utils/resumeDocumentParser";
import { exportResumeToPdf } from "../utils/pdfExport";

interface ResumeDocumentEditorProps {
  document: ResumeDocument;
  documentType: "original" | "tailored";
  onSave: (updatedDocument: ResumeDocument) => void;
  onCancel: () => void;
  onResetToBaseline?: () => void;
  baselineLabel?: string;
}

/**
 * Auto-resizing borderless textarea that matches normal document typography
 * and expands naturally with content without internal scrollbars.
 */
function DocumentTextarea({
  value,
  onChange,
  onKeyDown,
  onFocus,
  placeholder,
  className = "",
  style = {},
  dataId,
  ariaLabel,
}: {
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  dataId?: string;
  ariaLabel?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    autoResize();
  }, [value]);
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(entries => {
      const next = entries[0].contentRect.width;
      if (next !== width) { width = next; autoResize(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        autoResize();
      }}
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        autoResize();
        if (onFocus) onFocus(e);
      }}
      placeholder={placeholder}
      rows={1}
      data-id={dataId}
      aria-label={ariaLabel}
      className={`w-full resize-none overflow-hidden bg-transparent border border-transparent rounded-xs transition-colors hover:bg-[#1E6A63]/5 hover:border-[#1E6A63]/20 focus:bg-[#1E6A63]/5 focus:border-[#1E6A63]/40 focus:ring-1 focus:ring-[#1E6A63]/30 focus:outline-none ${className}`}
      style={style}
    />
  );
}

export function ResumeDocumentEditor({
  document: initialDocument,
  documentType,
  onSave,
  onCancel,
  onResetToBaseline,
  baselineLabel = "Reset to Original",
}: ResumeDocumentEditorProps) {
  // Working draft document
  const [doc, setDoc] = useState<ResumeDocument>(() => cloneResumeDocument(initialDocument));
  const documentStyle = doc.style || DEFAULT_DOCUMENT_STYLE;

  // Initial snapshot to detect dirty state
  const initialSnapshotRef = useRef<string>(JSON.stringify(initialDocument));

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<ResumeDocument[]>([]);
  const [redoStack, setRedoStack] = useState<ResumeDocument[]>([]);

  // Confirmation modals
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<{ idx: number; title: string } | null>(null);

  // Active focused input/textarea for formatting
  const activeElementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Determine if there are unsaved changes
  const isDirty = JSON.stringify(doc) !== initialSnapshotRef.current;

  // Push state to undo stack before mutation
  const pushHistory = (currentDoc: ResumeDocument) => {
    setUndoStack((prev) => [...prev.slice(-30), cloneResumeDocument(currentDoc)]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, cloneResumeDocument(doc)]);
    setDoc(cloneResumeDocument(previous));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, cloneResumeDocument(doc)]);
    setDoc(cloneResumeDocument(next));
  };

  // Keyboard shortcuts (Cmd+Z / Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, redoStack, doc]);

  // Bold / Italic text wrapping for selected text in active element
  const applyTextWrap = (prefix: string, suffix: string) => {
    const el = activeElementRef.current;
    if (!el) return;

    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const val = el.value;
    const selected = val.substring(start, end);

    let replacement = "";
    if (selected) {
      if (selected.startsWith(prefix) && selected.endsWith(suffix)) {
        replacement = selected.slice(prefix.length, -suffix.length);
      } else {
        replacement = `${prefix}${selected}${suffix}`;
      }
    } else {
      replacement = `${prefix}text${suffix}`;
    }

    const newVal = val.substring(0, start) + replacement + val.substring(end);
    el.value = newVal;

    const event = new Event("input", { bubbles: true });
    el.dispatchEvent(event);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 10);
  };

  const handleBoldClick = () => applyTextWrap("**", "**");
  const handleItalicClick = () => applyTextWrap("*", "*");

  const updateDocumentStyle = <K extends keyof DocumentStyle>(key: K, value: DocumentStyle[K]) => {
    pushHistory(doc);
    setDoc((prev) => ({
      ...prev,
      style: { ...(prev.style || DEFAULT_DOCUMENT_STYLE), [key]: value },
    }));
  };

  // Update candidate name
  const handleNameChange = (val: string) => {
    pushHistory(doc);
    setDoc((prev) => ({ ...prev, name: val }));
  };

  // Update contact line
  const handleContactChange = (val: string) => {
    pushHistory(doc);
    setDoc((prev) => ({ ...prev, contactLine: val }));
  };

  // Update summary
  const handleSummaryChange = (val: string) => {
    pushHistory(doc);
    setDoc((prev) => ({ ...prev, summary: val }));
  };

  // Update section title
  const handleSectionTitleChange = (sIdx: number, val: string) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      next.sections[sIdx].title = val;
      return next;
    });
  };

  // Move section up/down
  const handleMoveSection = (sIdx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? sIdx - 1 : sIdx + 1;
    if (targetIdx < 0 || targetIdx >= doc.sections.length) return;
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      const [moved] = next.sections.splice(sIdx, 1);
      next.sections.splice(targetIdx, 0, moved);
      return next;
    });
  };

  // Delete section with confirmation if not empty
  const requestDeleteSection = (sIdx: number) => {
    const section = doc.sections[sIdx];
    const hasContent =
      (section.items && section.items.length > 0) ||
      (section.skillsList && section.skillsList.length > 0) ||
      Boolean(section.content && section.content.trim());

    if (hasContent) {
      setSectionToDelete({ idx: sIdx, title: section.title });
    } else {
      executeDeleteSection(sIdx);
    }
  };

  const executeDeleteSection = (sIdx: number) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      next.sections.splice(sIdx, 1);
      return next;
    });
    setSectionToDelete(null);
  };

  // Add Item to Section
  const handleAddItem = (sIdx: number) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      const section = next.sections[sIdx];
      section.items = section.items || [];
      const isEdu = /education|academic/i.test(section.title);
      section.items.push({
        id: "id_" + Math.random().toString(36).slice(2, 9),
        title: isEdu ? "University / College" : "Role or Position Title",
        organization: isEdu ? "B.S. in Computer Science" : "Company or Organization",
        date: isEdu ? "Expected 2026" : "2024 – Present",
        location: "City, State",
        bullets: ["Key accomplishment, metric-driven contribution, or core responsibility."],
      });
      return next;
    });
  };

  // Move Item Up/Down
  const handleMoveItem = (sIdx: number, itemIdx: number, direction: "up" | "down") => {
    const items = doc.sections[sIdx]?.items;
    if (!items) return;
    const targetIdx = direction === "up" ? itemIdx - 1 : itemIdx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      const list = next.sections[sIdx].items;
      if (list) {
        const [moved] = list.splice(itemIdx, 1);
        list.splice(targetIdx, 0, moved);
      }
      return next;
    });
  };

  // Delete Item
  const handleDeleteItem = (sIdx: number, itemIdx: number) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      next.sections[sIdx].items?.splice(itemIdx, 1);
      return next;
    });
  };

  // Update Item Fields
  const handleItemFieldChange = (
    sIdx: number,
    itemIdx: number,
    field: "title" | "organization" | "date" | "location",
    val: string
  ) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      const item = next.sections[sIdx].items?.[itemIdx];
      if (item) {
        item[field] = val;
      }
      return next;
    });
  };

  // Bullet behavior: Add bullet
  const handleAddBullet = (sIdx: number, itemIdx: number, afterIdx?: number) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      const item = next.sections[sIdx].items?.[itemIdx];
      if (item) {
        const insertAt = afterIdx !== undefined ? afterIdx + 1 : item.bullets.length;
        item.bullets.splice(insertAt, 0, "");
      }
      return next;
    });

    const targetIdx = afterIdx !== undefined ? afterIdx + 1 : (doc.sections[sIdx]?.items?.[itemIdx]?.bullets?.length || 0);
    setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>(`[data-id="bullet_${sIdx}_${itemIdx}_${targetIdx}"]`);
      if (el) {
        el.focus();
        el.setSelectionRange(0, 0);
      }
    }, 30);
  };

  // Bullet behavior: Delete bullet
  const handleDeleteBullet = (sIdx: number, itemIdx: number, bIdx: number) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      next.sections[sIdx].items?.[itemIdx]?.bullets.splice(bIdx, 1);
      return next;
    });
  };

  // Move Bullet Up/Down
  const handleMoveBullet = (sIdx: number, itemIdx: number, bIdx: number, direction: "up" | "down") => {
    const bullets = doc.sections[sIdx]?.items?.[itemIdx]?.bullets;
    if (!bullets) return;
    const targetIdx = direction === "up" ? bIdx - 1 : bIdx + 1;
    if (targetIdx < 0 || targetIdx >= bullets.length) return;

    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      const bList = next.sections[sIdx].items?.[itemIdx]?.bullets;
      if (bList) {
        const [moved] = bList.splice(bIdx, 1);
        bList.splice(targetIdx, 0, moved);
      }
      return next;
    });
  };

  // Update Bullet text
  const handleBulletChange = (sIdx: number, itemIdx: number, bIdx: number, val: string) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      const item = next.sections[sIdx].items?.[itemIdx];
      if (item && item.bullets[bIdx] !== undefined) {
        item.bullets[bIdx] = val;
      }
      return next;
    });
  };

  // Bullet Keyboard Navigation: Enter -> new bullet, Backspace on empty -> delete and focus previous
  const handleBulletKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    sIdx: number,
    itemIdx: number,
    bIdx: number
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddBullet(sIdx, itemIdx, bIdx);
    } else if (e.key === "Backspace") {
      const bullets = doc.sections[sIdx]?.items?.[itemIdx]?.bullets;
      const currentVal = bullets?.[bIdx] || "";
      if (currentVal.trim() === "" && bullets && bullets.length > 1) {
        e.preventDefault();
        handleDeleteBullet(sIdx, itemIdx, bIdx);
        setTimeout(() => {
          const prevIdx = Math.max(0, bIdx - 1);
          const prevEl = document.querySelector<HTMLTextAreaElement>(`[data-id="bullet_${sIdx}_${itemIdx}_${prevIdx}"]`);
          if (prevEl) {
            prevEl.focus();
            const len = prevEl.value.length;
            prevEl.setSelectionRange(len, len);
          }
        }, 30);
      }
    }
  };

  // Skill category management
  const handleSkillCategoryChange = (sIdx: number, skillIdx: number, field: "category" | "items", val: string) => {
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      const skill = next.sections[sIdx].skillsList?.[skillIdx];
      if (skill) {
        skill[field] = val;
      }
      return next;
    });
  };

  const handleAddSkillCategory = (sIdx: number) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      next.sections[sIdx].skillsList = next.sections[sIdx].skillsList || [];
      next.sections[sIdx].skillsList?.push({
        id: "id_" + Math.random().toString(36).slice(2, 9),
        category: "Tools & Frameworks",
        items: "React, Node.js, TypeScript, PostgreSQL",
      });
      return next;
    });
  };

  const handleDeleteSkillCategory = (sIdx: number, skillIdx: number) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      next.sections[sIdx].skillsList?.splice(skillIdx, 1);
      return next;
    });
  };

  // Add New Section
  const handleAddNewSection = (type: "items" | "skills" | "text", title: string) => {
    pushHistory(doc);
    setDoc((prev) => {
      const next = cloneResumeDocument(prev);
      next.sections.push({
        id: "id_" + Math.random().toString(36).slice(2, 9),
        title,
        type,
        ...(type === "items"
          ? {
              items: [
                {
                  id: "id_" + Math.random().toString(36).slice(2, 9),
                  title: title === "EDUCATION" ? "Degree / Major" : "Role or Title",
                  organization: title === "EDUCATION" ? "University or College" : "Organization or Project",
                  date: "2024 – Present",
                  location: "City, State",
                  bullets: ["Key accomplishment or core contribution..."],
                },
              ],
            }
          : {}),
        ...(type === "skills"
          ? {
              skillsList: [
                {
                  id: "id_" + Math.random().toString(36).slice(2, 9),
                  category: "Technical Skills",
                  items: "Tools, technologies, and core competencies",
                },
              ],
            }
          : {}),
        ...(type === "text" ? { content: "Add summary or narrative background here..." } : {}),
      });
      return next;
    });
  };

  // Quick Action: Add Bullet to first available item
  const handleToolbarAddBullet = () => {
    for (let sIdx = 0; sIdx < doc.sections.length; sIdx++) {
      if (doc.sections[sIdx].items && doc.sections[sIdx].items!.length > 0) {
        handleAddBullet(sIdx, 0);
        return;
      }
    }
  };

  // Download PDF directly from working document
  const handleDownloadPdf = () => {
    const filename = `${(doc.name || "Resume").replace(/[^a-zA-Z0-9_-]/g, "_")}_${documentType === "tailored" ? "Tailored" : "Original"}.pdf`;
    exportResumeToPdf(doc, filename);
  };

  // Cancel Handler with dirty check
  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  // Reset to Baseline Handler with confirmation
  const handleResetClick = () => {
    if (onResetToBaseline) {
      setShowResetConfirm(true);
    }
  };

  return (
    <div data-testid="resume-document-editor" className="flex flex-col max-h-[95dvh] bg-[#F3EFE6] border-2 border-[#1E6A63] rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-200">
      {/* ================= STICKY WORD / GOOGLE DOCS STYLE TOOLBAR ================= */}
      <div data-testid="resume-editor-toolbar" className="shrink-0 sticky top-0 z-30 bg-white border-b border-[#E7DEC8] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Left: Document Mode, Undo/Redo, Formatting, Add Bullet */}
        <div className="flex flex-wrap min-w-0 max-w-full items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF6EE] border border-[#E7DEC8] text-[#1E6A63] text-xs font-bold">
            <FileText className="w-3.5 h-3.5" />
            <span>{documentType === "tailored" ? "Visual Editor · Tailored" : "Visual Editor · Original"}</span>
          </div>

          <div className="h-5 w-[1px] bg-[#E7DEC8]" />

          <label className="sr-only" htmlFor={`font-family-${documentType}`}>Font family</label>
          <select
            id={`font-family-${documentType}`}
            aria-label="Document font family"
            value={documentStyle.fontFamily}
            onChange={(e) => updateDocumentStyle("fontFamily", e.target.value as DocumentStyle["fontFamily"])}
            className="h-8 rounded-lg border border-[#E7DEC8] bg-white px-2 text-xs text-[#22302E]"
          >
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
          </select>

          <label className="sr-only" htmlFor={`font-size-${documentType}`}>Font size</label>
          <select
            id={`font-size-${documentType}`}
            aria-label="Document font size"
            value={documentStyle.fontSize}
            onChange={(e) => updateDocumentStyle("fontSize", Number(e.target.value))}
            className="h-8 rounded-lg border border-[#E7DEC8] bg-white px-2 text-xs text-[#22302E]"
          >
            {[9, 10, 11, 12, 13, 14].map((size) => <option key={size} value={size}>{size} pt</option>)}
          </select>

          <label className="sr-only" htmlFor={`line-spacing-${documentType}`}>Line spacing</label>
          <select
            id={`line-spacing-${documentType}`}
            aria-label="Line spacing"
            value={documentStyle.lineHeight}
            onChange={(e) => updateDocumentStyle("lineHeight", Number(e.target.value))}
            className="h-8 rounded-lg border border-[#E7DEC8] bg-white px-2 text-xs text-[#22302E]"
          >
            <option value={1.1}>Compact</option>
            <option value={1.25}>1.25</option>
            <option value={1.35}>1.35</option>
            <option value={1.5}>1.5</option>
            <option value={2}>Double</option>
          </select>

          <label className="sr-only" htmlFor={`paragraph-spacing-${documentType}`}>Paragraph spacing</label>
          <select
            id={`paragraph-spacing-${documentType}`}
            aria-label="Paragraph spacing"
            value={documentStyle.paragraphSpacing}
            onChange={(e) => updateDocumentStyle("paragraphSpacing", Number(e.target.value))}
            className="h-8 rounded-lg border border-[#E7DEC8] bg-white px-2 text-xs text-[#22302E]"
          >
            <option value={4}>Tight</option>
            <option value={8}>Normal</option>
            <option value={12}>Relaxed</option>
            <option value={16}>Wide</option>
          </select>

          <label className="sr-only" htmlFor={`page-margin-${documentType}`}>Page margins</label>
          <select
            id={`page-margin-${documentType}`}
            aria-label="Page margins"
            value={documentStyle.pageMargin}
            onChange={(e) => updateDocumentStyle("pageMargin", Number(e.target.value))}
            className="h-8 rounded-lg border border-[#E7DEC8] bg-white px-2 text-xs text-[#22302E]"
          >
            <option value={32}>Narrow margins</option>
            <option value={44}>Normal margins</option>
            <option value={58}>Wide margins</option>
          </select>

          <div className="h-5 w-[1px] bg-[#E7DEC8]" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className={`p-1.5 rounded-lg border transition-colors ${
                undoStack.length > 0
                  ? "bg-white border-[#E7DEC8] text-[#22302E] hover:bg-[#FAF6EE] cursor-pointer"
                  : "bg-stone-50 border-stone-200 text-stone-300 cursor-not-allowed"
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`p-1.5 rounded-lg border transition-colors ${
                redoStack.length > 0
                  ? "bg-white border-[#E7DEC8] text-[#22302E] hover:bg-[#FAF6EE] cursor-pointer"
                  : "bg-stone-50 border-stone-200 text-stone-300 cursor-not-allowed"
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-5 w-[1px] bg-[#E7DEC8]" />

          {/* Formatting: Bold / Italic */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleBoldClick}
              className="p-1.5 rounded-lg border border-[#E7DEC8] bg-white hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
              title="Bold selected text (**bold**)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleItalicClick}
              className="p-1.5 rounded-lg border border-[#E7DEC8] bg-white hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
              title="Italicize selected text (*italic*)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-5 w-[1px] bg-[#E7DEC8]" />

          {/* Add Bullet Action */}
          <button
            type="button"
            onClick={handleToolbarAddBullet}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
            title="Add bullet point"
          >
            <List className="w-3.5 h-3.5 text-[#1E6A63]" />
            <span>Add Bullet</span>
          </button>
        </div>

        {/* Right: Reset to Baseline, Download PDF, Cancel, Done Editing */}
        <div className="flex flex-wrap min-w-0 max-w-full items-center gap-2">
          {onResetToBaseline && (
            <button
              type="button"
              onClick={handleResetClick}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
              title="Discard all changes and restore pristine baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{baselineLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
            title="Download PDF of your current document"
          >
            <Download className="w-3.5 h-3.5 text-[#1E6A63]" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={handleCancelClick}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#E7DEC8] hover:bg-stone-100 text-[#22302E]/80 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={() => onSave(doc)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done Editing</span>
          </button>
        </div>
      </div>

      {/* Direct-Canvas Instruction Banner */}
      <div className="shrink-0 bg-[#FAF6EE] px-6 py-1.5 border-b border-[#E7DEC8] text-xs text-[#22302E]/70 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium text-[11px] sm:text-xs">
          <FileText className="w-3.5 h-3.5 text-[#1E6A63]" />
          Click anywhere on the resume page to edit text directly. Press Enter inside a bullet to create a new one.
        </span>
        <span className="hidden sm:inline text-[11px] text-[#22302E]/50">
          Professional ATS Typography Maintained Automatically
        </span>
      </div>

      {/* ================= PHYSICAL US LETTER DOCUMENT CANVAS ================= */}
      <div className="min-h-0 flex-1 p-4 sm:p-8 overflow-y-auto overflow-x-auto custom-scrollbar flex items-start justify-center bg-[#D9D2C4]">
        <div
          data-testid="resume-document-page"
          className="bg-white text-[#22302E] shadow-md border border-[#DCD3C0] rounded-sm w-full max-w-[816px] min-h-[1056px] h-fit overflow-visible shrink-0"
          style={{
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            minHeight: "1056px",
            height: "fit-content",
            fontFeatureSettings: '"tnum" 1',
            fontFamily: documentStyle.fontFamily,
            fontSize: `${documentStyle.fontSize}pt`,
            lineHeight: documentStyle.lineHeight,
            padding: `${documentStyle.pageMargin}px`,
            display: "flex",
            flexDirection: "column",
            gap: `${documentStyle.paragraphSpacing}px`,
          }}
        >
          {/* 1. Candidate Name (Direct heading text without form borders) */}
          <div className="text-center group relative">
            <input
              type="text"
              value={doc.name}
              onFocus={(e) => {
                activeElementRef.current = e.target;
              }}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="YOUR FULL NAME"
              className="w-full text-center text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#1E292E] bg-transparent border border-transparent hover:bg-[#1E6A63]/5 hover:border-[#1E6A63]/20 focus:bg-[#1E6A63]/5 focus:border-[#1E6A63]/40 focus:ring-1 focus:ring-[#1E6A63]/30 focus:outline-none transition-colors px-2 py-0.5 rounded-sm"
              title="Click to edit Candidate Name"
            />
          </div>

          {/* 2. Contact Information Line */}
          <div className="text-center group relative -mt-2">
            <DocumentTextarea
              value={doc.contactLine}
              onFocus={(e) => {
                activeElementRef.current = e.target;
              }}
              onChange={handleContactChange}
              ariaLabel="Contact information"
              placeholder="City, State | email@domain.com | (555) 123-4567 | linkedin.com/in/username | github.com/username"
              className="w-full text-center text-xs sm:text-[13px] text-[#465055] font-normal leading-relaxed bg-transparent border border-transparent hover:bg-[#1E6A63]/5 hover:border-[#1E6A63]/20 focus:bg-[#1E6A63]/5 focus:border-[#1E6A63]/40 focus:ring-1 focus:ring-[#1E6A63]/30 focus:outline-none transition-colors px-2 py-0.5 rounded-sm"
            />
          </div>

          {/* 3. Optional Professional Summary */}
          {doc.summary !== undefined && (
            <div className="group relative -mt-1">
              <DocumentTextarea
                value={doc.summary}
                onFocus={(e) => {
                  activeElementRef.current = e.target;
                }}
                onChange={handleSummaryChange}
                placeholder="Professional summary highlighting core expertise..."
                className="text-xs sm:text-sm text-[#2D373C] leading-relaxed p-1"
              />
            </div>
          )}

          {/* 4. Document Sections */}
          <div className="space-y-5">
            {doc.sections.map((section, sIdx) => (
              <div key={section.id} className="space-y-2 group/section relative">
                {/* Section Header with Horizontal Rule */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={section.title}
                      onFocus={(e) => {
                        activeElementRef.current = e.target;
                      }}
                      onChange={(e) => handleSectionTitleChange(sIdx, e.target.value)}
                      className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1E6A63] bg-transparent border border-transparent hover:bg-[#1E6A63]/5 hover:border-[#1E6A63]/20 focus:bg-[#1E6A63]/5 focus:border-[#1E6A63]/40 focus:ring-1 focus:ring-[#1E6A63]/30 focus:outline-none px-1 rounded-sm flex-1"
                      placeholder="SECTION TITLE"
                      title="Click to edit Section Title"
                    />

                    {/* Subtle Section Controls on Hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleMoveSection(sIdx, "up")}
                        disabled={sIdx === 0}
                        className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 cursor-pointer"
                        title="Move Section Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSection(sIdx, "down")}
                        disabled={sIdx === doc.sections.length - 1}
                        className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 cursor-pointer"
                        title="Move Section Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteSection(sIdx)}
                        className="p-1 text-rose-400 hover:text-rose-700 cursor-pointer"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Clean ATS Horizontal Divider Line */}
                  <div className="h-[1px] bg-[#D4DDD8] mt-1 mb-2" />
                </div>

                {/* Section Content: Text type */}
                {section.type === "text" && (
                  <DocumentTextarea
                    value={section.content || ""}
                    onFocus={(e) => {
                      activeElementRef.current = e.target;
                    }}
                    onChange={(val) => {
                      pushHistory(doc);
                      setDoc((prev) => {
                        const next = cloneResumeDocument(prev);
                        next.sections[sIdx].content = val;
                        return next;
                      });
                    }}
                    placeholder="Section description or narrative content..."
                    className="text-xs sm:text-sm text-[#2D373C] leading-relaxed p-1"
                  />
                )}

                {/* Section Content: Skills List */}
                {section.type === "skills" && (
                  <div className="space-y-1.5">
                    {section.skillsList?.map((skill, skillIdx) => (
                      <div key={skill.id} className="flex items-baseline gap-1.5 group/skill">
                        <input
                          type="text"
                          value={skill.category}
                          onFocus={(e) => {
                            activeElementRef.current = e.target;
                          }}
                          onChange={(e) =>
                            handleSkillCategoryChange(sIdx, skillIdx, "category", e.target.value)
                          }
                          className="font-bold text-xs sm:text-[13px] text-[#1E292E] w-36 shrink-0 bg-transparent border border-transparent hover:bg-[#1E6A63]/5 hover:border-[#1E6A63]/20 focus:bg-[#1E6A63]/5 focus:border-[#1E6A63]/40 focus:ring-1 focus:ring-[#1E6A63]/30 focus:outline-none px-1 py-0.5 rounded-sm"
                          placeholder="Category"
                        />
                        <span className="font-bold text-[#1E292E]">:</span>
                        <input
                          type="text"
                          value={skill.items}
                          onFocus={(e) => {
                            activeElementRef.current = e.target;
                          }}
                          onChange={(e) =>
                            handleSkillCategoryChange(sIdx, skillIdx, "items", e.target.value)
                          }
                          className="flex-1 text-xs sm:text-[13px] text-[#374146] bg-transparent border border-transparent hover:bg-[#1E6A63]/5 hover:border-[#1E6A63]/20 focus:bg-[#1E6A63]/5 focus:border-[#1E6A63]/40 focus:ring-1 focus:ring-[#1E6A63]/30 focus:outline-none px-1 py-0.5 rounded-sm"
                          placeholder="Skills, languages, or tools separated by commas..."
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteSkillCategory(sIdx, skillIdx)}
                          className="opacity-0 group-hover/skill:opacity-100 p-1 text-stone-300 hover:text-rose-600 transition-opacity cursor-pointer shrink-0"
                          title="Delete Skill Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddSkillCategory(sIdx)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E6A63] hover:text-[#17524C] pt-1 pl-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add skill category</span>
                    </button>
                  </div>
                )}

                {/* Section Content: Items (Experience, Education, Projects) */}
                {section.items && (
                  <div className="space-y-4">
                    {section.items.map((item, itemIdx) => (
                      <div key={item.id} className="space-y-1 group/item relative">
                        {/* Heading Row: Title, Organization, Date, Location */}
                        <div className="space-y-0.5 text-xs sm:text-sm min-w-0">
                          {/* Left: Role Title and Organization */}
                          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1.5 gap-y-0.5 min-w-0">
                            <DocumentTextarea
                              value={item.title}
                              onFocus={(e) => {
                                activeElementRef.current = e.target;
                              }}
                              onChange={(value) => handleItemFieldChange(sIdx, itemIdx, "title", value)}
                              placeholder="Role Title or Degree"
                              className="font-bold text-[#1E292E] px-1 py-0.5 min-w-0 leading-snug"
                            />
                            <span className="hidden sm:inline text-[#A0AAB0] font-normal pt-0.5">—</span>
                            <DocumentTextarea
                              value={item.organization}
                              onFocus={(e) => {
                                activeElementRef.current = e.target;
                              }}
                              onChange={(value) => handleItemFieldChange(sIdx, itemIdx, "organization", value)}
                              placeholder="Company or University"
                              className="italic text-[#4A555A] px-1 py-0.5 min-w-0 leading-snug"
                            />
                          </div>

                          {/* Right: Date, Location, and Item Controls */}
                          <div className="flex flex-wrap items-center justify-end gap-1 min-w-0">
                            <input
                              type="text"
                              value={item.date}
                              onFocus={(e) => {
                                activeElementRef.current = e.target;
                              }}
                              onChange={(e) =>
                                handleItemFieldChange(sIdx, itemIdx, "date", e.target.value)
                              }
                              placeholder="Dates (e.g. 2024 – Present)"
                              className="text-right font-medium text-xs text-[#526066] bg-transparent border border-transparent hover:bg-[#1E6A63]/5 hover:border-[#1E6A63]/20 focus:bg-[#1E6A63]/5 focus:border-[#1E6A63]/40 focus:ring-1 focus:ring-[#1E6A63]/30 focus:outline-none px-1 py-0.5 rounded-sm w-36 max-w-full"
                            />
                            <input
                              type="text"
                              value={item.location}
                              onFocus={(e) => {
                                activeElementRef.current = e.target;
                              }}
                              onChange={(e) =>
                                handleItemFieldChange(sIdx, itemIdx, "location", e.target.value)
                              }
                              placeholder="Location"
                              className="text-right italic text-xs text-[#64747B] bg-transparent border border-transparent hover:bg-[#1E6A63]/5 hover:border-[#1E6A63]/20 focus:bg-[#1E6A63]/5 focus:border-[#1E6A63]/40 focus:ring-1 focus:ring-[#1E6A63]/30 focus:outline-none px-1 py-0.5 rounded-sm w-28 max-w-full"
                            />

                            {/* Item Controls on Hover */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity ml-1">
                              <button
                                type="button"
                                onClick={() => handleMoveItem(sIdx, itemIdx, "up")}
                                disabled={itemIdx === 0}
                                className="p-0.5 text-stone-300 hover:text-stone-700 disabled:opacity-20 cursor-pointer"
                                title="Move Item Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveItem(sIdx, itemIdx, "down")}
                                disabled={itemIdx === section.items!.length - 1}
                                className="p-0.5 text-stone-300 hover:text-stone-700 disabled:opacity-20 cursor-pointer"
                                title="Move Item Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(sIdx, itemIdx)}
                                className="p-0.5 text-stone-300 hover:text-rose-600 cursor-pointer"
                                title="Delete this entry"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Bullets List */}
                        <div className="space-y-0.5 pl-3">
                          {item.bullets.map((bullet, bIdx) => (
                            <div
                              key={bIdx}
                              className="flex items-start gap-1.5 group/bullet relative hover:bg-[#1E6A63]/5 rounded-xs p-0.5 transition-colors"
                            >
                              <span className="text-[#1E6A63] font-bold text-sm leading-none mt-1 select-none shrink-0">
                                •
                              </span>
                              <DocumentTextarea
                                value={bullet}
                                onFocus={(e) => {
                                  activeElementRef.current = e.target;
                                }}
                                onChange={(val) => handleBulletChange(sIdx, itemIdx, bIdx, val)}
                                onKeyDown={(e) => handleBulletKeyDown(e, sIdx, itemIdx, bIdx)}
                                placeholder="Accomplishment bullet point (Press Enter to add another)..."
                                className="text-xs sm:text-[13px] text-[#2D373C] leading-relaxed p-0.5"
                                dataId={`bullet_${sIdx}_${itemIdx}_${bIdx}`}
                              />

                              {/* Bullet Controls on Hover */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/bullet:opacity-100 transition-opacity shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleMoveBullet(sIdx, itemIdx, bIdx, "up")}
                                  disabled={bIdx === 0}
                                  className="p-0.5 text-stone-300 hover:text-stone-700 disabled:opacity-20 cursor-pointer"
                                  title="Move Bullet Up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveBullet(sIdx, itemIdx, bIdx, "down")}
                                  disabled={bIdx === item.bullets.length - 1}
                                  className="p-0.5 text-stone-300 hover:text-stone-700 disabled:opacity-20 cursor-pointer"
                                  title="Move Bullet Down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddBullet(sIdx, itemIdx, bIdx)}
                                  className="p-0.5 text-stone-300 hover:text-[#1E6A63] cursor-pointer"
                                  title="Add bullet below"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBullet(sIdx, itemIdx, bIdx)}
                                  className="p-0.5 text-stone-300 hover:text-rose-600 cursor-pointer"
                                  title="Delete Bullet"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => handleAddBullet(sIdx, itemIdx)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E6A63] hover:text-[#17524C] pt-1 pl-4 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Bullet</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Item to Section Button */}
                    <button
                      type="button"
                      onClick={() => handleAddItem(sIdx)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-[#1E6A63] bg-[#1E6A63]/5 hover:bg-[#1E6A63]/10 border border-[#1E6A63]/20 transition-colors cursor-pointer mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add {section.title.toLowerCase()} entry</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Section Controls at Bottom of Document */}
          <div className="pt-4 border-t border-[#E7DEC8] flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#22302E]">Add Section:</span>
            <button
              type="button"
              onClick={() => handleAddNewSection("items", "EXPERIENCE")}
              className="px-2.5 py-1 text-xs rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
            >
              + Experience
            </button>
            <button
              type="button"
              onClick={() => handleAddNewSection("items", "EDUCATION")}
              className="px-2.5 py-1 text-xs rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
            >
              + Education
            </button>
            <button
              type="button"
              onClick={() => handleAddNewSection("items", "PROJECTS")}
              className="px-2.5 py-1 text-xs rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
            >
              + Projects
            </button>
            <button
              type="button"
              onClick={() => handleAddNewSection("skills", "TECHNICAL SKILLS")}
              className="px-2.5 py-1 text-xs rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
            >
              + Skills
            </button>
            <button
              type="button"
              onClick={() => handleAddNewSection("items", "CERTIFICATIONS")}
              className="px-2.5 py-1 text-xs rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
            >
              + Certifications
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="shrink-0 bg-white border-t border-[#E7DEC8] px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[#22302E]/70 flex items-center gap-2">
          {isDirty ? (
            <span className="text-amber-700 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes in progress
            </span>
          ) : (
            <span className="text-stone-500">Document matches current saved version</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(doc)}
            className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-xl text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done Editing</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal: Discard Unsaved Changes on Cancel */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E7DEC8] max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#22302E]">Discard Unsaved Changes?</h3>
                <p className="text-xs text-[#22302E]/70 leading-relaxed">
                  You have made changes in the visual editor. If you cancel now, your unsaved edits will be discarded.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7DEC8]">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  onCancel();
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#E2725B] hover:bg-[#C95E49] text-white shadow-xs transition-colors cursor-pointer"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reset to Baseline */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E7DEC8] max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#22302E]">{baselineLabel}?</h3>
                <p className="text-xs text-[#22302E]/70 leading-relaxed">
                  This will discard all your custom edits and restore the pristine baseline. Are you sure you want to continue?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7DEC8]">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
              >
                Keep Edits
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  if (onResetToBaseline) {
                    onResetToBaseline();
                  }
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#1E6A63] hover:bg-[#17524C] text-white shadow-xs transition-colors cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Section */}
      {sectionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E7DEC8] max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#22302E]">Delete Section?</h3>
                <p className="text-xs text-[#22302E]/70 leading-relaxed">
                  Are you sure you want to delete the <strong>{sectionToDelete.title}</strong> section and all its contents?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7DEC8]">
              <button
                type="button"
                onClick={() => setSectionToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E7DEC8] hover:bg-[#FAF6EE] text-[#22302E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteSection(sectionToDelete.idx)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Delete Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
