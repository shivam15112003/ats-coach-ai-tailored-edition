import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const exec=promisify(execFile);
const VERSION='0.17.0';
const TARGETS:Record<string,{target:string;sha256:string}>={
  x64:{target:'x86_64-unknown-linux-musl',sha256:'8533d07f9ccbd7a65824b9e0459041bca34af1eb33daba48f59215593753a3b7'},
  arm64:{target:'aarch64-unknown-linux-musl',sha256:'b10954a95404f3ab2328d2fa59a5ebab8e657f893fab096f98be8db7c0c979b8'},
};
let installing:Promise<string>|undefined;

/** Cloud Run has no laptop MiKTeX. Use a pinned, checksum-verified portable engine. */
export async function cloudLatexCompiler():Promise<string>{
  if(process.env.TECTONIC_PATH)return process.env.TECTONIC_PATH;
  if(process.platform!=='linux')throw new Error('No LaTeX compiler found. Install MiKTeX or set PDFLATEX_PATH.');
  if(installing)return installing;
  installing=(async()=>{
    const asset=TARGETS[process.arch];if(!asset)throw new Error('Unsupported cloud compiler architecture: '+process.arch);
    const folder=path.join(os.tmpdir(),`ats-tectonic-${VERSION}-${process.arch}`),binary=path.join(folder,'tectonic');
    try{await exec(binary,['--version'],{timeout:5000});return binary;}catch{/* Install first. */}
    await fs.mkdir(folder,{recursive:true});
    const file=`tectonic-${VERSION}-${asset.target}.tar.gz`;
    const response=await fetch(`https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${VERSION}/${file}`,{signal:AbortSignal.timeout(90000)});
    if(!response.ok)throw new Error(`Cloud compiler download failed (${response.status}). Retry after network access is restored.`);
    const archive=Buffer.from(await response.arrayBuffer());
    if(createHash('sha256').update(archive).digest('hex')!==asset.sha256)throw new Error('Cloud compiler checksum verification failed.');
    const archivePath=path.join(folder,file);await fs.writeFile(archivePath,archive);
    await exec('tar',['-xzf',archivePath,'-C',folder,'tectonic'],{timeout:15000});
    await fs.chmod(binary,0o755);await fs.unlink(archivePath);
    await exec(binary,['--version'],{timeout:5000});return binary;
  })();
  try{return await installing;}catch(error){installing=undefined;throw error;}
}

/** XeTeX writes Unicode directly; guard pdfTeX-only extraction primitives. */
export function portableLatex(source:string):string{
  return source.replace(/^([ \t]*)(\\input\{glyphtounicode\}|\\pdfgentounicode=1|\\pdfinterwordspaceon|\\pdfglyphtounicode\{[^\n]*\})[ \t]*$/gm,
    (_line,space,command)=>`${space}\\ifdefined\\pdfglyphtounicode ${command}\\fi`);
}
