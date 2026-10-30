import { z } from 'zod';

export const text = z.string().max(50000);
export const short = z.string().max(500);
export const url = z.string().max(2000).refine(value => !value || /^https?:\/\//i.test(value), 'Use an http or https URL');
const date = z.string().max(40).refine(value => !value || Number.isFinite(Date.parse(value)), 'Invalid date');
export const profileSchema = z.object({
  name: short.default(''), email: z.string().max(254).refine(value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Invalid email').default(''),
  phone: short.default(''), location: short.default(''), summary: text.default(''),
  links: z.array(z.object({ label: short.default(''), url: url.default('') })).max(30).default([]),
  experience: z.array(z.object({ company: short.default(''), title: short.default(''), start: short.default(''), end: short.default(''), description: text.default('') })).max(100).default([]),
  education: z.array(z.object({ school: short.default(''), degree: short.default(''), start: short.default(''), end: short.default('') })).max(100).default([]),
  skills: z.array(short).max(200).default([]),
  certifications: z.array(z.object({ name: short.default(''), issuer: short.default(''), date: short.default(''), url: url.default('') })).max(100).default([]),
  projects: z.array(z.object({ name: short.default(''), role: short.default(''), description: text.default(''), technologies: short.default(''), url: url.default(''), start: short.default(''), end: short.default('') })).max(100).default([]),
});
export const statuses = ['Saved', 'Preparing', 'Applied', 'Interviewing', 'Offer', 'Accepted', 'Rejected', 'Withdrawn', 'Archived'];
export const jobSchema = z.object({company: short.default(''), role: short.default(''), description: text.default(''), url: url.default(''), location: short.default(''), salary: short.default('')});
export const applicationSchema = jobSchema.extend({
  status: z.enum(statuses).default('Saved'), appliedAt: date.nullish().transform(value => value || ''),
  channel: short.default(''), contact: text.default(''), notes: text.default(''),
  interviews: z.array(z.object({ id: short.default(''), title: short, date: date.default(''), url: url.default(''), notes: text.default('') })).max(100).default([]),
  tasks: z.array(z.object({ id: short.default(''), title: short, due: date.default(''), done: z.boolean().default(false) })).max(500).default([]),
  documentIds: z.array(z.uuid()).max(200).default([]),
});
export const exportSchema = z.object({ template: z.enum(['classic', 'modern']).default('classic'), paper: z.enum(['A4', 'Letter']).default('A4'), fontSize: z.union([z.literal(10),z.literal(11),z.literal(12)]).default(11), margin: z.union([z.literal(12),z.literal(16),z.literal(20)]).default(16) });
export const documentSchema = z.object({type: z.enum(['resume','cover-letter']), title: short.min(1), content: z.union([profileSchema, text]), applicationId: z.uuid().nullable().optional(), sourceId: z.uuid().nullable().optional(), template: exportSchema.shape.template, paper: exportSchema.shape.paper});
export const comparisonSchema = z.object({matches:z.array(short).max(50),gaps:z.array(short).max(50),suggestions:z.array(text).max(50),keywords:z.array(short).max(100),score:z.number().min(0).max(100)});
const optionalId=z.preprocess(value=>value===''?null:value,z.uuid().nullable().optional());
export const preparationSchema = z.object({step:z.number().int().min(0).max(4).default(0),job:jobSchema.prefault({}),resume:z.union([profileSchema,text]).prefault({}),coverLetter:text.default(''),comparison:comparisonSchema.nullable().default(null),selectedResumeId:optionalId,applicationId:optionalId,resumeDocumentId:optionalId,coverDocumentId:optionalId,skipCoverLetter:z.boolean().default(false),template:exportSchema.shape.template,paper:exportSchema.shape.paper,fontSize:exportSchema.shape.fontSize,margin:exportSchema.shape.margin});
export const idSchema = z.uuid();
export function fail(status, message) { return Object.assign(new Error(message), {status}); }
