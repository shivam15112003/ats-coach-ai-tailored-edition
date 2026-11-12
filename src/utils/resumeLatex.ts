// Template copied from job_tailor/resume_and_cover_maker.py:7403.
export const RESUME_TEX_TEMPLATE = `
%-------------------------
% Resume in LaTeX
% Based on Jake Gutierrez template (MIT)
%------------------------

\\documentclass[letterpaper,10pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{graphicx}
\\input{glyphtounicode}

%---------- Page style ----------
\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Tiny ATS footer â€“ disabled
% \\fancyfoot[L]{\\tiny <<ATS_FOOTER>>}


% Adjust margins (Jake-style)
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.75in}
\\addtolength{\\textheight}{1.55in}


\\urlstyle{same}
\\linespread{0.97}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

% Sections formatting (Jake-style)
\\titleformat{\\section}{
  \\vspace{-11pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-1pt}]

% Ensure that generated PDF is machine readable / ATS parsable
\\pdfgentounicode=1
\\pdfinterwordspaceon
\\pdfglyphtounicode{bullet}{2022}

%-------------------------
% Jake's custom commands (kept for future use, not required by pipeline)
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubheadingUpdated}[5]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & {\\small #4} \\\\
      \\textit{\\small#5}
    \\end{tabular*}\\vspace{-3pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------
% Extra commands used by THIS pipeline
% (your project/experience formatting relies on these)
% Projects: show only the tools (no "Tech Stack:" label)
\\newcommand{\\techstackproj}[1]{%
  {\\textcolor{black}{\\normalfont #1}}%
}

% Experience: show only the tools (no "Tech Stack" text)
\\newcommand{\\techstackexp}[1]{%
  {\\normalsize\\textcolor{black}{\\normalfont #1}}%
}

% Our section helper: use Jake's \\section formatting but no numbers
\\newcommand{\\resSection}[1]{\\section*{#1}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\begin{document}

%==================== HEADER ====================

<<HEADER>>

% Wrap the whole body in \\small so it stays 1 page but keeps Jake spacing
{\\small

%==================== SUMMARY (optional) ====================

<<SUMMARY_BLOCK>>

%==================== EDUCATION ====================

\\resSection{EDUCATION}

<<EDUCATION>>

%==================== PROFESSIONAL EXPERIENCE ====================

\\resSection{EXPERIENCE}

<<EXPERIENCE>>

%==================== TECHNICAL SKILLS AND CERTIFICATIONS ====================

\\resSection{TECHNICAL SKILLS AND CERTIFICATIONS}

<<SKILLS>>
<<CERTIFICATIONS>>
<<EXTRACURRICULAR>>

%==================== ACADEMIC PROJECTS ====================

\\resSection{ACADEMIC PROJECTS}

<<PROJECTS>>

} % end \\small

\\end{document}
`;

export function escapeLatex(text: string): string {
  if (!text) return "";
  const replacements: Record<string, string> = {
    "\\": "\\textbackslash{}", "&": "\\&", "%": "\\%", "$": "\\$",
    "#": "\\#", "_": "\\_", "{": "\\{", "}": "\\}",
    "~": "\\textasciitilde{}", "^": "\\textasciicircum{}",
  };
  return String(text).replace(/[\\&%$#_{}~^]/g, char => replacements[char]);
}

export interface ResumeSectionData {
  additionalSections?: Array<{title:string;items:string[]}>;
  name: string;
  contacts: Array<{ text: string; href?: string }>;
  summary: string;
  education: Array<{ school: string; location: string; degree: string; dates: string; gpa?: string; coursework?: string }>;
  experience: Array<{ company: string; role: string; location: string; dates: string; bullets: string[] }>;
  skills: Array<{ category: string; items: string }>;
  certifications: string[];
  extracurricular: string[];
  projects: Array<{ name: string; techStack: string; dates: string; bullets: string[] }>;
}

const INLINE_SECTION_LABELS = "PROFESSIONAL SUMMARY|TECHNICAL SKILLS AND CERTIFICATIONS|TECHNICAL SKILLS|ACADEMIC PROJECTS|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|ACADEMIC BACKGROUND|KEY PROJECTS|SUMMARY|EDUCATION|EXPERIENCE|PROJECTS|CERTIFICATIONS|EXTRACURRICULAR|LEADERSHIP|ACTIVITIES|SKILLS";

/** PDF extraction may collapse every line. Bound identity to the source preamble only. */
export function extractResumeHeader(text: string): Pick<ResumeSectionData, "name" | "contacts"> {
  const labels = new RegExp(String.raw`\b(?:${INLINE_SECTION_LABELS})\b`, "g");
  const inline = labels.exec(text);
  const line = text.match(new RegExp(String.raw`^\s*(?:[#*]+\s*)?(?:${INLINE_SECTION_LABELS})(?:\s*[:*#]*)?\s*$`, "im"));
  const end = Math.min(inline?.index ?? text.length, line?.index ?? text.length);
  let preamble = text.slice(0, end).replace(/^\s*(?:resume|curriculum vitae)\s*(?:\n|$)/i, "").trim();
  preamble = preamble.replace(/\*\*|__/g, "").replace(/^\s*#+\s*/, "");
  const email = String.raw`[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}`;
  const url = String.raw`(?:https?:\/\/|www\.)[^\s|<>]+|(?:[A-Z0-9-]+\.)*(?:github\.com|linkedin\.com)\/[^\s|<>]+|[A-Z0-9-]+\.github\.io(?:\/[^\s|<>]*)?`;
  const phone = String.raw`\+?\d[\d ().-]{7,}\d`;
  const tokens = new RegExp(`${email}|${url}|${phone}`, "gi");
  const firstLine = preamble.split(/\r?\n/).find(value => value.trim()) || "";
  const firstContact = firstLine.search(new RegExp(`${email}|${url}|${phone}`, "i"));
  const nameCandidate = (firstContact >= 0 ? firstLine.slice(0, firstContact) : firstLine).replace(/[|,;\s]+$/g, "").trim();
  const name = nameCandidate && !/[\d@/:|]/.test(nameCandidate) && nameCandidate.split(/\s+/).length <= 8 ? nameCandidate : "";
  if (name) preamble = preamble.slice(preamble.indexOf(name) + name.length);
  const contacts: ResumeSectionData["contacts"] = [];
  let previousEnd = 0;
  const plain = (value: string) => {
    for (const part of value.split(/[|\n]/)) {
      const text = part.trim().replace(/^[,;\s]+|[,;\s]+$/g, "");
      if (text && text.length <= 100 && !/^(?:contact(?: information)?|personal details|header)$/i.test(text)) contacts.push({ text });
    }
  };
  for (const match of preamble.matchAll(tokens)) {
    plain(preamble.slice(previousEnd, match.index));
    const text = match[0].replace(/[;,]+$/g, "");
    contacts.push({ text, ...(/@/.test(text) ? {href:`mailto:${text}`} : /(?:https?:|www\.|github\.|linkedin\.)/i.test(text) ? {href: /^https?:/i.test(text) ? text : `https://${text}`} : {}) });
    previousEnd = match.index! + match[0].length;
  }
  plain(preamble.slice(previousEnd));
  return { name, contacts: contacts.filter((c,i,list)=>list.findIndex(other=>other.text===c.text)===i) };
}

function restoreSectionLineBreaks(text: string): string {
  return text.replace(new RegExp(String.raw`\b(${INLINE_SECTION_LABELS})\b`, "g"), "\n$1\n");
}

export function parseResumeToStructure(text: string): ResumeSectionData {
  const header = extractResumeHeader(text);
  const lines = restoreSectionLineBreaks(text).split("\n").map(l => l.replace(/\*\*|__/g, "").replace(/^\s*#{1,6}\s+/, "").replace(/\*([^*]+)\*/g, "$1").trim()).filter(Boolean);
  const data: ResumeSectionData = {
    name: header.name,
    contacts: header.contacts,
    summary: "",
    education: [],
    experience: [],
    skills: [],
    certifications: [],
    extracurricular: [],
    projects: [],
  };

  let currentSection = "HEADER";
  let currentJob: { company: string; role: string; location: string; dates: string; bullets: string[] } | null = null;
  let currentProj: { name: string; techStack: string; dates: string; bullets: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const cleanHeader = rawLine.replace(/^[#*\s-]+|[#*\s-]+$/g, "").toUpperCase().trim();

    if (cleanHeader === "PROFESSIONAL SUMMARY" || cleanHeader === "SUMMARY" || cleanHeader === "ABOUT ME") {
      currentSection = "SUMMARY";
      continue;
    } else if (cleanHeader === "EDUCATION" || cleanHeader === "ACADEMIC BACKGROUND") {
      currentSection = "EDUCATION";
      continue;
    } else if (cleanHeader === "EXPERIENCE" || cleanHeader === "WORK EXPERIENCE" || cleanHeader === "PROFESSIONAL EXPERIENCE") {
      currentSection = "EXPERIENCE";
      continue;
    } else if (/^(?:TECHNICAL SKILLS(?: AND CERTIFICATIONS)?|SKILLS(?: & .*)?)$/.test(cleanHeader)) {
      currentSection = "SKILLS";
      continue;
    } else if (/^(?:ACADEMIC |KEY )?PROJECTS$/.test(cleanHeader)) {
      currentSection = "PROJECTS";
      continue;
    } else if (/^(?:CERTIFICATIONS|LICENSES)$/.test(cleanHeader)) {
      currentSection = "CERTIFICATIONS";
      continue;
    } else if (/^(?:EXTRACURRICULAR|LEADERSHIP(?: & ACTIVITIES)?|ACTIVITIES)$/.test(cleanHeader)) {
      currentSection = "EXTRACURRICULAR";
      continue;
    }

    if (currentSection === "HEADER") {
      continue;
    } else if (currentSection === "SUMMARY") {
      data.summary += (data.summary ? " " : "") + rawLine;
    } else if (currentSection === "EDUCATION") {
      const previous = data.education.at(-1);
      if (/^(?:c?gpa)\s*:/i.test(rawLine) && previous) { previous.gpa = rawLine.replace(/^(?:c?gpa)\s*:\s*/i, ""); continue; }
      if (/^relevant coursework\s*:/i.test(rawLine) && previous) { previous.coursework = rawLine.replace(/^relevant coursework\s*:\s*/i, ""); continue; }
      const parts = rawLine.split("|").map(p => p.trim());
      if (parts.length >= 2) {
        data.education.push({
          school: parts[0] || "",
          location: parts.length >= 4 ? parts[3] : "",
          degree: parts[1] || "",
          dates: parts[2] || "",
        });
      } else {
        data.education.push({
          school: rawLine,
          location: "",
          degree: "",
          dates: "",
        });
      }
    } else if (currentSection === "EXPERIENCE") {
      const cleanLine = rawLine.replace(/^[#*•\s-]+|[#*•\s-]+$/g, "").trim();
      const hasPipe = cleanLine.includes("|");
      const isJobTitle = hasPipe && (
        cleanLine.includes(" - ") || cleanLine.includes(" -- ") ||
        /present|\d{4}|engineer|intern|developer|lead|analyst|manager|specialist|assistant|associate|scientist/i.test(cleanLine)
      );

      if (isJobTitle || (hasPipe && !rawLine.startsWith("- ") && !rawLine.startsWith("• "))) {
        const parts = cleanLine.split("|").map(p => p.trim());
        currentJob = {
          role: parts[0] || "",
          company: parts[1] || "",
          dates: parts[2] || "",
          location: parts[3] || "",
          bullets: [],
        };
        data.experience.push(currentJob);
      } else if (rawLine.startsWith("-") || rawLine.startsWith("•") || rawLine.startsWith("*")) {
        const b = rawLine.replace(/^[-•*]\s*/, "").replace(/^\*\*|\*\*$/g, "").trim();
        if (currentJob) {
          currentJob.bullets.push(b);
        } else {
          currentJob = { company: "", role: "", location: "", dates: "", bullets: [b] };
          data.experience.push(currentJob);
        }
      }
    } else if (currentSection === "SKILLS") {
      const clean = rawLine.replace(/^[-•*]\s*/, "").trim();
      const idx = clean.indexOf(":");
      if (idx !== -1) {
        data.skills.push({
          category: clean.slice(0, idx).trim(),
          items: clean.slice(idx + 1).trim(),
        });
      } else {
        data.skills.push({
          category: "Technical Skills",
          items: clean,
        });
      }
    } else if (currentSection === "PROJECTS") {
      const cleanLine = rawLine.replace(/^[#*•\s-]+|[#*•\s-]+$/g, "").trim();
      const hasPipe = cleanLine.includes("|");

      if (hasPipe && !rawLine.startsWith("- ") && !rawLine.startsWith("• ")) {
        const parts = cleanLine.split("|").map(p => p.trim());
        currentProj = {
          name: parts[0] || "",
          techStack: parts[1] || "",
          dates: parts[2] || "",
          bullets: [],
        };
        data.projects.push(currentProj);
      } else if (rawLine.startsWith("-") || rawLine.startsWith("•") || rawLine.startsWith("*")) {
        const b = rawLine.replace(/^[-•*]\s*/, "").replace(/^\*\*|\*\*$/g, "").trim();
        if (currentProj) {
          currentProj.bullets.push(b);
        } else {
          currentProj = { name: "", techStack: "", dates: "", bullets: [b] };
          data.projects.push(currentProj);
        }
      }
    } else if (currentSection === "CERTIFICATIONS") {
      const b = rawLine.replace(/^[-•*]\s*/, "").trim();
      data.certifications.push(b);
    } else if (currentSection === "EXTRACURRICULAR") {
      const b = rawLine.replace(/^[-•*]\s*/, "").trim();
      data.extracurricular.push(b);
    }
  }

  return data;
}

/** Same uniform font sizes used by the Python resume maker; 10pt minimum body. */
export function applyResumeLayout(source: string, lineSpread = 1.32, scale = 1): string {
  let tex = source.replace(/% BEGIN UNIFORM RESUME FONTS[\s\S]*?% END UNIFORM RESUME FONTS\n/g, "");
  const sizes: Record<string, [number, number]> = {
    tiny: [6, 7], scriptsize: [8, 9], footnotesize: [10, 12], small: [10, 12],
    normalsize: [11, 13], large: [14, 16], Large: [14.4, 18], LARGE: [17.28, 22], huge: [20.74, 25], Huge: [24.88, 30],
  };
  const fonts = ["% BEGIN UNIFORM RESUME FONTS", ...Object.entries(sizes).map(([name, [size, leading]]) =>
    String.raw`\renewcommand{${String.fromCharCode(92)}${name}}{\fontsize{${(size * scale).toFixed(3)}}{${(leading * scale).toFixed(3)}}\selectfont}`), "% END UNIFORM RESUME FONTS\n"].join("\n");
  tex = tex.replace(/\\linespread\{[0-9.]+\}/, String.raw`\linespread{${lineSpread}}`);
  return tex.replace("\\begin{document}", fonts + "\\begin{document}");
}

export const SUMMARY_LAYOUT_MACROS = String.raw`
% BEGIN ATS SUMMARY LAYOUT
\newsavebox{\atsSummaryBox}
\newcount\atsSummaryLines
\newcommand{\atsMeasureSummary}[1]{%
  \setbox\atsSummaryBox=\vbox{\hsize=\linewidth\parindent=0pt\noindent #1\par\global\atsSummaryLines=\prevgraf}%
}
\newcommand{\resumeSummary}[4]{%
  \atsMeasureSummary{#1}%
  \ifnum\atsSummaryLines>3
    \atsMeasureSummary{#3}%
    \ifnum\atsSummaryLines<2 \atsMeasureSummary{#4}\fi
  \else
    \ifnum\atsSummaryLines<2 \atsMeasureSummary{#2}\fi
  \fi
  \typeout{ATS_SUMMARY_LINES=\the\atsSummaryLines}%
  \noindent\usebox{\atsSummaryBox}\par
}
% END ATS SUMMARY LAYOUT
`;

export function formatResumeSummary(summary: string): string {
  const clean=summary.replace(/\s+/g," ").trim();
  if(!clean)return "";
  const sentences=clean.split(/(?<=[.!?])\s+(?=[A-Z])/);
  let concise=sentences[0];
  for(const sentence of sentences.slice(1)){
    if((concise+" "+sentence).split(/\s+/).length>38)break;
    concise+=" "+sentence;
  }
  const shorter=sentences[0];
  const twoLines=(text:string)=>{
    const words=text.split(/\s+/);const middle=Math.ceil(words.length/2);
    return escapeLatex(words.slice(0,middle).join(" "))+String.raw` \hfil\break `+escapeLatex(words.slice(middle).join(" "));
  };
  return String.raw`\resumeSummary{${escapeLatex(concise)}}{${twoLines(concise)}}{${escapeLatex(shorter)}}{${twoLines(shorter)}}`;
}

export function applyResumePresentation(source:string,summary?:string):string{
  // Repair cached headers where a plain-text contact joined the spacing command.
  let tex=source.replace(/\\enspace(?=[A-Za-z])/g,"\\enspace{}")
    .replace(/(\\textbf\{\\large[^\n]*?\}\\\\)\[(?:10|2)pt\]/g,"$1[0pt]");
  if(summary && !tex.includes("% BEGIN ATS SUMMARY LAYOUT"))tex=tex.replace(escapeLatex(summary),()=>formatResumeSummary(summary));
  if(tex.includes("\\resumeSummary{")&&!tex.includes("\\resSection{SUMMARY}"))tex=tex.replace("\\resumeSummary{","\\resSection{SUMMARY}\n\\resumeSummary{");
  if(tex.includes("\\resumeSummary{")&&!tex.includes("% BEGIN ATS SUMMARY LAYOUT"))
    tex=tex.replace("\\begin{document}",SUMMARY_LAYOUT_MACROS+"\n\\begin{document}");
  return tex;
}

export function renderResumeHeader(data: Pick<ResumeSectionData, "name" | "contacts">): string {
  const esc = escapeLatex;
  const name = data.name ? String.raw`\textbf{\large ${esc(data.name)}}\\[0pt]` : "";
  const contactParts = data.contacts.filter(c => c.text.trim()).map(c => c.href
    ? String.raw`\href{${esc(c.href)}}{${esc(/^https?:/i.test(c.href) ? c.href : c.text)}}` : esc(c.text));
  const separator = String.raw`\enspace{}\textbar{}\enspace{}`;
  const contacts = contactParts.join(separator);
  const primaryCount=data.contacts.some(c=>/github\.com/i.test(c.href||c.text))?3:2;
  const wrapped = [contactParts.slice(0,primaryCount).join(separator), contactParts.slice(primaryCount).join(separator)].filter(Boolean).join(String.raw`\\[2pt]`);
  const contactBlock = contacts ? String.raw`\begingroup\footnotesize\leavevmode
\setbox0=\hbox{${contacts}}
\ifdim\wd0>\linewidth\parbox{\linewidth}{\centering ${wrapped}}\else\box0\fi\endgroup\\[1pt]` : "";
  return name || contactBlock ? String.raw`\begin{center}
${name}
${contactBlock}
\end{center}
\vspace{-0.45em}` : "";
}

const RESUME_SECTION = /^(?:PROFESSIONAL SUMMARY|SUMMARY|ABOUT ME|EDUCATION|ACADEMIC BACKGROUND|EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|TECHNICAL SKILLS(?: AND CERTIFICATIONS)?|SKILLS|ACADEMIC PROJECTS|PROJECTS|KEY PROJECTS|CERTIFICATIONS|LICENSES|EXTRACURRICULAR|LEADERSHIP(?: & ACTIVITIES)?|ACTIVITIES)$/i;

/** Identity is copied from source deterministically, rather than regenerated by the LLM. */
export function preserveOriginalHeader(original: string, tailored: string): string {
  const originalData = parseResumeToStructure(original);
  const lines = tailored.split("\n");
  const bodyStart = lines.findIndex(line => RESUME_SECTION.test(line.replace(/^[#*\s-]+|[#*\s-]+$/g, "").trim()));
  if (bodyStart < 0) return tailored;
  const header = [originalData.name, ...originalData.contacts.map(c => c.text)].filter(Boolean).join("\n");
  return [header, lines.slice(bodyStart).join("\n")].filter(Boolean).join("\n\n");
}

/** Repair an existing generated PDF source too, so preview and download share the restored header. */
export function restoreOriginalLatexHeader(source: string, original: string): string {
  const start = source.indexOf("\\begin{document}");
  if (start < 0) return source;
  const contentStart = start + "\\begin{document}".length;
  const header = renderResumeHeader(parseResumeToStructure(original));
  const body = source.slice(contentStart);
  const match = body.match(/\\begin\{center\}[\s\S]*?\\end\{center\}(?:\s*\\vspace\{-0\.45em\})?/);
  return source.slice(0, contentStart) + (match
    ? body.replace(match[0], () => header)
    : "\n" + header + "\n" + body);
}

function formatMakerBullets(items:string[],projects=false):string{
  const content=items.filter(b=>b.trim());
  if(!content.length)return "";
  const options=projects?"leftmargin=0.18in, label={--}, topsep=0pt, partopsep=0pt, parsep=0pt, itemsep=0pt":"leftmargin=0.18in, label={--}, topsep=0pt, partopsep=0pt, itemsep=0pt, parsep=0pt";
  return [String.raw`\begin{itemize}[${options}]`,...content.map(b=>String.raw`  \item ${escapeLatex(b)}`),String.raw`\end{itemize}`].join("\n");
}
export function formatMakerEducation(education:ResumeSectionData["education"]):string{
  const lines:string[]=[];const esc=escapeLatex;
  for(const e of education){
    if(e.degree||e.dates)lines.push((e.degree?String.raw`\textbf{${esc(e.degree)}}`:"")+(e.dates?String.raw` \hfill ${esc(e.dates)}`:"")+String.raw`\\`);
    const school=[e.school,e.location].filter(Boolean).join(", ");
    if(school||e.gpa)lines.push(esc(school)+(e.gpa?String.raw` \hfill \textbf{GPA: ${esc(e.gpa)}}`:"")+String.raw`\\[0.1em]`);
    if(e.coursework)lines.push(String.raw`\textit{Relevant Coursework:} ${esc(e.coursework)}\\[0.1em]`);
    lines.push("");
  }
  return lines.join("\n").trim();
}
export function formatMakerExperience(experience:ResumeSectionData["experience"]):string{
  const esc=escapeLatex;
  return experience.map(e=>{
    const lines=[String.raw`\noindent\begin{tabular*}{\textwidth}{@{}l@{\extracolsep{\fill}}r@{}}`,String.raw`  ${e.role?String.raw`\textbf{${esc(e.role)}}`:""} & ${esc(e.dates)}\\`];
    if(e.company||e.location)lines.push(String.raw`  ${e.company?String.raw`\textit{${esc(e.company)}}`:""} & ${e.location?String.raw`\textit{${esc(e.location)}}`:""}\\`);
    lines.push(String.raw`\end{tabular*}`);
    if(e.bullets.length)lines.push(formatMakerBullets(e.bullets));
    return lines.join("\n");
  }).join("\n\n\\vspace{0.12em}\n\n");
}
export function formatMakerProjects(projects:ResumeSectionData["projects"]):string{
  const esc=escapeLatex;
  return projects.map(p=>{
    const left=[p.name?String.raw`\textbf{${esc(p.name)}}`:"",p.techStack?String.raw`\techstackproj{${esc(p.techStack)}}`:""].filter(Boolean).join(String.raw` \textbar{} `);
    const lines=[String.raw`\noindent\begin{tabularx}{\linewidth}{@{}>{\raggedright\arraybackslash}X@{}}`,String.raw`  ${left}\\`,String.raw`\end{tabularx}`];
    if(p.bullets.length)lines.push(formatMakerBullets(p.bullets,true));
    return lines.join("\n");
  }).join("\n\n\\vspace{0.12em}\n\n");
}
export function buildLatexFromStructure(data: ResumeSectionData): string {
  const esc = escapeLatex;
  const header=renderResumeHeader(data);
  const education=formatMakerEducation(data.education);
  const experience=formatMakerExperience(data.experience);
  const skills = data.skills.filter(s => s.items.trim()).map(s =>
    (s.category ? String.raw`\textbf{${esc(s.category)}:} ` : "") + esc(s.items) + String.raw`\\`).join("\n");
  const certifications = data.certifications.filter(Boolean).length
    ? String.raw`\textbf{Certifications:} ${esc(data.certifications.filter(Boolean).join(", "))}\\` : "";
  const extracurricular = data.extracurricular.filter(Boolean).length
    ? String.raw`\textbf{Extra-Curricular:} ${esc(data.extracurricular.filter(Boolean).join("; "))}\\` : "";
  const projects=formatMakerProjects(data.projects);
  const sections: Record<string, string> = { HEADER: header, SUMMARY_BLOCK: formatResumeSummary(data.summary),
    EDUCATION: education, EXPERIENCE: experience, SKILLS: skills, CERTIFICATIONS: certifications,
    EXTRACURRICULAR: extracurricular, PROJECTS: projects + (data.additionalSections||[]).map(section=>String.raw`\resSection{${esc(section.title)}}`+"\n"+formatMakerBullets(section.items)).join("\n") };
  let tex = RESUME_TEX_TEMPLATE;
  for (const [heading, content] of [["EDUCATION", education], ["EXPERIENCE", experience],
    ["TECHNICAL SKILLS AND CERTIFICATIONS", skills || certifications || extracurricular], ["ACADEMIC PROJECTS", projects]]) {
    if (!content) tex = tex.replace(String.raw`\resSection{${heading}}`, "");
  }
  for (const [key, value] of Object.entries(sections)) tex = tex.replace(`<<${key}>>`, () => value);
  return applyResumeLayout(applyResumePresentation("% ATS Coach: automatic one-page layout\n" + tex));
}

/** Remove empty lists left in resumes generated by older template versions. */
export function removeEmptyLatexLists(source: string): string {
  return source
    .replace(/\\resumeSubHeadingListStart\s*\\resumeSubHeadingListEnd/g, "")
    .replace(/\\resumeItemListStart\s*\\resumeItemListEnd/g, "")
    .replace(/\\begin\{itemize\}(?:\[[^\]]*\])?\s*(?:\\small\s*\{\s*\\item\s*\{\s*\}\s*\}\s*)?\\end\{itemize\}/g, "");
}


/** Source-preserved results use the SAME structured formatters as rewritten results. */
export function buildSourcePreservingLatex(original:string,structure?:ResumeSectionData):string{
  return buildLatexFromStructure(structure||parseResumeToStructure(original));
}
