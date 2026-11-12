"""Small stdlib-only cloud adapters around the copied Python maker."""
import base64
import contextlib
import copy
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

COMPILER = ""
ENGINE = "pdflatex"


def normalize_http_url(value):
    value = str(value or "").strip()
    return value if not value or re.match(r"https?://", value) else "https://" + value


def normalize_location_city_state_country(value):
    return str(value or "").strip()


def split_company_and_location(value):
    return str(value or "").strip(), ""


def _education_gpa(education):
    return str(education.get("gpa") or "").strip()


def highlight_keywords_latex(value):
    return value


def auto_linkify_latex(value):
    # Header formatters already supply real hyperlinks. Avoid nested links.
    return value


def _is_noise_credential(value):
    return False


def _is_non_skill_phrase(value):
    return not str(value or "").strip()


def _collapse_adjacent_word_repeats(value):
    return str(value or "")


def _strip_html_tags(value):
    return re.sub(r"<[^>]+>", "", str(value or ""))


def _one_line_bullet(value):
    # Original desktop truncation could remove a second metric or a qualifier.
    # Concision belongs in the prompt; never truncate factual text mechanically.
    return re.sub(r"\s+", " ", str(value or "")).strip()


def portable_tex(source):
    return re.sub(r"^(\s*)(\\input\{glyphtounicode\}|\\pdfgentounicode=1|\\pdfinterwordspaceon|\\pdfglyphtounicode\{[^\n]*\})[ \t]*$",
                  lambda m: m[1] + r"\ifdefined\pdfglyphtounicode " + m[2] + r"\fi", source, flags=re.M)


def compile_tex(tex_path):
    tex_path = Path(tex_path).resolve()
    source = portable_tex(tex_path.read_text(encoding="utf-8"))
    tex_path.write_text(source, encoding="utf-8")
    if ENGINE == "tectonic":
        arguments = [COMPILER, "--keep-logs", "--keep-intermediates", "--untrusted", tex_path.name]
        passes = 1  # Tectonic performs its own reruns.
    else:
        arguments = [COMPILER, "-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", tex_path.name]
        passes = 2
    for _ in range(passes):
        result = subprocess.run(arguments, cwd=tex_path.parent, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, encoding="utf-8", errors="replace", timeout=90,
                                env={**os.environ, "openin_any": "p", "openout_any": "p"})
        if result.returncode:
            log = tex_path.with_suffix(".log")
            details = log.read_text(encoding="utf-8", errors="replace") if log.exists() else result.stdout
            match = re.search(r"(?:!|error:)[\s\S]{0,1400}", details)
            raise RuntimeError("LaTeX compilation failed: " + (match[0] if match else details[-1400:]))
    output = tex_path.with_suffix(".pdf")
    if not output.is_file():
        raise RuntimeError("Compiler did not produce a PDF.")
    return output


def get_pdf_page_count(pdf_path):
    # Both engines record the actual page count in their generated log. The
    # Node bridge independently reads the returned PDF before serving it.
    log = Path(pdf_path).with_suffix(".log").read_text(encoding="utf-8", errors="replace")
    counts = re.findall(r"Output written on .*?\((\d+) pages?", log)
    if not counts:
        raise RuntimeError("Compiler log did not report a page count.")
    return int(counts[-1])


def check_resume_pdf_text_readability(pdf_path):
    if not Path(pdf_path).read_bytes().startswith(b"%PDF-"):
        raise RuntimeError("The generated file is not a PDF.")
    # Actual text extraction is performed by the existing Node PDF parser.
    # Missing email/sections are valid for arbitrary uploaded resumes.


def configure(maker, folder):
    maker.RESUME_TEX_PATH = Path(folder) / "resume_generated.tex"


def prepare_resume(data):
    data = copy.deepcopy(data)
    for key in ("education", "experience", "projects", "skills", "certifications", "extracurriculars", "other_sections"):
        data.setdefault(key, [])
    data.setdefault("header", {})
    data.setdefault("summary", "")
    # The original compact renderer expects flat skills, not category prefixes.
    data["skills"] = [str(s).split(":", 1)[-1].strip() for s in data["skills"] if str(s).strip()]
    return data


def render_resume(maker, data, folder):
    configure(maker, folder)
    maker.OTHER_SECTIONS = data.get("other_sections", [])
    maker.write_resume_tex(maker.RESUME_TEX_PATH, maker.format_resume_header(data["header"]),
        maker.format_summary(data["summary"]), maker.format_education(data["education"]),
        maker.format_skills(data["skills"]), maker.format_certifications(data["certifications"]),
        maker.format_extracurricular(data["extracurriculars"]), maker.format_projects(data["projects"]),
        maker.format_experience(data["experience"]))
    return maker.RESUME_TEX_PATH


def render_cover(maker, letter, header):
    body, _ = maker.build_cover_body_block(letter.get("body_paragraphs", []))
    fields = {
        "HEADER_BLOCK": maker.build_cover_header_block(header),
        "DATE_LINE": maker.latex_escape(letter.get("date", "")),
        "COMPANY_BLOCK": maker.build_cover_company_block(letter),
        "SALUTATION": maker.latex_escape(letter.get("salutation") or "Dear Hiring Manager,"),
        "BODY_BLOCK": body,
        "CLOSING_BLOCK": maker.build_cover_closing_block(letter, header),
    }
    source = maker.COVER_LETTER_TEX_TEMPLATE
    for key, value in fields.items():
        if not value:
            source = re.sub(r"<<" + key + r">>(?:\\\\(?:\[[^\]]*\])?)?", "", source)
        else:
            source = source.replace("<<" + key + ">>", value)
    return "% Original Python maker: cover\n" + source


def cover_from_markdown(markdown):
    # Preserve user edits using the maker's cover template and body formatter.
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", markdown).strip()
    lines = text.splitlines()
    greeting = next((i for i, line in enumerate(lines) if re.match(r"\s*(Dear|Hello)\b", line, re.I)), -1)
    closing = next((i for i in range(len(lines)-1, -1, -1) if re.match(r"\s*(Sincerely|Kind regards|Best regards|Regards|Respectfully|Yours sincerely|Thank you)[,\s]*$", lines[i], re.I)), -1)
    signature_name = " ".join(lines[closing+1:]).strip() if closing >= 0 else ""
    body_start = greeting + 1 if greeting >= 0 else 0
    body_end = closing if closing >= body_start else len(lines)
    recipient_lines = lines[:greeting] if greeting >= 0 else []
    # A full editable letter can include its sender block. The maker already
    # renders the candidate header, so only recipient lines belong to company.
    first_blank = next((i for i, line in enumerate(recipient_lines) if not line.strip()), -1)
    normalize_name = lambda value: re.sub(r"\s+", " ", value).strip().casefold()
    if signature_name and first_blank > 0 and normalize_name(recipient_lines[0]) == normalize_name(signature_name):
        recipient_lines = recipient_lines[first_blank+1:]
    before = [line.strip() for line in recipient_lines if line.strip()]
    date_line = next((line for line in before if re.search(r"\b20\d\d\b", line)), "")
    company = [line for line in before if line != date_line and not re.match(r"Hiring Manager", line, re.I)]
    return {"date": date_line, "company_name": company[0] if company else "", "company_location": ", ".join(company[1:]),
            "salutation": lines[greeting].strip() if greeting >= 0 else "", "body_paragraphs": re.split(r"\n\s*\n", "\n".join(lines[body_start:body_end]).strip()),
            "closing": lines[closing].strip() if closing >= 0 else "", "signature_name": signature_name}


def main():
    import resume_and_cover_maker as maker
    from prompts import RESUME_PROMPT, COVER_PROMPT
    global COMPILER, ENGINE
    request = json.load(sys.stdin)
    action = request.get("action")
    COMPILER, ENGINE = request.get("compiler", ""), request.get("engine", "pdflatex")
    try:
        if action == "prompts":
            result = {"resume": RESUME_PROMPT, "cover": COVER_PROMPT}
        else:
            with tempfile.TemporaryDirectory(prefix="ats-python-maker-") as folder, contextlib.redirect_stdout(sys.stderr):
                if action == "compile_source":
                    path = Path(folder) / "edited.tex"
                    path.write_text(request.get("latexSource", ""), encoding="utf-8")
                    pdf = maker.compile_resume_one_page(path) if "% Original Python maker: resume" in request.get("latexSource", "") else compile_tex(path)
                elif action in ("render_resume", "compile_resume"):
                    data = prepare_resume(request.get("resume", {}))
                    path = render_resume(maker, data, folder)
                    if action == "compile_resume":
                        pdf = maker.compile_resume_one_page_autofit(data)
                        path = pdf.with_suffix(".tex")
                elif action in ("render_cover", "compile_cover"):
                    letter = request.get("letter") or cover_from_markdown(request.get("markdown", ""))
                    path = Path(folder) / "cover_letter.tex"
                    path.write_text(render_cover(maker, letter, request.get("header", {})), encoding="utf-8")
                    if action == "compile_cover": pdf = compile_tex(path)
                else:
                    raise RuntimeError("Unknown maker action.")
                result = {"latexSource": path.read_text(encoding="utf-8"), "workflow": "original_python_maker"}
                if action.startswith("compile_"):
                    result.update(pdfBase64=base64.b64encode(pdf.read_bytes()).decode(), pages=get_pdf_page_count(pdf))
        print(json.dumps({"success": True, **result}, ensure_ascii=True))
    except Exception as error:
        print(json.dumps({"success": False, "error": str(error)}, ensure_ascii=True))
        sys.exit(1)


__all__ = ["normalize_http_url", "normalize_location_city_state_country", "split_company_and_location",
           "_education_gpa", "highlight_keywords_latex", "auto_linkify_latex", "_is_noise_credential",
           "_is_non_skill_phrase", "_collapse_adjacent_word_repeats", "_strip_html_tags", "_one_line_bullet",
           "compile_tex", "get_pdf_page_count", "check_resume_pdf_text_readability"]
