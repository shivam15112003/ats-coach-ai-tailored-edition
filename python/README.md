# Original Python maker cloud copy

`resume_and_cover_maker.py` contains 20 functions and both LaTeX templates copied
from the desktop `resume_and_cover_maker.py`. `maker_provenance.json` records its
source hash, original function hashes, line numbers, and intentional changes.
The original desktop file is unchanged. Its complete backup remains locally
beside the desktop file and is not published with this app.

The original Python one-page spacing ladder, profile sequence, and font-growth
functions execute in this worker. They are not TypeScript reimplementations.

Cloud adaptations are in `cloud_adapter.py`: standard-library subprocess/JSON
transport, compiler selection, and page counts from the compiler log. Node also
opens each returned PDF, checks its page count, and extracts its text. No pip,
Selenium, browser profiles, local key files, or personal constants are required.

The profession-neutral prompts live in `prompts.py`. They prohibit invented
facts and allow equivalent wording. Missing fields stay empty. Candidate header
details come from the uploaded original. Missing summaries may be derived from
its evidence. Projects and metrics are never invented to meet a length target.

Other intentional adaptations: no forced email/profile/GPA/location, no invented
name placeholders, no mechanical bullet truncation, no forced USD currency,
absent sections omitted, and additional real sections preserved. Skills are
compact and use a profession-neutral label.

The app invokes `run_maker.py` over standard input/output. Python 3.10+ is detected
automatically. On Linux x64 without Python, the server can download a pinned,
checksum-verified portable Python runtime. LaTeX uses installed pdflatex or the
existing checksum-verified portable Tectonic engine. Temporary candidate files
are deleted after every request.

Run tests: `python -m unittest discover -s python -p test_cloud_maker.py`.
Regenerate the copy: `python scripts/copy_resume_maker.py /path/to/original.py`.
