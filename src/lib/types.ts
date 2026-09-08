import type { ForumCategoryId } from './forum';
export type Role = 'campus' | 'admin';
export interface DemoSession { role: Role; name: string; campusId?: string }
export interface Campus { id: string; name: string; region: string; initials: string; acronym?: string; city?: string; source?: 'user' | 'document' }
export interface IndicatorDefinition { id: string; name: string; category: string; unit: string; description: string }
export interface CampusIndicator { id: string; campusId: string; definitionId: string; baseline: number; target: number; current: number; note: string; updatedAt: string }
export type VerificationStatus = 'pending' | 'approved' | 'revision';
export interface DebSubmission { id: string; campusId: string; version: number; status: VerificationStatus; indicators: CampusIndicator[]; submittedAt: string; reviewedAt?: string; reviewedBy?: string; decisionNote?: string; simulated?: boolean }
export type FeedbackState = 'open' | 'responded' | 'closed';
export interface Feedback { id: string; campusId: string; indicatorId: string; text: string; requiresRevision: boolean; state: FeedbackState; createdAt: string; updatedAt: string }
export interface ProposalVersion { id: string; campusId: string; version: number; filename: string; size: number; createdAt: string; changes: string; simulated: boolean }
export interface Question { id: string; campusId: string; title: string; body: string; createdAt: string; categoryIds?: ForumCategoryId[] }
export interface Answer { id: string; questionId: string; body: string; updatedAt: string }
export interface QuestionLike { id: string; questionId: string; campusId: string }
export interface FaqEntry { id: string; questionId?: string; question: string; answer: string; order: number }
export interface Activity { id: string; campusId: string; text: string; createdAt: string }
export interface Notification { id: string; campusId: string; recipient: Role; title: string; body: string; href: string; createdAt: string; readAt: string | null; simulated?: boolean }
export interface Snapshot {
  campusRosterVersion?: number;
  submissions?: DebSubmission[];
  campuses: Campus[]; definitions: IndicatorDefinition[]; indicators: CampusIndicator[];
  feedback: Feedback[]; proposals: ProposalVersion[]; questions: Question[];
  answers: Answer[]; likes: QuestionLike[]; faq: FaqEntry[]; activities: Activity[]; notifications: Notification[]; notificationSeedVersion?: number;
}
export interface DataService {
  submitDeb(actor: DemoSession): Promise<void>;
  reviewDeb(actor: DemoSession, submissionId: string, decision: 'approved' | 'revision', note: string): Promise<void>;
  load(actor: DemoSession): Promise<Snapshot>;
  updateIndicator(actor: DemoSession, id: string, current: number, note: string): Promise<void>;
  addFeedback(actor: DemoSession, indicatorId: string, text: string, requiresRevision: boolean): Promise<void>;
  closeFeedback(actor: DemoSession, id: string): Promise<void>;
  uploadProposal(actor: DemoSession, file: File, changes: string): Promise<void>;
  proposalFile(actor: DemoSession, id: string): Promise<Blob>;
  ask(actor: DemoSession, title: string, body: string, categoryIds?: ForumCategoryId[]): Promise<string>;
  answer(actor: DemoSession, questionId: string, body: string): Promise<void>;
  toggleLike(actor: DemoSession, questionId: string): Promise<void>;
  promoteFaq(actor: DemoSession, questionId: string): Promise<void>;
  saveFaq(actor: DemoSession, entry: Pick<FaqEntry, 'question' | 'answer'> & { id?: string }): Promise<void>;
  moveFaq(actor: DemoSession, id: string, direction: -1 | 1): Promise<void>;
  deleteFaq(actor: DemoSession, id: string): Promise<void>;
  readNotifications(actor: DemoSession, ids?: string[]): Promise<void>;
  reset(): Promise<void>;
}
