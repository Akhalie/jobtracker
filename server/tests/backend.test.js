import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApplication } from '../src/features/applications/service.js';
import { profileSchema,applicationSchema,preparationSchema } from '../src/lib/schemas.js';
import { hashPassword,verifyPassword } from '../src/middleware/auth.js';
import { documentHtml } from '../src/lib/pdf.js';
import { filePath } from '../src/lib/files.js';
import { encrypt,decrypt } from '../src/features/settings/service.js';
import { toJsonResume,fromJsonResume } from '../src/lib/json-resume.js';

test('application edits preserve immutable identity/history and record only stage transitions',()=>{
  const first=buildApplication({company:'Example',role:'Engineer'},null,'2026-01-01T00:00:00.000Z');
  const edited=buildApplication({company:'Changed',id:randomUUID(),history:[],createdAt:'fake'},first,'2026-01-02T00:00:00.000Z');
  assert.equal(edited.id,first.id);
  assert.equal(edited.createdAt,first.createdAt);
  assert.equal(edited.history.length,1);
  const applied=buildApplication({status:'Applied',appliedAt:'2026-01-03'},edited,'2026-01-03T00:00:00.000Z');
  assert.deepEqual(applied.history.map(item=>item.status),['Saved','Applied']);
  assert.equal(first.status,'Saved');
});
test('validation rejects unsafe URLs, invalid dates, and unsupported statuses',()=>{
  assert.throws(()=>profileSchema.parse({links:[{label:'unsafe',url:'javascript:alert(1)'}]}));
  assert.throws(()=>applicationSchema.parse({status:'Email sent'}));
  assert.throws(()=>applicationSchema.parse({appliedAt:'not-a-date'}));
  assert.throws(()=>buildApplication({company:' ',role:'Engineer'}));
  assert.equal(profileSchema.parse({projects:[{name:'Tracker'}]}).projects[0].technologies,'');
  assert.equal(preparationSchema.parse({}).step,0);
});
test('password hashes use unique salts and verify only the supplied password',async()=>{
  const a=await hashPassword('a-real-password'),b=await hashPassword('a-real-password');
  assert.notEqual(a,b);
  assert.equal(await verifyPassword('a-real-password',a),true);
  assert.equal(await verifyPassword('wrong-password',a),false);
});
test('export escapes imported text instead of interpreting HTML or loading external URLs',()=>{
  const html=documentHtml({type:'resume',title:'Resume',content:profileSchema.parse({name:'<script>steal()</script>',summary:'<img src="https://attacker.test">'})},{template:'classic',paper:'A4',fontSize:11,margin:16});
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.throws(()=>filePath('../../secrets.txt'));
  assert.throws(()=>filePath('a.pdf'));
});
test('API keys are authenticated encrypted values',()=>{
  process.env.ENCRYPTION_KEY ||= 'unit-test-key';
  const encrypted=encrypt('secret-api-key');
  assert.ok(!encrypted.includes('secret-api-key'));
  assert.equal(decrypt(encrypted),'secret-api-key');
  const altered=encrypted.slice(0,-1)+(encrypted.endsWith('0')?'1':'0');
  assert.throws(()=>decrypt(altered));
});
test('JSON Resume import maps standard career fields and own exports retain exact profile content',()=>{
  const profile=fromJsonResume({basics:{name:'Jamie'},work:[{name:'Example',position:'Developer',highlights:['Built a tracker']}],skills:[{name:'Web',keywords:['React']}],projects:[{name:'Tracker',roles:['Developer'],keywords:['MySQL']}]});
  assert.equal(profile.experience[0].company,'Example');
  assert.equal(profile.experience[0].description,'Built a tracker');
  assert.equal(profile.projects[0].technologies,'MySQL');
  assert.deepEqual(fromJsonResume(toJsonResume(profile)),profile);
  assert.throws(()=>fromJsonResume({unexpected:'value'}));
});


test('uploaded resume text survives preparation saving and legacy summaries are presented as raw text',async()=>{
 const {publicDocument}=await import('../src/features/documents/service.js');
 assert.equal(preparationSchema.parse({resume:'Uploaded resume text'}).resume,'Uploaded resume text');
 const legacy={type:'resume',content:profileSchema.parse({summary:'Whole PDF text'}),extractionWarning:'Imported text is in Summary. Review and organize it into career fields before exporting.'};
 assert.equal(publicDocument(legacy).content,'Whole PDF text');
 assert.equal(legacy.content.summary,'Whole PDF text');
 assert.equal(publicDocument({...legacy,extractionWarning:undefined}).content.summary,'Whole PDF text');
});


test('AI profile URLs accept bare web domains without accepting unsafe schemes or changing resume facts',async()=>{
 const {normalizeProfileUrls}=await import('../src/lib/ai.js');
 const original={name:'Example Person',summary:'Original summary',links:[{label:'LinkedIn',url:'linkedin.com/in/example-person'}],projects:[{name:'Portfolio',url:'portfolio.example.test/project'}],certifications:[{name:'Certificate',url:''}]};
 const value=profileSchema.parse(normalizeProfileUrls(original));
 assert.equal(value.links[0].url,'https://linkedin.com/in/example-person');
 assert.equal(value.projects[0].url,'https://portfolio.example.test/project');
 assert.equal(value.certifications[0].url,'');
 assert.equal(value.name,original.name);assert.equal(value.summary,original.summary);
 assert.equal(original.links[0].url,'linkedin.com/in/example-person');
 for(const url of ['javascript:alert(1)','data:text/html,test','not a web address','person@example.test'])assert.throws(()=>profileSchema.parse(normalizeProfileUrls({links:[{label:'Unsafe',url}]})));
 assert.throws(()=>profileSchema.parse(normalizeProfileUrls({links:'invalid'})));
});


test('resume PDF formatting preserves separate achievement bullet lines',()=>{
 const description='- Maintained workstations.\n- Resolved network issues.';
 const html=documentHtml({type:'resume',title:'Resume',content:profileSchema.parse({name:'Example Person',experience:[{company:'Example Co',title:'Support Intern',description}]})},{template:'modern',paper:'A4',fontSize:11,margin:16});
 assert.ok(html.includes('- Maintained workstations.<br>- Resolved network issues.'));
 assert.equal(profileSchema.parse({experience:[{description}]}).experience[0].description,description);
});
