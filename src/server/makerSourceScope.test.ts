import {test}from'node:test';import assert from'node:assert/strict';
import{sourceScopedText,sourceScopedResume,normalizeMakerClosing,sourceScopedRecipient}from'./makerSourceScope';
test('removes invented registration and team composition without rejecting a resume',()=>{
 const source='Nurse. Coordinated patient care with the clinical team for 20 patients weekly.';
 const draft={summary:'Registered Nurse with clinical experience.',experience:[{title:'Nurse',bullets:['Coordinated high-quality care with the multidisciplinary clinical team for 20 patients weekly.']}]};
 const r=sourceScopedResume(draft,source);
 assert.equal(r.summary,'Nurse with clinical experience.');
 assert.equal(r.experience[0].bullets[0],'Coordinated care with the clinical team for 20 patients weekly.');
 assert.equal(draft.summary,'Registered Nurse with clinical experience.');
});
test('omits missing recipient details and keeps explicit job addresses',()=>{
 assert.equal(sourceScopedRecipient({company_line_2:'Human Resources Department',company_location:'Not Provided'},'Nurse at Sample Hospital').company_line_2,'');
 assert.equal(sourceScopedRecipient({company_location:'Not Provided'},'Nurse at Sample Hospital').company_location,'');
 assert.equal(sourceScopedRecipient({company_location:'Phoenix, AZ'},'Location: Phoenix, AZ').company_location,'Phoenix, AZ');
});
test('retains supported qualifiers and equivalent ordinary wording',()=>{
 assert.equal(sourceScopedText('Registered Nurse with multidisciplinary teamwork.','RN, worked with a multi-specialty team.'),'Registered Nurse with multidisciplinary teamwork.');
 const draft='Architected a model that increased the score to 82 percent.';
 assert.equal(sourceScopedText(draft,'Built a model that increased the score to 82%.'),draft);
});
test('keeps a misplaced closing paragraph as body content and supplies a short sign-off',()=>{
 const closing='Thank you for your time and consideration. I welcome the opportunity to discuss my background.';
 const r=normalizeMakerClosing({body_paragraphs:['Original paragraph.'],closing});
 assert.equal(r.closing,'Sincerely');assert.deepEqual(r.body_paragraphs,['Original paragraph.',closing]);
 assert.equal(normalizeMakerClosing({closing:'Kind regards,'}).closing,'Kind regards,');
});
