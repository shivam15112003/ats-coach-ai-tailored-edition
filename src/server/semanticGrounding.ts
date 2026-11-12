import {parseResumeToStructure,ResumeSectionData} from "../utils/resumeLatex";
export interface ResumeClaim { id: number; section: string; context: string; text: string; }
export function resumeClaims(text: string): ResumeClaim[] {
  return resumeClaimsFromStructure(parseResumeToStructure(text));
}
export function resumeClaimsFromStructure(d:ResumeSectionData):ResumeClaim[]{
  const items: Omit<ResumeClaim,"id">[]=[];
  const add=(section:string,context:string,text:string)=>{if(text.trim())items.push({section,context,text});};
  add("summary","",d.summary);
  for(const e of d.education)add("education","",[e.school,e.degree,e.dates,e.location,e.gpa,e.coursework].filter(Boolean).join(" | "));
  for(const e of d.experience){const context=[e.role,e.company,e.dates,e.location].filter(Boolean).join(" | ");add("experience header","",context);for(const b of e.bullets)add("experience",context,b);}
  for(const p of d.projects){const context=[p.name,p.techStack,p.dates].filter(Boolean).join(" | ");add("project header","",context);for(const b of p.bullets)add("project",context,b);}
  for(const s of d.skills)add("skills",s.category,s.items);
  for(const c of d.certifications)add("certification","",c);
  for(const a of d.extracurricular)add("activity","",a);
  for(const section of d.additionalSections||[])for(const item of section.items)add(section.title,"",item);
  return items.map((item,id)=>({...item,id}));
}
export function semanticReviewIssue(original:string,claims:ResumeClaim[],review:unknown):string|null{
  const normalize=(v:string)=>v.normalize("NFKC").toLowerCase().replace(/[\u2013\u2014]/g,"-").replace(/\s+/g," ").trim();
  const checks=(review as any)?.checks;
  if(!claims.length||!Array.isArray(checks)||checks.length!==claims.length)return "Not every resume claim received a factual meaning check.";
  const seen=new Set<number>();
  for(const check of checks){
    if(!Number.isInteger(check.id)||!claims.some(c=>c.id===check.id)||seen.has(check.id))return "The meaning check contains missing or duplicate claim references.";
    seen.add(check.id);
    if(check.supported!==true)return "A rewrite changes or adds facts: "+String(check.reason||claims.find(c=>c.id===check.id)?.text);
    const claim=claims.find(c=>c.id===check.id)!;
    const numbers=(text:string)=>(text.match(/\d+(?:[,.]\d+)*/g)||[]).map(n=>n.replace(/,/g,""));
    const evidence=(Array.isArray(check.source_quotes)?check.source_quotes:[]).filter((q:unknown)=>typeof q==="string").join(" ");
    const directions=(text:string)=>[...text.matchAll(/\b(to|by)\s+(\d+(?:\.\d+)?)\s*(?:%|percent)/gi)].map(m=>({direction:m[1].toLowerCase(),number:m[2]}));
    for(const target of directions(claim.text)){
      const matching=directions(evidence).filter(m=>m.number===target.number);
      if(matching.length&&!matching.some(m=>m.direction===target.direction))return "The percentage meaning changed between an increase to a value and an increase by a value.";
    }
    if(numbers(claim.text).some(n=>!numbers(evidence).includes(n)))return "A number, percentage, date, or quantity changed from its original evidence.";
    if(!Array.isArray(check.source_quotes)||!check.source_quotes.length||check.source_quotes.some((q:unknown)=>typeof q!=="string"||!q.trim()||!normalize(original).includes(normalize(q))))return "A meaning check does not reference actual original resume evidence.";
  }
  return null;
}
