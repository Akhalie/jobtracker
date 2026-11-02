import { normalizeProfile } from '../../lib/api.js';

export const resumeContent = (value) => (typeof value === 'string' ? value : normalizeProfile(value));
export function restoreResume(source, documents) {
  const selected = documents.find((doc) => doc.id === source?.selectedResumeId);
  const value = source?.resume;
  const legacy =
    selected &&
    typeof selected.content === 'string' &&
    value &&
    typeof value === 'object' &&
    value.summary === selected.content &&
    !value.name &&
    !value.email &&
    !value.phone &&
    !value.location &&
    !['experience', 'education', 'skills', 'projects', 'certifications', 'links'].some((key) => value[key]?.length);
  return legacy ? selected.content : resumeContent(value);
}
export function originalPdf(resume, document) {
  return Boolean(
    document?.hasFile &&
    /\.pdf$/i.test(document.originalName || '') &&
    typeof resume === 'string' &&
    resume === document.content
  );
}
