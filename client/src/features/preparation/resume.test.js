import test from 'node:test';
import assert from 'node:assert/strict';
import {resumeContent,restoreResume,originalPdf} from './resume.js';
import {emptyProfile} from '../../lib/api.js';

test('PDF text remains separate from profile fields and original is reused only when unchanged',()=>{
 const text='Taylor Test\nExperience\nBuilt software.';
 const document={id:'original',content:text,hasFile:true,originalName:'Resume.PDF'};
 assert.equal(resumeContent(text),text);
 assert.equal(originalPdf(text,document),true);
 assert.equal(originalPdf(text+' Edited',document),false);
 assert.equal(originalPdf(text,{...document,hasFile:false}),false);
 assert.equal(resumeContent({name:'Taylor'}).name,'Taylor');
});
test('legacy upload drafts recover the original text without discarding deliberate structured edits',()=>{
 const text='Old extracted resume';
 const documents=[{id:'original',content:text}];
 const legacy={selectedResumeId:'original',resume:{...emptyProfile(),summary:text}};
 assert.equal(restoreResume(legacy,documents),text);
 const edited={...legacy,resume:{...legacy.resume,name:'Taylor'}};
 assert.equal(restoreResume(edited,documents).name,'Taylor');
});
