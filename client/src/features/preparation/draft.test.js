import test from 'node:test';
import assert from 'node:assert/strict';
import {newDraft,updateDraft} from './draft.js';
test('starting a new draft removes all old application and document references',()=>{
 const old={...newDraft(),applicationId:'old-app',selectedResumeId:'old-source',resumeDocumentId:'old-resume',coverDocumentId:'old-letter',comparison:{matches:['old match']}};
 const next=updateDraft(old,newDraft());
 for(const key of ['applicationId','selectedResumeId','resumeDocumentId','coverDocumentId','comparison'])assert.equal(next[key],null);
 assert.equal(old.applicationId,'old-app');
});
test('job/resume edits invalidate comparison and exported files without deleting the tracked application',()=>{
 const old={...newDraft(),applicationId:'app',resumeDocumentId:'file',comparison:{matches:['stale']}};
 const next=updateDraft(old,{job:{...old.job,role:'New role'}});
 assert.equal(next.comparison,null);assert.equal(next.resumeDocumentId,null);assert.equal(next.applicationId,'app');
 const exportResult=updateDraft(next,{resumeDocumentId:'new-file'});assert.equal(exportResult.resumeDocumentId,'new-file');
});
