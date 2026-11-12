import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),skill=process.env.PRESENTATIONS_SKILL;
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const args=process.argv.slice(2);
if(args.length!==4||args[0]!=='--overview'||args[2]!=='--guide')throw new Error('Usage: node scripts/finalize_google_decks.mjs --overview <Google export.pptx> --guide <Google export.pptx>');
const sources={overview:path.resolve(args[1]),guide:path.resolve(args[3])};
for(const [kind,file] of Object.entries(sources)) {
  const dir=path.join(root,'build/premium',kind),stamp=Date.now();
  const candidatePath=path.join(dir,`google-${stamp}.pptx`);await fs.copyFile(file,candidatePath);
  const finalPath=path.join(dir,`google-validated-${stamp}`,`ATS-Coach-AI-${kind}.pptx`);await fs.mkdir(path.dirname(finalPath),{recursive:true});
  // Native Google Slides uses 10 x 5.625 inches while preserving the 16:9 composition.
  await finalizePresentation({workspaceDir:root,candidatePath,finalPath,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','9144000,5143500','--validate-heading-fit'],explicitTotalSlideCount:kind==='overview'?8:13,fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(dir,`google-validation-${stamp}.json`)});
  await fs.copyFile(finalPath,path.join(dir,'Google-Final.pptx'));
  console.log(`${kind}: native Google export validated`);
}
