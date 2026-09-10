import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Snapshot, AppSession } from '../../types';
import type { PageRequest, NavigationData } from '../../page-data';
import * as map from './mappers';
import { PreviewError } from './preview-error';

const collections = {
  campuses: 'campuses', definitions: 'indicator_definitions', indicators: 'campus_indicators', submissions: 'deb_submissions',
  feedback: 'indicator_feedback', proposals: 'proposal_versions', questions: 'questions', answers: 'question_answers',
  likes: 'question_likes', faq: 'faq_entries', activities: 'activities', notifications: 'notifications'
} as const;
type Resource = keyof typeof collections;
const stats: Resource[] = ['campuses', 'definitions', 'indicators', 'feedback', 'proposals'];
const dependencies: Record<PageRequest['view'], Resource[]> = {
  guide: [],
  dashboard: [...stats, 'activities', 'questions', 'likes'], campuses: stats,
  'campus-detail': [...stats, 'submissions'], accounts: ['campuses'], map: stats,
  indicators: ['campuses', 'definitions', 'indicators', 'feedback', 'submissions'], proposals: ['campuses', 'proposals'],
  questions: ['campuses', 'questions', 'answers', 'likes', 'faq'], 'question-detail': ['campuses', 'questions', 'answers', 'likes', 'faq'],
  faq: ['faq'], notifications: ['campuses', 'notifications'], review: ['campuses', 'definitions', 'indicators', 'feedback', 'submissions'], masters: []
};

/** Only requested page collections are read, using the authenticated user (never a superuser). */
export async function readPage(pb: PocketBase, actor: AppSession, request: PageRequest): Promise<Partial<Snapshot>> {
  const adminOnly = ['campuses', 'campus-detail', 'accounts', 'map', 'review', 'masters'];
  if (adminOnly.includes(request.view) && actor.role !== 'admin') throw new PreviewError(403, 'Halaman ini hanya untuk Admin.');
  if (request.campus && actor.role !== 'admin' && request.campus !== actor.campusId) throw new PreviewError(403, 'Kampus tidak dapat diakses.');
  if (request.view === 'campus-detail' && !request.campus) throw new PreviewError(400, 'Kampus wajib dipilih.');
  if (request.view === 'question-detail' && !request.question) throw new PreviewError(400, 'Pertanyaan wajib dipilih.');
  let keys = [...dependencies[request.view]];
  if (request.view === 'campus-detail') {
    if (request.tab === 'Proposal') keys = ['campuses', 'proposals', 'feedback'];
    else if (request.tab === 'Feedback') keys = ['campuses', 'definitions', 'indicators', 'feedback'];
    else if (request.tab === 'Indikator') keys = ['campuses', 'definitions', 'indicators', 'feedback', 'submissions'];
    else keys = stats;
  }
  const raw: Partial<Record<Resource, RecordModel[]>> = {};
  await Promise.all(keys.map(async key => {
    const filters: string[] = [];
    if (key === 'definitions') filters.push('status = "active"');
    if (key === 'indicators') filters.push('definition.status = "active"');
    if (request.campus) {
      if (key === 'campuses') filters.push(pb.filter('id = {:id}', { id: request.campus }));
      else if (['indicators', 'feedback', 'submissions', 'proposals', 'activities'].includes(key)) filters.push(pb.filter('campus = {:id}', { id: request.campus }));
    }
    if (request.question) {
      if (key === 'questions') filters.push(pb.filter('id = {:id}', { id: request.question }));
      if (['answers', 'likes', 'faq'].includes(key)) filters.push(pb.filter('question = {:id}', { id: request.question }));
    }
    const options = { sort: key === 'faq' ? 'order,id' : 'id', ...(filters.length ? { filter: filters.join(' && ') } : {}) };
    // The dashboard only displays four activities. Other page collections are never queried here.
    raw[key] = key === 'activities' ? (await pb.collection(collections[key]).getList(1, 4, { ...options, sort: '-created,-id' })).items : await pb.collection(collections[key]).getFullList(options);
  }));
  const data: Partial<Snapshot> = {};
  if (raw.campuses) data.campuses = raw.campuses.map(map.mapCampus);
  if (raw.definitions) data.definitions = raw.definitions.map(map.mapDefinition);
  if (raw.indicators) {
    const masters = new Map(raw.definitions!.map(d => [d.id, d]));
    data.indicators = raw.indicators.map(r => map.mapIndicator({ ...r, baseline: masters.get(r.definition)!.baseline, target: masters.get(r.definition)!.target }));
  }
  if (raw.submissions) data.submissions = raw.submissions.map(map.mapSubmission);
  if (raw.feedback) data.feedback = raw.feedback.map(map.mapFeedback);
  if (raw.proposals) data.proposals = raw.proposals.map(map.mapProposal);
  if (raw.questions) data.questions = raw.questions.map(map.mapQuestion);
  if (raw.answers) data.answers = raw.answers.map(map.mapAnswer);
  if (raw.likes) data.likes = raw.likes.map(map.mapLike);
  if (raw.faq) data.faq = raw.faq.map(map.mapFaq);
  if (raw.activities) data.activities = raw.activities.map(map.mapActivity);
  if (raw.notifications) data.notifications = raw.notifications.map(r => map.mapNotification(r, actor.role));
  if (raw.campuses && ['campuses', 'campus-detail', 'map'].includes(request.view)) data.locations = raw.campuses.map(map.mapLocation);
  return data;
}

export async function readNavigation(pb: PocketBase, actor: AppSession): Promise<NavigationData> {
  const count = async (collection: string, filter: string) => (await pb.collection(collection).getList(1, 1, { filter, fields: 'id' })).totalItems;
  const [pendingCount, revisionCount, unreadCount, campus] = await Promise.all([
    actor.role === 'admin' ? count('deb_submissions', 'status = "pending"') : 0,
    actor.role === 'campus' ? count('indicator_feedback', 'requiresRevision = true && state != "closed"') : 0,
    count('notifications', 'readAt = ""'),
    actor.campusId ? pb.collection('campuses').getOne(actor.campusId).then(map.mapCampus) : undefined
  ]);
  return { pendingCount, revisionCount, unreadCount, ...(campus ? { campus } : {}) };
}
