"""Package reviewed Google Slides/Vids exports and their accessible transcripts.

The Google exports are supplied explicitly; this script does not call an AI API.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import textwrap

ROOT = Path(__file__).resolve().parents[1]


def timestamp(seconds):
    ms = round(seconds * 1000)
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}.{ms % 1000:03}"


def captions(items, boundaries, target):
    cues = ["WEBVTT", ""]
    for index, item in enumerate(items):
        # Full sentence cues, proportioned to the measured scene duration.
        sentences = re.split(r"(?<=[.!?])\s+", item["narration"])
        total = sum(len(s.split()) for s in sentences)
        elapsed = boundaries[index]
        duration = boundaries[index + 1] - elapsed
        for sentence in sentences:
            end = elapsed + duration * len(sentence.split()) / total
            cues.extend([f"{timestamp(elapsed)} --> {timestamp(end)}", textwrap.fill(sentence, 55), ""])
            elapsed = end
    target.write_text("\n".join(cues), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--overview-video", required=True, type=Path)
    parser.add_argument("--overview-pptx", required=True, type=Path)
    parser.add_argument("--overview-pdf", required=True, type=Path)
    parser.add_argument("--desktop", required=True, type=Path)
    parser.add_argument("--compose-reviewed-slides", action="store_true", help="Use checked PDF frames with the Google Vids audio to avoid conversion artifacts.")
    args = parser.parse_args()
    import pymupdf

    target = ROOT / "public/overview"
    target.mkdir(exist_ok=True)
    shutil.copy2(args.overview_video, target / "ats-coach-overview.mp4")
    shutil.copy2(args.overview_pptx, target / "ats-coach-overview.pptx")
    shutil.copy2(args.overview_pdf, target / "ats-coach-overview.pdf")
    document = pymupdf.open(args.overview_pdf)
    overview = json.loads((ROOT / "src/data/appOverview.json").read_text(encoding="utf-8"))
    assert len(document) == len(overview) == 6
    for index, page in enumerate(document):
        page.get_pixmap(matrix=pymupdf.Matrix(16 / 9, 16 / 9)).save(target / f"slide-{index + 1:02}.png")
    overview_duration = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(args.overview_video)], text=True).strip())
    overview_boundaries = [0, 13.866667, 31.233333, 47.633333, 64.2, 79, overview_duration]
    if args.compose_reviewed_slides:
        work = ROOT / "build/marketing/reviewed-overview"
        work.mkdir(parents=True, exist_ok=True)
        concat = []
        for index, page in enumerate(document):
            frame = work / f"slide-{index + 1:02}.png"
            page.get_pixmap(matrix=pymupdf.Matrix(8 / 3, 8 / 3)).save(frame)
            concat.extend([f"file '{frame.as_posix()}'", f"duration {overview_boundaries[index + 1] - overview_boundaries[index]:.9f}"])
        concat.append(f"file '{frame.as_posix()}'")
        sequence = work / "frames.txt"
        sequence.write_text("\n".join(concat), encoding="utf-8")
        subprocess.run(["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(sequence), "-i", str(args.overview_video), "-map", "0:v:0", "-map", "1:a:0", "-t", str(overview_duration), "-r", "30", "-c:v", "libx264", "-crf", "20", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", "-y", str(target / "ats-coach-overview.mp4")], check=True)
    captions(overview, overview_boundaries, target / "captions.vtt")
    guide = json.loads((ROOT / "src/data/gettingStarted.json").read_text(encoding="utf-8"))
    captions(guide, [0, 14.5, 32.066667, 50.5, 68.366667, 84.766667, 103.433333, 123.033333, 141.866667, 157.866667, 172.3], ROOT / "public/guide/captions.vtt")

    packages = {
        "Marketing": [(target / "ats-coach-overview.mp4", "ATS-Coach-AI-Overview.mp4"), (target / "ats-coach-overview.pptx", "ATS-Coach-AI-Overview.pptx"), (target / "ats-coach-overview.pdf", "ATS-Coach-AI-Overview.pdf"), (target / "captions.vtt", "English-captions.vtt")],
        "Walkthrough": [(ROOT / "public/guide/ats-coach-walkthrough.mp4", "ATS-Coach-AI-How-to.mp4"), (ROOT / "public/guide/ats-coach-getting-started.pptx", "ATS-Coach-AI-How-to.pptx"), (ROOT / "public/guide/captions.vtt", "English-captions.vtt")],
    }
    manifest = []
    for folder, entries in packages.items():
        directory = args.desktop / folder
        directory.mkdir(parents=True, exist_ok=True)
        for source, name in entries:
            final = directory / name
            shutil.copy2(source, final)
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            assert hashlib.sha256(final.read_bytes()).hexdigest() == digest
            manifest.append({"file": str(final), "bytes": final.stat().st_size, "sha256": digest})
    (args.desktop / "verified-files.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
