import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const runtime = createRequire(path.join(process.env.ARTIFACT_MODULES, '__premium.cjs'));
const { Presentation, PresentationFile } = await import(pathToFileURL(runtime.resolve('@oai/artifact-tool')).href);
const stories = JSON.parse(await fs.readFile('scripts/premium-storyboards.json', 'utf8'));
const captures = JSON.parse(await fs.readFile('scripts/premium-captures.json', 'utf8'));
const root = process.cwd(), W = 1280, H = 720;
const C = { ink:'#153C3E', teal:'#1E6A63', paper:'#FAF8F2', mint:'#D5ECE1', gray:'#52615D', coral:'#D64B31' };

function text(slide, value, x,y,w,h,size=28,color=C.ink,bold=false) {
  const s=slide.shapes.add({name:value.slice(0,65),geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  s.text=value; s.text.style={typeface:'Arial',fontSize:size,color,bold,verticalAlignment:'middle',insets:0};
  return s;
}
function line(slide,x,y,w,color=C.teal,width=1) {
  slide.shapes.add({geometry:'line',position:{left:x,top:y,width:w,height:0},line:{fill:color,width},fill:'none'});
}
async function screen(slide,key,box,annotate=false) {
  const a=captures[key], c=a.crop, scale=Math.min(box.w/c.w,box.h/c.h), width=c.w*scale,height=c.h*scale;
  const x=box.x+(box.w-width)/2,y=box.y+(box.h-height)/2;
  const file=a.precropped||a.file;
  slide.images.add({blob:await fs.readFile(path.join('scripts/premium-screenshots',file)),contentType:file.endsWith('.png')?'image/png':'image/jpeg',alt:`Real ATS Coach AI screen: ${key}`,position:{left:x,top:y,width,height},fit:'contain',...(!a.precropped?{crop:{left:c.x/a.width,top:c.y/a.height,right:1-(c.x+c.w)/a.width,bottom:1-(c.y+c.h)/a.height}}:{})});
  if(annotate) for(const [i,m] of (a.marks||[]).entries()) {
    const left=x+(m.x-c.x)*scale, top=y+(m.y-c.y)*scale;
    slide.shapes.add({name:`Control highlight ${i+1}`,geometry:'ellipse',position:{left,top,width:m.w*scale,height:m.h*scale},fill:'none',line:{fill:C.coral,width:4}});
    const number=slide.shapes.add({name:`Step ${i+1}`,geometry:'ellipse',position:{left:left-12,top:top-12,width:30,height:30},fill:C.coral,line:{fill:'#FFFFFF',width:2}});
    number.text=String(i+1); number.text.style={typeface:'Arial',fontSize:19,bold:true,color:'#FFFFFF',alignment:'center',verticalAlignment:'middle',insets:0};
  }
}
function footer(slide,index,total,dark,kind) {
  const color=dark?C.mint:C.gray;
  text(slide,`ATS COACH AI   /   ${kind==='overview'?'PRODUCT OVERVIEW':'HOW TO USE'}`,48,676,1050,24,16,color,true);
  text(slide,`${String(index+1).padStart(2,'0')} / ${total}`,1140,676,92,24,16,color);
}
for(const [kind,items] of Object.entries(stories)) {
  const deck=Presentation.create({slideSize:{width:W,height:H}});
  const dir=path.join(root,'build/premium',kind); await fs.mkdir(dir,{recursive:true});
  for(const [i,item] of items.entries()) {
    const slide=deck.slides.add(),dark=['cover','closing','flow'].includes(item.layout);
    slide.background.fill=dark?C.ink:C.paper;
    slide.speakerNotes.text=item.narration+'\n\n'+(item.steps||item.aside||[]).join('\n')+'\n\nProduct: https://remix-remix-ats-coach-ai-1403.ai.studio/\nScreenshots use anonymized sample application materials.'+(item.layout==='permissions'?'\nMicrophone references: https://support.google.com/chrome/answer/2693767\nhttps://support.microsoft.com/en-us/windows/turn-on-app-permissions-for-your-microphone-in-windows-94991183-f69d-b4cf-4679-c98ca45f577a':'');
    if(item.layout==='cover') {
      text(slide,item.subtitle.toUpperCase(),48,60,680,35,20,C.mint,true);
      text(slide,item.title,48,124,550,235,kind==='overview'?65:60,'#FFFFFF',true);
      text(slide,kind==='overview'?'Understand your fit.\nPrepare your application.':'A guided tour using\nanonymized sample materials.',48,402,510,100,30,C.mint);
      await screen(slide,item.image,{x:654,y:115,w:570,h:480});
    } else if(item.layout==='closing') {
      text(slide,item.title,48,77,600,95,76,'#FFFFFF',true);
      text(slide,item.subtitle,48,200,570,90,39,C.mint,true);
      for(const [j,t] of item.aside.entries()) text(slide,`${j+1}. ${t}`,48,340+j*54,570,45,28,'#FFFFFF');
      text(slide,'remix-remix-ats-coach-ai-1403.ai.studio',48,520,1150,50,25,C.mint);
      await screen(slide,item.image,{x:702,y:128,w:530,h:350});
    } else if(item.layout==='flow') {
      text(slide,item.title,48,55,1184,78,54,'#FFFFFF',true);
      text(slide,item.subtitle,48,148,1184,55,28,C.mint);
      for(const [j,t] of item.steps.entries()) {
        const x=48+j*302;
        text(slide,String(j+1).padStart(2,'0'),x,290,240,85,65,C.mint,true);
        line(slide,x,400,238,C.mint,2);
        text(slide,t,x,425,245,110,33,'#FFFFFF',true);
      }
      text(slide,'Your resume and the target role connect every step.',48,580,1184,50,27,C.mint);
    } else if(item.layout==='voiceFlow') {
      text(slide,item.title,48,45,1184,80,48,C.ink,true);
      text(slide,item.subtitle,48,132,1184,50,28,C.gray);
      const labels=['Spoken question\n+ written text','Microphone\n+ editable transcript','Review\n+ Submit Answer','AI feedback\n+ follow-up'];
      for(const [j,t] of labels.entries()) {
        const x=48+j*302;
        text(slide,String(j+1).padStart(2,'0'),x,266,245,65,52,C.teal,true);
        line(slide,x,362,235,C.teal,2);
        text(slide,t,x,390,250,115,30,C.ink,true);
        if(j<3)slide.shapes.add({geometry:'rightArrow',position:{left:x+250,top:390,width:35,height:30},fill:C.teal,line:{fill:'none',width:0}});
      }
      text(slide,'Only Submit Answer sends the reviewed answer text for feedback.',48,575,1184,55,28,C.teal,true);
    } else if(item.layout==='permissions') {
      text(slide,item.title,48,50,1184,80,54,C.ink,true);
      text(slide,item.subtitle,48,140,1184,55,28,C.gray);
      for(const [j,t] of item.steps.entries()) {
        text(slide,String(j+1).padStart(2,'0'),48,260+j*80,78,60,35,C.teal,true);
        text(slide,t.replaceAll(' → ',' / '),145,260+j*80,1060,60,30,C.ink,j===0);
      }
      text(slide,'Use the published app in a separate Chrome tab. Text entry remains available.',48,608,1184,42,23,C.gray);
    } else if(item.layout==='split') {
      text(slide,item.title,48,43,1184,80,49,C.ink,true);
      text(slide,item.subtitle,48,135,1184,55,27,C.gray);
      await screen(slide,item.image,{x:48,y:232,w:790,h:407});
      for(const [j,t] of item.aside.entries()) {
        text(slide,String(j+1).padStart(2,'0'),894,235+j*132,320,40,23,C.teal,true);
        text(slide,t,894,282+j*132,320,72,29,C.ink,true);
      }
    } else {
      text(slide,item.title,48,36,1184,76,49,C.ink,true);
      text(slide,item.subtitle,48,119,1184,53,27,C.gray);
      const imageKey=kind==='guide'&&item.image==='application'?'application-controls':kind==='guide'&&item.image==='interview'?'interview-settings':item.image;
      const narrow=captures[imageKey].crop.w/captures[imageKey].crop.h<1.6;
      await screen(slide,imageKey,{x:48,y:199,w:narrow?670:1184,h:421},Boolean(item.mark));
      if(narrow) {
        const lines=item.steps||['One workspace for each role','Save locally and reopen later','Review before sharing'];
        for(const [j,t]of lines.slice(0,3).entries())text(slide,t,790,235+j*125,420,100,28,C.ink,true);
      }
      text(slide,item.note||item.steps?.[0]||'Anonymized sample shown',48,629,1184,35,18,C.gray);
    }
    footer(slide,i,items.length,dark,kind);
    const png=await deck.export({slide,format:'png',scale:1.5});
    await fs.writeFile(path.join(dir,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
  }
  const candidatePath=path.join(dir,`candidate-${Date.now()}.pptx`);
  console.log(`${kind}: exporting editable PowerPoint`);
  const exported=await PresentationFile.exportPptx(deck);
  console.log(`${kind}: saving candidate`);
  await exported.save(candidatePath);
  const skill=process.env.PRESENTATIONS_SKILL;
  const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
  const finalPath=path.join(dir,'validated-'+Date.now(),kind==='overview'?'ATS-Coach-AI-Product-Overview.pptx':'ATS-Coach-AI-Walkthrough.pptx');
  await fs.mkdir(path.dirname(finalPath),{recursive:true});
  await finalizePresentation({workspaceDir:root,candidatePath,finalPath,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],explicitTotalSlideCount:items.length,fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(dir,`validation-${Date.now()}.json`)});
  await fs.copyFile(finalPath,path.join(dir,path.basename(finalPath)));
  console.log(`${kind}: ${items.length} reviewed scenes exported to ${finalPath}`);
}
