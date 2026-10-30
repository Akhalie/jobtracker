import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { aiConfig } from '../features/settings/service.js';
import { profileSchema,jobSchema,comparisonSchema,text,fail } from './schemas.js';
const instructions=await readFile(new URL('../../prompts/career-assistant.txt',import.meta.url),'utf8');
const shapes={
  extract:'result is {company,role,description,url,location,salary}; preserve the complete supplied description, use empty strings for unknown values.',
  resume:'result is a career profile object with name,email,phone,location,summary,links:[{label,url}],experience:[{company,title,start,end,description}],education:[{school,degree,start,end}],skills:[string],certifications:[{name,issuer,date,url}],projects:[{name,role,description,technologies,url,start,end}]. Tailor emphasis only; preserve supplied facts and do not drop contact information.',
  compare:'result is {matches:[string],gaps:[string],suggestions:[string],keywords:[string],score:number 0..100}. Explain requirements using evidence. Identify unsupported qualifications as gaps. Score is heuristic coverage, not an ATS guarantee.',
  cover:'result is a plain text cover letter string. Use only supplied facts and make it specific to the job. No fabricated company research. Keep it under 400 words.',
  rewrite:'result is the rewritten plain text string. Preserve facts; follow the requested editing instruction without introducing unsupported claims.',
};
const aiResumeSchema=z.object(Object.fromEntries(Object.entries(profileSchema.shape).map(([field,schema])=>[field,schema.removeDefault?schema.removeDefault():schema]))).refine(value=>value.summary.trim()||value.experience.length||value.projects.length||value.education.length,'Resume content is empty.');
const outputs={extract:jobSchema,resume:aiResumeSchema,compare:comparisonSchema,cover:text.trim().min(1),rewrite:text.trim().min(1)};
export async function callAI(body) {
  const input=z.object({task:z.enum(['extract','resume','compare','cover','rewrite']),job:jobSchema.optional(),profile:profileSchema.optional(),resume:z.union([profileSchema,text]).optional(),text:text.optional(),instruction:z.string().max(4000).optional()}).parse(body);
  const config=await aiConfig();
  if (!config.aiApiKey || !config.aiModel) throw fail(503,'Configure an AI API key and model in Settings first.');
  const endpoint=`${config.aiBaseUrl.replace(/\/$/,'')}/chat/completions`;
  let response;
  try {
    response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.aiApiKey}`},body:JSON.stringify({model:config.aiModel,messages:[{role:'system',content:`${instructions}\n${shapes[input.task]}`},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_object'},temperature:0.2}),signal:AbortSignal.timeout(90000)});
  } catch { throw fail(502,'The AI provider could not be reached. Your draft has not been changed.'); }
  if (!response.ok) throw fail(502,`The AI provider returned HTTP ${response.status}. Check your key, model, and quota. Your draft is unchanged.`);
  try {
    const payload=await response.json();
    const raw=payload.choices?.[0]?.message?.content;
    const parsed=JSON.parse(raw);
    return outputs[input.task].parse(parsed.result);
  } catch { throw fail(502,'The AI response did not match the expected format. Your draft is unchanged; try again.'); }
}
