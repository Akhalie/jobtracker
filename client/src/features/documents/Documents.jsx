import { useState } from 'react';
import { Plus, Upload, Search, FileText, ArrowUpRight, Trash2 } from 'lucide-react';
import { api, emptyProfile, dateText } from '../../lib/api.js';
import DocumentViewer from '../../components/DocumentViewer.jsx';
import {
  PageHeader,
  Card,
  Button,
  Field,
  Input,
  Textarea,
  Empty,
  ErrorNote,
  Modal,
  Notice
} from '../../components/ui/index.jsx';

export default function Documents({ documents, applications, type, refresh }) {
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState(null),
    [create, setCreate] = useState(false),
    [title, setTitle] = useState(''),
    [text, setText] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const resume = type === 'resume';
  const list = documents.filter(
    (d) => d.type === type && `${d.title} ${d.originalName || ''}`.toLowerCase().includes(query.toLowerCase())
  );
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      form.append('title', file.name);
      const doc = await api('/documents/upload', { method: 'POST', body: form });
      await refresh();
      setSelected(doc);
      setNotice('Original file preserved. Review extracted content before editing.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }
  async function add() {
    setBusy(true);
    setError('');
    try {
      const doc = await api('/documents', {
        method: 'POST',
        body: { title, type, content: resume ? emptyProfile() : text }
      });
      await refresh();
      setCreate(false);
      setTitle('');
      setText('');
      setSelected(doc);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(doc) {
    if (!confirm(`Delete “${doc.title}”? This cannot be undone.`)) {
      return;
    }
    setError('');
    try {
      await api(`/documents/${doc.id}`, { method: 'DELETE' });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Your document library"
        title={resume ? 'Resumes / CVs' : 'Cover letters'}
        description={
          resume
            ? 'Keep your originals, tailored versions, and exported resumes together.'
            : 'Every letter, draft, and final version in one place.'
        }
      >
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">
          <Upload size={15} />
          Upload
          <input
            type="file"
            accept={resume ? '.pdf,.docx,.txt,.json' : '.pdf,.docx,.txt'}
            disabled={busy}
            className="sr-only"
            onChange={upload}
          />
        </label>
        <Button
          onClick={() => {
            setCreate(true);
            setError('');
          }}
        >
          <Plus size={15} />
          New {resume ? 'resume' : 'cover letter'}
        </Button>
      </PageHeader>
      <ErrorNote>{error}</ErrorNote>
      <Notice>{notice}</Notice>
      <div className="relative mb-5 max-w-md">
        <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
        <Input
          aria-label="Search documents"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/10"
        />
      </div>
      {!list.length ? (
        <Card>
          <Empty
            title={query ? 'No matching documents' : `Your ${resume ? 'resume' : 'cover letter'} library starts here`}
            description="Upload an existing document, create a draft, or prepare an application to save tailored versions."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((doc) => {
            const used = applications.filter((a) => a.documentIds?.includes(doc.id));
            return (
              <Card key={doc.id} className="flex flex-col p-5">
                <div className="mb-5 flex items-start justify-between">
                  <span className="rounded-xl bg-brand/8 p-3 text-brand">
                    <FileText size={22} />
                  </span>
                  <button
                    onClick={() => remove(doc)}
                    aria-label={`Delete ${doc.title}`}
                    className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h2 className="truncate font-semibold" title={doc.title}>
                  {doc.title}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {dateText(doc.createdAt)} · {doc.hasFile ? 'File available' : 'Editable draft'}
                  {doc.sourceId ? ' · New version' : ''}
                </p>
                <p className="mb-5 mt-4 min-h-5 text-xs text-slate-500">
                  {used.length ? `Used in ${used.map((a) => a.company).join(', ')}` : 'Not linked to an application'}
                </p>
                <button
                  onClick={() => setSelected(doc)}
                  className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-brand"
                >
                  View {resume ? 'resume / CV' : 'cover letter'}
                  <ArrowUpRight size={16} />
                </button>
              </Card>
            );
          })}
        </div>
      )}
      {selected && <DocumentViewer document={selected} onClose={() => setSelected(null)} refresh={refresh} />}
      {create && (
        <Modal title={`New ${resume ? 'resume' : 'cover letter'}`} onClose={() => setCreate(false)}>
          <ErrorNote>{error}</ErrorNote>
          <Field label="Document title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={resume ? 'My master resume' : 'Cover letter — Company'}
            />
          </Field>
          {!resume && (
            <Field label="Letter content" className="mt-4">
              <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
          )}
          <div className="mt-5 flex justify-end">
            <Button onClick={add} disabled={!title.trim()} loading={busy}>
              Create draft
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
