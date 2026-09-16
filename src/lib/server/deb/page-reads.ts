import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Snapshot, AppSession } from '../../types';
import { emptyPageData, type PageRequest, type NavigationData } from '../../page-data';
import { campusStats } from '../../domain';
import * as map from './mappers';
import { PreviewError } from './preview-error';
import { periodsFrom, activePeriodFilter } from '../../periods';

const collections = {
  campuses: 'campuses', definitions: 'indicator_definitions', indicators: 'campus_indicators', submissions: 'deb_submissions',
  feedback: 'indicator_feedback', proposals: 'proposal_versions', questions: 'questions', answers: 'question_answers',
  likes: 'question_likes', faq: 'faq_entries', activities: 'activities', notifications: 'notifications'
} as const;
type Resource = keyof typeof collections;
// Read only mapper inputs, excluding unused PocketBase metadata and storage fields.
const fields: Record<Resource, string> = {
  campuses: 'id,name,region,initials,acronym,city,source,revision,province,island,hasLocation,longitude,latitude,locationApproximate',
  definitions: 'id,name,category,unit,description,baseline,target,period,periodState',
  indicators: 'id,campus,definition,current,unfilled,note,updated',
  submissions: 'id,campus,period,version,status,snapshot,submittedAt,reviewedAt,reviewedBy,decisionNote,simulated',
  feedback: 'id,campus,indicator,text,requiresRevision,state,created,updated',
  proposals: 'id,campus,version,filename,size,changes,created,simulated,reviewNote,reviewedAt,reviewedBy,reviewRevision',
  questions: 'id,campus,title,body,categoryIds,replyCount,lastReplyRole,created',
  answers: 'id,question,body,updated', likes: 'id,question,campus',
  faq: 'id,sourceQuestion,question,answer,order', activities: 'id,campus,text,created',
  notifications: 'id,campus,title,body,target,created,readAt,simulated'
};
const stats: Resource[] = ['campuses', 'definitions', 'indicators', 'feedback', 'proposals'];
const dependencies: Record<PageRequest['view'], Resource[]> = {
  guide: [],
  dashboard: [...stats, 'activities', 'questions', 'likes'], campuses: stats,
  'campus-detail': [...stats, 'submissions'], accounts: ['campuses'], map: stats,
  indicators: ['campuses', 'definitions', 'indicators', 'feedback', 'submissions'], proposals: ['campuses', 'proposals'],
  questions: ['campuses', 'questions', 'answers', 'likes'], 'question-detail': ['campuses', 'questions', 'answers', 'likes', 'faq'],
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
  if (request.view === 'notifications' && actor.role === 'campus') keys = ['notifications'];
  if (request.view === 'campus-detail') {
    if (request.tab === 'Proposal') keys = ['campuses', 'proposals', 'feedback'];
    else if (request.tab === 'Feedback') keys = ['campuses', 'definitions', 'indicators', 'feedback'];
    else if (request.tab === 'Indikator') keys = ['campuses', 'definitions', 'indicators', 'feedback', 'submissions'];
    else keys = stats;
  }
  const raw: Partial<Record<Resource, RecordModel[]>> = {};
  const periodPage = keys.some(key => ['definitions','indicators','submissions'].includes(key));
  const periods = periodPage ? periodsFrom(await pb.collection('indicator_definitions').getFullList({ fields: 'id,period,periodState', filter: 'periodState != "draft"', sort: 'created,id' })) : [];
  const selected = request.period === undefined ? periods.find(p => p.state === 'active') : periods.find(p => p.id === request.period);
  if (request.period !== undefined && periodPage && !selected) throw new PreviewError(404, 'Periode tidak ditemukan.');
  const periodFilter = pb.filter('period = {:period}', { period: selected?.id || '' });
  if (request.view === 'review') {
    raw.submissions = await pb.collection(collections.submissions).getFullList({ fields: fields.submissions, sort: 'id',
      filter: periodFilter + (request.campus ? ' && ' + pb.filter('campus = {:id}', { id: request.campus }) : '') });
    keys = keys.filter(key => key !== 'submissions');
  }
  await Promise.all(keys.map(async key => {
    const filters: string[] = [];
    if (key === 'definitions' || key === 'submissions') filters.push(periodFilter);
    if (key === 'indicators') filters.push('definition.' + periodFilter);
    if (key === 'feedback') filters.push(periodPage ? 'indicator.definition.' + periodFilter : activePeriodFilter.replaceAll('periodState', 'indicator.definition.periodState'));
    if (key === 'definitions') filters.push('status = "active"');
    if (key === 'indicators') filters.push('definition.status = "active"');
    if (key === 'indicators' && request.view === 'review') {
      const pending = [...new Set(raw.submissions!.filter(s => s.status === 'pending').map(s => s.campus))];
      if (!pending.length) { raw.indicators = []; return; }
      filters.push('(' + pending.map(id => pb.filter('campus = {:id}', { id })).join(' || ') + ')');
    }
    if (request.campus) {
      if (key === 'campuses') filters.push(pb.filter('id = {:id}', { id: request.campus }));
      else if (['indicators', 'feedback', 'submissions', 'proposals', 'activities'].includes(key)) filters.push(pb.filter('campus = {:id}', { id: request.campus }));
    }
    if (key === 'campuses' && !request.campus && actor.role === 'campus' && ['indicators', 'proposals'].includes(request.view)) {
      filters.push(pb.filter('id = {:id}', { id: actor.campusId }));
    }
    if (request.question) {
      if (key === 'questions') filters.push(pb.filter('id = {:id}', { id: request.question }));
      if (['answers', 'likes'].includes(key)) filters.push(pb.filter('question = {:id}', { id: request.question }));
    }
    if (request.question && key === 'faq') filters.push(pb.filter('sourceQuestion = {:id}', { id: request.question }));
    const options = { fields: fields[key], sort: key === 'faq' ? 'order,id' : 'id', ...(filters.length ? { filter: filters.join(' && ') } : {}) };
    // The dashboard only displays four activities. Other page collections are never queried here.
    raw[key] = key === 'activities' ? (await pb.collection(collections[key]).getList(1, 4, { ...options, sort: '-created,-id' })).items : await pb.collection(collections[key]).getFullList(options);
  }));
  const data: Partial<Snapshot> = periodPage ? { periods, period: selected } : {};
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
  if (actor.role === 'admin' && ['dashboard', 'campuses', 'map'].includes(request.view)) {
    const snapshot = { ...emptyPageData(), ...data };
    data.campusMetrics = Object.fromEntries(snapshot.campuses.map(campus => {
      const { progress, achieved, total, revisions } = campusStats(snapshot, campus.id);
      return [campus.id, { progress, achieved, total, revisions }];
    }));
    delete data.definitions;
    delete data.indicators;
    delete data.feedback;
  }
  return data;
}

export async function readNavigation(pb: PocketBase, actor: AppSession): Promise<NavigationData> {
  const count = async (collection: string, filter: string) => (await pb.collection(collection).getList(1, 1, { filter, fields: 'id' })).totalItems;
  const [pendingCount, revisionCount, unreadCount, campus] = await Promise.all([
    actor.role === 'admin' ? count('deb_submissions', 'status = "pending"') : 0,
    actor.role === 'campus' ? count('indicator_feedback', 'requiresRevision = true && state != "closed" && ' + activePeriodFilter.replaceAll('periodState', 'indicator.definition.periodState')) : 0,
    count('notifications', 'readAt = ""'),
    actor.campusId ? pb.collection('campuses').getOne(actor.campusId).then(map.mapCampus) : undefined
  ]);
  return { pendingCount, revisionCount, unreadCount, ...(campus ? { campus } : {}) };
}
