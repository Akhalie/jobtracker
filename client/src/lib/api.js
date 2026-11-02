export async function api(path, options = {}) {
  const headers = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers
  };
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...options,
      headers,
      body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the app is running and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}
export const statuses = [
  'Saved',
  'Preparing',
  'Applied',
  'Interviewing',
  'Offer',
  'Accepted',
  'Rejected',
  'Withdrawn',
  'Archived'
];
export const emptyProfile = () => ({
  name: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  links: [],
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: []
});
export function normalizeProfile(value) {
  const p = value && typeof value === 'object' ? value : {};
  return {
    ...emptyProfile(),
    ...p,
    ...Object.fromEntries(
      ['links', 'experience', 'education', 'skills', 'certifications', 'projects'].map((k) => [
        k,
        Array.isArray(p[k]) ? p[k] : []
      ])
    )
  };
}
export function dateText(value) {
  if (!value) {
    return '—';
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
