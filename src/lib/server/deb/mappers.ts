import type { RecordModel } from 'pocketbase';
import type { Activity, Answer, Campus, CampusIndicator, DebSubmission, FaqEntry, Feedback, IndicatorDefinition, Notification, ProposalVersion, Question, QuestionLike, Role } from '../../types';
import { validateCategories } from '../../forum';

const date = (value: string) => new Date(value).toISOString();
export interface BackendSession { id: string; name: string; role: Role; campusId?: string }
export function mapSession(r: RecordModel): BackendSession {
  if (!r.active || !['campus', 'admin'].includes(r.role) || (r.role === 'campus' && !r.campus)) throw new Error('Inactive or invalid DEB account');
  return { id: r.id, name: r.name, role: r.role, ...(r.campus ? { campusId: r.campus } : {}) };
}
export const mapCampus = (r: RecordModel): Campus => ({ id: r.id, name: r.name, region: r.region, initials: r.initials, acronym: r.acronym, city: r.city, source: r.source });
export const mapLocation = (r: RecordModel) => ({ campusId: r.id, province: r.province as string, island: r.island as string,
  longitude: r.longitude as number, latitude: r.latitude as number, approximate: r.locationApproximate as boolean });
export const mapDefinition = (r: RecordModel): IndicatorDefinition => ({ id: r.id, name: r.name, category: r.category, unit: r.unit, description: r.description });
export const mapIndicator = (r: RecordModel): CampusIndicator => ({ id: r.id, campusId: r.campus, definitionId: r.definition, baseline: r.baseline, target: r.target, current: r.current, note: r.note, updatedAt: date(r.updated) });
export const mapSubmission = (r: RecordModel): DebSubmission => ({ id: r.id, campusId: r.campus, version: r.version, status: r.status,
  indicators: r.snapshot.map((i: CampusIndicator) => ({ id: i.id, campusId: i.campusId, definitionId: i.definitionId, baseline: i.baseline, target: i.target, current: i.current, note: i.note, updatedAt: date(i.updatedAt) })),
  submittedAt: date(r.submittedAt), reviewedAt: r.reviewedAt ? date(r.reviewedAt) : undefined, reviewedBy: r.reviewedBy || undefined, decisionNote: r.decisionNote || undefined, simulated: r.simulated });
export const mapFeedback = (r: RecordModel): Feedback => ({ id: r.id, campusId: r.campus, indicatorId: r.indicator, text: r.text, requiresRevision: r.requiresRevision, state: r.state, createdAt: date(r.created), updatedAt: date(r.updated) });
export const mapProposal = (r: RecordModel): ProposalVersion => ({ id: r.id, campusId: r.campus, version: r.version, filename: r.filename, size: r.size, changes: r.changes, createdAt: date(r.created), simulated: r.simulated });
export const mapQuestion = (r: RecordModel): Question => ({ id: r.id, campusId: r.campus, title: r.title, body: r.body, categoryIds: validateCategories(r.categoryIds), createdAt: date(r.created) });
export const mapAnswer = (r: RecordModel): Answer => ({ id: r.id, questionId: r.question, body: r.body, updatedAt: date(r.updated) });
export const mapLike = (r: RecordModel): QuestionLike => ({ id: r.id, questionId: r.question, campusId: r.campus });
export const mapFaq = (r: RecordModel): FaqEntry => ({ id: r.id, questionId: r.sourceQuestion || undefined, question: r.question, answer: r.answer, order: r.order });
export const mapActivity = (r: RecordModel): Activity => ({ id: r.id, campusId: r.campus, text: r.text, createdAt: date(r.created) });
export const mapNotification = (r: RecordModel, role: Role): Notification => ({ id: r.id, campusId: r.campus, recipient: role, title: r.title, body: r.body, href: r.target, createdAt: date(r.created), readAt: r.readAt ? date(r.readAt) : null, simulated: r.simulated });
