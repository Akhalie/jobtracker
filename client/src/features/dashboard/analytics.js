import { statuses } from '../../lib/api.js';
export function dashboardData(applications, days='all', now=new Date()) {
 const cutoff=days==='all'?0:now.getTime()-Number(days)*86400000;
 const apps=applications.filter(a=>new Date(a.appliedAt||a.createdAt).getTime()>=cutoff);
 const reached=(a,stages)=>stages.includes(a.status)||(a.history||[]).some(h=>stages.includes(h.status));
 const applied=apps.filter(a=>a.appliedAt||reached(a,['Applied','Interviewing','Offer','Accepted','Rejected']));
 const interviewed=applied.filter(a=>reached(a,['Interviewing','Offer','Accepted']));
 const offered=applied.filter(a=>reached(a,['Offer','Accepted']));
 const responses=applied.filter(a=>reached(a,['Interviewing','Offer','Accepted','Rejected']));
 const pipeline=statuses.map(name=>({name,value:apps.filter(a=>a.status===name).length}));
 const months=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,name:d.toLocaleDateString('en',{month:'short'}),value:0}});
 for(const a of apps){if(!a.appliedAt)continue;const d=new Date(a.appliedAt);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;const month=months.find(m=>m.key===key);if(month)month.value++}
 const outcomes=[{name:'Accepted',value:apps.filter(a=>a.status==='Accepted').length},{name:'Rejected',value:apps.filter(a=>a.status==='Rejected').length},{name:'Withdrawn',value:apps.filter(a=>a.status==='Withdrawn').length},{name:'Pending',value:apps.filter(a=>!['Accepted','Rejected','Withdrawn','Archived'].includes(a.status)).length}];
 const tasks=applications.flatMap(a=>(a.tasks||[]).filter(t=>!t.done).map(t=>({...t,company:a.company,role:a.role,applicationId:a.id}))).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
 const interviews=applications.flatMap(a=>(a.interviews||[]).filter(i=>i.date&&new Date(i.date)>=now).map(i=>({...i,company:a.company,role:a.role}))).sort((a,b)=>new Date(a.date)-new Date(b.date));
 return {apps,applied,interviewed,offered,responses,pipeline,months,outcomes,tasks,interviews,responseRate:applied.length?Math.round(responses.length/applied.length*100):0,conversion:applied.length?Math.round(interviewed.length/applied.length*100):0};
}
