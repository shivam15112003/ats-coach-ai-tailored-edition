import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {resolveLatexCompiler} from './latexResume';
import {cloudLatexCompiler} from './cloudLatex';
import {PDFParse} from 'pdf-parse';

const exec=promisify(execFile);
let pythonPromise:Promise<string>|undefined;

export async function resolveMakerPython():Promise<string>{
  if(pythonPromise)return pythonPromise;
  pythonPromise=(async()=>{
    for(const candidate of [process.env.PYTHON_PATH,'python3','python'].filter(Boolean) as string[]){
      try{await exec(candidate,['-c','import sys; assert sys.version_info >= (3,10)'],{timeout:5000,windowsHide:true});return candidate;}catch{/* Try next. */}
    }
    if(process.platform!=='linux'||process.arch!=='x64')throw new Error('Python 3.10+ is required. Set PYTHON_PATH to its executable.');
    const directory=path.join(os.tmpdir(),'ats-python-3.12.15'),binary=path.join(directory,'python','bin','python3');
    try{await exec(binary,['--version'],{timeout:5000});return binary;}catch{/* Bootstrap cloud runtime. */}
    await fs.mkdir(directory,{recursive:true});
    const asset='cpython-3.12.15%2B20261021-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz';
    const response=await fetch('https://github.com/astral-sh/python-build-standalone/releases/download/20261021/'+asset,{signal:AbortSignal.timeout(90000)});
    if(!response.ok)throw new Error(`Cloud Python download failed (${response.status}).`);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(createHash('sha256').update(bytes).digest('hex')!=='6d7521138fd33afddc1ccd08abb007d9a2829e38117c2576f9efdc0ec73ce772')throw new Error('Cloud Python checksum mismatch.');
    const archive=path.join(directory,'python.tar.gz');await fs.writeFile(archive,bytes);
    await exec('tar',['-xzf',archive,'-C',directory],{timeout:30000});await fs.unlink(archive);
    await exec(binary,['--version'],{timeout:5000});return binary;
  })();
  try{return await pythonPromise;}catch(error){pythonPromise=undefined;throw error;}
}

export async function runPythonMaker(request:Record<string,unknown>,signal?:AbortSignal):Promise<any>{
  const python=await resolveMakerPython();
  if(String(request.action).startsWith('compile_')){
    const installed=process.env.TECTONIC_PATH?undefined:resolveLatexCompiler();
    request={...request,compiler:installed||await cloudLatexCompiler(),engine:installed?'pdflatex':'tectonic'};
  }
  signal?.throwIfAborted();
  const result=await new Promise<any>((resolve,reject)=>{
    const child=spawn(python,[path.resolve('python/run_maker.py')],{windowsHide:true,detached:process.platform!=='win32',env:{...process.env,PYTHONIOENCODING:'utf-8'},stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='',settled=false;
    const stop=()=>{try{if(process.platform!=='win32'&&child.pid)process.kill(-child.pid,'SIGTERM');else child.kill();}catch{/* Already exited. */}};
    const finish=(error?:Error,value?:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
    const abort=()=>{stop();finish(new Error('Resume preparation cancelled.'));};
    const timer=setTimeout(()=>{stop();finish(new Error('The original maker took too long to compile. Shorten long bullets and retry.'));},240000);
    signal?.addEventListener('abort',abort,{once:true});
    child.stdout.on('data',b=>{stdout+=b.toString();if(stdout.length>20_000_000){stop();finish(new Error('Maker output is too large.'));}});
    child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-6000);});
    child.on('error',error=>finish(error));
    child.on('close',()=>{try{const data=JSON.parse(stdout.trim());if(!data.success)throw new Error(data.error||'The original maker did not complete.');finish(undefined,data);}catch(error){finish(error instanceof Error?error:new Error(stderr||'Invalid maker response.'));}});
    child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(request));
  });
  if(result.pdfBase64){
    const parser=new PDFParse({data:Buffer.from(result.pdfBase64,'base64')});
    try{
      const info=await parser.getInfo();const extracted=await parser.getText();
      if(!extracted.text.trim())throw new Error('The compiled PDF has no extractable text.');
      result.pages=info.total;
      if(request.action==='compile_resume'&&result.pages!==1)throw new Error('The original maker did not produce exactly one page.');
    }finally{await parser.destroy();}
  }
  return result;
}
