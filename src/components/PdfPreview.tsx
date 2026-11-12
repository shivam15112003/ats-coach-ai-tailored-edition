import {useEffect,useRef,useState} from 'react';
import {getDocument} from 'pdfjs-dist';
import {WorkerMessageHandler} from 'pdfjs-dist/build/pdf.worker.min.mjs';

// Use PDF.js's in-process worker adapter: AI Studio can restrict Worker URLs
// inside its preview frame. No remote scripts, blob fonts or PDF plug-in needed.
(globalThis as typeof globalThis & {pdfjsWorker:unknown}).pdfjsWorker={WorkerMessageHandler};

/** Canvas rendering also works inside AI Studio's sandboxed app frame. */
export function PdfPreview({base64,title,className=''}:{base64:string;title:string;className?:string}){
  const host=useRef<HTMLDivElement>(null),pages=useRef<HTMLDivElement>(null);
  const [width,setWidth]=useState(600),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!host.current)return;
    const observer=new ResizeObserver(entries=>setWidth(Math.max(200,Math.floor(entries[0].contentRect.width))));
    observer.observe(host.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    let cancelled=false;setError('');setLoading(true);
    const task=getDocument({data:Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),disableFontFace:true,useWasm:false});
    const target=pages.current!;target.replaceChildren();
    (async()=>{
      try{
        const pdf=await task.promise;
        for(let number=1;number<=pdf.numPages&&!cancelled;number++){
          const page=await pdf.getPage(number);if(cancelled)return;
          const viewport=page.getViewport({scale:(width-16)/page.getViewport({scale:1}).width});
          const ratio=Math.min(window.devicePixelRatio||1,2),canvas=document.createElement('canvas');
          canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);
          canvas.style.width='100%';canvas.style.height='auto';canvas.style.background='white';
          canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${title}, page ${number} of ${pdf.numPages}`);
          target.appendChild(canvas);
          await page.render({canvas,viewport,intent:'print',transform:ratio===1?undefined:[ratio,0,0,ratio,0,0]}).promise;
        }
        if(!cancelled)setLoading(false);
      }catch(e){if(!cancelled){setLoading(false);setError(e instanceof Error?e.message:'Could not display the PDF.');}}
    })();
    return()=>{cancelled=true;void task.destroy();};
  },[base64,width,title]);
  return <div ref={host} role="region" aria-label={title} className={'overflow-auto bg-[#eee] p-2 '+className}>
    {loading&&<p role="status" className="text-xs p-2">Rendering PDF…</p>}
    {error&&<p role="alert" className="text-sm p-3 text-red-800">{error}</p>}
    <div ref={pages} className="space-y-3"/>
  </div>;
}
