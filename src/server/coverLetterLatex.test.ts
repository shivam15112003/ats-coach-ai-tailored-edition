import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildCoverLetterLatex} from '../utils/coverLetterLatex';
import {compileLatex,resolveLatexCompiler} from './latexResume';

test('cover letter source preserves edited text and escapes LaTeX special characters',async()=>{
 const source=buildCoverLetterLatex('Dear Hiring Manager,\n\nBuilt C++ tools & improved results by 82%.\n\nSincerely,\nCasey Lee','Casey Lee\ncasey@example.com\nSUMMARY\nEngineer.');
 assert.match(source,/82\\%/);assert.match(source,/tools \\&/);
 assert.doesNotMatch(source,/automatic one-page layout/);
 if(!resolveLatexCompiler())return;
 const result=await compileLatex(source);
 assert.equal(result.success,true,result.logExcerpt);
 assert.equal(result.pages,1);
 const edited=source.replace('82\\%','85\\%');
 const revised=await compileLatex(edited);
 assert.equal(revised.success,true,revised.logExcerpt);
 assert.ok(revised.latexSource!.includes('85\\%'));
});
