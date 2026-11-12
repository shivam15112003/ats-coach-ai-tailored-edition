import { jsPDF } from "jspdf";
import { ResumeDocument, DocumentStyle, DEFAULT_DOCUMENT_STYLE } from "../types";
import { parseTextToResumeDocument } from "./resumeDocumentParser";

/**
 * Extracts candidate name or title from the top of the resume/letter.
 */
export function extractCandidateName(text: string): string {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const clean = line.replace(/^[#*\s-]+/, "").replace(/[*_#]/g, "").trim();
    if (clean && clean.length < 50 && !/^(contact|summary|skills|experience|education|phone|email|october|november|december|january|february|march|april|may|june|july|august|september)/i.test(clean)) {
      return clean;
    }
  }
  return "Candidate";
}

/**
 * Builds a jsPDF document instance from a ResumeDocument or raw text.
 */
export function createResumePdfDoc(input: ResumeDocument | string): jsPDF {
  const docData: ResumeDocument = typeof input === "string" ? parseTextToResumeDocument(input) : input;
  const style = docData.style || DEFAULT_DOCUMENT_STYLE;
  const pdfFont = style.fontFamily === "Arial" ? "helvetica" : "times";
  const baseSize = style.fontSize;
  const lineStep = Math.max(11, baseSize * style.lineHeight);

  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = style.pageMargin;
  const contentWidth = pageWidth - margin * 2;
  const rightMargin = pageWidth - margin;
  let cursorY = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  // 1. Candidate Name (Centered, Bold, 19pt)
  doc.setFont(pdfFont, "bold");
  doc.setFontSize(baseSize + 8);
  doc.setTextColor(30, 41, 46);
  const nameText = (docData.name || "Candidate Name").toUpperCase();
  doc.text(nameText, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 16;

  // 2. Contact Information (Centered, 9pt)
  if (docData.contactLine) {
    doc.setFont(pdfFont, "normal");
    doc.setFontSize(Math.max(8, baseSize - 2));
    doc.setTextColor(70, 80, 85);
    const cleanContacts = docData.contactLine.replace(/[*_]/g, "");
    const contactLines = doc.splitTextToSize(cleanContacts, contentWidth);
    for (const cLine of contactLines) {
      doc.text(cLine, pageWidth / 2, cursorY, { align: "center" });
      cursorY += lineStep;
    }
  }
  cursorY += 6;

  // 3. Optional Summary Block
  if (docData.summary && docData.summary.trim()) {
    checkPageBreak(35);
    doc.setFont(pdfFont, "normal");
    doc.setFontSize(Math.max(8.5, baseSize - 1));
    doc.setTextColor(45, 55, 60);
    const wrappedSummary = doc.splitTextToSize(docData.summary.trim(), contentWidth);
    doc.text(wrappedSummary, margin, cursorY);
    cursorY += wrappedSummary.length * lineStep + style.paragraphSpacing;
  }

  // 4. Render Each Section
  for (const section of docData.sections) {
    if (!section.title) continue;

    // Section Header (Uppercase, 11pt bold, with clean horizontal separator)
    checkPageBreak(38);
    cursorY += 6;
    doc.setFont(pdfFont, "bold");
    doc.setFontSize(baseSize);
    doc.setTextColor(30, 106, 99); // Dark teal ATS accent for crisp typographic hierarchy
    doc.text(section.title.toUpperCase(), margin, cursorY);
    cursorY += 4;

    // Thin separator line
    doc.setDrawColor(200, 205, 205);
    doc.setLineWidth(0.75);
    doc.line(margin, cursorY, rightMargin, cursorY);
    cursorY += 12;

    // Text type section (e.g. Summary, Objective)
    if (section.type === "text" && section.content) {
      doc.setFont(pdfFont, "normal");
      doc.setFontSize(Math.max(8.5, baseSize - 1));
      doc.setTextColor(45, 55, 60);
      const lines = doc.splitTextToSize(section.content.trim(), contentWidth);
      checkPageBreak(lines.length * lineStep + style.paragraphSpacing);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * lineStep + style.paragraphSpacing;
      continue;
    }

    // Skills type section
    if (section.type === "skills" && section.skillsList) {
      for (const skill of section.skillsList) {
        if (!skill.category && !skill.items) continue;
        checkPageBreak(18);

        const categoryLead = skill.category ? `${skill.category}: ` : "";
        doc.setFont(pdfFont, "bold");
        doc.setFontSize(Math.max(8.5, baseSize - 1));
        doc.setTextColor(34, 48, 46);
        const catWidth = doc.getTextWidth(categoryLead);

        doc.text(categoryLead, margin, cursorY);

        doc.setFont(pdfFont, "normal");
        doc.setTextColor(45, 55, 60);
        const availableItemsWidth = contentWidth - catWidth;
        const wrappedItems = doc.splitTextToSize(skill.items || "", availableItemsWidth);

        if (wrappedItems.length > 0) {
          doc.text(wrappedItems[0], margin + catWidth, cursorY);
          for (let w = 1; w < wrappedItems.length; w++) {
            cursorY += lineStep;
            checkPageBreak(14);
            doc.text(wrappedItems[w], margin + catWidth, cursorY);
          }
        }
        cursorY += lineStep;
      }
      cursorY += 3;
      continue;
    }

    // Items type section (Experience, Education, Projects, etc.)
    if (section.items) {
      for (const item of section.items) {
        checkPageBreak(28);

        const hasTitle = Boolean(item.title);
        const hasOrg = Boolean(item.organization);
        const hasDate = Boolean(item.date);
        const hasLoc = Boolean(item.location);

        if (hasTitle || hasOrg || hasDate || hasLoc) {
          // Line 1: Title (Left, Bold) and Date (Right, Regular)
          doc.setFont(pdfFont, "bold");
          doc.setFontSize(Math.max(9, baseSize - 0.5));
          doc.setTextColor(34, 48, 46);
          const leftTitle = item.title || "";
          doc.text(leftTitle, margin, cursorY);

          if (item.date) {
            doc.setFont(pdfFont, "normal");
            doc.setFontSize(Math.max(8.5, baseSize - 1));
            doc.setTextColor(60, 70, 75);
            doc.text(item.date, rightMargin, cursorY, { align: "right" });
          }
          cursorY += lineStep;

          // Line 2: Organization (Left, Italic) and Location (Right, Italic)
          if (hasOrg || hasLoc) {
            doc.setFont(pdfFont, "italic");
            doc.setFontSize(Math.max(8.5, baseSize - 1));
            doc.setTextColor(55, 65, 70);
            if (item.organization) {
              doc.text(item.organization, margin, cursorY);
            }
            if (item.location) {
              doc.text(item.location, rightMargin, cursorY, { align: "right" });
            }
            cursorY += lineStep;
          }
        }

        // Bullets
        for (const bullet of item.bullets) {
          if (!bullet || !bullet.trim()) continue;

          doc.setFont(pdfFont, "normal");
          doc.setFontSize(Math.max(8.2, baseSize - 1.5));
          doc.setTextColor(45, 55, 60);

          const bulletIndent = 12;
          const bulletTextWidth = contentWidth - bulletIndent;
          const cleanBullet = bullet.replace(/[*_]/g, "").trim();
          const wrappedLines = doc.splitTextToSize(cleanBullet, bulletTextWidth);
          const blockHeight = wrappedLines.length * lineStep;

          checkPageBreak(blockHeight + 3);

          // Bullet symbol
          doc.setFont(pdfFont, "bold");
          doc.setTextColor(30, 106, 99);
          doc.text("•", margin + 2, cursorY);

          // Bullet text
          doc.setFont(pdfFont, "normal");
          doc.setTextColor(45, 55, 60);
          doc.text(wrappedLines, margin + bulletIndent, cursorY);

          cursorY += blockHeight + Math.max(2, style.paragraphSpacing / 3);
        }

        cursorY += 3;
      }
    }
  }

  return doc;
}

/**
 * Generates an ATS-compliant, text-searchable US Letter PDF for resumes.
 */
export function exportResumeToPdf(input: ResumeDocument | string, filename?: string): void {
  const doc = createResumePdfDoc(input);
  const candidateName = typeof input === "string" ? extractCandidateName(input) : (input.name || "Candidate");
  const targetFilename = filename || `${candidateName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Resume.pdf`;
  doc.save(targetFilename);
}

/**
 * Generates Base64 Data URI of the compiled PDF for live browser preview.
 */
export function generateResumePdfDataUri(input: ResumeDocument | string): string {
  const doc = createResumePdfDoc(input);
  return doc.output("datauristring");
}

/**
 * Generates an ATS-compliant, formatted PDF for cover letters.
 */
export function exportCoverLetterToPdf(markdownText: string, filename?: string): void {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54; // 0.75 in
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const candidateName = extractCandidateName(markdownText);
  const targetFilename = filename || `${candidateName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Cover_Letter.pdf`;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  const paragraphs = markdownText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  for (const para of paragraphs) {
    const isHeading = para.startsWith("#");
    const cleanPara = para.replace(/^#+\s*/, "").replace(/[*_]/g, "");

    if (isHeading) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 46);
      doc.text(cleanPara, margin, cursorY);
      cursorY += 24;
      continue;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 50, 55);

    const wrapped = doc.splitTextToSize(cleanPara, contentWidth);
    const blockHeight = wrapped.length * 15;

    checkPageBreak(blockHeight + 12);
    doc.text(wrapped, margin, cursorY);
    cursorY += blockHeight + 12;
  }

  doc.save(targetFilename);
}
