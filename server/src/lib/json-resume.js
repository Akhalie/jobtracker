import { z } from 'zod';
import { profileSchema, short, text, url } from './schemas.js';

const strings = z.array(short).max(200).default([]);
const entries = (schema) => z.array(z.object(schema)).max(100).default([]);
const date = short.default('');
const jsonResume = z
  .object({
    basics: z
      .object({
        name: short.default(''),
        email: short.default(''),
        phone: short.default(''),
        summary: text.default(''),
        url: url.default(''),
        location: z
          .object({ city: short.default(''), region: short.default(''), countryCode: short.default('') })
          .default({}),
        profiles: entries({ network: short.default(''), url: url.default('') })
      })
      .prefault({}),
    work: entries({
      name: short.default(''),
      position: short.default(''),
      startDate: date,
      endDate: date,
      summary: text.default(''),
      highlights: z.array(text).max(100).default([])
    }),
    education: entries({
      institution: short.default(''),
      area: short.default(''),
      studyType: short.default(''),
      startDate: date,
      endDate: date
    }),
    skills: entries({ name: short.default(''), keywords: strings }),
    certificates: entries({ name: short.default(''), issuer: short.default(''), date, url: url.default('') }),
    projects: entries({
      name: short.default(''),
      description: text.default(''),
      entity: short.default(''),
      roles: strings,
      keywords: strings,
      url: url.default(''),
      startDate: date,
      endDate: date
    }),
    custom: z.object({ jobTracker: profileSchema.optional() }).optional()
  })
  .refine(
    (value) => value.basics.name || value.work.length || value.projects.length || value.custom?.jobTracker,
    'This file does not contain a recognizable JSON Resume.'
  );

export function fromJsonResume(input) {
  const p = jsonResume.parse(input);
  if (p.custom?.jobTracker) {
    return p.custom.jobTracker;
  }
  return profileSchema.parse({
    name: p.basics.name,
    email: p.basics.email,
    phone: p.basics.phone,
    summary: p.basics.summary,
    location: [p.basics.location.city, p.basics.location.region, p.basics.location.countryCode]
      .filter(Boolean)
      .join(', '),
    links: [
      ...(p.basics.url ? [{ label: 'Website', url: p.basics.url }] : []),
      ...p.basics.profiles.map((item) => ({ label: item.network, url: item.url }))
    ],
    experience: p.work.map((item) => ({
      company: item.name,
      title: item.position,
      start: item.startDate,
      end: item.endDate,
      description: [item.summary, ...item.highlights].filter(Boolean).join('\n')
    })),
    education: p.education.map((item) => ({
      school: item.institution,
      degree: [item.studyType, item.area].filter(Boolean).join(' '),
      start: item.startDate,
      end: item.endDate
    })),
    skills: [...new Set(p.skills.flatMap((item) => [item.name, ...item.keywords]).filter(Boolean))],
    certifications: p.certificates,
    projects: p.projects.map((item) => ({
      name: item.name,
      role: item.roles.join(', '),
      description: item.description,
      technologies: item.keywords.join(', '),
      url: item.url,
      start: item.startDate,
      end: item.endDate
    }))
  });
}
const dates = (start, end) => ({
  ...(/^\d{4}(-\d{2}){0,2}$/.test(start) ? { startDate: start } : {}),
  ...(/^\d{4}(-\d{2}){0,2}$/.test(end) ? { endDate: end } : {})
});
export function toJsonResume(input) {
  const p = profileSchema.parse(input);
  return {
    basics: {
      name: p.name,
      email: p.email,
      phone: p.phone,
      summary: p.summary,
      location: { city: p.location },
      profiles: p.links.map((item) => ({ network: item.label, url: item.url }))
    },
    work: p.experience.map((item) => ({
      name: item.company,
      position: item.title,
      ...dates(item.start, item.end),
      summary: item.description
    })),
    education: p.education.map((item) => ({
      institution: item.school,
      area: item.degree,
      ...dates(item.start, item.end)
    })),
    skills: p.skills.map((name) => ({ name })),
    certificates: p.certifications,
    projects: p.projects.map((item) => ({
      name: item.name,
      description: item.description,
      roles: item.role ? [item.role] : [],
      keywords: item.technologies
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      url: item.url,
      ...dates(item.start, item.end)
    })),
    custom: { jobTracker: p }
  };
}
