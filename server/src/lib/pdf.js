import puppeteer from 'puppeteer';
import { profileSchema } from './schemas.js';

export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const line=value=>escapeHtml(value).replaceAll('\n','<br>');
const section=(title,content)=>content?`<section><h2>${escapeHtml(title)}</h2>${content}</section>`:'';
export function documentHtml(document,options) {
  let body;
  if(document.type==='cover-letter') body=`<article><h1>${escapeHtml(document.title)}</h1><div class="letter">${line(typeof document.content==='string'?document.content:document.content.summary)}</div></article>`;
  else if(typeof document.content==='string') body=`<h1>${escapeHtml(document.title)}</h1><div>${line(document.content)}</div>`;
  else {
    const p=profileSchema.parse(document.content);
    body=`<header><h1>${escapeHtml(p.name||document.title)}</h1><p>${[p.email,p.phone,p.location].filter(Boolean).map(escapeHtml).join(' · ')}</p><p>${p.links.map(link=>`${escapeHtml(link.label)}: ${escapeHtml(link.url)}`).join(' · ')}</p></header>`;
    body+=section('Summary',p.summary?`<p>${line(p.summary)}</p>`:'');
    body+=section('Experience',p.experience.map(item=>`<div class="entry"><h3>${escapeHtml(item.title)} · ${escapeHtml(item.company)}</h3><p class="dates">${escapeHtml(item.start)} – ${escapeHtml(item.end)}</p><p>${line(item.description)}</p></div>`).join(''));
    body+=section('Education',p.education.map(item=>`<div class="entry"><h3>${escapeHtml(item.degree)} · ${escapeHtml(item.school)}</h3><p class="dates">${escapeHtml(item.start)} – ${escapeHtml(item.end)}</p></div>`).join(''));
    body+=section('Skills',p.skills.length?`<p>${p.skills.map(escapeHtml).join(' · ')}</p>`:'');
    body+=section('Projects',p.projects.map(item=>`<div class="entry"><h3>${escapeHtml(item.name)}${item.role?' · '+escapeHtml(item.role):''}</h3><p>${line(item.description)}</p><p>${escapeHtml(item.technologies)} ${escapeHtml(item.url)}</p></div>`).join(''));
    body+=section('Certifications',p.certifications.map(item=>`<p>${escapeHtml(item.name)}${item.issuer?' · '+escapeHtml(item.issuer):''} ${escapeHtml(item.date)} ${escapeHtml(item.url)}</p>`).join(''));
  }
  // Print pagination needs document CSS rather than application Tailwind classes.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(document.title)}</title><style>@page{size:${options.paper};margin:${options.margin}mm}*{box-sizing:border-box}body{font-family:${options.template==='modern'?'Arial, sans-serif':'Georgia, serif'};font-size:${options.fontSize}pt;color:#17212b;line-height:1.45;margin:0;overflow-wrap:anywhere}h1{font-size:25pt;margin:0 0 6pt}h2{font-size:12pt;text-transform:uppercase;letter-spacing:1pt;border-bottom:1px solid ${options.template==='modern'?'#0f766e':'#777'};padding-bottom:4pt;margin:17pt 0 7pt;color:${options.template==='modern'?'#0f766e':'#17212b'}}h3{font-size:11pt;margin:0}p{margin:5pt 0}.dates{font-size:9pt;color:#555}h1,h2,h3{break-after:avoid}.entry{margin-bottom:10pt}.letter{white-space:normal;line-height:1.7;margin-top:24pt}a{color:inherit}section{margin:0}</style></head><body>${body}</body></html>`;
}
export async function generatePdf(document,options) {
  const browser=await puppeteer.launch({headless:true, ...(process.env.PUPPETEER_EXECUTABLE_PATH?{executablePath:process.env.PUPPETEER_EXECUTABLE_PATH}:{})});
  try {
    const page=await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request',request=>request.abort());
    await page.setContent(documentHtml(document,options),{waitUntil:'domcontentloaded'});
    return Buffer.from(await page.pdf({format:options.paper,preferCSSPageSize:true,printBackground:true,timeout:30000}));
  } finally {await browser.close();}
}
