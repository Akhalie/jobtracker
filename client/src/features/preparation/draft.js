import {emptyProfile} from '../../lib/api.js';
export function newDraft(){return {step:0,job:{company:'',role:'',description:'',url:'',location:'',salary:''},resume:emptyProfile(),coverLetter:'',comparison:null,selectedResumeId:null,applicationId:null,resumeDocumentId:null,coverDocumentId:null,skipCoverLetter:false,template:'classic',paper:'A4',fontSize:11,margin:16};}
export function updateDraft(current,patch){
 const next={...current,...patch};
 if(('job' in patch||'resume' in patch)&&!('comparison' in patch))next.comparison=null;
 if(['job','resume','coverLetter','skipCoverLetter','template','paper','fontSize','margin'].some(k=>k in patch)&&!('resumeDocumentId' in patch)){next.resumeDocumentId=null;next.coverDocumentId=null;}
 return next;
}
