import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, FileText, Save, Sparkles, Upload, RotateCcw } from 'lucide-react';
import { newDraft, updateDraft } from './draft.js';
import { resumeContent, restoreResume, originalPdf } from './resume.js';
import { api, normalizeProfile } from '../../lib/api.js';
import ProfileFields from '../../components/ProfileFields.jsx';
import DocumentContent from '../../components/DocumentContent.jsx';
import PdfPreview from '../../components/PdfPreview.jsx';
import {
  PageHeader,
  Card,
  Button,
  Field,
  Input,
  Textarea,
  Select,
  ErrorNote,
  Notice
} from '../../components/ui/index.jsx';

const steps = ['Job description', 'Resume', 'Compare / ATS', 'Cover letter', 'Export'];
const initial = newDraft;
export default function Preparation({ profile, documents, applications, draft, onDraftChange, refresh, navigate }) {
  const recovery = useRef(null);
  if (recovery.current === null) {
    let recovered;
    try {
      recovered = JSON.parse(sessionStorage.getItem('folio-preparation-recovery') || 'null');
    } catch {}
    const source = recovered || draft;
    recovery.current = {
      ...initial(),
      ...source,
      job: { ...initial().job, ...source?.job },
      resume: restoreResume(source, documents)
    };
  }
  const [data, setData] = useState(recovery.current),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [saved, setSaved] = useState('Saved'),
    [preview, setPreview] = useState(typeof recovery.current.resume === 'string'),
    [suggestion, setSuggestion] = useState(null),
    [rewrite, setRewrite] = useState('');
  const selectedDocument = documents.find((doc) => doc.id === data.selectedResumeId);
  const sourcePdf = Boolean(selectedDocument?.hasFile && /\.pdf$/i.test(selectedDocument.originalName || ''));
  const keepOriginal = originalPdf(data.resume, selectedDocument);
  const resumeText = typeof data.resume === 'string';
  const dirty = useRef(!!sessionStorage.getItem('folio-preparation-recovery')),
    current = useRef(data),
    queue = useRef(Promise.resolve()),
    mounted = useRef(true);
  current.current = data;
  function remember(value) {
    try {
      sessionStorage.setItem('folio-preparation-recovery', JSON.stringify(value));
    } catch {}
  }
  function change(patch) {
    dirty.current = true;
    const next = updateDraft(current.current, patch);
    current.current = next;
    remember(next);
    setData(next);
    onDraftChange(next);
    setSaved('Unsaved changes');
  }
  function persist(snapshot) {
    const serialized = JSON.stringify(snapshot);
    queue.current = queue.current
      .catch(() => {})
      .then(() => api('/preparation', { method: 'PUT', body: snapshot }))
      .then(() => {
        if (JSON.stringify(current.current) === serialized) {
          dirty.current = false;
          onDraftChange(snapshot);
          try {
            sessionStorage.removeItem('folio-preparation-recovery');
          } catch {}
        }
        if (mounted.current) {
          setSaved(dirty.current ? 'Unsaved changes' : 'Saved');
        }
      });
    return queue.current;
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (dirty.current) {
        remember(current.current);
        persist(current.current).catch(() => {});
      }
    };
  }, []);
  useEffect(() => {
    if (!dirty.current) {
      return;
    }
    const id = setTimeout(() => {
      setSaved('Saving…');
      persist(data).catch((e) => {
        if (mounted.current) {
          setSaved('Saved in this tab · server retry needed');
          setError(e.message);
        }
      });
    }, 700);
    return () => clearTimeout(id);
  }, [data]);
  async function work(name, fn) {
    setBusy(name);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  async function ai(task) {
    await work(task, async () => {
      const { result } = await api('/ai', {
        method: 'POST',
        body: {
          task,
          job: data.job,
          profile,
          resume: data.resume,
          text: resumeText ? data.resume : data.resume.summary,
          instruction: rewrite
        }
      });
      if (task === 'extract') {
        change({ job: { ...data.job, ...result } });
      }
      if (task === 'resume') {
        setSuggestion(normalizeProfile(result));
      }
      if (task === 'compare') {
        change({ comparison: result });
      }
      if (task === 'cover') {
        change({
          coverLetter: typeof result === 'string' ? result : result.text || result.coverLetter || '',
          skipCoverLetter: false
        });
      }
      if (task === 'rewrite') {
        setSuggestion({ ...data.resume, summary: typeof result === 'string' ? result : result.text || '' });
      }
    });
  }
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    await work('upload', async () => {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'resume');
      form.append('title', file.name);
      const doc = await api('/documents/upload', { method: 'POST', body: form });
      change({ resume: resumeContent(doc.content), selectedResumeId: doc.id });
      await refresh();
      setPreview(true);
      setNotice('Uploaded resume ready. View the original below; extracted text is available for review and AI.');
    });
    e.target.value = '';
  }
  async function saveResume() {
    await work('save-resume', async () => {
      const doc = await api('/documents', {
        method: 'POST',
        body: {
          type: 'resume',
          title: `${data.job.company || 'Untitled'} — ${data.job.role || 'Resume'}`,
          content: data.resume,
          sourceId: data.selectedResumeId || undefined
        }
      });
      change({ selectedResumeId: doc.id });
      await refresh();
      setNotice('A new resume version was saved to your library.');
    });
  }
  async function exportPackage() {
    await work('export', async () => {
      let base, resume;
      if (keepOriginal) {
        base = selectedDocument;
        resume = selectedDocument;
      } else {
        base = await api('/documents', {
          method: 'POST',
          body: {
            type: 'resume',
            title: `${data.job.company || 'Application'} — ${data.job.role || 'Resume'}`,
            content: data.resume,
            sourceId: data.selectedResumeId || undefined
          }
        });
        resume = await api(`/documents/${base.id}/export`, {
          method: 'POST',
          body: {
            template: data.template,
            paper: data.paper,
            fontSize: Number(data.fontSize),
            margin: Number(data.margin)
          }
        });
      }
      const ids = [resume.id];
      if (!data.skipCoverLetter && data.coverLetter.trim()) {
        const cover = await api('/documents', {
          method: 'POST',
          body: {
            type: 'cover-letter',
            title: `${data.job.company || 'Application'} — Cover letter`,
            content: data.coverLetter
          }
        });
        const pdf = await api(`/documents/${cover.id}/export`, {
          method: 'POST',
          body: {
            template: data.template,
            paper: data.paper,
            fontSize: Number(data.fontSize),
            margin: Number(data.margin)
          }
        });
        ids.push(pdf.id);
      }
      let application;
      const existing = applications.find((a) => a.id === data.applicationId);
      if (existing?.status === 'Preparing') {
        application = await api(`/applications/${data.applicationId}`, {
          method: 'PATCH',
          body: { ...data.job, documentIds: ids }
        });
      } else {
        application = await api('/applications', {
          method: 'POST',
          body: { ...data.job, status: 'Preparing', documentIds: ids }
        });
      }
      const patch = {
        applicationId: application.id,
        resumeDocumentId: ids[0],
        coverDocumentId: ids[1] || null,
        selectedResumeId: base.id
      };
      change(patch);
      await persist({ ...data, ...patch });
      await refresh();
      setNotice('Application package saved. Download the PDFs below. It is tracked as Preparing, not Applied.');
    });
  }
  function reset() {
    if (!confirm('Start a new preparation draft? Saved documents and applications will remain.')) {
      return;
    }
    change(initial());
    setSuggestion(null);
    setNotice('Started a new draft.');
    setError('');
  }
  return (
    <>
      <PageHeader
        eyebrow="Make your next move"
        title="Prepare an application"
        description="A focused workspace, from job description to ready-to-send documents."
      >
        <span className="self-center px-2 text-xs text-slate-500" role="status">
          {saved}
        </span>
        <Button variant="secondary" onClick={reset}>
          <RotateCcw size={14} />
          New draft
        </Button>
      </PageHeader>
      <nav
        aria-label="Application preparation stages"
        className="mb-6 grid grid-cols-5 overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => change({ step: i })}
            aria-current={data.step === i ? 'step' : undefined}
            className={`flex flex-col items-center gap-2 px-2 py-4 text-xs sm:flex-row sm:justify-center sm:gap-2 ${data.step === i ? 'bg-brand/8 font-bold text-brand' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${data.step === i ? 'bg-brand text-white' : data.step > i ? 'bg-emerald-50 text-brand' : 'bg-slate-100'}`}
            >
              {data.step > i ? <Check size={13} /> : i + 1}
            </span>
            <span className="hidden sm:block">{s}</span>
            <span className="sm:hidden">{['Job', 'Resume', 'Compare', 'Letter', 'Export'][i]}</span>
          </button>
        ))}
      </nav>
      <ErrorNote>{error}</ErrorNote>
      <Notice>{notice}</Notice>
      {data.step === 0 && (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-lg bg-brand/10 p-2 text-brand">
                <FileText size={20} />
              </span>
              <div>
                <h2 className="font-semibold">Start with the opportunity</h2>
                <p className="text-xs text-slate-500">Paste the full posting for the best context.</p>
              </div>
            </div>
            <Field label="Job description">
              <Textarea
                rows={15}
                value={data.job.description}
                onChange={(e) => change({ job: { ...data.job, description: e.target.value } })}
                placeholder="Paste the job description, requirements, and company information…"
              />
            </Field>
            <Button
              className="mt-4"
              onClick={() => ai('extract')}
              loading={busy === 'extract'}
              disabled={!!busy || !data.job.description.trim()}
            >
              <Sparkles size={15} />
              Extract job details
            </Button>
            <p className="mt-3 text-xs text-slate-400">AI is optional. You can fill in the details yourself.</p>
          </Card>
          <Card className="p-6">
            <h2 className="mb-5 font-semibold">Opportunity details</h2>
            <div className="space-y-4">
              {[
                ['company', 'Company'],
                ['role', 'Job title'],
                ['url', 'Job URL'],
                ['location', 'Location'],
                ['salary', 'Salary / range']
              ].map(([k, l]) => (
                <Field key={k} label={l}>
                  <Input
                    value={data.job[k] || ''}
                    onChange={(e) => change({ job: { ...data.job, [k]: e.target.value } })}
                    placeholder={k === 'url' ? 'https://' : ''}
                  />
                </Field>
              ))}
            </div>
          </Card>
        </div>
      )}
      {data.step === 1 && (
        <>
          <Card className="mb-5 p-5">
            <h2 className="mb-4 font-semibold">Choose your starting point</h2>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Saved resume" className="min-w-56 flex-1">
                <Select
                  value={data.selectedResumeId || ''}
                  onChange={(e) => {
                    const d = documents.find((d) => String(d.id) === e.target.value);
                    if (d) {
                      change({ selectedResumeId: d.id, resume: resumeContent(d.content) });
                      setPreview(true);
                    } else {
                      change({ selectedResumeId: null });
                    }
                  }}
                >
                  <option value="">Select a resume</option>
                  {documents
                    .filter((d) => d.type === 'resume')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                </Select>
              </Field>
              <Button
                variant="secondary"
                onClick={() => {
                  change({ resume: normalizeProfile(profile), selectedResumeId: null });
                  setPreview(false);
                  setNotice('Profile copied into this draft. Changes here will not change your profile.');
                }}
              >
                Use my profile
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">
                <Upload size={15} />
                Upload resume
                <input
                  className="sr-only"
                  type="file"
                  accept=".pdf,.docx,.txt,.json"
                  disabled={!!busy}
                  onChange={upload}
                />
              </label>
              <Button onClick={() => ai('resume')} loading={busy === 'resume'} disabled={!!busy}>
                <Sparkles size={15} />
                AI draft
              </Button>
            </div>
          </Card>
          {suggestion && (
            <Card className="mb-5 border-brand/30 p-5">
              <h3 className="mb-3 font-semibold">Review AI suggestion</h3>
              <p className="mb-3 text-sm text-slate-500">
                Accept the complete draft or selected sections. Your original profile and saved documents remain
                unchanged.
              </p>
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-100">
                <DocumentContent content={suggestion} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => {
                    change({ resume: suggestion, comparison: null });
                    setSuggestion(null);
                  }}
                >
                  Accept draft
                </Button>
                <Button variant="secondary" onClick={() => setSuggestion(null)}>
                  Discard
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!resumeText &&
                  [
                    ['summary', 'summary'],
                    ['experience', 'experience'],
                    ['projects', 'projects'],
                    ['skills', 'skills']
                  ].map(([key, label]) => (
                    <Button
                      key={key}
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => {
                        change({
                          resume: { ...normalizeProfile(data.resume), [key]: suggestion[key] },
                          comparison: null
                        });
                        setNotice(`Applied suggested ${label}. Review the content below.`);
                      }}
                    >
                      Use {label}
                    </Button>
                  ))}
              </div>
            </Card>
          )}
          <div className="mb-4 flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setPreview(!preview)}>
              {resumeText
                ? preview
                  ? 'Edit extracted text'
                  : sourcePdf
                    ? 'View uploaded PDF'
                    : 'Preview text'
                : preview
                  ? 'Edit content'
                  : 'Preview content'}
            </Button>
            <Button
              variant="secondary"
              onClick={saveResume}
              disabled={!!busy || keepOriginal}
              loading={busy === 'save-resume'}
            >
              <Save size={15} />
              Save new version
            </Button>
          </div>
          {sourcePdf && preview && resumeText ? (
            <Card className="overflow-hidden p-3">
              <PdfPreview title="Uploaded resume PDF" src={`/api/documents/${selectedDocument.id}/file`} />
            </Card>
          ) : resumeText ? (
            <Card className="p-5">
              <Field label="Extracted resume text">
                <Textarea rows={22} value={data.resume} onChange={(e) => change({ resume: e.target.value })} />
              </Field>
              <p className="mt-3 text-xs text-slate-500">
                Editing this text creates a separate draft. Your original file stays unchanged. Use AI draft to turn it
                into editable resume sections.
              </p>
            </Card>
          ) : preview ? (
            <Card className="overflow-auto p-4">
              <DocumentContent content={data.resume} />
            </Card>
          ) : (
            <ProfileFields value={data.resume} onChange={(resume) => change({ resume, comparison: null })} />
          )}{' '}
          {!resumeText && (
            <Card className="mt-5 p-5">
              <h3 className="mb-3 font-semibold">Refine your summary</h3>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={rewrite}
                  onChange={(e) => setRewrite(e.target.value)}
                  placeholder="For example: make the summary shorter and more direct"
                />
                <Button onClick={() => ai('rewrite')} disabled={!!busy || !rewrite.trim()} loading={busy === 'rewrite'}>
                  <Sparkles size={15} />
                  Suggest rewrite
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
      {data.step === 2 && (
        <>
          <Card className="mb-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">How does your resume match?</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Compare against the actual requirements. Missing qualifications stay visible.
                </p>
              </div>
              <Button
                onClick={() => ai('compare')}
                loading={busy === 'compare'}
                disabled={!!busy || !data.job.description}
              >
                <Sparkles size={15} />
                {data.comparison ? 'Run comparison again' : 'Compare resume'}
              </Button>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              This is a compatibility review, not a guaranteed employer ATS score. Export checks should include PDF
              reading order and page layout.
            </p>
          </Card>
          {data.comparison ? (
            <>
              <div className="mb-5 grid gap-5 lg:grid-cols-2">
                {[
                  ['matches', 'Supported matches', 'text-emerald-700', 'bg-emerald-50'],
                  ['gaps', 'Qualification gaps', 'text-amber-700', 'bg-amber-50'],
                  ['keywords', 'Keyword coverage', 'text-blue-700', 'bg-blue-50'],
                  ['suggestions', 'Suggested improvements', 'text-brand', 'bg-brand/5']
                ].map(([key, title, color, bg]) => (
                  <Card key={key} className="p-6">
                    <h3 className={`mb-4 font-semibold ${color}`}>{title}</h3>
                    <ul className="space-y-2">
                      {(data.comparison[key] || []).map((text, i) => (
                        <li key={i} className={`rounded-lg p-3 text-sm leading-6 ${bg}`}>
                          {typeof text === 'string' ? text : JSON.stringify(text)}
                        </li>
                      ))}
                    </ul>
                    {!data.comparison[key]?.length && <p className="text-sm text-slate-400">None identified.</p>}
                  </Card>
                ))}
              </div>
              <Button variant="secondary" onClick={() => change({ step: 1 })}>
                <ArrowLeft size={15} />
                Review and edit resume
              </Button>
            </>
          ) : (
            <Card className="p-8 text-sm leading-7 text-slate-500">
              <h3 className="mb-3 font-semibold text-ink">Before you compare</h3>
              <ul className="list-inside list-disc space-y-2">
                <li>Make sure the resume includes your relevant work and projects.</li>
                <li>Check dates, qualifications, and contact information.</li>
                <li>Review every AI suggestion before accepting it.</li>
                <li>Without AI, use the job description to review your resume manually and continue.</li>
              </ul>
            </Card>
          )}
        </>
      )}
      {data.step === 3 && (
        <Card className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">A letter with something to say</h2>
              <p className="mt-1 text-sm text-slate-500">
                Connect your experience to this opportunity, or leave it out.
              </p>
            </div>
            <Button onClick={() => ai('cover')} disabled={!!busy} loading={busy === 'cover'}>
              <Sparkles size={15} />
              Draft cover letter
            </Button>
          </div>
          <label className="mb-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.skipCoverLetter}
              onChange={(e) => change({ skipCoverLetter: e.target.checked })}
              className="accent-brand"
            />
            Skip cover letter for this application
          </label>
          <Field label="Cover letter">
            <Textarea
              disabled={data.skipCoverLetter}
              rows={17}
              value={data.coverLetter}
              onChange={(e) => change({ coverLetter: e.target.value })}
              placeholder="Write your cover letter here, or use AI to create a draft from your resume and the job description."
            />
          </Field>
        </Card>
      )}
      {data.step === 4 && (
        <div className="grid items-start gap-6 xl:grid-cols-[300px_1fr]">
          <Card className="p-6">
            <h2 className="mb-5 font-semibold">Finish your package</h2>
            <div className="space-y-4">
              {keepOriginal && (
                <p className="text-sm text-slate-500">
                  Your original PDF keeps its layout. Formatting below applies to the cover letter.
                </p>
              )}
              <Field label="Template">
                <Select value={data.template} onChange={(e) => change({ template: e.target.value })}>
                  <option value="classic">Classic — traditional</option>
                  <option value="modern">Modern — clean</option>
                </Select>
              </Field>
              <Field label="Paper size">
                <Select value={data.paper} onChange={(e) => change({ paper: e.target.value })}>
                  <option>A4</option>
                  <option>Letter</option>
                </Select>
              </Field>
              <Field label="Font size">
                <Select value={data.fontSize} onChange={(e) => change({ fontSize: Number(e.target.value) })}>
                  {[10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} pt
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Margins">
                <Select value={data.margin} onChange={(e) => change({ margin: Number(e.target.value) })}>
                  {[12, 16, 20].map((n) => (
                    <option key={n} value={n}>
                      {n} mm
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                className="w-full"
                onClick={exportPackage}
                loading={busy === 'export'}
                disabled={
                  !!busy ||
                  !(keepOriginal || (resumeText ? data.resume.trim() : data.resume.name)) ||
                  !data.job.company ||
                  !data.job.role
                }
              >
                <Download size={15} />
                {keepOriginal ? 'Save package' : 'Generate PDFs'}
              </Button>
              <p className="text-xs leading-5 text-slate-400">
                Requires a resume, company, and role. Saves a package to Applications as Preparing.
              </p>
              {data.resumeDocumentId && (
                <a
                  href={`/api/documents/${data.resumeDocumentId}/file?download=1`}
                  className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-brand"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={14} />
                  Download resume
                </a>
              )}
              {data.coverDocumentId && (
                <a
                  href={`/api/documents/${data.coverDocumentId}/file?download=1`}
                  className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-brand"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={14} />
                  Download cover letter
                </a>
              )}
              {data.applicationId && (
                <Button variant="secondary" className="w-full" onClick={() => navigate('applications')}>
                  View applications
                  <ArrowRight size={14} />
                </Button>
              )}
            </div>
          </Card>
          <div>
            <p className="mb-3 text-xs text-slate-500">
              Content preview · Downloaded PDF is the final pagination reference
            </p>
            <Card className="max-h-[850px] overflow-auto bg-slate-100 p-4">
              <>
                {keepOriginal ? (
                  <PdfPreview title="Export resume PDF" src={`/api/documents/${selectedDocument.id}/file`} />
                ) : (
                  <DocumentContent
                    content={data.resume}
                    template={data.template}
                    paper={data.paper}
                    fontSize={data.fontSize}
                    margin={data.margin}
                  />
                )}
              </>
            </Card>
            {!data.skipCoverLetter && data.coverLetter && (
              <Card className="mt-5 overflow-auto p-4">
                <DocumentContent content={data.coverLetter} />
              </Card>
            )}
          </div>
        </div>
      )}
      <div className="mt-7 flex items-center justify-between border-t border-slate-200 pt-5">
        <Button
          variant="secondary"
          disabled={data.step === 0 || !!busy}
          onClick={() => change({ step: Math.max(0, data.step - 1) })}
        >
          <ArrowLeft size={15} />
          Back
        </Button>
        <p className="hidden text-xs text-slate-400 sm:block">
          Your profile stays unchanged. This is a separate draft.
        </p>
        {data.step < 4 ? (
          <Button onClick={() => change({ step: data.step + 1 })} disabled={!!busy}>
            Continue
            <ArrowRight size={15} />
          </Button>
        ) : (
          <span className="text-xs text-slate-500">Ready when you are.</span>
        )}
      </div>
    </>
  );
}
