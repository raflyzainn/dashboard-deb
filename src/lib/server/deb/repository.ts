import type PocketBase from 'pocketbase';
import type { Snapshot } from '../../types';
import * as map from './mappers';

/** P0 read foundation, not wired into DataService. Rules apply to every page fetched. */
export function createDebRepository(pb: PocketBase) {
  async function session() {
    if (pb.authStore.record?.collectionName === '_superusers') throw new Error('Use a user-scoped PocketBase client');
    const result = await pb.collection('users').authRefresh();
    return map.mapSession(result.record);
  }
  return {
    async load(): Promise<Snapshot> {
      const actor = await session();
      const names = ['campuses', 'indicator_definitions', 'campus_indicators', 'deb_submissions', 'indicator_feedback', 'proposal_versions', 'questions', 'question_answers', 'question_likes', 'faq_entries', 'activities', 'notifications'];
      // getFullList follows pagination; never aggregate only the first 30/500 records.
      const [campuses, definitions, indicators, submissions, feedback, proposals, questions, answers, likes, faq, activities, notifications] = await Promise.all(names.map(name => pb.collection(name).getFullList({ sort: name === 'faq_entries' ? 'order,id' : 'id' })));
      return { campuses: campuses.map(map.mapCampus), definitions: definitions.map(map.mapDefinition), indicators: indicators.map(map.mapIndicator), submissions: submissions.map(map.mapSubmission),
        feedback: feedback.map(map.mapFeedback), proposals: proposals.map(map.mapProposal), questions: questions.map(map.mapQuestion), answers: answers.map(map.mapAnswer), likes: likes.map(map.mapLike),
        faq: faq.map(map.mapFaq), activities: activities.map(map.mapActivity), notifications: notifications.map(record => map.mapNotification(record, actor.role)) };
    },
    async locations() {
      await session();
      return (await pb.collection('campuses').getFullList()).map(map.mapLocation);
    },
    async proposalFile(id: string): Promise<Blob> {
      await session();
      const record = await pb.collection('proposal_versions').getOne(id);
      const token = await pb.files.getToken();
      const response = await fetch(pb.files.getURL(record, record.file, { token }), { redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Proposal file access failed');
      return response.blob();
    }
  };
}
