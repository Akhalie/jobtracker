import { z } from 'zod';
import { pool, getState, setState, listRecords, putRecord } from './db.js';
import {
  profileSchema,
  applicationSchema,
  documentSchema,
  preparationSchema,
  exportSchema,
  statuses,
  fail
} from './schemas.js';
import { readStored, saveFile, removeStored } from './files.js';

const date = z.iso.datetime();
const savedApp = applicationSchema.extend({
  id: z.uuid(),
  createdAt: date,
  updatedAt: date,
  history: z.array(z.object({ status: z.enum(statuses), at: date })).max(10000)
});
const savedDoc = documentSchema.extend({
  id: z.uuid(),
  createdAt: date,
  fontSize: exportSchema.shape.fontSize.optional(),
  margin: exportSchema.shape.margin.optional(),
  originalName: z.string().max(500).nullable().optional(),
  extractionWarning: z.string().max(500).optional(),
  file: z
    .object({
      extension: z.enum(['pdf', 'docx', 'txt', 'json']),
      data: z
        .string()
        .max(10 * 1024 * 1024)
        .regex(/^[A-Za-z0-9+/]*={0,2}$/)
    })
    .optional()
});
const backupSchema = z.object({
  version: z.literal(1),
  profile: profileSchema,
  preparation: preparationSchema,
  applications: z.array(savedApp).max(10000),
  documents: z.array(savedDoc).max(10000)
});
export async function exportBackup() {
  const documents = [];
  for (const { fileKey, ...document } of await listRecords('documents')) {
    documents.push({
      ...document,
      ...(fileKey
        ? { file: { extension: fileKey.split('.').at(-1), data: (await readStored(fileKey)).toString('base64') } }
        : {})
    });
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: await getState('profile', profileSchema.parse({})),
    preparation: await getState('preparation', preparationSchema.parse({})),
    applications: await listRecords('applications'),
    documents
  };
}
export async function restoreBackup(input) {
  const backup = backupSchema.parse(input);
  const appIds = new Set(backup.applications.map((app) => app.id)),
    docIds = new Set(backup.documents.map((doc) => doc.id));
  if (appIds.size !== backup.applications.length || docIds.size !== backup.documents.length) {
    throw fail(400, 'Backup contains duplicate identifiers.');
  }
  if (backup.applications.some((app) => app.documentIds.some((id) => !docIds.has(id)))) {
    throw fail(400, 'Backup references a missing document.');
  }
  if (
    backup.documents.some(
      (doc) => (doc.applicationId && !appIds.has(doc.applicationId)) || (doc.sourceId && !docIds.has(doc.sourceId))
    )
  ) {
    throw fail(400, 'Backup contains broken document references.');
  }
  const staged = [];
  const originalFiles = (await listRecords('documents')).map((doc) => doc.fileKey).filter(Boolean);
  const db = await pool.getConnection();
  try {
    const documents = [];
    for (const { file, ...document } of backup.documents) {
      let fileKey;
      if (file) {
        const buffer = Buffer.from(file.data, 'base64');
        if (buffer.length > 5 * 1024 * 1024) {
          throw fail(400, 'A backup file exceeds the upload limit.');
        }
        if (file.extension === 'pdf' && buffer.subarray(0, 5).toString() !== '%PDF-') {
          throw fail(400, 'Invalid PDF in backup.');
        }
        if (file.extension === 'docx' && (buffer[0] !== 0x50 || buffer[1] !== 0x4b)) {
          throw fail(400, 'Invalid DOCX in backup.');
        }
        fileKey = await saveFile(buffer, file.extension);
        staged.push(fileKey);
      }
      documents.push({ ...document, hasFile: Boolean(fileKey), ...(fileKey ? { fileKey } : {}) });
    }
    await db.beginTransaction();
    await db.execute('DELETE FROM applications');
    await db.execute('DELETE FROM documents');
    for (const app of backup.applications) {
      await putRecord('applications', app, db);
    }
    for (const doc of documents) {
      await putRecord('documents', doc, db);
    }
    await setState('profile', backup.profile, db);
    await setState('preparation', backup.preparation, db);
    await db.commit();
  } catch (error) {
    await db.rollback();
    await Promise.all(staged.map(removeStored));
    throw error;
  } finally {
    db.release();
  }
  const cleanup = await Promise.allSettled(originalFiles.map(removeStored));
  return {
    ok: true,
    applications: backup.applications.length,
    documents: backup.documents.length,
    ...(cleanup.some((result) => result.status === 'rejected')
      ? { warning: 'Restore succeeded, but some unreferenced old files could not be removed.' }
      : {})
  };
}
