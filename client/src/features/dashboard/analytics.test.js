import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardData} from './analytics.js';
test('dashboard uses recorded history and does not count saved jobs as submissions',()=>{
 const now=new Date('2026-10-30T12:00:00Z');
 const d=dashboardData([{id:'a',status:'Saved',createdAt:'2026-10-01',tasks:[],interviews:[]},{id:'b',status:'Rejected',createdAt:'2026-09-01',appliedAt:'2026-10-02',history:[{status:'Interviewing',at:'2026-10-10'}],tasks:[{title:'done',done:true},{title:'follow up',done:false}],interviews:[]}],'all',now);
 assert.equal(d.apps.length,2);assert.equal(d.applied.length,1);assert.equal(d.interviewed.length,1);assert.equal(d.conversion,100);assert.equal(d.responseRate,100);assert.equal(d.months.at(-1).value,1);assert.equal(d.tasks.length,1);
 assert.equal(dashboardData([],'all',now).responseRate,0);
});
test('date filtering keeps only applications within the selected period',()=>{
 const d=dashboardData([{status:'Applied',appliedAt:'2026-01-01'},{status:'Applied',appliedAt:'2026-10-15'}],30,new Date('2026-10-30'));
 assert.equal(d.apps.length,1);assert.equal(d.pipeline.find(s=>s.name==='Applied').value,1);
});
