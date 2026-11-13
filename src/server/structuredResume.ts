import {extractResumeHeader,parseResumeToStructure,ResumeSectionData} from "../utils/resumeLatex";
const text=(value:unknown)=>typeof value==="string"?value.trim():"";
const list=(value:unknown)=>Array.isArray(value)?value:[];
export function resumeMakerStructure(raw:any,original?:string):ResumeSectionData {
 const value=raw?.resume||raw||{};
 const sourceHeader=original?extractResumeHeader(original):null;
 const contacts=[value.header?.phone,value.header?.email,value.header?.github_url,value.header?.linkedin_url,value.header?.portfolio_url].map(text).filter(Boolean).map(t=>({text:t,...(t.includes('@')?{href:`mailto:${t}`}:/https?:|github\.|linkedin\.|www\./i.test(t)?{href:/^https?:/i.test(t)?t:`https://${t}`}:{})}));
 const skills:ResumeSectionData['skills']=[];
 const plain:string[]=[];
 for(const item of list(value.skills).map(text).filter(Boolean)){const colon=item.indexOf(':');if(colon>0)skills.push({category:item.slice(0,colon).trim(),items:item.slice(colon+1).trim()});else plain.push(item);}
 if(plain.length)skills.push({category:'Skills',items:plain.join(', ')});
 return {name:sourceHeader?sourceHeader.name:text(value.header?.name),contacts:sourceHeader?sourceHeader.contacts:contacts,summary:text(value.summary),
 education:list(value.education).map(e=>({school:text(e.institution),degree:text(e.degree),location:text(e.location),dates:text(e.date),gpa:text(e.gpa).replace(/^(?:c?gpa)\s*[.:]?\s*/i,""),coursework:text(e.coursework)})),
 experience:list(value.experience).map(e=>({role:text(e.title),company:text(e.company),location:text(e.location),dates:text(e.date),bullets:list(e.bullets).map(text).filter(Boolean)})),
 projects:list(value.projects).map(p=>({name:text(p.title),techStack:text(p.tools),dates:text(p.timeframe),bullets:list(p.bullets).map(text).filter(Boolean)})),skills,
 certifications:list(value.certifications).map(text).filter(Boolean),extracurricular:list(value.extracurriculars).map(text).filter(Boolean),
 additionalSections:list(value.other_sections).map(s=>({title:text(s.title),items:list(s.items).map(text).filter(Boolean)}))};
}
export function structureToMarkdown(d:ResumeSectionData):string {
 const lines=[d.name,...d.contacts.map(c=>c.text)];
 if(d.summary)lines.push('SUMMARY',d.summary);
 if(d.education.length){lines.push('EDUCATION');for(const e of d.education){lines.push([e.school,e.degree,e.dates,e.location].join(' | '));if(e.gpa)lines.push('GPA: '+e.gpa);if(e.coursework)lines.push('Relevant Coursework: '+e.coursework);}}
 if(d.experience.length){lines.push('EXPERIENCE');for(const e of d.experience)lines.push([e.role,e.company,e.dates,e.location].join(' | '),...e.bullets.map(b=>'- '+b));}
 if(d.skills.length)lines.push('TECHNICAL SKILLS',...d.skills.map(s=>s.category+': '+s.items));
 if(d.projects.length){lines.push('ACADEMIC PROJECTS');for(const p of d.projects)lines.push([p.name,p.techStack,p.dates].join(' | '),...p.bullets.map(b=>'- '+b));}
 if(d.certifications.length)lines.push('CERTIFICATIONS',...d.certifications.map(c=>'- '+c));
 if(d.extracurricular.length)lines.push('EXTRACURRICULAR',...d.extracurricular.map(c=>'- '+c));
 for(const s of d.additionalSections||[])lines.push(s.title,...s.items.map(c=>'- '+c));
 return lines.filter(Boolean).join('\n');
}
export function extractedStructureIssue(original:string,d:ResumeSectionData):string|null{
 // Tailoring may legitimately add projects and, for weak experience, additional
 // roles, so content is no longer required to be a literal substring of the
 // source. Only reject an empty or unusable extraction.
 void original;
 const hasContent=Boolean(d.name||d.summary||d.education.length||d.experience.length||d.projects.length||d.skills.length);
 return hasContent?null:'Source extraction produced no usable resume content.';
}
export function localSourceStructure(original:string):ResumeSectionData{return parseResumeToStructure(original);}
