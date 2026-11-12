/** Retract added credential/scope qualifiers without rejecting normal rephrasing. */
export function sourceScopedText(value:string,original:string):string{
  const source=original.normalize('NFKC');
  const attributes:Array<[RegExp,RegExp]>=[
    [/\bregistered\s+/gi,/\bregistered\b|\bRN\b/i],
    [/\bboard[- ]certified\s+/gi,/\bboard[- ]certified\b/i],
    [/\blicensed\s+/gi,/\blicensed\b|\blicen[cs]e\b|\blicensure\b/i],
    [/\bchartered\s+/gi,/\bchartered\b/i],
    [/\bmultidisciplinary\s+/gi,/\b(?:multi[- ]?disciplinary|interdisciplinary|multi[- ]specialty)\b/i],
    [/\bcross[- ]functional\s+/gi,/\bcross[- ]functional\b/i],
    [/\bhigh[- ]quality\s+/gi,/\bhigh[- ]quality\b/i],
    [/\bcomprehensive\s+/gi,/\b(?:comprehensive|complete|full)\b/i],
  ];
  let result=value;
  for(const [added,evidence]of attributes)if(!evidence.test(source))result=result.replace(added,'');
  return result.replace(/\s{2,}/g,' ').trim();
}

export function sourceScopedResume(resume:any,original:string):any{
  return {...resume,summary:sourceScopedText(String(resume.summary||''),original),
    experience:(resume.experience||[]).map((entry:any)=>({...entry,title:sourceScopedText(String(entry.title||''),original),bullets:(entry.bullets||[]).map((b:string)=>sourceScopedText(b,original))})),
    projects:(resume.projects||[]).map((entry:any)=>({...entry,bullets:(entry.bullets||[]).map((b:string)=>sourceScopedText(b,original))}))};
}

export function normalizeMakerClosing(letter:any):any{
  const closing=String(letter.closing||'').trim();
  if(closing.length>60||closing.split(/\s+/).length>7){
    return {...letter,body_paragraphs:[...(letter.body_paragraphs||[]),closing],closing:'Sincerely'};
  }
  return {...letter,closing:closing||'Sincerely'};
}

export function sourceScopedRecipient(letter:any,job:string):any{
  const result={...letter};
  const normalize=(text:string)=>text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const evidence=normalize(job);
  for(const field of ['company_line_2','company_location']){
    const value=String(result[field]||'').trim();
    if(!value||/not (?:provided|available|specified)|unknown|n\/a|\[.*\]/i.test(value)||!evidence.includes(normalize(value)))result[field]='';
  }
  return result;
}
