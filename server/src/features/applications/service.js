import { randomUUID } from 'node:crypto';
import { applicationSchema, fail } from '../../lib/schemas.js';
import { pool, getRecord, putRecord } from '../../lib/db.js';

export function buildApplication(input, existing = null, now = new Date().toISOString()) {
  const fields = applicationSchema.parse({...existing,...input});
  if (!fields.company.trim() || !fields.role.trim()) throw fail(400,'Company and role are required.');
  const history = [...(existing?.history || [])];
  if (!existing || existing.status !== fields.status) history.push({status:fields.status,at:now});
  return {...fields,id:existing?.id || randomUUID(),createdAt:existing?.createdAt || now,updatedAt:now,history};
}
export async function saveApplication(input, existing) {
  const application = buildApplication(input, existing);
  for (const id of application.documentIds) if (!await getRecord('documents',id)) throw fail(400,'An attached document no longer exists.');
  return putRecord('applications',application);
}
export async function deleteApplication(id) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const [docs] = await db.execute('SELECT id,payload FROM documents');
    for (const row of docs) {
      const document = typeof row.payload==='string' ? JSON.parse(row.payload) : row.payload;
      if (document.applicationId===id) await putRecord('documents',{...document,applicationId:null},db);
    }
    await db.execute('DELETE FROM applications WHERE id=?',[id]);
    await db.commit();
  } catch (error) { await db.rollback(); throw error; }
  finally { db.release(); }
}
