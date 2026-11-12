"""Create the cloud copy from the user's desktop maker, without importing it.

Usage: python scripts/copy_resume_maker.py /path/to/resume_and_cover_maker.py
Only the named formatters/templates/fitting functions are copied. Browser
profiles, API keys, private applicant constants and desktop startup stay local.
"""
import ast
import hashlib
import json
import sys
from pathlib import Path

source_path = Path(sys.argv[1])
source = source_path.read_text(encoding="utf-8-sig")
tree = ast.parse(source)
names = [
    "latex_escape", "word_count", "format_resume_header", "format_education",
    "format_summary", "format_skills", "format_projects", "format_experience",
    "format_certifications", "format_extracurricular", "build_cover_header_block",
    "build_cover_company_block", "build_cover_body_block", "build_cover_closing_block",
    "write_resume_tex", "check_exactly_one_page", "_uniform_resume_font_scale",
    "_grow_resume_fonts_to_fit", "compile_resume_one_page", "compile_resume_one_page_autofit",
]
functions = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}
root = Path(__file__).resolve().parent.parent / "python"
root.mkdir(exist_ok=True)
constants = []
for node in tree.body:
    if isinstance(node, ast.Assign):
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id in ("RESUME_TEX_TEMPLATE", "COVER_LETTER_TEX_TEMPLATE"):
                constants.append(target.id + " = " + repr(ast.literal_eval(node.value)))
parts = [
    '"""Cloud copy of the original resume and cover maker. See maker_provenance.json.\n'
    'Personal defaults and Windows/browser dependencies are intentionally excluded.\n"""',
    "from __future__ import annotations\nimport re\nfrom pathlib import Path\nfrom cloud_adapter import *",
    "MAX_PROJECT_BULLETS=3\nMAX_EXPERIENCE_BULLETS=4\nMAX_SKILLS_PER_CATEGORY=24\nMAX_SOFT_SKILLS=5\nCOMPACT_SKILLS=True\nHIGHLIGHT_KEYWORDS=[]\nOTHER_SECTIONS=[]",
] + constants
manifest = {}
for name in names:
    node = functions[name]
    copied = ast.get_source_segment(source, node)
    adaptations = []
    if name in ("format_resume_header", "build_cover_header_block"):
        copied = copied.replace('email = APPLICANT_EMAIL', 'email = str(header.get("email") or "").strip()')
        start = copied.index('    # --- GitHub:')
        end = copied.index('    linkedin_url =', start)
        copied = copied[:start] + '''    github_url = normalize_http_url(header.get("github_url") or "")
    github_label = github_url.replace("https://", "").replace("http://", "")
''' + copied[end:]
        copied = copied.replace(' or "YOUR NAME"', '').replace(' or "Your Name"', '')
        copied = copied.replace('[10pt]', '[0pt]').replace(r'\enspace\textbar{}\enspace', r'\enspace{}\textbar{}\enspace{}')
        adaptations += ["source header only; no fixed email/profile/name", "compact header gap and command delimiters"]
    if name == "build_cover_closing_block":
        copied = copied.replace(' or "Your Name"', '')
        adaptations += ["omit missing signature instead of adding placeholder"]
    if name == "build_cover_body_block":
        copied = copied.replace('p_safe = p.replace("$", "USD ")', 'p_safe = p')
        adaptations += ["preserve original currency instead of assuming USD"]
    if name == "format_skills":
        copied = copied.replace(r'\textbf{Technical Skills:}', r'\textbf{Skills:}')
        adaptations += ["profession-neutral skills label"]
    if name == "write_resume_tex":
        marker = '    path.write_text(tex, encoding="utf-8")'
        copied = copied.replace(marker, '''    for label, block in [("EDUCATION",education_tex),("EXPERIENCE",experience_tex),
                         ("TECHNICAL SKILLS AND CERTIFICATIONS",skills_tex+certifications_tex+extracurricular_tex),
                         ("ACADEMIC PROJECTS",projects_tex)]:
        if not block.strip(): tex=tex.replace(r"\\resSection{"+label+"}", "")
    tex=tex.replace("TECHNICAL SKILLS AND CERTIFICATIONS", "SKILLS AND CERTIFICATIONS")
    if OTHER_SECTIONS:
        extra="\\n".join(r"\\resSection{"+latex_escape(s.get("title", ""))+"}\\n"+
            "\\n\\n".join(latex_escape(str(x)) for x in s.get("items",[]) if str(x).strip()) for s in OTHER_SECTIONS)
        tex=tex.replace(r"} % end \\small",extra+"\\n"+r"} % end \\small")
    tex="% Original Python maker: resume\\n"+tex
''' + marker)
        adaptations += ["omit absent sections; preserve generic additional sections"]
    parts.append(copied)
    manifest[name] = {"source_lines": [node.lineno,node.end_lineno], "original_sha256": hashlib.sha256(ast.get_source_segment(source,node).encode()).hexdigest(), "adaptations": adaptations}
(root / "resume_and_cover_maker.py").write_text("\n\n".join(parts)+"\n",encoding="utf-8")
(root / "maker_provenance.json").write_text(json.dumps({"source_file":source_path.name,"source_sha256":hashlib.sha256(source.encode()).hexdigest(),"functions":manifest},indent=2)+"\n",encoding="utf-8")
print("Copied",len(names),"original Python functions and both original LaTeX templates.")
