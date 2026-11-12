import {buildLatexFromStructure, type ResumeSectionData} from '../utils/resumeLatex';

// Ported from compile_resume_one_page in resume_and_cover_maker.py.
export const MAKER_SPACING = [
  [1.32,.36],[1.27,.32],[1.22,.30],[1.18,.26],[1.14,.22],[1.11,.20],
  [1.08,.18],[1.05,.16],[1.03,.14],[1,.12],[.97,.12],[.95,.10],
  [.93,.08],[.92,.06],[.90,.05],[.88,.04],[.86,.03],
] as const;

export function makerBlockGaps(source:string,gap:number):string{
  return source.replace(/\\vspace\{[0-9.]+em\}/g,()=>`\\vspace{${gap.toFixed(2)}em}`);
}

function compactSkills(data:ResumeSectionData,hardCap:number,softCap:number){
  const unique=(values:string[])=>[...new Map(values.map(v=>[v.toLowerCase(),v])).values()];
  const tokens=(soft:boolean)=>unique(data.skills.filter(s=>/soft|interpersonal/i.test(s.category)===soft)
    .flatMap(s=>s.items.split(/[,;]/).map(v=>v.trim()).filter(Boolean)));
  return [{category:'Technical Skills',items:tokens(false).slice(0,hardCap).join(', ')},
    {category:'Soft Skills',items:tokens(true).sort().slice(0,softCap).join(', ')}].filter(s=>s.items);
}

// The maker reduces skills/optional sections before dropping bullet counts.
// Keep all education, job and project identities, as in the Python profiles.
export function makerContentProfiles(data:ResumeSectionData):Array<{source:string;minLineSpread:number}>{
  const profiles = [
    [3,4,24,5,1,1],[3,4,20,5,1,1],[3,4,18,4,1,1],
    [3,4,14,3,1,1],[3,4,12,3,1,1],[3,4,10,2,1,1],
    [3,4,8,2,1,1],[3,4,8,2,1,0],[3,4,8,2,0,0],
    [3,3,8,2,1,0],[2,3,8,2,1,0],[2,2,6,2,1,0],[2,2,6,2,0,0],
  ];
  return profiles.map(([pb,eb,skills,soft,cert,extra])=>({minLineSpread:pb===3&&eb===4?.95:0,source:buildLatexFromStructure({
    ...data,
    projects:data.projects.map(p=>({...p,bullets:p.bullets.slice(0,pb)})),
    experience:data.experience.map(e=>({...e,bullets:e.bullets.slice(0,eb)})),
    skills:compactSkills(data,skills,soft),
    certifications:cert?data.certifications:[],extracurricular:extra?data.extracurricular:[],
  })}));
}
