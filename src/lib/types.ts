import type { ForumCategoryId } from './forum';
export type Role = 'campus' | 'admin';
export interface DemoSession { role: Role; name: string; campusId?: string }
export interface AppSession extends DemoSession { id: string }
export interface PreviewAccount { key: string; name: string; role: Role }
export interface LocationDto { campusId: string; province: string; island: string; longitude: number | null; latitude: number | null; approximate: boolean }
export interface Bootstrap { session: AppSession; data: Snapshot; locations: LocationDto[]; capabilities: { readOnly: boolean }; loadedAt: string }
export interface Campus { id: string; name: string; region: string; initials: string; acronym?: string; city?: string; source?: 'user' | 'document' | 'admin'; revision?: number }
export interface IndicatorDefinition { id: string; name: string; category: string; unit: string; description: string }
export interface MasterDefinition extends IndicatorDefinition { code: string; baseline: number; target: number; status: 'draft' | 'active'; revision: number }
export interface DefinitionInput { id?: string; revision?: number; code: string; name: string; category: string; unit: string; description: string; baseline: number; target: number }
export interface CampusInput { id?: string; revision?: number; name: string; initials: string; acronym: string; region: string; city: string; province: string; island: string; latitude: number | null; longitude: number | null; approximate: boolean }
export interface MasterAudit { id: string; actor: string; entity: string; entityId: string; operation: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; created: string }
export interface MasterData { definitions: MasterDefinition[]; audit: MasterAudit[] }
export interface CampusIndicator { id: string; campusId: string; definitionId: string; baseline: number; target: number; current: number; note: string; updatedAt: string }
export interface SubmissionIndicator extends CampusIndicator { name: string; category: string; unit: string; description?: string }
export type VerificationStatus = 'pending' | 'approved' | 'revision';
export interface DebSubmission { id: string; campusId: string; version: number; status: VerificationStatus; indicators: SubmissionIndicator[]; submittedAt: string; reviewedAt?: string; reviewedBy?: string; decisionNote?: string; simulated?: boolean }
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
  locations?: LocationDto[];
  campusRosterVersion?: number;
  submissions?: DebSubmission[];
  campuses: Campus[]; definitions: IndicatorDefinition[]; indicators: CampusIndicator[];
  feedback: Feedback[]; proposals: ProposalVersion[]; questions: Question[];
  answers: Answer[]; likes: QuestionLike[]; faq: FaqEntry[]; activities: Activity[]; notifications: Notification[]; notificationSeedVersion?: number;
}
export interface DataService {
  masters(): Promise<MasterData>;
  saveCampus(input: CampusInput): Promise<void>;
  deleteCampus(id: string, revision: number): Promise<void>;
  saveDefinition(input: DefinitionInput): Promise<void>;
  activateDefinition(id: string, revision: number): Promise<void>;
  deleteDefinition(id: string, revision: number): Promise<void>;
  submitDeb(): Promise<void>;
  reviewDeb(submissionId: string, decision: 'approved' | 'revision', note: string): Promise<void>;
  load(): Promise<Snapshot>;
  updateIndicator(id: string, current: number, note: string): Promise<void>;
  addFeedback(indicatorId: string, text: string, requiresRevision: boolean): Promise<void>;
  closeFeedback(id: string): Promise<void>;
  uploadProposal(file: File, changes: string): Promise<void>;
  proposalFile(id: string): Promise<Blob>;
  ask(title: string, body: string, categoryIds?: ForumCategoryId[]): Promise<string>;
  answer(questionId: string, body: string): Promise<void>;
  setLike(questionId: string, liked: boolean): Promise<void>;
  promoteFaq(questionId: string): Promise<void>;
  saveFaq(entry: Pick<FaqEntry, 'question' | 'answer'> & { id?: string }): Promise<void>;
  moveFaq(id: string, direction: -1 | 1): Promise<void>;
  deleteFaq(id: string): Promise<void>;
  readNotifications(ids?: string[]): Promise<void>;
}
