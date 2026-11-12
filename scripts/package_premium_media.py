"""Package reviewed Google Slides and Google Vids exports without AI API calls."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import textwrap
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
for media_kind in ("overview", "guide"):
    for format_name in ("pdf", "video"):
        parser.add_argument(f"--{media_kind}-{format_name}", required=True, type=Path)
parser.add_argument("--desktop", required=True, type=Path)
parser.add_argument("--project-links", type=Path, help="Optional JSON mapping of project labels to URLs.")
args = parser.parse_args()
DESKTOP = args.desktop
SOURCES = {
    "overview": {"pdf": args.overview_pdf, "video": args.overview_video, "folder": "01 - Client and Marketing", "name": "ATS-Coach-AI-Product-Overview", "public": "ats-coach-overview"},
    "guide": {"pdf": args.guide_pdf, "video": args.guide_video, "folder": "02 - App Walkthrough", "name": "ATS-Coach-AI-Walkthrough", "public": "ats-coach-getting-started"},
}
LINKS = json.loads(args.project_links.read_text(encoding="utf-8")) if args.project_links else {"App": "https://remix-remix-ats-coach-ai-1403.ai.studio/"}

def timestamp(value):
    ms = round(value * 1000)
    return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}"

def write_captions(items, boundaries, target):
    cues = ["WEBVTT", ""]
    for index, item in enumerate(items):
        sentences = re.split(r"(?<=[.!?])\s+", item["narration"])
        chunks = []
        for sentence in sentences:
            words = sentence.split()
            chunks.extend(" ".join(words[i:i+12]) for i in range(0,len(words),12))
        total = sum(len(chunk.split()) for chunk in chunks)
        elapsed = boundaries[index]
        duration = boundaries[index+1]-elapsed
        for chunk in chunks:
            end = elapsed + duration*len(chunk.split())/total
            cues.extend([f"{timestamp(elapsed)} --> {timestamp(end)}", textwrap.fill(chunk,45), ""])
            elapsed = end
    target.write_text("\n".join(cues),encoding="utf-8")

stories = json.loads((ROOT/"scripts/premium-storyboards.json").read_text(encoding="utf-8"))
manifest = []
for kind, source in SOURCES.items():
    items = stories[kind]
    target = ROOT/"public"/kind
    target.mkdir(exist_ok=True)
    native_pdf = source["pdf"]
    pdf = pymupdf.open(native_pdf)
    assert len(pdf) == len(items)
    for i,page in enumerate(pdf):
        assert abs(page.rect.width/page.rect.height-16/9)<0.001
        page.get_pixmap(matrix=pymupdf.Matrix(1920/page.rect.width,1920/page.rect.width)).save(target/f"slide-{i+1:02}.png")
    public_ppt = target/(source["public"]+".pptx")
    public_pdf = target/(source["public"]+".pdf")
    shutil.copy2(ROOT/"build/premium"/kind/"Google-Final.pptx",public_ppt)
    shutil.copy2(native_pdf,public_pdf)
    raw_video = source["video"]
    probe = json.loads(subprocess.check_output(["ffprobe","-v","error","-show_format","-show_streams","-of","json",str(raw_video)],text=True))
    duration=float(probe["format"]["duration"])
    log=(ROOT/"build/premium"/kind/"scenes.log").read_text(encoding="utf-8")
    changes=[float(value) for value in re.findall(r"pts_time:([0-9.]+)",log)]
    boundaries=([0] if changes[0] != 0 else [])+changes+[duration]
    assert len(boundaries)==len(items)+1,(kind,boundaries)
    captions=target/"captions.vtt"
    write_captions(items,boundaries,captions)
    video=target/("ats-coach-overview.mp4" if kind=="overview" else "ats-coach-walkthrough.mp4")
    # Checked Google Slides PDF frames avoid occasional image conversion glitches
    # in Google Vids, while preserving its generated narration and music exactly.
    sequence=ROOT/"build/premium"/kind/"reviewed-frames.txt"
    frames=[]
    for i in range(len(items)):
        frame=target/f"slide-{i+1:02}.png"
        frames.extend([f"file '{frame.as_posix()}'",f"duration {boundaries[i+1]-boundaries[i]:.9f}"])
    frames.append(f"file '{frame.as_posix()}'")
    sequence.write_text("\n".join(frames),encoding="utf-8")
    subprocess.run(["ffmpeg","-v","error","-f","concat","-safe","0","-i",str(sequence),"-i",str(raw_video),"-i",str(captions),"-map","0:v:0","-map","1:a:0","-map","2:s:0","-t",str(duration),"-r","30","-c:v","libx264","-crf","18","-preset","fast","-pix_fmt","yuv420p","-c:a","copy","-c:s","mov_text","-metadata:s:s:0","language=eng","-metadata:s:s:0","title=English","-movflags","+faststart","-y",str(video)],check=True)
    data=[{key:value for key,value in item.items() if key in {"title","subtitle","narration","steps"}} for item in items]
    (ROOT/"src/data"/("appOverview.json" if kind=="overview" else "gettingStarted.json")).write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    destination=DESKTOP/source["folder"]
    destination.mkdir(parents=True,exist_ok=True)
    for original,name in [(video,source["name"]+".mp4"),(public_ppt,source["name"]+".pptx"),(public_pdf,source["name"]+".pdf"),(captions,"English-captions.vtt")]:
        final=destination/name
        shutil.copy2(original,final)
        digest=hashlib.sha256(original.read_bytes()).hexdigest()
        assert hashlib.sha256(final.read_bytes()).hexdigest()==digest
        manifest.append({"file":str(final),"bytes":final.stat().st_size,"sha256":digest})
    transcript="\n\n".join(f"{i+1}. {item['title']}\n{item['narration']}" for i,item in enumerate(items))
    (destination/"Narration transcript.txt").write_text(transcript,encoding="utf-8")
    (ROOT/"build/premium"/kind/"timing.json").write_text(json.dumps({"duration":duration,"boundaries":boundaries},indent=2),encoding="utf-8")
    print(f"{kind}: {len(items)} slides, {duration:.3f}s, verified Desktop copies")
(DESKTOP/"Google Projects.txt").write_text("\n\n".join(f"{name}\n{url}" for name,url in LINKS.items()),encoding="utf-8")
(DESKTOP/"START HERE.txt").write_text("ATS COACH AI\n\n01 - Client and Marketing: 8-slide product overview and narrated video.\n02 - App Walkthrough: 13-slide guide and narrated video.\n\nEach folder includes an editable PowerPoint, PDF, MP4, English captions, and narration transcript. Both presentations and videos end with a thank-you scene.\n\nThe videos use Google Vids Narrator voiceover and its provided background music. They show the real published app with anonymized sample materials. Native Google Slides and editable Google Vids source project links are in Google Projects.txt.\n\nThe final MP4s combine reviewed Google Slides PDF frames with the unchanged Google Vids audio to avoid occasional image conversion glitches. They include complete English captions. Caption timings follow the measured scene boundaries and approximate sentence timing within each scene.\n\nEducational scores do not predict hiring outcomes. Sample content is labelled. Workspace files save the application materials and documents; application answers and practice notes export separately.\n",encoding="utf-8")
(DESKTOP/"verified-files.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
print(DESKTOP)
