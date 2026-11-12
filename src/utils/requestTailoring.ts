import type {TailoringResult} from "../types";
export async function requestTailoring(body:Record<string,unknown>,headers:Record<string,string>,signal:AbortSignal,onRetry:(reason:string)=>void,fetcher:typeof fetch=fetch):Promise<TailoringResult>{
  let previousFailure="";
  for(let attempt=0;attempt<3;attempt++){
    signal.throwIfAborted();
    const response=await fetcher("/api/tailor-resume",{method:"POST",headers,signal,body:JSON.stringify({...body,attempt:attempt+1,strictRetry:attempt>0,finalAttempt:attempt===2,previousFailure})});
    const payload=await response.json();
    if(response.ok)return payload as TailoringResult;
    const reason=typeof payload?.error==="string"?payload.error:"The draft could not be verified.";
    if(attempt<2&&payload?.retryable===true){previousFailure=reason;onRetry(reason);continue;}
    throw new Error(reason);
  }
  throw new Error("The retry did not return a resume.");
}
