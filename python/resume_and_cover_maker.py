"""Cloud copy of the original resume and cover maker. See maker_provenance.json.
Personal defaults and Windows/browser dependencies are intentionally excluded.
"""

from __future__ import annotations
import re
from pathlib import Path
from cloud_adapter import *

MAX_PROJECT_BULLETS=3
MAX_EXPERIENCE_BULLETS=4
MAX_SKILLS_PER_CATEGORY=24
MAX_SOFT_SKILLS=5
COMPACT_SKILLS=True
HIGHLIGHT_KEYWORDS=[]
OTHER_SECTIONS=[]

RESUME_TEX_TEMPLATE = '\n%-------------------------\n% Resume in LaTeX\n% Based on Jake Gutierrez template (MIT)\n%------------------------\n\n\\documentclass[letterpaper,10pt]{article}\n\n\\usepackage{latexsym}\n\\usepackage[empty]{fullpage}\n\\usepackage{titlesec}\n\\usepackage{marvosym}\n\\usepackage[usenames,dvipsnames]{color}\n\\usepackage{verbatim}\n\\usepackage{enumitem}\n\\usepackage[hidelinks]{hyperref}\n\\usepackage{fancyhdr}\n\\usepackage[T1]{fontenc}\n\\usepackage{lmodern}\n\\usepackage[english]{babel}\n\\usepackage{tabularx}\n\\usepackage{graphicx}\n\\input{glyphtounicode}\n\n%---------- Page style ----------\n\\pagestyle{fancy}\n\\fancyhf{} % clear all header and footer fields\n\\fancyfoot{}\n\\renewcommand{\\headrulewidth}{0pt}\n\\renewcommand{\\footrulewidth}{0pt}\n\n% Tiny ATS footer â€“ disabled\n% \\fancyfoot[L]{\\tiny <<ATS_FOOTER>>}\n\n\n% Adjust margins (Jake-style)\n\\addtolength{\\oddsidemargin}{-0.5in}\n\\addtolength{\\evensidemargin}{-0.5in}\n\\addtolength{\\textwidth}{1in}\n\\addtolength{\\topmargin}{-.75in}\n\\addtolength{\\textheight}{1.55in}\n\n\n\\urlstyle{same}\n\\linespread{0.97}\n\n\\raggedbottom\n\\raggedright\n\\setlength{\\tabcolsep}{0in}\n\\setlength{\\parindent}{0pt}\n\\setlength{\\parskip}{0pt}\n\n% Sections formatting (Jake-style)\n\\titleformat{\\section}{\n  \\vspace{-11pt}\\scshape\\raggedright\\large\n}{}{0em}{}[\\color{black}\\titlerule \\vspace{-1pt}]\n\n% Ensure that generated PDF is machine readable / ATS parsable\n\\pdfgentounicode=1\n\\pdfinterwordspaceon\n\\pdfglyphtounicode{bullet}{2022}\n\n%-------------------------\n% Jake\'s custom commands (kept for future use, not required by pipeline)\n\\newcommand{\\resumeItem}[1]{\n  \\item\\small{\n    {#1 \\vspace{-2pt}}\n  }\n}\n\n\\newcommand{\\resumeSubheading}[4]{\n  \\vspace{-2pt}\\item\n    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}\n      \\textbf{#1} & #2 \\\\\n      \\textit{\\small#3} & \\textit{\\small #4} \\\\\n    \\end{tabular*}\\vspace{-7pt}\n}\n\n\\newcommand{\\resumeSubheadingUpdated}[5]{\n  \\vspace{-2pt}\\item\n    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}\n      \\textbf{#1} & #2 \\\\\n      \\textit{\\small#3} & {\\small #4} \\\\\n      \\textit{\\small#5}\n    \\end{tabular*}\\vspace{-3pt}\n}\n\n\\newcommand{\\resumeSubSubheading}[2]{\n    \\item\n    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}\n      \\textit{\\small#1} & \\textit{\\small #2} \\\\\n    \\end{tabular*}\\vspace{-7pt}\n}\n\n\\newcommand{\\resumeProjectHeading}[2]{\n    \\item\n    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}\n      \\small#1 & #2 \\\\\n    \\end{tabular*}\\vspace{-7pt}\n}\n\n\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}\n\n\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}\n\n\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}\n\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}\n\\newcommand{\\resumeItemListStart}{\\begin{itemize}}\n\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}\n\n%-------------------------\n% Extra commands used by THIS pipeline\n% (your project/experience formatting relies on these)\n% Projects: show only the tools (no "Tech Stack:" label)\n\\newcommand{\\techstackproj}[1]{%\n  {\\textcolor{black}{\\normalfont #1}}%\n}\n\n% Experience: show only the tools (no "Tech Stack" text)\n\\newcommand{\\techstackexp}[1]{%\n  {\\normalsize\\textcolor{black}{\\normalfont #1}}%\n}\n\n% Our section helper: use Jake\'s \\section formatting but no numbers\n\\newcommand{\\resSection}[1]{\\section*{#1}}\n\n%-------------------------------------------\n%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%\n\n\\begin{document}\n\n%==================== HEADER ====================\n\n<<HEADER>>\n\n% Wrap the whole body in \\small so it stays 1 page but keeps Jake spacing\n{\\small\n\n%==================== SUMMARY (optional) ====================\n\n<<SUMMARY_BLOCK>>\n\n%==================== EDUCATION ====================\n\n\\resSection{EDUCATION}\n\n<<EDUCATION>>\n\n%==================== PROFESSIONAL EXPERIENCE ====================\n\n\\resSection{EXPERIENCE}\n\n<<EXPERIENCE>>\n\n%==================== TECHNICAL SKILLS AND CERTIFICATIONS ====================\n\n\\resSection{TECHNICAL SKILLS AND CERTIFICATIONS}\n\n<<SKILLS>>\n<<CERTIFICATIONS>>\n<<EXTRACURRICULAR>>\n\n%==================== ACADEMIC PROJECTS ====================\n\n\\resSection{ACADEMIC PROJECTS}\n\n<<PROJECTS>>\n\n} % end \\small\n\n\\end{document}\n'

COVER_LETTER_TEX_TEMPLATE = '\n\\documentclass[10pt]{article}\n\n\\usepackage[margin=0.8in]{geometry}\n\\usepackage[T1]{fontenc}\n\\usepackage{lmodern}\n\\usepackage[utf8]{inputenc}\n\\usepackage[hidelinks]{hyperref}\n\\input{glyphtounicode}\n\\setlength{\\parindent}{0pt}\n\\setlength{\\parskip}{0.6em}\n\n% ATS-safe PDF text extraction\n\\pdfgentounicode=1\n\\pdfinterwordspaceon\n\n% No headers/footers or page numbers on the cover letter\n\\pagestyle{empty}\n\n\\begin{document}\n\n<<HEADER_BLOCK>>\\\\[0.5em]\n\n<<DATE_LINE>>\\\\[0.5em]\n\n<<COMPANY_BLOCK>>\\\\[0.5em]\n\n<<SALUTATION>>\\\\\n\n<<BODY_BLOCK>>\n\n<<CLOSING_BLOCK>>\n\n\\end{document}\n'

def latex_escape(text: str) -> str:
    if text is None:
        return ""
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(c, c) for c in text)

def word_count(text: str) -> int:
    if not text:
        return 0
    tokens = re.findall(r"\b\w+\b", text)
    return len(tokens)

def format_resume_header(header: dict) -> str:
    """
    Centered header:

      NAME
      phone | email | github | linkedin | portfolio

    - Name on its own line (big).
    - Display complete URLs; wrap to readable contact lines rather than shrink.
    """

    def fix_url(u: str) -> str:
        if not u:
            return ""
        return re.sub(r"\s+", "", str(u))

    name = (header.get("name") or header.get("full_name") or "").strip()
    phone = re.sub(r"\s+", " ", (header.get("phone") or "")).strip()
    email = str(header.get("email") or "").strip()

    github_url = normalize_http_url(header.get("github_url") or "")
    github_label = github_url.replace("https://", "").replace("http://", "")
    linkedin_url = normalize_http_url(fix_url(header.get("linkedin_url") or ""))
    portfolio_url = normalize_http_url(fix_url(header.get("portfolio_url") or ""))

    def label(url: str) -> str:
        """
        Display the complete clickable URL, including its protocol and path.
        """
        if not url:
            return ""
        return latex_escape(url)

    name_tex = latex_escape(name)
    phone_tex = latex_escape(phone) if phone else ""

    # Email (mailto)
    email_mailto = email
    email_label_tex = latex_escape(email) if email else ""

    parts: list[str] = []
    if phone_tex:
        parts.append(phone_tex)
    if email:
        parts.append(rf"\href{{mailto:{email_mailto}}}{{{email_label_tex}}}")
    if github_url:
        # IMPORTANT: label is fixed exactly as requested
        parts.append(rf"\href{{{github_url}}}{{{label(github_url)}}}")
    if linkedin_url:
        parts.append(rf"\href{{{linkedin_url}}}{{{label(linkedin_url)}}}")
    if portfolio_url:
        parts.append(rf"\href{{{portfolio_url}}}{{{label(portfolio_url)}}}")

    lines = [r"\begin{center}"]
    lines.append(f"  \\textbf{{\\large {name_tex}}}\\\\[0pt]")

    if parts:
        sep = r"\enspace{}\textbar{}\enspace{}"
        primary = parts[:(3 if github_url else 2)]
        profiles = parts[len(primary):]
        wrapped = sep.join(primary)
        if profiles:
            wrapped += r"\\[2pt]" + sep.join(profiles)
        lines.extend([
            r"  \begingroup\footnotesize\leavevmode%",
            r"  \setbox0=\hbox{" + sep.join(parts) + "}%",
            r"  \ifdim\wd0>\linewidth\parbox{\linewidth}{\centering " + wrapped
            + r"}\else\box0\fi\endgroup\\[1pt]",
        ])

    lines.append(r"\end{center}")
    lines.append(r"\vspace{-0.45em}")
    return "\n".join(lines)

def format_education(education_list):
    """
    Print EVERY education entry Gemini returns, and, if present,
    show a 'Relevant Coursework:' line under each one.
    """
    lines = []
    for edu in education_list or []:
        degree = (edu.get("degree") or "").strip()
        institution = (edu.get("institution") or "").strip()
        location_raw = (edu.get("location") or "").strip()
        # Enforce: City, Country (no state/province)
        location = (
            normalize_location_city_state_country(location_raw) if location_raw else ""
        )
        date_str = (edu.get("date") or "").strip()

        # --- GPA: normalise to 'GPA: x/y' ---
        gpa_raw = _education_gpa(edu)
        gpa_clean = gpa_raw
        if gpa_clean:
            # remove labels like 'GPA', 'CGPA', 'GPA:', 'CGPA.' etc
            gpa_clean = re.sub(r"(?i)\b(c?gpa)\b\.?:?", "", gpa_clean).strip()
            # remove any leftover leading punctuation like ':', '-', ','
            gpa_clean = re.sub(r"^[\s:,\-]+", "", gpa_clean).strip()
        gpa_tex = latex_escape(f"GPA: {gpa_clean}") if gpa_clean else ""

        # NEW: coursework string from Gemini (support either key name, string or list)
        raw_cw = edu.get("coursework") or edu.get("relevant_coursework") or ""
        if isinstance(raw_cw, list):
            cw_parts = [str(x).strip() for x in raw_cw if str(x).strip()]
            coursework = ", ".join(cw_parts)
        else:
            coursework = str(raw_cw).strip()

        # Skip only if everything is truly empty
        if not (
            degree or institution or location or date_str or gpa_clean or coursework
        ):
            continue

        deg_tex = latex_escape(degree)
        date_tex = latex_escape(date_str)
        inst_loc = ", ".join(x for x in [institution, location] if x)
        inst_loc_tex = latex_escape(inst_loc)

        # -------- Line 1: degree + date --------
        if deg_tex or date_tex:
            l1 = ""
            if deg_tex:
                l1 = f"\\textbf{{{deg_tex}}}"
            if date_tex:
                l1 += r" \hfill " + date_tex
            l1 += r"\\"
            lines.append(l1)

        # -------- Line 2: institution, location, GPA (if any) --------
        if inst_loc_tex or gpa_tex:
            if gpa_tex:
                # institution/location on left, GPA: x/y on right
                l2 = f"{inst_loc_tex} \\hfill \\textbf{{{gpa_tex}}}\\\\[0.1em]"
            else:
                l2 = inst_loc_tex + r"\\[0.1em]"
            lines.append(l2)

        # -------- Line 3: Relevant Coursework (if provided) --------
        if coursework:
            cw_tex = latex_escape(coursework)
            cw_tex = highlight_keywords_latex(cw_tex)
            cw_tex = auto_linkify_latex(cw_tex)
            lines.append(r"\textit{Relevant Coursework:} " + cw_tex + r"\\[0.1em]")

        # small extra gap between entries
        lines.append("")

    return "\n".join(lines).strip()

def format_summary(summary: str) -> str:
    tex = latex_escape((summary or "").strip())
    tex = highlight_keywords_latex(tex)
    tex = auto_linkify_latex(tex)
    return tex

def format_skills(skills_list):
    """
    Take a flat list of skills and regroup them into:
      - Hard Skills & Technical Keywords   (grouped into technical categories)
      - Soft Skills & Behavioural Keywords (separate line)

    Input: resume_obj["skills"]  -> list of strings.
    Output: LaTeX block used in <<SKILLS>>.
    """
    # 1) Flatten all comma/"/" separated skills into tokens
    raw_tokens = []
    for line in skills_list or []:
        if not line:
            continue
        s = re.sub(
            r"^\s*(skills?|technical skills?)\s*:\s*",
            "",
            str(line),
            flags=re.IGNORECASE,
        )
        parts = re.split(r"[,/]", s)
        for part in parts:
            token = part.strip()
            if token:
                raw_tokens.append(token)

    # --- Sets for hard and soft skills ---
    categories = {
        "Programming Languages": set(),
        "Machine Learning & Deep Learning": set(),
        "Data & Analytics": set(),
        "MLOps & Optimization": set(),
        "Cloud & Infrastructure": set(),
        "Web & Frontend": set(),
        "Databases": set(),
        "Computer Vision & Robotics": set(),
        "Natural Language Processing": set(),
        "Visualization": set(),
        "Tools & Technologies": set(),
    }
    soft_skills = set()

    # Heuristic list of phrases that flag a soft skill
    SOFT_KEYWORDS = [
        "communication",
        "communicator",
        "teamwork",
        "team player",
        "collaboration",
        "collaborative",
        "leadership",
        "stakeholder",
        "problem solving",
        "problem-solving",
        "critical thinking",
        "time management",
        "adaptability",
        "ownership",
        "initiative",
        "self-motivated",
        "detail oriented",
        "detail-oriented",
        "presentation",
        "storytelling",
        # Trait words that were falling into the technical "Data Automation
        # Skills" default bucket and hurting Resume Worded readability /
        # role-strength (user 2026-06-18). These are behavioural, not technical.
        "accuracy",
        "flexibility",
        "flexible",
        "prioritization",
        "prioritisation",
        "adaptability",
        "adaptable",
        "organization",
        "organisation",
        "organized",
        "organised",
        "reliability",
        "reliable",
        "attention to detail",
        "interpersonal",
        "mentoring",
        "mentorship",
        "work ethic",
        "multitasking",
        "multi-tasking",
        "creativity",
    ]

    def is_soft_skill(low: str) -> bool:
        return any(kw in low for kw in SOFT_KEYWORDS)

    def add_skill(token: str):
        t_norm = token.strip()
        if not t_norm:
            return
        low = t_norm.lower()

        # Drop JD boilerplate / fields / degrees that are NOT skills (user
        # 2026-06-18: "Computer Science", "Eagerness to learn" wrecked
        # readability when rendered as Data-Automation skills).
        if _is_non_skill_phrase(t_norm):
            return

        # First: if it looks like a soft-skill phrase, keep it out of tech categories
        if is_soft_skill(low):
            soft_skills.add(t_norm)
            return

        def has(*subs):
            return any(sub in low for sub in subs)

        # Databases FIRST so "PostgreSQL"/"MySQL" don't get caught by the bare
        # "sql" check in Programming Languages.
        if (
            has("postgres")
            or has("mysql")
            or has("mongodb", "mongo")
            or has("redis")
            or has("sqlite")
            or has("dynamodb")
            or has("snowflake")
            or has("bigquery")
            or has("database")
        ):
            categories["Databases"].add(t_norm)
        # Hard-skill buckets
        elif (
            has("python")
            or re.search(r"\bsql\b", low)
            or has("c++", "c/c++")
            or has("typescript", "type script")
            or has("javascript", "java script")
            or has("java")
            or has("golang", "go lang")
            or has("rust")
            or has("c#", "c sharp")
            or has("ruby")
            or has("scala")
            or has("kotlin")
        ):
            categories["Programming Languages"].add(t_norm)
        elif (
            has("pytorch", "torch")
            or has("tensorflow")
            or has("keras")
            or has("scikit-learn", "sklearn")
            or has("xgboost")
            or has("lightgbm")
            or has("catboost")
            or has("transformer")
        ):
            categories["Machine Learning & Deep Learning"].add(t_norm)
        elif has("pandas") or has("numpy") or has("excel") or has("spreadsheet"):
            categories["Data & Analytics"].add(t_norm)
        elif (
            has("mlflow")
            or has("optuna")
            or has("onnx")
            or has("mlops")
            or has("docker")
            or has("kubernetes")
            or has("k8s")
        ):
            categories["MLOps & Optimization"].add(t_norm)
        elif (
            has("aws", "amazon web")
            or has("gcp", "google cloud")
            or has("azure")
            or has("vercel")
            or has("bare metal", "baremetal")
            or has("terraform")
            or has("cloud")
            or has("serverless")
            or has("lambda")
            or has("ec2")
            or has("s3 ")
        ):
            categories["Cloud & Infrastructure"].add(t_norm)
        elif (
            has("react")
            or has("next.js", "nextjs", "next js")
            or has("vue")
            or has("angular")
            or has("node", "node.js")
            or has("express")
            or has("html")
            or has("css")
            or has("tailwind")
            or has("frontend", "front-end")
            or has("ui/ux", "ux")
            or has("rest api", "restful", "graphql")
        ):
            categories["Web & Frontend"].add(t_norm)
        elif (
            has("opencv")
            or has("mediapipe")
            or has("dlib")
            or has("ros2", "ros 2")
            or has("ros")
            or has("robot")
        ):
            categories["Computer Vision & Robotics"].add(t_norm)
        elif (
            has("spacy")
            or has("nltk")
            or has("bert")
            or has("gpt")
            or has("sentence-bert", "sentence bert")
            or has("llm")
        ):
            categories["Natural Language Processing"].add(t_norm)
        elif (
            has("matplotlib")
            or has("seaborn")
            or has("plotly")
            or has("tableau")
            or has("power bi", "powerbi")
        ):
            categories["Visualization"].add(t_norm)
        else:
            # default bucket for misc technical tools (Git, CI/CD, Claude Code,
            # Streamlit, ETL/workflow tools, etc.) — a clean "Tools" label, no
            # longer the odd "Data Automation Skills" junk drawer.
            categories["Tools & Technologies"].add(t_norm)

    # 2) Classify each token
    for token in raw_tokens:
        add_skill(token)

    ordered_cats = [
        "Programming Languages",
        "Machine Learning & Deep Learning",
        "Data & Analytics",
        "MLOps & Optimization",
        "Cloud & Infrastructure",
        "Web & Frontend",
        "Databases",
        "Computer Vision & Robotics",
        "Natural Language Processing",
        "Visualization",
        "Tools & Technologies",
    ]

    lines: list[str] = []
    rendered_lows: set[str] = set()

    # In compact mode the cap applies to the combined technical-skill list.
    _cat_cap = max(1, int(MAX_SKILLS_PER_CATEGORY or 12))
    _soft_cap = max(1, int(MAX_SOFT_SKILLS or 8))

    if COMPACT_SKILLS:
        # Merge technical categories, then enforce the total cap after catch-all tokens.
        hard_all: list[str] = []
        for cat in ordered_cats:
            for s in sorted(categories[cat])[:_cat_cap]:
                low = s.lower().strip()
                if low and low not in rendered_lows:
                    hard_all.append(s)
                    rendered_lows.add(low)
        # Fold any remaining exact JD keywords into the same technical line —
        # but skip soft skills AND JD boilerplate/fields ("Computer Science",
        # "Eagerness to learn") so the compact line stays clean (user 2026-06-18).
        for token in raw_tokens:
            low = token.lower().strip()
            if (
                not low
                or low in rendered_lows
                or is_soft_skill(low)
                or _is_non_skill_phrase(token)
            ):
                continue
            hard_all.append(token)
            rendered_lows.add(low)
        if hard_all:
            source_order = {token.lower().strip(): index for index, token in reversed(list(enumerate(raw_tokens)))}
            jd_keywords = {str(token).lower().strip() for token in HIGHLIGHT_KEYWORDS}
            hard_all.sort(key=lambda token: (token.lower().strip() not in jd_keywords, source_order.get(token.lower().strip(), len(raw_tokens))))
            hard_all = hard_all[:_cat_cap]
            # Label is just "Technical Skills:" — certifications render on their own
            # separate "Certifications:" line, so naming them here was redundant
            # (user 2026-06-15: repeated "Certifications").
            lines.append(
                r"\textbf{Skills:} "
                + latex_escape(", ".join(hard_all))
                + r"\\"
            )
        if soft_skills:
            soft_tex = latex_escape(", ".join(sorted(soft_skills)[:_soft_cap]))
            lines.append(r"\textbf{Soft Skills:} " + soft_tex + r"\\")
        skills_tex = "\n".join(lines).strip()
        skills_tex = highlight_keywords_latex(skills_tex)
        skills_tex = auto_linkify_latex(skills_tex)
        return skills_tex

    # (no separate "Hard Skills & Technical Keywords" heading)
    # lines.append(r"\textbf{Hard Skills \& Technical Keywords}\\[0.1em]")

    # Hard skill categories
    for cat in ordered_cats:
        skills = sorted(categories[cat])
        # Keep skills compact so the resume fits on one page.
        skills = skills[:_cat_cap]
        if not skills:
            continue
        cat_tex = latex_escape(cat + ":")
        vals_tex = latex_escape(", ".join(skills))
        lines.append(f"\\textbf{{{cat_tex}}} {vals_tex}\\\\")
        rendered_lows.update(s.lower().strip() for s in skills)

    # ---------- SOFT SKILLS HEADING ----------
    if soft_skills:
        soft_tex = latex_escape(", ".join(sorted(soft_skills)[:_soft_cap]))
        lines.append(r"\textbf{Soft Skills:} " + soft_tex + r"\\")
        rendered_lows.update(s.lower().strip() for s in sorted(soft_skills)[:_soft_cap])

    # NOTE: the separate "Job Keywords:" catch-all line was removed (user
    # 2026-06-15) — it looked like keyword-stuffing and the main JD keywords
    # already appear in the category lines above. Dropping it also frees a little
    # space at the bottom.

    skills_tex = "\n".join(lines).strip()
    # Reuse your existing bolding/linking logic
    skills_tex = highlight_keywords_latex(skills_tex)
    skills_tex = auto_linkify_latex(skills_tex)
    return skills_tex

def format_projects(projects):
    r"""
    Format academic/personal projects as:

    LEFT:
      \textbf{Title} | \techstackproj{Tech stack}

    RIGHT:
      (blank)  -- project repo links are intentionally NOT rendered in Projects

    Notes:
      - No dates/timeframes are rendered in the Projects section.
      - Even if a project has a "github_url" field, this function does not show it.
    """
    blocks = []
    for proj in projects or []:
        title_raw = str(proj.get("title", "")).strip()
        badge_raw = str(proj.get("badge", "")).strip()
        tools_raw = str(proj.get("tools", "")).strip()

        bullets = [
            str(b).strip() for b in (proj.get("bullets") or []) if str(b).strip()
        ]
        bullets = bullets[: max(1, int(MAX_PROJECT_BULLETS or 3))]
        bullets = [_one_line_bullet(b) for b in bullets]

        # Limit project tech stack to at most 5 items (keep Gemini order)
        if tools_raw:
            tools_tokens = [
                t.strip() for t in re.split(r"[,/]", tools_raw) if t.strip()
            ]
            tools_tokens = tools_tokens[:5]
            tools_raw = ", ".join(tools_tokens)

        title_tex = latex_escape(title_raw) if title_raw else ""

        # (badge is intentionally not rendered here unless you add it to the header layout)
        if badge_raw:
            _ = auto_linkify_latex(latex_escape(badge_raw))

        tools_tex = ""
        if tools_raw:
            tools_tex = latex_escape(tools_raw)
            tools_tex = highlight_keywords_latex(tools_tex)
            tools_tex = auto_linkify_latex(tools_tex)

        header_lines = []

        # LEFT CELL: [Title] | [Tech stack]
        left_segments = []
        if title_tex:
            left_segments.append(r"\textbf{" + title_tex + "}")
        if tools_tex:
            left_segments.append(r"\techstackproj{" + tools_tex + "}")
        left_cell = r" \textbar{} ".join(left_segments) if left_segments else ""

        header_lines.append(r"\noindent\begin{tabularx}{\linewidth}{@{}>{\raggedright\arraybackslash}X@{}}")
        header_lines.append(f"  {left_cell}\\\\")
        header_lines.append(r"\end{tabularx}")

        block_parts = header_lines

        if bullets:
            block_parts.append(
                r"\begin{itemize}[leftmargin=0.18in, label={--}, topsep=0pt, partopsep=0pt, parsep=0pt, itemsep=0pt]"
            )
            for b in bullets:
                b_raw = str(b).strip()
                if not b_raw:
                    continue
                b_tex = latex_escape(b_raw)
                b_tex = highlight_keywords_latex(b_tex)
                b_tex = auto_linkify_latex(b_tex)
                block_parts.append(f"  \\item {b_tex}")
            block_parts.append(r"\end{itemize}")

        if block_parts:
            blocks.append("\n".join(block_parts))

    return "\n\n\\vspace{0.12em}\n\n".join(blocks)

def format_experience(exp_list):
    r"""
    Render experience to match the layout in the provided PDF resume:

      Title (bold) .................................. Date (right aligned)
      Company (italic) .............................. Location (italic, right aligned)
      • Bullet 1
      • Bullet 2
      • Bullet 3

    Notes:
    - Prefers a dedicated "location" field. If missing, we try to split a trailing
      location out of the "company" field (older JSON sometimes embeds it).
    - Location is normalized (best-effort) to: City, Country (state/province removed).
    - "tech_stack" is intentionally NOT rendered on the company/location line so the
      output matches the PDF format exactly (tools should already appear in bullets/skills).
    """
    blocks: list[str] = []
    for e in exp_list or []:
        title_raw = str(e.get("title", "")).strip()
        company_raw = str(e.get("company", "")).strip()

        # Preferred: separate location field. Fallbacks included for older schemas.
        location_raw = str(e.get("location") or e.get("company_location") or "").strip()

        date_raw = str(e.get("date") or "").strip()
        bullets = [str(b).strip() for b in (e.get("bullets") or []) if str(b).strip()]

        # Keep bullets compact so the resume stays 1 page
        bullets = bullets[: max(1, int(MAX_EXPERIENCE_BULLETS or 3))]
        bullets = [_one_line_bullet(b) for b in bullets]

        # Normalize placeholder dates to empty
        if date_raw.lower() in ("none", "n/a", "na", "null", "-"):
            date_raw = ""

        # If the company field contains a location, split it out
        company_name_raw, loc_from_company = split_company_and_location(company_raw)
        if not location_raw:
            location_raw = loc_from_company

        location_norm = normalize_location_city_state_country(location_raw)

        title_tex = latex_escape(title_raw)
        company_tex = latex_escape(company_name_raw or company_raw)
        location_tex = latex_escape(location_norm) if location_norm else ""
        date_tex = latex_escape(date_raw)

        lines: list[str] = []

        # Header block (2-row table) to align date/location on the right
        lines.append(
            r"\noindent\begin{tabular*}{\textwidth}{@{}l@{\extracolsep{\fill}}r@{}}"
        )
        left1 = rf"\textbf{{{title_tex}}}" if title_tex else ""
        right1 = date_tex if date_tex else ""
        lines.append(f"  {left1} & {right1}\\\\")
        if company_tex or location_tex:
            left2 = rf"\textit{{{company_tex}}}" if company_tex else ""
            right2 = rf"\textit{{{location_tex}}}" if location_tex else ""
            lines.append(f"  {left2} & {right2}\\\\")
        lines.append(r"\end{tabular*}")

        # Bullets (tight spacing)
        if bullets:
            lines.append(
                r"\begin{itemize}[leftmargin=0.18in, label={--}, topsep=0pt, partopsep=0pt, itemsep=0pt, parsep=0pt]"
            )
            for b in bullets:
                b_clean = _collapse_adjacent_word_repeats(b)
                b_tex = latex_escape(b_clean)
                b_tex = highlight_keywords_latex(b_tex)
                b_tex = auto_linkify_latex(b_tex)
                lines.append(f"  \\item {b_tex}")
            lines.append(r"\end{itemize}")

        if lines:
            blocks.append("\n".join(lines))

    # Small vertical gap between jobs, matching projects section
    return "\n\n\\vspace{0.12em}\n\n".join(blocks)

def format_certifications(cert_list):
    cleaned = []
    for c in cert_list or []:
        s = str(c).strip()
        if not s:
            continue
        # Strip any leading "Certifications:" noise
        s = re.sub(r"^\s*certifications?\s*:\s*", "", s, flags=re.IGNORECASE)
        s = s.rstrip(",;")
        # Drop non-professional "certifications" like a driving license/permit.
        if s and not _is_noise_credential(s):
            cleaned.append(s)

    if not cleaned:
        return ""

    # ðŸ”¹ Show at most 5 certifications
    cleaned = cleaned[:5]

    joined = ", ".join(cleaned)

    # Escape â†’ highlight AI/ML/Robotics keywords â†’ linkify
    body = latex_escape(joined)
    body = highlight_keywords_latex(body)
    body = auto_linkify_latex(body)

    return r"\textbf{Certifications:} " + body + r"\\"

def format_extracurricular(ex_list):
    """
    If there are extracurricular activities, render them as:

      \textbf{Extra-Curricular:} item1; item2; item3\\
    """
    items = [
        str(x).strip()
        for x in ex_list or []
        if str(x).strip() and not _is_noise_credential(x)
    ]
    if not items:
        return ""
    joined = "; ".join(items)

    # Escape â†’ highlight AI/ML/Robotics keywords â†’ linkify
    body = latex_escape(joined)
    body = highlight_keywords_latex(body)
    body = auto_linkify_latex(body)

    return r"\textbf{Extra-Curricular:} " + body + r"\\"

def build_cover_header_block(header: dict) -> str:
    """
    Name
    Location · phone · email
    GitHub · LinkedIn
    Portfolio  (next line, no blank gap)
    """
    name = (header.get("name") or header.get("full_name") or "").strip()
    location_raw = (header.get("location") or "").strip()
    # Enforce: City, Country (no state/province)
    location = (
        normalize_location_city_state_country(location_raw) if location_raw else ""
    )
    phone = (header.get("phone") or "").strip()
    email = str(header.get("email") or "").strip()

    github_url = normalize_http_url(header.get("github_url") or "")
    github_label = github_url.replace("https://", "").replace("http://", "")
    linkedin_url = normalize_http_url(header.get("linkedin_url") or "")
    portfolio_url = normalize_http_url(header.get("portfolio_url") or "")

    name_tex = latex_escape(name)
    lines = [rf"\textbf{{{name_tex}}}\\"]

    contact_parts = []
    if location:
        contact_parts.append(latex_escape(location))
    if phone:
        contact_parts.append(latex_escape(phone))
    if email:
        email_mailto = email
        email_label = email
        contact_parts.append(
            rf"\href{{mailto:{email_mailto}}}{{{latex_escape(email_label)}}}"
        )

    if contact_parts:
        lines.append(" $\\cdot$ ".join(contact_parts) + r"\\")

    link_parts = []
    if github_url:
        # IMPORTANT: label is fixed exactly as requested
        link_parts.append(
            rf"GitHub: \href{{{github_url}}}{{{latex_escape(github_label)}}}"
        )
    if linkedin_url:
        lbl = linkedin_url.replace("https://", "").replace("http://", "").rstrip("/")
        link_parts.append(rf"LinkedIn: \href{{{linkedin_url}}}{{{latex_escape(lbl)}}}")

    if link_parts:
        lines.append(" $\\cdot$ ".join(link_parts) + r"\\")

    if portfolio_url:
        lbl = portfolio_url.replace("https://", "").replace("http://", "").rstrip("/")
        lines.append(rf"Portfolio: \href{{{portfolio_url}}}{{{latex_escape(lbl)}}}")

    return "\n".join(lines).strip()

def build_cover_company_block(letter: dict) -> str:
    company_name = (letter.get("company_name") or "").strip()
    company_line_2 = (letter.get("company_line_2") or "").strip()
    company_location = (letter.get("company_location") or "").strip()

    lines = [r"Hiring Manager\\"]
    if company_name:
        lines.append(latex_escape(company_name) + r"\\")
    if company_line_2:
        lines.append(latex_escape(company_line_2) + r"\\")
    if company_location:
        lines.append(latex_escape(company_location))
    return "\n".join(lines).strip()

def build_cover_body_block(body_paragraphs):
    """
    Convert body_paragraphs into clean LaTeX paragraphs:

    - Strips any stray HTML tags (<p>, <br>, etc).
    - Collapses obvious adjacent repeated words.
    - Escapes LaTeX and auto-linkifies URLs/emails.
    """
    raw_paras = [str(p).strip() for p in (body_paragraphs or []) if str(p).strip()]

    clean_paras = []
    for p in raw_paras:
        # 1) kill HTML tags
        p_no_html = _strip_html_tags(p)
        # 2) collapse 'word word' repetition
        p_no_html = _collapse_adjacent_word_repeats(p_no_html)
        if p_no_html:
            clean_paras.append(p_no_html.strip())

    plain = " ".join(clean_paras)
    wc = word_count(plain)

    escaped_paras = []
    for p in clean_paras:
        p_safe = p
        t = latex_escape(p_safe)
        t = highlight_keywords_latex(t)
        t = auto_linkify_latex(t)
        escaped_paras.append(t)

    body_tex = "\n\n".join(escaped_paras)
    return body_tex, wc

def build_cover_closing_block(letter: dict, header: dict) -> str:
    closing = (letter.get("closing") or "Sincerely").strip()
    # Always end the sign-off with a comma ("Sincerely," not "Sincerely") even
    # when Gemini omits it.
    closing = closing.rstrip(",").rstrip() + ","
    sig_name = (
        letter.get("signature_name") or header.get("name") or ""
    ).strip()
    return f"{latex_escape(closing)}\\\\\n{latex_escape(sig_name)}"

def write_resume_tex(
    path: Path,
    header_tex: str,
    summary_tex: str,
    education_tex: str,
    skills_tex: str,
    certifications_tex: str,
    extracurricular_tex: str,
    projects_tex: str,
    experience_tex: str,
):
    # Optional SUMMARY section
    summary_tex = (summary_tex or "").strip()
    if summary_tex:
        summary_block = r"\resSection{SUMMARY}" + "\n\n" + summary_tex + "\n\n"
    else:
        summary_block = ""

    tex = (
        RESUME_TEX_TEMPLATE.replace("<<HEADER>>", header_tex)
        .replace("<<SUMMARY_BLOCK>>", summary_block)
        .replace("<<EDUCATION>>", education_tex)
        .replace("<<SKILLS>>", skills_tex)
        .replace("<<CERTIFICATIONS>>", certifications_tex)
        .replace("<<EXTRACURRICULAR>>", extracurricular_tex)
        .replace("<<PROJECTS>>", projects_tex)
        .replace("<<EXPERIENCE>>", experience_tex)
        .replace("<<ATS_FOOTER>>", "")  # ðŸ”¹ remove footer text entirely
    )
    for label, block in [("EDUCATION",education_tex),("EXPERIENCE",experience_tex),
                         ("TECHNICAL SKILLS AND CERTIFICATIONS",skills_tex+certifications_tex+extracurricular_tex),
                         ("ACADEMIC PROJECTS",projects_tex)]:
        if not block.strip(): tex=tex.replace(r"\resSection{"+label+"}", "")
    tex=tex.replace("TECHNICAL SKILLS AND CERTIFICATIONS", "SKILLS AND CERTIFICATIONS")
    if OTHER_SECTIONS:
        extra="\n".join(r"\resSection{"+latex_escape(s.get("title", ""))+"}\n"+
            "\n\n".join(latex_escape(str(x)) for x in s.get("items",[]) if str(x).strip()) for s in OTHER_SECTIONS)
        tex=tex.replace(r"} % end \small",extra+"\n"+r"} % end \small")
    tex="% Original Python maker: resume\n"+tex
    path.write_text(tex, encoding="utf-8")
    print(f"- wrote resume LaTeX to {path}")

def check_exactly_one_page(pdf_path: Path) -> None:
    """
    HARD check: resume must be exactly 1 page.
    """
    pages = get_pdf_page_count(pdf_path)
    print(f"  PDF has {pages} page(s).")
    if pages != 1:
        raise RuntimeError(f"Resume PDF must be 1 page, but got {pages} pages.")
    print("âœ… Resume PDF is exactly 1 page.")

def _uniform_resume_font_scale(tex: str, scale: float) -> str:
    tex = re.sub(r"% BEGIN UNIFORM RESUME FONTS[\s\S]*?% END UNIFORM RESUME FONTS\n", "", tex)
    sizes = {"tiny": (6, 7), "scriptsize": (8, 9), "footnotesize": (10, 12),
             "small": (10, 12), "normalsize": (11, 13), "large": (14, 16),
             "Large": (14.4, 18), "LARGE": (17.28, 22), "huge": (20.74, 25),
             "Huge": (24.88, 30)}
    commands = ["% BEGIN UNIFORM RESUME FONTS"]
    for name, (size, leading) in sizes.items():
        commands.append(rf"\renewcommand{{\{name}}}{{\fontsize{{{size * scale:.3f}}}{{{leading * scale:.3f}}}\selectfont}}")
    commands.append("% END UNIFORM RESUME FONTS\n")
    tex = re.sub(r"\\documentclass\[letterpaper,\d+pt\]", r"\\documentclass[letterpaper,10pt]", tex)
    return tex.replace(r"\begin{document}", "\n".join(commands) + r"\begin{document}", 1)

def _grow_resume_fonts_to_fit(tex_path: Path, fitting_tex: str) -> Path:
    low, high = 1.0, 1.12
    best_tex = _uniform_resume_font_scale(fitting_tex, low)
    for _ in range(5):
        scale = (low + high) / 2
        candidate = _uniform_resume_font_scale(fitting_tex, scale)
        tex_path.write_text(candidate, encoding="utf-8")
        candidate_pdf = compile_tex(tex_path)
        log_path = tex_path.with_suffix(".log")
        compile_log = log_path.read_text(encoding="utf-8", errors="replace") if log_path.exists() else ""
        overflow = any(float(value) > 0.5 for value in re.findall(
            r"Overfull \\hbox \(([0-9.]+)pt too wide\)", compile_log))
        if get_pdf_page_count(candidate_pdf) == 1 and not overflow:
            low, best_tex = scale, candidate
        else:
            high = scale
    tex_path.write_text(best_tex, encoding="utf-8")
    result = compile_tex(tex_path)
    print(f"- uniform resume font scale: {low:.3f} (body={10 * low:.2f}pt, one page)")
    return result

def compile_resume_one_page(tex_path: Path, min_linespread: float = 0.0) -> Path:
    """
    Compile the resume and (if needed) progressively tighten LaTeX spacing
    until it becomes exactly 1 page, WITHOUT re-calling Gemini.

    It tweaks:
      - \\linespread{...}
      - inter-block gaps: \\vspace{0.12em}  (projects/experience separators)

    `min_linespread` is a READABLE-spacing floor (user 2026-06-14: "spacing
    should be there otherwise readability gets less"): spacing attempts tighter
    than this are skipped, so the caller can demand a not-cramped render (and
    instead trim other content / step down) rather than cram lines together.
    """
    base_tex = _uniform_resume_font_scale(tex_path.read_text(encoding="utf-8"), 1.0)

    # (body baseline, linespread, gap_em) — first find readable one-page spacing.
    # first and return the first render that fits 1 page, i.e. the loosest that
    # fits → content is spread to FILL the page with no bottom whitespace (user
    # 2026-06-13), tightening only when content is long.
    attempts = [
        # Loosest-that-fits first so content breathes / fills the page. Moderate
        # loose steps give the resume room so it isn't dense (user 2026-06-15:
        # "spacing is too tight, looking very dense") — but capped at 1.32 (not
        # the old 1.40 which looked over-spread). Paired with COMPACT skills
        # (fewer lines), the optimizer can land on a comfortable, non-dense spacing.
        (9, 1.32, 0.36),
        (9, 1.27, 0.32),
        (9, 1.22, 0.30),
        (9, 1.18, 0.26),
        (9, 1.14, 0.22),
        (9, 1.11, 0.20),
        # More breathing room before uniform font growth.
        (9, 1.08, 0.18),
        (9, 1.05, 0.16),
        (9, 1.03, 0.14),
        (9, 1.00, 0.12),
        # Original / light tightening
        (9, 0.97, 0.12),
        (9, 0.95, 0.10),
        (9, 0.93, 0.08),
        (9, 0.92, 0.06),
        # More aggressive (last resorts)
        (9, 0.90, 0.05),
        (9, 0.88, 0.04),
        (9, 0.86, 0.03),
    ]

    last_pages = None
    last_pdf = None

    for _old_baseline, linespread, gap_em in attempts:
        font_pt = 10
        # Honor the readable-spacing floor: never cram tighter than the caller
        # allows (keeps the resume readable instead of squeezing in content).
        if linespread < min_linespread:
            continue
        tex = base_tex

        # Set font size
        tex = re.sub(
            r"\\documentclass\[letterpaper,\d+pt\]",
            r"\\documentclass[letterpaper,10pt]",
            tex,
        )

        # Adjust line spacing
        tex = re.sub(
            r"\\linespread\{[0-9.]+\}",
            rf"\\linespread{{{linespread}}}",
            tex,
        )

        # Adjust the small gaps between blocks (projects/experience)
        tex = re.sub(
            r"\\vspace\{[0-9.]+em\}",
            rf"\\vspace{{{gap_em:.2f}em}}",
            tex,
        )

        tex_path.write_text(tex, encoding="utf-8")

        pdf_path = compile_tex(tex_path)
        pages = get_pdf_page_count(pdf_path)
        print(
            f"  - resume pages: {pages} (body=10pt baseline, linespread={linespread}, gap={gap_em}em)"
        )

        last_pages = pages
        last_pdf = pdf_path

        if pages == 1:
            print(
                f"âœ… Resume fits 1 page (font={font_pt}pt, linespread={linespread})."
            )
            return _grow_resume_fonts_to_fit(tex_path, tex)

    raise RuntimeError(
        f"Resume is still {last_pages} pages after tightening. "
        "You must shorten content (e.g., shorten 1â€“2 bullets) and rerun."
    )

def compile_resume_one_page_autofit(resume_data: dict) -> Path:
    """
    Render + compile the resume to EXACTLY 1 page WITHOUT re-calling Gemini.

    Strategy:
      1) Render four projects with compact, capped skills and readable spacing.
      2) Trim skills and optional sections before reducing bullet counts.
         Preserve every project and work-experience entry throughout.

    Returns the 1-page PDF path.
    """
    import copy

    global \
        MAX_PROJECT_BULLETS, \
        MAX_EXPERIENCE_BULLETS, \
        MAX_SKILLS_PER_CATEGORY, \
        MAX_SOFT_SKILLS
    global COMPACT_SKILLS

    # Preserve original limits so we can restore after auto-fit
    orig_limits = (
        MAX_PROJECT_BULLETS,
        MAX_EXPERIENCE_BULLETS,
        MAX_SKILLS_PER_CATEGORY,
        MAX_SOFT_SKILLS,
    )
    orig_compact = COMPACT_SKILLS

    profiles = [
        # (proj bullets, exp bullets, skills/cat, soft skills, include cert, include extra, max projects, max experience, compact_skills)
        (3, 4, 24, 5, True, True, None, None, True),
        (3, 4, 20, 5, True, True, None, None, True),
        (3, 4, 18, 4, True, True, None, None, True),
        (3, 4, 14, 3, True, True, None, None, True),
        (3, 4, 12, 3, True, True, None, None, True),
        (3, 4, 10, 2, True, True, None, None, True),
        (3, 4, 8, 2, True, True, None, None, True),
        (3, 4, 8, 2, True, False, None, None, True),
        (3, 4, 8, 2, False, False, None, None, True),
        (3, 3, 8, 2, True, False, None, None, True),
        (2, 3, 8, 2, True, False, None, None, True),
        (2, 2, 6, 2, True, False, None, None, True),
        (2, 2, 6, 2, False, False, None, None, True),
    ]

    last_err: Exception | None = None

    try:
        for (
            p_bul,
            e_bul,
            skills_cap,
            soft_cap,
            keep_cert,
            keep_extra,
            max_proj,
            max_exp,
            compact,
        ) in profiles:
            MAX_PROJECT_BULLETS = int(p_bul)
            MAX_EXPERIENCE_BULLETS = int(e_bul)
            MAX_SKILLS_PER_CATEGORY = int(skills_cap)
            MAX_SOFT_SKILLS = int(soft_cap)
            # Compact skills free space before any project bullets are reduced.
            COMPACT_SKILLS = bool(compact)

            data = copy.deepcopy(resume_data) if isinstance(resume_data, dict) else {}

            # Apply optional caps
            if max_proj is not None:
                data["projects"] = list(data.get("projects", []) or [])[: int(max_proj)]
            if max_exp is not None:
                data["experience"] = list(data.get("experience", []) or [])[
                    : int(max_exp)
                ]

            cert_list = list(data.get("certifications", []) or []) if keep_cert else []
            extra_list = (
                list(data.get("extracurriculars", []) or []) if keep_extra else []
            )

            # Re-render LaTeX for this profile
            header_tex = format_resume_header(data.get("header", {}))
            education_tex = format_education(data.get("education", []))
            summary_tex = format_summary(data.get("summary", ""))
            skills_tex = format_skills(data.get("skills", []))
            projects_tex = format_projects(data.get("projects", []))
            experience_tex = format_experience(data.get("experience", []))
            certifications_tex = format_certifications(cert_list)
            extracurricular_tex = format_extracurricular(extra_list)

            write_resume_tex(
                RESUME_TEX_PATH,
                header_tex,
                summary_tex,
                education_tex,
                skills_tex,
                certifications_tex,
                extracurricular_tex,
                projects_tex,
                experience_tex,
            )

            # Compile and force EXACTLY 1 page that also FILLS the page. Always
            # run the spacing optimizer (it tries LOOSE→tight and returns the
            # first 1-page render, i.e. the loosest spacing that still fits, so
            # short content is spread to fill the page instead of leaving
            # bottom whitespace — user 2026-06-13). The old fast-path returned
            # the default-spacing render the moment it was 1 page, which left a
            # big empty gap at the bottom when content fit with room to spare.
            try:
                # For the full 20-bullet profiles, require readable
                # spacing: if the bullets only fit by cramming
                # lines, reject this render and let the loop trim more skills /
                # drop optional sections first. Step-down profiles may use any
                # spacing. Floor 0.95 = mild compression, still readable.
                _floor = 0.95 if (p_bul == 3 and e_bul == 4) else 0.0
                pdf_path = compile_resume_one_page(
                    RESUME_TEX_PATH, min_linespread=_floor
                )
                check_exactly_one_page(pdf_path)
                check_resume_pdf_text_readability(pdf_path)
                return pdf_path
            except Exception as e:
                last_err = e
                print(
                    f"- auto-fit attempt failed (proj_bullets={p_bul}, exp_bullets={e_bul}, "
                    f"skills_cap={skills_cap}, compact_skills={compact}, keep_cert={keep_cert}, "
                    f"keep_extra={keep_extra}, max_proj={max_proj}, max_exp={max_exp}): {e}"
                )
                continue

        raise RuntimeError(
            "Could not fit resume to exactly 1 page after auto-fit attempts. "
            "Consider shortening 1–2 bullets or removing one experience entry."
        ) from last_err
    finally:
        # Restore original caps for any later calls
        (
            MAX_PROJECT_BULLETS,
            MAX_EXPERIENCE_BULLETS,
            MAX_SKILLS_PER_CATEGORY,
            MAX_SOFT_SKILLS,
        ) = orig_limits
        COMPACT_SKILLS = orig_compact
