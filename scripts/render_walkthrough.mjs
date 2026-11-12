import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const runtime = createRequire(path.join(process.env.ARTIFACT_MODULES, '__guide.cjs'));
const { Presentation, PresentationFile } = await import(pathToFileURL(runtime.resolve('@oai/artifact-tool')).href);
const exportSlides = process.argv.includes('--export-slides');
await fs.mkdir('build/guide', { recursive: true });
const chapters = JSON.parse(await fs.readFile('src/data/gettingStarted.json', 'utf8'));
const scenes = JSON.parse(await fs.readFile('scripts/guide-scenes.json', 'utf8'));
if (scenes.length !== chapters.length) throw new Error('Every guide chapter needs a video scene');
const film = Presentation.create({ slideSize: { width: 1280, height: 720 } });
function label(slide, value, x, y, w, h, size = 28, color = '#22302E', bold = false, alignment = 'left') {
  const shape = slide.shapes.add({ geometry: 'textbox', position: {left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0} });
  shape.text = value; shape.text.style = { typeface: 'Arial', fontSize: size, color, bold, alignment, verticalAlignment:'middle', insets:0 };
}
for (let index = 0; index < chapters.length; index++) {
  const item = chapters[index], scene = scenes[index], slide = film.slides.add();
  slide.speakerNotes.text = `${item.narration}\n\nSteps:\n${item.steps.join('\n')}` + (scene.image ? '\n\nScreenshot: verified anonymized ATS Coach AI sample. The numbered circles identify the controls.' : '') + (index === 7 ? '\n\nReferences:\nhttps://support.google.com/chrome/answer/2693767\nhttps://support.microsoft.com/en-us/windows/privacy/turn-on-app-permissions-for-your-microphone-in-windows' : '');
  slide.background.fill = '#FAF6EE';
  label(slide, item.title, 56, 32, 1168, 65, 46, '#1E6A63', true);
  label(slide, scene.hint, 56, 105, 1168, 75, 27);
  if (scene.image) {
    const c = scene.crop, scale = Math.min(1160/c.w, 450/c.h);
    const w=c.w*scale, h=c.h*scale, x=(1280-w)/2, y=198+(450-h)/2;
    const bytes = await fs.readFile(path.join('scripts/guide-screenshots',scene.image));
    slide.images.add({ blob: bytes, contentType: scene.image.endsWith('.png')?'image/png':'image/jpeg', alt:`Real ATS Coach AI sample screen: ${item.title}`, position:{left:x,top:y,width:w,height:h},fit:'contain',crop:{left:c.x/scene.sourceWidth,top:c.y/scene.sourceHeight,right:1-(c.x+c.w)/scene.sourceWidth,bottom:1-(c.y+c.h)/scene.sourceHeight} });
    for (const [markIndex, mark] of scene.marks.entries()) {
      const mx=x+(mark.x-c.x)*scale, my=y+(mark.y-c.y)*scale, mw=mark.w*scale, mh=mark.h*scale;
      slide.shapes.add({name:`Highlight ${markIndex+1}`,geometry:'ellipse',position:{left:mx,top:my,width:mw,height:mh},fill:'none',line:{fill:'#D83B26',width:4}});
      const badge=slide.shapes.add({geometry:'ellipse',position:{left:mx-15,top:my-15,width:34,height:34},fill:'#D83B26',line:{fill:'#FFFFFF',width:2}});
      badge.text=String(markIndex+1); badge.text.style={typeface:'Arial',fontSize:22,bold:true,color:'#FFFFFF',alignment:'center',verticalAlignment:'middle',insets:0};
    }
  } else {
    const labels=scene.flow;
    for (let j=0;j<labels.length;j++) {
      const x=56+j*408;
      const node=slide.shapes.add({geometry:'roundRect',position:{left:x,top:285,width:350,height:165},fill:'#E4EFEB',line:{fill:'#1E6A63',width:2},borderRadius:16});
      node.text=labels[j]; node.text.style={typeface:'Arial',fontSize:30,bold:true,color:'#1E6A63',alignment:'center',verticalAlignment:'middle',insets:20};
      label(slide,String(j+1),x,235,350,40,28,'#1E6A63',true,'center');
      if(j<labels.length-1)slide.shapes.add({geometry:'rightArrow',position:{left:x+363,top:348,width:32,height:38},fill:'#1E6A63',line:{fill:'none',width:0}});
    }
  }
  if(scene.note)label(slide,scene.note,56,650,1168,34,18,'#52615D');
  label(slide,`${index+1} / ${chapters.length}`,1130,687,94,24,18,'#1E6A63',false,'right');
  const png=await film.export({slide,format:'png',scale:1});
  await fs.writeFile(`build/guide/video-slide-${String(index+1).padStart(2,'0')}.png`,new Uint8Array(await png.arrayBuffer()));
  if (exportSlides) await fs.writeFile(`public/guide/slide-${String(index+1).padStart(2,'0')}.png`,new Uint8Array(await png.arrayBuffer()));
}
console.log(`Rendered ${chapters.length} annotated walkthrough scenes`);
if (exportSlides) {
  const root = process.cwd(), skill = process.env.PRESENTATIONS_SKILL;
  const build = path.join(root,'build/guide');
  const candidatePath = path.join(build,'candidate.pptx');
  await (await PresentationFile.exportPptx(film)).save(candidatePath);
  const { finalizePresentation } = await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
  const finalPath=path.join(build,`validated-${Date.now()}`,'ats-coach-getting-started.pptx');
  await fs.mkdir(path.dirname(finalPath),{recursive:true});
  await finalizePresentation({workspaceDir:root,candidatePath,finalPath,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],explicitTotalSlideCount:chapters.length,fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(build,`validation-${Date.now()}.json`)});
  await fs.copyFile(finalPath,path.join(root,'public/guide/ats-coach-getting-started.pptx'));
  console.log('PowerPoint and in-app slides now match the video visuals');
}
