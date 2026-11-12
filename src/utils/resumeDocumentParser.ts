import { ResumeDocument, ResumeSection, ResumeItem, ResumeSkillCategory, DEFAULT_DOCUMENT_STYLE } from "../types";

function generateId(): string {
  return "id_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
}

/**
 * Deep clone a ResumeDocument for immutable state updates and undo/redo history.
 */
export function cloneResumeDocument(doc: ResumeDocument): ResumeDocument {
  return JSON.parse(JSON.stringify(doc));
}

/**
 * Parse any resume text (markdown or plain text) into a structured ResumeDocument.
 */
export function parseTextToResumeDocument(rawText: string): ResumeDocument {
  const text = (rawText || "").trim();
  const lines = text.split("\n").map(l => l.trim());

  const doc: ResumeDocument = {
    name: "Candidate Name",
    contactLine: "",
    summary: "",
    sections: [],
    style: { ...DEFAULT_DOCUMENT_STYLE },
  };

  if (!lines.length || !text) {
    return doc;
  }

  // Common known section headers
  const isSectionHeader = (line: string): { isHeader: boolean; title: string; type: "items" | "skills" | "text" } => {
    const clean = line.replace(/^[#*\s-]+|[#*\s-]+$/g, "").trim();
    const upper = clean.toUpperCase();

    // Check markdown heading ## or ###
    const isMdHeading = line.startsWith("## ") || line.startsWith("### ");
    const isAllCapsShort = clean.length > 2 && clean.length < 40 && clean === clean.toUpperCase() && !clean.includes("•") && !clean.includes("|") && !clean.includes(":");

    if (upper === "PROFESSIONAL SUMMARY" || upper === "SUMMARY" || upper === "ABOUT ME" || upper === "OBJECTIVE") {
      return { isHeader: true, title: "SUMMARY", type: "text" };
    }
    if (upper === "EDUCATION" || upper === "ACADEMIC BACKGROUND" || upper === "EDUCATION & CREDENTIALS") {
      return { isHeader: true, title: "EDUCATION", type: "items" };
    }
    if (upper === "EXPERIENCE" || upper === "WORK EXPERIENCE" || upper === "PROFESSIONAL EXPERIENCE" || upper === "EMPLOYMENT HISTORY") {
      return { isHeader: true, title: "EXPERIENCE", type: "items" };
    }
    if (["SKILLS", "TECHNICAL SKILLS", "CORE COMPETENCIES", "SKILLS AND CERTIFICATIONS", "TECHNICAL SKILLS AND CERTIFICATIONS"].includes(upper)) {
      return { isHeader: true, title: "TECHNICAL SKILLS", type: "skills" };
    }
    if (["PROJECTS", "ACADEMIC PROJECTS", "KEY PROJECTS", "SELECTED PROJECTS"].includes(upper)) {
      return { isHeader: true, title: "PROJECTS", type: "items" };
    }
    if (["CERTIFICATIONS", "CERTIFICATIONS & LICENSES", "LICENSES", "LICENSES & CERTIFICATIONS"].includes(upper)) {
      return { isHeader: true, title: "CERTIFICATIONS", type: "items" };
    }
    if (["LEADERSHIP", "ACTIVITIES", "LEADERSHIP & ACTIVITIES", "EXTRACURRICULAR ACTIVITIES"].includes(upper)) {
      return { isHeader: true, title: "LEADERSHIP & ACTIVITIES", type: "items" };
    }

    if (isMdHeading && clean.length < 45) {
      return { isHeader: true, title: clean, type: "items" };
    }
    if (isAllCapsShort && !line.includes("@") && !line.includes("HTTP")) {
      return { isHeader: true, title: clean, type: "items" };
    }

    return { isHeader: false, title: "", type: "items" };
  };

  // Find candidate name and contact information at the top
  let i = 0;
  while (i < lines.length && !lines[i]) i++;

  if (i < lines.length) {
    const firstLine = lines[i].replace(/^[#*\s]+/, "").trim();
    doc.name = firstLine || "Candidate Name";
    i++;
  }

  // Next non-empty lines before the first section header are contact info
  const contactParts: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }
    const headerCheck = isSectionHeader(line);
    if (headerCheck.isHeader) {
      break;
    }
    // Clean contact text
    const cleanLine = line.replace(/^[#*\s-]+/, "").trim();
    if (cleanLine) {
      contactParts.push(cleanLine);
    }
    i++;
  }

  doc.contactLine = contactParts.join(" | ");

  // Now parse each section
  let currentSection: ResumeSection | null = null;
  let currentItem: ResumeItem | null = null;

  const commitCurrentSection = () => {
    if (currentSection) {
      if (currentItem && currentSection.items) {
        currentSection.items.push(currentItem);
        currentItem = null;
      }
      doc.sections.push(currentSection);
      currentSection = null;
    }
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    i++;

    if (!rawLine) continue;

    const headerCheck = isSectionHeader(rawLine);
    if (headerCheck.isHeader) {
      commitCurrentSection();
      currentSection = {
        id: generateId(),
        title: headerCheck.title,
        type: headerCheck.type,
        ...(headerCheck.type === "items" ? { items: [] } : {}),
        ...(headerCheck.type === "skills" ? { skillsList: [] } : {}),
        ...(headerCheck.type === "text" ? { content: "" } : {}),
      };
      continue;
    }

    if (!currentSection) {
      // Default to experience or summary if no header yet
      currentSection = {
        id: generateId(),
        title: "EXPERIENCE",
        type: "items",
        items: [],
      };
    }

    // Handle section content based on type
    if (currentSection.type === "text") {
      currentSection.content = (currentSection.content ? currentSection.content + "\n" : "") + rawLine;
    } else if (currentSection.type === "skills") {
      const cleanLine = rawLine.replace(/^[-*•\s]+/, "").trim();
      const colonIdx = cleanLine.indexOf(":");
      if (colonIdx !== -1) {
        const cat = cleanLine.slice(0, colonIdx).replace(/[*_]/g, "").trim();
        const items = cleanLine.slice(colonIdx + 1).replace(/[*_]/g, "").trim();
        currentSection.skillsList = currentSection.skillsList || [];
        currentSection.skillsList.push({
          id: generateId(),
          category: cat || "Skills",
          items: items || cleanLine,
        });
      } else if (cleanLine) {
        currentSection.skillsList = currentSection.skillsList || [];
        currentSection.skillsList.push({
          id: generateId(),
          category: "General",
          items: cleanLine.replace(/[*_]/g, ""),
        });
      }
    } else {
      // Items section (Experience, Education, Projects, etc.)
      const isBullet = /^[-*•]\s+/.test(rawLine);

      if (isBullet) {
        const bulletText = rawLine.replace(/^[-*•]\s+/, "").replace(/^\*\*|\*\*$/g, "").trim();
        if (!currentItem) {
          currentItem = {
            id: generateId(),
            title: "Highlights",
            organization: "",
            date: "",
            location: "",
            bullets: [],
          };
        }
        currentItem.bullets.push(bulletText);
      } else {
        // Line represents an item heading (e.g. "Software Engineer | Google | June 2024 – Present | Mountain View, CA")
        // Or "Arizona State University — B.S. in Computer Science"
        // Or "Campus Resource Exchange Platform | React, Node.js, PostgreSQL"
        if (currentItem) {
          currentSection.items = currentSection.items || [];
          currentSection.items.push(currentItem);
          currentItem = null;
        }

        const cleanLine = rawLine.replace(/^[#*]+|[#*]+$/g, "").trim();

        // Check if there are pipes or dashes
        if (cleanLine.includes("|")) {
          const parts = cleanLine.split("|").map(p => p.trim());
          // Standard: Role | Company | Dates | Location or Project | Tech | Dates
          const title = parts[0] || "Role";
          const org = parts[1] || "";
          const date = parts[2] || "";
          const loc = parts[3] || "";

          currentItem = {
            id: generateId(),
            title,
            organization: org,
            date,
            location: loc,
            bullets: [],
          };
        } else if (cleanLine.includes("—") || cleanLine.includes(" -- ") || cleanLine.includes(" - ")) {
          const splitChar = cleanLine.includes("—") ? "—" : cleanLine.includes(" -- ") ? " -- " : " - ";
          const parts = cleanLine.split(splitChar).map(p => p.trim());
          currentItem = {
            id: generateId(),
            title: parts[0] || "Title",
            organization: parts[1] || "",
            date: parts[2] || "",
            location: parts[3] || "",
            bullets: [],
          };
        } else {
          // Single line heading
          currentItem = {
            id: generateId(),
            title: cleanLine,
            organization: "",
            date: "",
            location: "",
            bullets: [],
          };
        }
      }
    }
  }

  commitCurrentSection();

  return doc;
}

/**
 * Convert a structured ResumeDocument back into clean markdown / plain text.
 */
export function resumeDocumentToText(doc: ResumeDocument): string {
  const parts: string[] = [];

  // Name
  if (doc.name) {
    parts.push(doc.name.toUpperCase());
  }

  // Contacts
  if (doc.contactLine) {
    parts.push(doc.contactLine);
  }

  // Summary if exists outside sections
  if (doc.summary) {
    parts.push("\nSUMMARY\n" + doc.summary);
  }

  for (const section of doc.sections) {
    parts.push("\n" + section.title.toUpperCase());

    if (section.type === "text" && section.content) {
      parts.push(section.content);
    } else if (section.type === "skills" && section.skillsList) {
      for (const skill of section.skillsList) {
        parts.push(`${skill.category}: ${skill.items}`);
      }
    } else if (section.items) {
      for (const item of section.items) {
        const headerPieces: string[] = [];
        if (item.title) headerPieces.push(item.title);
        if (item.organization) headerPieces.push(item.organization);
        if (item.date) headerPieces.push(item.date);
        if (item.location) headerPieces.push(item.location);

        if (headerPieces.length > 0) {
          parts.push(headerPieces.join(" | "));
        }

        for (const bullet of item.bullets) {
          parts.push(`• ${bullet}`);
        }
      }
    }
  }

  return parts.join("\n");
}
