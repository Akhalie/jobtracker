import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreview({ src, title = 'PDF preview' }) {
  const container = useRef(null);
  const [status, setStatus] = useState('Loading PDF…'),
    [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    const target = container.current;
    target.replaceChildren();
    setStatus('Loading PDF…');
    setError('');
    const loading = getDocument({ url: src, withCredentials: true, isEvalSupported: false });
    (async () => {
      try {
        const pdf = await loading.promise;
        if (pdf.numPages > 50) {
          throw new Error('This preview supports up to 50 pages. Download the file to view the complete document.');
        }
        for (let index = 1; index <= pdf.numPages; index++) {
          if (cancelled) {
            return;
          }
          const page = await pdf.getPage(index);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = 'mx-auto block h-auto max-w-full bg-white shadow-sm';
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `PDF page ${index} of ${pdf.numPages}`);
          await page.render({ canvas, viewport }).promise;
          if (cancelled) {
            return;
          }
          target.append(canvas);
        }
        setStatus(`${pdf.numPages} ${pdf.numPages === 1 ? 'page' : 'pages'}`);
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'The PDF could not be displayed. Open the original file below.');
          setStatus('');
        }
      }
    })();
    return () => {
      cancelled = true;
      loading.destroy().catch(() => {});
    };
  }, [src]);
  return (
    <section title={title} aria-label={title}>
      <p role="status" className="mb-2 text-xs text-slate-500">
        {status}
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div ref={container} className="max-h-[75vh] space-y-4 overflow-auto rounded-lg bg-slate-100 p-3" />
      <a href={src} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-brand underline">
        Open original PDF
      </a>
    </section>
  );
}
