import { test, expect } from '@playwright/test';
import mysql from 'mysql2/promise';

try { process.loadEnvFile('.env'); } catch {}
test.beforeAll(async () => {
  const database = process.env.TEST_DB_NAME || 'job_tracker_test';
  if (database === process.env.DB_NAME || !database.endsWith('_test')) throw new Error('Refusing to reset a non-test database.');
  const db = await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database});
  try { for (const table of ['sessions','users','state','applications','documents']) await db.execute(`DELETE FROM ${table}`); }
  finally { await db.end(); }
});

test('career profile, preparation, PDF package, direct tracking, charts, and mobile navigation', async ({ page }) => {
  test.setTimeout(150000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Your name').fill('Taylor Test');
  await page.getByLabel('Workspace password').fill('private-workspace-test');
  await page.getByRole('button',{name:'Create workspace'}).click();
  await expect(page.getByRole('heading',{name:'Keep moving, Taylor.'})).toBeVisible();
  const nav = page.getByRole('navigation',{name:'Main navigation'});
  await expect(page.getByText('Inbox',{exact:true})).toHaveCount(0);

  await nav.getByRole('link',{name:'Career profile'}).click();
  await page.getByLabel('Full name').fill('Taylor Test');
  await page.getByLabel('Email',{exact:true}).fill('taylor@example.test');
  await page.getByLabel('Professional summary').fill('Developer building accessible applications with React and MySQL.');
  await page.getByLabel('Skills — separate with commas').fill('React, Express, MySQL');
  const projects = page.locator('section').filter({has:page.getByRole('heading',{name:'Projects',exact:true})});
  await projects.getByRole('button',{name:'Add',exact:true}).click();
  await page.getByLabel('Project name').fill('Career workspace');
  await page.getByLabel('Technologies',{exact:true}).fill('React, Express, MySQL');
  await page.getByRole('button',{name:'Save profile',exact:true}).first().click();
  await expect(page.getByRole('status')).toContainText('Career profile saved');

  await nav.getByRole('link',{name:'Prepare application',exact:true}).click();
  await page.getByLabel('Job description',{exact:true}).fill('Build accessible React applications and Express APIs backed by MySQL.');
  await page.getByLabel('Company',{exact:true}).fill('Northstar Test');
  await page.getByLabel('Job title',{exact:true}).fill('Frontend Developer');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Use my profile',exact:true}).click();
  await expect(page.getByLabel('Full name')).toHaveValue('Taylor Test');
  await expect(page.getByLabel('Template',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Compare resume',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Configure an AI API key and model');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Cover letter',{exact:true}).fill('Dear hiring team,\n\nMy experience building accessible React applications fits the Frontend Developer role. My Career workspace project uses React, Express, and MySQL.\n\nRegards,\nTaylor Test');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Template',{exact:true}).selectOption('modern');
  await page.getByLabel('Paper size').selectOption('Letter');
  await page.getByRole('button',{name:'Generate PDFs',exact:true}).click();
  const resumeLink = page.getByRole('link',{name:'Download resume',exact:true});
  await expect(resumeLink).toBeVisible({timeout:60000});
  await expect(page.getByRole('link',{name:'Download cover letter',exact:true})).toBeVisible();
  const file = await page.request.get(await resumeLink.getAttribute('href'));
  expect(file.status()).toBe(200);
  const pdfBytes = await file.body();
  expect(pdfBytes.subarray(0,5).toString()).toBe('%PDF-');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({data:new Uint8Array(pdfBytes),isEvalSupported:false,useSystemFonts:true});
  const pdf = await loading.promise;
  try {
    const first = await pdf.getPage(1);
    const viewport = first.getViewport({scale:1});
    expect(Math.round(viewport.width)).toBe(612);
    expect(Math.round(viewport.height)).toBe(792);
    const text = (await first.getTextContent()).items.map(item=>item.str).join(' ');
    expect(text).toContain('Taylor Test');
    expect(text).toContain('Career workspace');
  } finally { await loading.destroy(); }
  const imported = await page.request.post('/api/documents/upload', { multipart: {type:'resume',title:'Imported PDF check',file:{name:'resume.pdf',mimeType:'application/pdf',buffer:pdfBytes}} });
  expect(imported.status()).toBe(201);
  expect((await imported.json()).content).toContain('Taylor Test');
  await page.reload();
  await expect(page.getByRole('link',{name:'Download resume',exact:true})).toBeVisible();

  await nav.getByRole('link',{name:'Applications',exact:false}).click();
  await expect(page.getByRole('button',{name:'Frontend Developer',exact:false}).first()).toBeVisible();
  await page.getByRole('button',{name:'Add application',exact:true}).first().click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Company *').fill('Direct Entry Test');
  await dialog.getByLabel('Role *').fill('Full Stack Engineer');
  await dialog.getByLabel('Stage',{exact:true}).selectOption('Applied');
  await dialog.getByLabel('Submission date').fill(new Date().toISOString().slice(0,10));
  await dialog.getByRole('button',{name:'Add application',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button',{name:'Full Stack Engineer',exact:false}).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Stage',{exact:true}).selectOption('Interviewing');
  await dialog.getByRole('button',{name:'Interviews',exact:true}).click();
  await dialog.getByRole('button',{name:'Add interview',exact:true}).click();
  await dialog.getByLabel('Round / title').fill('Technical conversation');
  await dialog.getByLabel('Date and time').fill(new Date(Date.now()+86400000).toISOString().slice(0,16));
  await dialog.getByRole('button',{name:'Follow-ups',exact:true}).click();
  await dialog.getByRole('button',{name:'Add follow-up',exact:true}).click();
  await dialog.getByLabel('Follow-up task',{exact:true}).fill('Prepare project examples');
  await dialog.getByLabel('Due date').fill(new Date().toISOString().slice(0,10));
  await dialog.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button',{name:'Board view'}).click();
  await expect(page.getByRole('button',{name:'Full Stack Engineer',exact:false}).first()).toBeVisible();

  await nav.getByRole('link',{name:'Resumes / CVs'}).click();
  await page.locator('section').filter({has:page.getByRole('heading',{name:'Northstar Test — Frontend Developer',exact:true})}).first().getByRole('button',{name:'View resume / CV',exact:false}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('heading',{name:'Taylor Test',exact:true})).toBeVisible();
  await page.getByRole('dialog').getByRole('button',{name:'Edit new version',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Professional summary').fill('Updated draft for a new opportunity.');
  await page.getByRole('dialog').getByRole('button',{name:'Save new version',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Updated draft for a new opportunity.');
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await nav.getByRole('link',{name:'Cover letters',exact:true}).click();
  await page.getByRole('button',{name:'View cover letter',exact:false}).first().click();
  await expect(page.getByRole('dialog')).toContainText('Dear hiring team');
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();

  await nav.getByRole('link',{name:'Overview',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Application activity',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Interview conversion',exact:true})).toBeVisible();
  await expect(page.locator('.recharts-surface').first()).toBeVisible();
  await expect(page.getByText('Prepare project examples',{exact:true})).toBeVisible();
  await expect(page.getByText('Technical conversation',{exact:true})).toBeVisible();
  await expect(page.locator('.recharts-pie-sector').first()).toBeVisible();
  await page.screenshot({path:'test-results/dashboard-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('aside').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await page.screenshot({path:'test-results/settings-mobile.png',fullPage:true});
  await page.getByLabel('API base URL').fill('https://example.test/v1');
  await page.getByLabel('Model',{exact:true}).fill('fixture-model');
  await page.getByLabel('API key',{exact:true}).fill('fixture-key');
  await page.getByRole('button',{name:'Save AI settings',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('AI settings saved');
  const settings=await (await page.request.get('/api/settings')).json();
  expect(settings.aiConfigured).toBe(true);
  expect(JSON.stringify(settings)).not.toContain('fixture-key');
  const backup=await (await page.request.get('/api/backup')).json();
  expect(backup.profile.projects[0].name).toBe('Career workspace');
  expect(backup.applications).toHaveLength(2);
  expect(JSON.stringify(backup)).not.toContain('fixture-key');
  expect(runtimeErrors).toEqual([]);
});


test('uploaded PDF stays visible, supports comparison, and exports unchanged', async ({page})=>{
  const health=await (await page.request.get('/api/health')).json();
  const login=await page.request.post(health.setupRequired?'/api/auth/setup':'/api/auth/login',{data:{name:'Taylor Test',password:'private-workspace-test'}});
  expect(login.ok()).toBe(true);
  const docs=await (await page.request.get('/api/documents')).json();
  let source=docs.find(doc=>doc.hasFile && doc.originalName==='resume.pdf');
  if(!source){
    const draft=await (await page.request.post('/api/documents',{data:{type:'resume',title:'PDF fixture',content:{name:'Taylor Test',summary:'Experienced developer.',skills:['React','MySQL']}}})).json();
    const generated=await page.request.post(`/api/documents/${draft.id}/export`,{data:{template:'modern',paper:'Letter',fontSize:11,margin:16}});
    expect(generated.ok()).toBe(true);source=await generated.json();
  }
  const bytes=await (await page.request.get(`/api/documents/${source.id}/file`)).body();
  const {newDraft}=await import('../client/src/features/preparation/draft.js');
  await page.request.put('/api/preparation',{data:{...newDraft(),step:1,job:{company:'PDF Test',role:'Engineer',description:'React and MySQL development'}}});
  await page.goto('/#preparation');
  await page.locator('input[type="file"]').setInputFiles({name:'My resume.pdf',mimeType:'application/pdf',buffer:bytes});
  await expect(page.getByTitle('Uploaded resume PDF')).toBeVisible();
  await expect(page.getByLabel('Professional summary',{exact:true})).toHaveCount(0);
  const frame=page.getByTitle('Uploaded resume PDF');
  const uploadedId=(await frame.getByRole('link',{name:'Open original PDF',exact:true}).getAttribute('href')).split('/')[3];
  await expect(frame.getByRole('img',{name:'PDF page 1 of 1'})).toBeVisible();
  await page.screenshot({path:'test-results/uploaded-resume.png',fullPage:true});
  await page.getByRole('button',{name:'Edit extracted text',exact:true}).click();
  await expect(page.getByLabel('Extracted resume text')).toHaveValue(/Taylor Test/);
  await page.getByRole('button',{name:'View uploaded PDF',exact:true}).click();
  await expect(frame).toBeVisible();
  let compared=false;
  await page.route('**/api/ai',async route=>{
    const input=route.request().postDataJSON();
    expect(typeof input.resume).toBe('string');
    expect(input.resume).toContain('Taylor Test');
    compared=true;
    await route.fulfill({json:{result:{matches:['React experience'],gaps:[],suggestions:[],keywords:['React'],score:80}}});
  });
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Compare resume',exact:true}).click();
  await expect(page.getByText('React experience',{exact:true})).toBeVisible();
  expect(compared).toBe(true);
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Skip cover letter for this application').check();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByTitle('Export resume PDF')).toBeVisible();
  await page.getByRole('button',{name:'Save package',exact:true}).click();
  const link=page.getByRole('link',{name:'Download resume',exact:true});
  await expect(link).toBeVisible();
  expect(await link.getAttribute('href')).toContain(uploadedId);
  const exported=await page.request.get(await link.getAttribute('href'));
  expect(exported.ok()).toBe(true);
  expect((await exported.body()).equals(bytes)).toBe(true);
  await page.reload();
  await page.getByRole('navigation',{name:'Application preparation stages'}).getByRole('button',{name:/Resume/}).click();
  await expect(page.getByTitle('Uploaded resume PDF')).toBeVisible();
  await expect(page.getByLabel('Professional summary',{exact:true})).toHaveCount(0);
});
