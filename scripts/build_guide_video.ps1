# Run in Windows PowerShell (System.Speech) after build_guide.mjs.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$guideRoot = (Get-Location).Path
$guideBuild = Join-Path $guideRoot 'build/guide'
$guidePublic = Join-Path $guideRoot 'public/guide'
$guideSlides = Get-Content -LiteralPath (Join-Path $guideRoot 'src/data/gettingStarted.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$guideSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$guideSynth.Rate = 0
$guideSynth.Volume = 100
$guideOffset = 0.0
$guideCaptions = New-Object System.Collections.Generic.List[string]
$guideCaptions.Add("WEBVTT`n")
$guideConcat = New-Object System.Collections.Generic.List[string]
function Format-GuideTime([double]$seconds) { return [TimeSpan]::FromSeconds($seconds).ToString('hh\:mm\:ss\.fff') }
try {
  for ($guideIndex = 0; $guideIndex -lt $guideSlides.Count; $guideIndex++) {
    $guideStem = 'slide-{0:D2}' -f ($guideIndex + 1)
    $guideWav = Join-Path $guideBuild ($guideStem + '.wav')
    $guideSynth.SetOutputToWaveFile($guideWav)
    $guideSynth.Speak($guideSlides[$guideIndex].narration)
    $guideSynth.SetOutputToNull()
    $guideAudioSeconds = [double]::Parse((& ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $guideWav), [Globalization.CultureInfo]::InvariantCulture)
    $guideDuration = $guideAudioSeconds + 1.4
    $guideDurationText = $guideDuration.ToString('0.000', [Globalization.CultureInfo]::InvariantCulture)
    $guideSegment = Join-Path $guideBuild ($guideStem + '.mp4')
    $guideFrame = Join-Path $guideBuild ('video-' + $guideStem + '.png')
    if (!(Test-Path -LiteralPath $guideFrame)) { throw "Missing annotated walkthrough frame: $guideFrame" }
    & ffmpeg -hide_banner -loglevel error -y -loop 1 -i $guideFrame -i $guideWav -af apad=pad_dur=1.4 -t $guideDurationText -r 24 -vf 'scale=1280:720,format=yuv420p' -c:v libx264 -preset fast -crf 24 -c:a aac -b:a 96k -movflags +faststart $guideSegment
    if ($LASTEXITCODE -ne 0) { throw "Video encoding failed for $guideStem" }
    $guideConcat.Add("file '$($guideSegment.Replace('\','/'))'")
    $guideSentences = [regex]::Split($guideSlides[$guideIndex].narration, '(?<=[.!?])\s+')
    $guideWords = ($guideSlides[$guideIndex].narration -split '\s+').Count
    $guideSentenceOffset = $guideOffset
    foreach ($guideSentence in $guideSentences) {
      $guideSentenceDuration = $guideAudioSeconds * (($guideSentence -split '\s+').Count / $guideWords)
      $guideCaptions.Add("$(Format-GuideTime $guideSentenceOffset) --> $(Format-GuideTime ($guideSentenceOffset + $guideSentenceDuration))`n$guideSentence`n")
      $guideSentenceOffset += $guideSentenceDuration
    }
    $guideOffset += $guideDuration
    Write-Output "$guideStem encoded ($guideDurationText seconds)"
  }
} finally { $guideSynth.Dispose() }
$guideConcatPath = Join-Path $guideBuild 'concat.txt'
[IO.File]::WriteAllLines($guideConcatPath, $guideConcat, (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path $guidePublic 'captions.vtt'), (($guideCaptions -join "`n").TrimEnd() + "`n"), (New-Object Text.UTF8Encoding($false)))
& ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i $guideConcatPath -c copy -movflags +faststart (Join-Path $guidePublic 'ats-coach-walkthrough.mp4')
if ($LASTEXITCODE -ne 0) { throw 'Final video assembly failed' }
Write-Output "Created narrated walkthrough: $([math]::Round($guideOffset,1)) seconds"
