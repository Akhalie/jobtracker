import { mkdir,readFile,writeFile,unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fail } from './schemas.js';
export const storage=path.resolve(process.env.STORAGE_DIR || 'storage');
export const filePath=key=>{
  if (!/^[a-f0-9-]{36}\.(pdf|docx|txt|json)$/.test(key)) throw fail(400,'Invalid storage file identifier.');
  return path.join(storage,key);
};
export async function saveFile(buffer,extension) {
  await mkdir(storage,{recursive:true});
  const key=`${randomUUID()}.${extension}`;
  await writeFile(filePath(key),buffer,{flag:'wx',mode:0o600});
  return key;
}
export const readStored=key=>readFile(filePath(key));
export const removeStored=key=>unlink(filePath(key)).catch(error=>{if(error.code!=='ENOENT')throw error;});
