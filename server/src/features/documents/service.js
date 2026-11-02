import { randomUUID } from 'node:crypto';
import { getRecord, putRecord } from '../../lib/db.js';
import { documentSchema, fail } from '../../lib/schemas.js';
import { saveFile, removeStored } from '../../lib/files.js';
import { fromJsonResume } from '../../lib/json-resume.js';

export function publicDocument({ fileKey, ...value }) {
  // Older imports stored the complete extracted document in summary.
  const legacy =
    value.type === 'resume' &&
    typeof value.content === 'object' &&
    /^(Imported text is in Summary|No text found)/.test(value.extractionWarning || '');
  return { ...value, ...(legacy ? { content: value.content.summary || '' } : {}) };
}
export async function buildDocument(input, existing = null) {
  const fields = documentSchema.parse(input);
  if (fields.applicationId && !(await getRecord('applications', fields.applicationId))) {
    throw fail(400, 'Linked application not found.');
  }
  if (fields.sourceId && !(await getRecord('documents', fields.sourceId))) {
    throw fail(400, 'Source document not found.');
  }
  const value = {
    ...fields,
    id: randomUUID(),
    sourceId: existing?.id || fields.sourceId || null,
    createdAt: new Date().toISOString(),
    hasFile: false,
    originalName: null
  };
  return value;
}
export async function saveDocument(input, existing = null) {
  return putRecord('documents', await buildDocument(input, existing));
}
export async function importDocument(file, type, title) {
  const name = file.originalname.toLowerCase();
  let extension, content;
  if (name.endsWith('.pdf') && file.buffer.subarray(0, 5).toString() === '%PDF-') {
    extension = 'pdf';
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loading = getDocument({ data: new Uint8Array(file.buffer), isEvalSupported: false, useSystemFonts: true });
    let pdf;
    try {
      pdf = await loading.promise;
      if (pdf.numPages > 50) {
        throw fail(400, 'Resume imports are limited to 50 pages.');
      }
      const pages = [];
      for (let index = 1; index <= pdf.numPages; index++) {
        pages.push(
          (await (await pdf.getPage(index)).getTextContent()).items
            .map((item) => (item.str || '') + (item.hasEOL ? '\n' : ' '))
            .join('')
        );
      }
      content = pages.join('\n\n');
    } catch (error) {
      if (error.status) {
        throw error;
      }
      throw fail(400, 'This PDF could not be read. Use a text-based, unencrypted PDF.');
    } finally {
      await loading.destroy();
    }
  } else if (name.endsWith('.docx') && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b) {
    extension = 'docx';
    const mammoth = await import('mammoth');
    try {
      content = (await mammoth.default.extractRawText({ buffer: file.buffer })).value;
    } catch {
      throw fail(400, 'This DOCX could not be read.');
    }
  } else if (name.endsWith('.txt')) {
    extension = 'txt';
    content = file.buffer.toString('utf8');
  } else if (name.endsWith('.json') && type === 'resume') {
    extension = 'json';
    let parsed;
    try {
      parsed = JSON.parse(file.buffer.toString('utf8'));
    } catch {
      throw fail(400, 'This file is not valid JSON.');
    }
    content = fromJsonResume(parsed);
  } else {
    throw fail(400, 'Upload a PDF, DOCX, TXT, or JSON Resume document.');
  }
  if (content.length > 50000) {
    throw fail(400, 'The extracted text is too long (maximum 50,000 characters).');
  }
  const value = await buildDocument({ type, title: title || file.originalname, content });
  const fileKey = await saveFile(file.buffer, extension);
  try {
    return await putRecord('documents', {
      ...value,
      fileKey,
      hasFile: true,
      originalName: file.originalname,
      extractionWarning:
        typeof content === 'object'
          ? 'Imported JSON Resume fields. Review before exporting.'
          : !content.trim()
            ? 'No text found. Scanned documents need manual entry or OCR.'
            : 'Extracted text is kept separately from the original file. Review before editing.'
    });
  } catch (error) {
    await removeStored(fileKey);
    throw error;
  }
}
