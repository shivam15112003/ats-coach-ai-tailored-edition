import {extractResumeHeader} from "../utils/resumeLatex";
import { LAYOUT_SAMPLE } from "./fixtures/resumeLayout";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileLatex, resolveLatexCompiler, buildLatexFromStructure, parseResumeToStructure, escapeLatex, removeEmptyLatexLists, applyResumeLayout, preserveOriginalHeader, restoreOriginalLatexHeader } from './latexResume';

const available = Boolean(resolveLatexCompiler());
test('escapes literal backslashes and braces without escaping generated commands', () => {
  assert.equal(escapeLatex('C:\\tools {AI} & 50%'), 'C:\\textbackslash{}tools \\{AI\\} \\& 50\\%');
});
test('rejects empty source', async () => assert.equal((await compileLatex('')).success, false));
test('compiles saved template with special characters and absent optional sections', { skip: !available }, async () => {
  const source = buildLatexFromStructure(parseResumeToStructure('Sample Candidate\nSUMMARY\nRobotics & AI: 50% improvement; C:\\tools.'));
  const result = await compileLatex(source);
  assert.equal(result.success, true, result.logExcerpt);
  assert.equal(Buffer.from(result.pdfBase64!, 'base64').subarray(0, 5).toString(), '%PDF-');
  assert.equal(result.pages, 1);
});
test('reports invalid source honestly instead of a missing-compiler message', { skip: !available }, async () => {
  const result = await compileLatex('\\documentclass{article}\\begin{document}\\unknownResumeCommand\\end{document}');
  assert.equal(result.success, false);
  assert.match(result.logExcerpt!, /Undefined control sequence/);
});

test('does not misreport horizontal overflow on a one-page PDF as needing another page', {skip:!available},async()=>{
  const source=buildLatexFromStructure(parseResumeToStructure('Casey Lee\nSUMMARY\nEngineering graduate.'))
    .replace('\\end{document}','\\noindent\\hbox{'+('W'.repeat(180))+'}\\end{document}');
  const result=await compileLatex(source,{fitToPage:true});
  assert.equal(result.success,true,result.logExcerpt);
  assert.equal(result.pages,1);
  assert.equal(result.warning,undefined);
});

test('compiles plain-text portfolio contacts and repairs previously cached spacing commands', { skip: !available }, async () => {
  const data=parseResumeToStructure('Casey Lee\nSUMMARY\nEngineering graduate working with Python.');
  data.contacts=[{text:'casey@example.com',href:'mailto:casey@example.com'},{text:'sample-portfolio'}];
  const source=buildLatexFromStructure(data);
  assert.match(source,/\\enspace\{\}sample-portfolio/);
  for(const candidate of [source,source.replaceAll('\\enspace{}','\\enspace')]){
    const result=await compileLatex(candidate);
    assert.equal(result.success,true,result.logExcerpt);
    assert.ok(result.pdfBase64);
  }
});
test('finds the installed Windows compiler without PATH', { skip: process.platform !== 'win32' || !available }, async () => {
  const previous = process.env.PATH;
  try {
    process.env.PATH = '';
    assert.ok(resolveLatexCompiler());
    const result = await compileLatex('\\documentclass{article}\\begin{document}Compiler PATH regression test.\\end{document}');
    assert.equal(result.success, true, result.logExcerpt);
  } finally { process.env.PATH = previous; }
});


test('compiles legacy source containing empty lists and an empty skills item', { skip: !available }, async () => {
  const source = buildLatexFromStructure(parseResumeToStructure('Sample Candidate\nSUMMARY\nRobotics engineer.'));
  const legacy = source.replace('\\end{document}', String.raw`
\resumeSubHeadingListStart
\resumeSubHeadingListEnd
\resumeItemListStart
\resumeItemListEnd
\begin{itemize}[leftmargin=0.15in, label={}]
  \small{\item{
  }}
\end{itemize}
\begin{itemize}
\end{itemize}
\end{document}`);
  const result = await compileLatex(legacy);
  assert.equal(result.success, true, result.logExcerpt);
  assert.match(removeEmptyLatexLists(legacy), /Robotics engineer/);
});

test('compiles experience and projects without bullet points', { skip: !available }, async () => {
  const source = buildLatexFromStructure(parseResumeToStructure('Sample Candidate\nEXPERIENCE\nEngineer | Sample Lab | 2026\nPROJECTS\nNavigation | Python | 2026'));
  assert.equal(source.includes('\\resumeItemListStart\n'), false);
  const result = await compileLatex(source);
  assert.equal(result.success, true, result.logExcerpt);
});


test('omits missing fields and empty sections instead of adding defaults', () => {
  const source = buildLatexFromStructure(parseResumeToStructure('SUMMARY\nEngineering graduate.'));
  assert.doesNotMatch(source, /Candidate Name|Degree \/ Coursework|Specialist|\\resSection\{EDUCATION\}|\\resSection\{ACADEMIC PROJECTS\}/);
  assert.doesNotMatch(source, /GPA:/);
});

test('parses supported GPA and coursework without inventing education entries', () => {
  const data = parseResumeToStructure('Sample Candidate\nEDUCATION\nSample University | MS Robotics | 2026 |\nGPA: 3.9/4\nRelevant Coursework: Robot Dynamics');
  assert.equal(data.education.length, 1);
  assert.equal(data.education[0].gpa, '3.9/4');
  const source = buildLatexFromStructure(data);
  assert.match(source, /GPA: 3.9\/4/);
  assert.match(source, /Robot Dynamics/);
});

test('removes markdown formatting from rendered project and education fields', () => {
  const data = parseResumeToStructure('**Sample Candidate**\nEDUCATION\n**Sample University** | **MS Robotics** | 2026 |\nPROJECTS\n**Navigation** | *Python, ROS 2* |\n- Tested simulated navigation.');
  assert.equal(data.name, 'Sample Candidate');
  assert.equal(data.education[0].degree, 'MS Robotics');
  assert.equal(data.projects[0].name, 'Navigation');
  assert.equal(data.projects[0].techStack, 'Python, ROS 2');
});


test('uses the resume maker uniform font commands with actual LaTeX command names', () => {
  const source = applyResumeLayout('\\linespread{0.97}\n\\begin{document}Body\\end{document}',1.18,1);
  assert.ok(source.includes('\\renewcommand{\\small}{\\fontsize{10.000}{12.000}\\selectfont}'));
  assert.ok(source.includes('\\linespread{1.18}'));
  assert.equal(source.includes('${name}'),false);
  assert.equal(applyResumeLayout(source,1.05,1).match(/% BEGIN UNIFORM RESUME FONTS/g)?.length,1);
});


test('fits the imported template to one page without deleting project facts', { skip: !available }, async () => {
  const result = await compileLatex(buildLatexFromStructure(LAYOUT_SAMPLE), {fitToPage:true});
  assert.equal(result.success,true,result.error);
  assert.equal(result.pages,1);
  assert.match(result.latexSource!, /\\fontsize\{10\./);
  for (const project of LAYOUT_SAMPLE.projects)
    for (const bullet of project.bullets) assert.ok(result.latexSource!.includes(escapeLatex(bullet)));
});


const originalHeaderResume = 'RESUME\nSAMPLE CANDIDATE\nsample@example.com | github.com/sample\nSUMMARY\nRobotics engineer.\nEDUCATION\nSample University | MS Robotics | 2026 |';
test('restores an omitted or rewritten generated name and contacts from the original', () => {
  for (const generated of ['SUMMARY\nRobotics engineer.', 'OTHER NAME\nwrong@example.com\nSUMMARY\nRobotics engineer.']) {
    const restored=preserveOriginalHeader(originalHeaderResume,generated);
    assert.match(restored,/^SAMPLE CANDIDATE\nsample@example.com\ngithub.com\/sample/);
    assert.doesNotMatch(restored,/OTHER NAME|wrong@example/);
  }
});
test('does not invent a name or contacts when the source has no header', () => {
  const restored=preserveOriginalHeader('SUMMARY\nRobotics engineer.','OTHER NAME\nSUMMARY\nRobotics engineer.');
  assert.equal(restored,'SUMMARY\nRobotics engineer.');
});
test('repairs cached headerless LaTeX and remains stable when checked again', () => {
  const source=buildLatexFromStructure(parseResumeToStructure('SUMMARY\nRobotics engineer.'));
  const repaired=restoreOriginalLatexHeader(source,originalHeaderResume);
  assert.match(repaired,/\\textbf\{\\large SAMPLE CANDIDATE\}/);
  assert.match(repaired,/sample@example.com/);
  assert.equal(restoreOriginalLatexHeader(repaired,originalHeaderResume),repaired);
});


const flattenedSource = 'SAMPLE CANDIDATE +1 (480) 555-0100 | sample@example.com | github.com/sample123 linkedin.com/in/sample123 sample123.github.io/portfolio SUMMARY Robotics engineer working with sensors. EDUCATION Sample University | MS Robotics | 2026 | Sample City EXPERIENCE Engineer | Sample Lab | 2025 | TECHNICAL SKILLS AND CERTIFICATIONS Languages: Python ACADEMIC PROJECTS Navigation | Python |';
test('extracts only identity from flattened PDF text before the summary', () => {
  const header=extractResumeHeader(flattenedSource);
  assert.equal(header.name,'SAMPLE CANDIDATE');
  assert.deepEqual(header.contacts.map(c=>c.text), ['+1 (480) 555-0100','sample@example.com','github.com/sample123','linkedin.com/in/sample123','sample123.github.io/portfolio']);
  assert.equal(header.contacts.some(c=>/SUMMARY|EDUCATION|Robotics engineer/.test(c.text)),false);
  assert.equal(parseResumeToStructure(flattenedSource).name,'SAMPLE CANDIDATE');
});
test('repairs cached LaTeX from a flattened source without inserting body text into the header', () => {
  const old=buildLatexFromStructure(parseResumeToStructure('SUMMARY\nRobotics engineer.'));
  const repaired=restoreOriginalLatexHeader(old,flattenedSource);
  const header=repaired.match(/\\begin\{center\}[\s\S]*?\\end\{center\}/)![0];
  assert.match(header,/SAMPLE CANDIDATE/);
  assert.match(header,/sample@example.com/);
  assert.doesNotMatch(header,/EDUCATION|MS Robotics|Languages|Navigation/);
});


test('keeps the name-to-contact gap compact and renders summaries in two or three lines', {skip:!available}, async()=>{
  for(const summary of ['Robotics engineer.','Robotics engineer and graduate student working with Python and robotic systems. Develops sensor analysis tools and simulation workflows grounded in laboratory engineering experience. Documents repeatable testing methods and communicates results to research teams.']){
    const source=buildLatexFromStructure({...LAYOUT_SAMPLE,summary,experience:[],projects:[],education:[],skills:[]});
    assert.match(source,/\\large SAMPLE CANDIDATE\}\\\\\[0pt\]/);
    const result=await compileLatex(source);
    assert.equal(result.success,true,result.logExcerpt);
    assert.ok(result.summaryLines!>=2&&result.summaryLines!<=3,`Actual summary lines: ${result.summaryLines}`);
  }
});
