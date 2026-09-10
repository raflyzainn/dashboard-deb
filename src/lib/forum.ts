import type { Question, Snapshot } from './types';

// Topic labels derived from the brief's core modules, capacity building and roadmap.
// These are not the Survive/Recoverable/Pivot campus groups or DEB performance levels.
export const FORUM_CATEGORIES = [
  { id: 'indikator', label: 'Indikator & baseline', color: 'blue' },
  { id: 'proposal', label: 'Proposal', color: 'violet' },
  { id: 'social-mapping', label: 'Social Mapping', color: 'teal' },
  { id: 'toc', label: 'Theory of Change (ToC)', color: 'purple' },
  { id: 'ikm', label: 'IKM', color: 'pink' },
  { id: 'energi', label: 'Energi', color: 'amber' },
  { id: 'ekonomi', label: 'Ekonomi', color: 'green' },
  { id: 'sosial', label: 'Sosial', color: 'orange' },
  { id: 'umum', label: 'Umum', color: 'gray' }
] as const;
export type ForumCategoryId = typeof FORUM_CATEGORIES[number]['id'];

export function questionCategories(question: Pick<Question, 'title' | 'categoryIds'>): ForumCategoryId[] {
  return question.categoryIds?.length ? question.categoryIds : ['umum'];
}
export function validateCategories(categories: ForumCategoryId[]): ForumCategoryId[] {
  if (!Array.isArray(categories) || !categories.length || categories.some(id => !FORUM_CATEGORIES.some(c => c.id === id))) throw new Error('Pilih setidaknya satu kategori pertanyaan yang tersedia.');
  return [...new Set(categories)];
}
export function matchesQuestion(question: Question, answers: Snapshot['answers'], search: string, categories: ForumCategoryId[]) {
  const text = [question.title, question.body, ...answers.filter(a => a.questionId === question.id).map(a => a.body)].join(' ').toLocaleLowerCase('id-ID');
  return text.includes(search.trim().toLocaleLowerCase('id-ID')) && (!categories.length || questionCategories(question).some(id => categories.includes(id)));
}
