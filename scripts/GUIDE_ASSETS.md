# Getting started guide

`src/data/gettingStarted.json` is the shared source for the slide images,
editable PowerPoint, narrated video, captions, and in-app transcript.
The assets in `public/guide` are served locally with the app and copied by Vite
into the production build. The walkthrough uses an installed Windows system
voice and contains no user data or external media.

To rebuild:

1. Set `ARTIFACT_MODULES`, `PRESENTATIONS_SKILL`, and `RUNTIME_PYTHON` to the
   bundled presentation runtime paths. Run `node scripts/build_guide.mjs`.
   Each run validates a new staging file before replacing the public PowerPoint.
   The PowerPoint, in-app slide PNGs, and video frames share one native layout,
   including the same screenshots, numbered highlights, diagrams, and Thank You slide.
2. Run `node scripts/render_walkthrough.mjs` with `ARTIFACT_MODULES` set. This
   renders the real screenshots in `scripts/guide-screenshots`, numbered oval highlights, and native process
   diagrams described by `scripts/guide-scenes.json` into video frames.
3. With FFmpeg and FFprobe available, run
   `powershell.exe -NoProfile -File scripts/build_guide_video.ps1`.
4. Inspect all slide images and annotated video frames. Check the video audio, captions, duration,
   browser playback, and PowerPoint download before committing updated assets.

The guide shows a welcome banner until dismissed or opened. It stores only
that preference in localStorage. The permanent How to use control remains
available throughout the session. Media requires an explicit Play action.

Screenshot sources: input and original-document editor captured from the live
anonymized sample on November 8, 2026. Cover letter, Application Q&A, and interview
summary use verified earlier anonymized sample screenshots from this project.
The native image crop excludes the surrounding AI Studio editor. Sample interview
scores illustrate the summary screen only and do not promise future scores.
The diagram chapters explain the workflow without fabricating screenshots or
new AI results when provider quota is exhausted.
