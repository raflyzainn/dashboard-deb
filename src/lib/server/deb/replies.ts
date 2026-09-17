import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import type { ReplyPage, QuestionReply } from '../../types';
import { PreviewError } from './preview-error';

const mapReply = (r: RecordModel): QuestionReply => ({
  id: r.id, questionId: r.question, sequence: r.sequence, authorRole: r.authorRole,
  authorName: r.authorName, body: r.body, createdAt: r.created,
  replyTo: r.replyTo || undefined,
  quote: r.expand?.replyTo ? { authorName: r.expand.replyTo.authorName, body: r.expand.replyTo.body.slice(0, 200) } : undefined
});

export async function readReplies(pb: PocketBase, id: string, params: URLSearchParams): Promise<ReplyPage> {
  if (!/^[a-z0-9]{15}$/.test(id)) throw new PreviewError(404, 'Pertanyaan tidak ditemukan.');
  await pb.collection('questions').getOne(id, { fields: 'id' });
  const after = params.get('after'), before = params.get('before');
  if ((after !== null && before !== null) || [after, before].some(v => v !== null && (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v))))) {
    throw new PreviewError(400, 'Posisi balasan tidak valid.');
  }
  const filter = pb.filter('question = {:id}' + (after !== null ? ' && sequence > {:cursor}' : before !== null ? ' && sequence < {:cursor}' : ''), { id, cursor: Number(after ?? before) });
  const result = await pb.collection('question_replies').getList(1, 50, {
    filter, sort: after !== null ? 'sequence' : '-sequence', expand: 'replyTo',
    fields: 'id,question,sequence,authorRole,authorName,body,created,replyTo,expand.replyTo.authorName,expand.replyTo.body'
  });
  return { items: result.items.map(mapReply).sort((a, b) => a.sequence - b.sequence), hasMore: result.totalItems > result.items.length };
}
