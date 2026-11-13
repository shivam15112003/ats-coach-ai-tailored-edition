import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {resumeMakerStructure,structureToMarkdown,extractedStructureIssue} from "./structuredResume";
import {formatMakerEducation,formatMakerExperience,formatMakerProjects,buildLatexFromStructure,RESUME_TEX_TEMPLATE,buildSourcePreservingLatex} from "../utils/resumeLatex";
import {RESUME_MAKER_PROMPT} from "./resumeMakerPrompt";
import {MAKER_SPACING,makerBlockGaps,makerContentProfiles} from './resumePageFit';
const clinical={header:{name:"Casey Lee",email:"casey@example.com"},summary:"Registered nurse working in patient care and clinical documentation.",education:[{degree:"Bachelor of Science in Nursing",institution:"Sample Health University",location:"Sample City",date:"2024",gpa:"",coursework:""}],experience:[{title:"Registered Nurse",company:"Sample Hospital",location:"Sample City",date:"2024 - Present",bullets:["Documented patient assessments and coordinated care with the clinical team."]}],projects:[],skills:["Clinical Skills: Patient assessment, Clinical documentation"],certifications:["Registered Nurse"],extracurriculars:[],other_sections:[{title:"LANGUAGES",items:["English"]}]};
const engineering={header:{name:"Alex Morgan"},education:[{degree:"MS Engineering",institution:"Sample University",location:"Sample City",date:"2026",gpa:"3.8/4",coursework:"Control Systems"}],experience:[{title:"Engineer",company:"Sample Lab",location:"Sample City",date:"2025",bullets:["Built a model that increased the score to 82%."]}],projects:[{title:"Navigation",tools:"Python, ROS 2",bullets:["Tested navigation with recorded measurements."]}],skills:["Programming Languages: Python"],certifications:[],extracurriculars:[],other_sections:[]};

test('ports every spacing step from the Python one-page compiler, including block gaps',()=>{
 const reference=fs.readFileSync(path.resolve('python/resume_and_cover_maker.py'),'utf8')
   .split('def compile_resume_one_page(')[1].split('last_pages = None')[0];
 const expected=[...reference.matchAll(/\(9, ([0-9.]+), ([0-9.]+)\)/g)].map(m=>[Number(m[1]),Number(m[2])]);
 assert.deepEqual(MAKER_SPACING,expected);
 assert.equal(makerBlockGaps('\\vspace{0.12em} \\vspace{-0.45em}',.03),'\\vspace{0.03em} \\vspace{-0.45em}');
});

test('one-page content profiles compact skills before reducing bullets and keep entry identities',()=>{
 const d=resumeMakerStructure(engineering);
 d.skills=[{category:'Programming',items:Array.from({length:30},(_,i)=>'Skill '+i).join(', ')}];
 d.projects[0].bullets=['first fact','second fact','third fact','fourth fact'];
 const before=JSON.stringify(d),profiles=makerContentProfiles(d);
 assert.equal(profiles.length,13);
 assert.equal(profiles[0].minLineSpread,.95);
 assert.equal(profiles[9].minLineSpread,0);
 assert.ok(profiles[0].source.includes('Skill 23'));
 assert.ok(!profiles[0].source.includes('Skill 24'));
 assert.ok(profiles[0].source.includes('third fact'));
 assert.ok(!profiles[10].source.includes('third fact'));
 for(const p of profiles){assert.ok(p.source.includes('Navigation'));assert.ok(p.source.includes('Sample Lab'));assert.ok(p.source.includes('Sample University'));}
 assert.equal(JSON.stringify(d),before);
});
test("uses the Python resume maker's actual education, experience, and project LaTeX",()=>{
 const reference=path.resolve('python/resume_and_cover_maker.py');
 assert.ok(fs.existsSync(reference));
 const normalize=(s:string)=>s.replace(/\s+/g,'');
 for(const value of [clinical,engineering]){
  const expected=JSON.parse(execFileSync('python',['src/server/reference_format_fixture.py',reference],{input:JSON.stringify(value),encoding:'utf8'}));
  assert.equal(RESUME_TEX_TEMPLATE,expected.resume_template);
  const d=resumeMakerStructure(value);
  assert.equal(normalize(formatMakerEducation(d.education)),normalize(expected.format_education));
  assert.equal(normalize(formatMakerExperience(d.experience)),normalize(expected.format_experience));
  assert.equal(normalize(formatMakerProjects(d.projects)),normalize(expected.format_projects));
 }
});
test("supports non-technology resumes without fixed applicant data or invented projects",()=>{
 const d=resumeMakerStructure(clinical);const latex=buildLatexFromStructure(d);
 assert.match(latex,/Registered Nurse/);assert.match(latex,/Sample Hospital/);
 assert.doesNotMatch(latex,/Shivam|Amity|Python|ACADEMIC PROJECTS\}/i);
 assert.equal(d.projects.length,0);assert.equal(d.education[0].gpa,'');
 assert.ok(latex.includes('\\resSection{LANGUAGES}'));
});
test("source-preserved mode uses the same formatted entries and bullet lists",()=>{
 const d=resumeMakerStructure(engineering);
 const result=buildSourcePreservingLatex(structureToMarkdown(d),d);
 assert.ok(result.includes('\\begin{tabular*}'));
 assert.ok(result.includes('\\begin{itemize}'));
 assert.equal(result,buildLatexFromStructure(d));
});
test("generic prompt removes personal overrides and allows tailored projects",()=>{
 assert.doesNotMatch(RESUME_MAKER_PROMPT,/shiva|amity|3\.89|95\+/i);
 assert.match(RESUME_MAKER_PROMPT,/MAY BE INVENTED FREELY/);
 assert.match(RESUME_MAKER_PROMPT,/Never invent, guess, or complete a missing link/);
 const d=resumeMakerStructure(engineering);
 assert.equal(extractedStructureIssue(structureToMarkdown(d),d),null);
 const empty=resumeMakerStructure({header:{name:""}});
 assert.notEqual(extractedStructureIssue('No engineering background provided.',empty),null);
});
