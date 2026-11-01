import { useState } from 'react';
import { Save, Upload, Sparkles } from 'lucide-react';
import { api, normalizeProfile } from '../../lib/api.js';
import ProfileFields from '../../components/ProfileFields.jsx';
import { PageHeader, Button, ErrorNote, Notice, Card, Field, Textarea } from '../../components/ui/index.jsx';
export default function Profile({ profile, setProfile, refresh }) {
 const [value,setValue]=useState(()=>normalizeProfile(profile)),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[importedText,setImportedText]=useState(null);
 function populate(imported){
  const fields=Object.entries(normalizeProfile(imported)).filter(([,field])=>Array.isArray(field)?field.length:field.trim());
  setValue(current=>({...current,...Object.fromEntries(fields)}));
 }
 async function extract(text){
  if(!text.trim())throw new Error('No readable text was found. Use a text-based PDF, DOCX, or TXT file; scanned PDFs need OCR.');
  const {result}=await api('/ai',{method:'POST',body:{task:'profile',text}});
  populate(result);setImportedText(null);
  setNotice('AI filled your career profile. Review the fields, then Save profile. Fields missing from the resume were kept unchanged.');
 }
 async function save(){setBusy('save');setError('');setNotice('');try{const p=await api('/profile',{method:'PUT',body:value});setProfile(p);setNotice('Career profile saved. Existing application documents are unchanged.');}catch(e){setError(e.message)}finally{setBusy('')}}
 async function importFile(e){
  const file=e.target.files[0];if(!file)return;
  setBusy('import');setError('');setNotice('');
  try{
   const form=new FormData();form.append('file',file);form.append('type','resume');form.append('title',file.name);
   const doc=await api('/documents/upload',{method:'POST',body:form});
   await refresh();
   if(typeof doc.content==='string'){setImportedText(doc.content);await extract(doc.content)}
   else{populate(doc.content);setImportedText(null);setNotice('Resume fields imported for review. Check them before saving.')}
  }catch(e){setError(e.message)}finally{setBusy('');e.target.value=''}
 }
 async function retry(){setBusy('import');setError('');setNotice('');try{await extract(importedText)}catch(e){setError(e.message)}finally{setBusy('')}}
 return <><PageHeader eyebrow="Your foundation" title="Career profile" description="Your experience, all in one place. Use it to build better applications."><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"><Upload size={15}/>{busy==='import'?'Importing with AI…':'Import resume'}<input type="file" accept=".pdf,.docx,.txt,.json" className="sr-only" disabled={!!busy} onChange={importFile}/></label><a href="/api/profile/export" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">Export JSON</a><Button onClick={save} disabled={!!busy} loading={busy==='save'}><Save size={15}/>Save profile</Button></PageHeader>
 <p className="mb-4 text-xs text-slate-500">Resume imports use your AI provider in Settings to fill the fields. Your original file is preserved.</p>
 <ErrorNote>{error}</ErrorNote><Notice>{notice}</Notice>{busy==='import' && <p role="status" className="mb-4 text-sm text-brand">Reading your resume and organizing career details…</p>}
 <div className="max-w-4xl">{importedText!==null && !busy && <Card className="mb-5 p-5"><p className="mb-3 text-sm text-slate-500">Your original is saved in the resume library. The profile fields are unchanged until extraction succeeds.</p><details><summary className="cursor-pointer text-sm text-brand">View extracted resume text</summary><Field label="Imported resume text" className="mt-3"><Textarea readOnly rows={12} value={importedText}/></Field></details><Button className="mt-4" onClick={retry} disabled={!importedText.trim()}><Sparkles size={15}/>Fill fields with AI</Button></Card>}
 <fieldset disabled={!!busy}><ProfileFields value={value} onChange={setValue}/></fieldset><div className="mt-5 flex justify-end"><Button onClick={save} disabled={!!busy} loading={busy==='save'}><Save size={15}/>Save profile</Button></div></div></>;
}
