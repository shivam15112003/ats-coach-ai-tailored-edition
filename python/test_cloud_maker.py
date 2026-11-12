import ast
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import resume_and_cover_maker as maker
import cloud_adapter as adapter
from prompts import RESUME_PROMPT, COVER_PROMPT


class CloudMakerTests(unittest.TestCase):
    def test_original_fit_functions_are_copied_exactly(self):
        root = Path(__file__).parent
        manifest = json.loads((root / "maker_provenance.json").read_text())
        source = (root / "resume_and_cover_maker.py").read_text(encoding="utf-8")
        functions = {n.name: n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef)}
        for name in ("compile_resume_one_page", "compile_resume_one_page_autofit", "_grow_resume_fonts_to_fit", "_uniform_resume_font_scale"):
            self.assertEqual(hashlib.sha256(ast.get_source_segment(source, functions[name]).encode()).hexdigest(), manifest["functions"][name]["original_sha256"])

    def test_generic_candidate_has_no_fixed_contacts_or_education(self):
        data = adapter.prepare_resume({"header": {"name": "Casey Lee"}, "summary": "Registered nurse working with clinical records.",
            "education": [{"degree": "BS Nursing", "institution": "Sample Health University"}],
            "experience": [{"title": "Nurse", "company": "Sample Hospital", "bullets": ["Documented patient assessments."]}],
            "skills": ["Patient assessment", "Clinical documentation"],
            "other_sections": [{"title": "LANGUAGES", "items": ["English"]}]})
        with tempfile.TemporaryDirectory() as folder:
            source = adapter.render_resume(maker, data, folder).read_text()
        for banned in ("Shivam", "Amity", "Arizona State", "YOUR NAME", "github.com/", "GPA:", r"\resSection{ACADEMIC PROJECTS}"):
            self.assertNotIn(banned, source)
        self.assertIn("Sample Health University", source)
        self.assertIn("LANGUAGES", source)
        self.assertIn("English", source)

    def test_bullet_adaptation_never_truncates_a_metric_or_qualifier(self):
        bullet = "Analyzed laboratory measurements for recorded operational conditions " * 4 + "and increased the score to 82%, not by 82%."
        self.assertEqual(adapter._one_line_bullet(bullet), bullet)

    def test_cover_uses_original_template_without_fixed_identity(self):
        source = adapter.render_cover(maker, {"body_paragraphs": ["Managed patient care & documented a 25% reduction in review time."], "closing": "Kind regards"}, {"name": "Casey Lee"})
        self.assertIn("0.6em", source)
        self.assertIn("25\\%", source)
        self.assertIn("Kind regards,", source)
        self.assertNotIn("Your Name", source)
        self.assertNotIn("Shivam", source)

    def test_generic_prompts_do_not_require_fabricated_projects_or_metrics(self):
        self.assertIn("ANY candidate", RESUME_PROMPT)
        self.assertIn("never invent projects", RESUME_PROMPT)
        self.assertIn("ORIGINAL RESUME", COVER_PROMPT)
        for value in ("APPLICANT_EMAIL", "GITHUB_USERNAME", "Mechanical Tree", "master's in Robotics"):
            self.assertNotIn(value, RESUME_PROMPT + COVER_PROMPT)

    def test_cover_sender_header_does_not_become_the_recipient_company(self):
        body = "My edited example includes C++ & Python with a supported 25% result."
        for sender in ("", "Alex Morgan\nTempe, AZ | [Contact Redacted - Privacy Safe]\n\n"):
            letter = adapter.cover_from_markdown(sender + "Hiring Manager\nNexus Tech Innovations\n\nDear Hiring Manager,\n\n" + body + "\n\nSincerely,\nAlex Morgan")
            self.assertEqual(letter["company_name"], "Nexus Tech Innovations")
            self.assertEqual(letter["company_location"], "")
            self.assertEqual(letter["signature_name"], "Alex Morgan")
            self.assertEqual(letter["body_paragraphs"], [body])
            source = adapter.render_cover(maker, letter, {"name": "Alex Morgan"})
            self.assertEqual(source.count("Nexus Tech Innovations"), 1)
            self.assertIn("C++ \\& Python", source)


if __name__ == "__main__":
    unittest.main()
