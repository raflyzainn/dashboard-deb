import type { Snapshot, Campus, AppSession } from './types';

export type PageView = 'dashboard' | 'campuses' | 'campus-detail' | 'accounts' | 'map' | 'indicators' | 'proposals' | 'questions' | 'question-detail' | 'faq' | 'notifications' | 'review' | 'masters' | 'guide';
export interface PageRequest { view: PageView; campus?: string; question?: string; tab?: string }
export interface PageResponse { data: Partial<Snapshot>; loadedAt: string }
export interface NavigationData { pendingCount: number; revisionCount: number; unreadCount: number; campus?: Campus }
export interface SessionResponse { session: AppSession; capabilities: { readOnly: boolean }; navigation: NavigationData }

/** Empty slots adapt existing presentation components, never fetched or cached as a global dataset. */
export function emptyPageData(): Snapshot {
  return { campuses: [], definitions: [], indicators: [], submissions: [], feedback: [], proposals: [], questions: [], answers: [], likes: [], faq: [], activities: [], notifications: [], locations: [] };
}

export function pageRequest(url: URL): PageRequest {
  const [, , section, id] = url.pathname.split('/');
  switch (section) {
    case 'guide': return { view: 'guide' };
    case 'campuses': return id ? { view: 'campus-detail', campus: decodeURIComponent(id), tab: url.searchParams.get('tab') || 'Ringkasan' } : { view: url.searchParams.get('tab') === 'accounts' ? 'accounts' : 'campuses' };
    case 'sebaran': return { view: 'map' };
    case 'proposal': return { view: 'proposals' };
    case 'questions': return id ? { view: 'question-detail', question: decodeURIComponent(id) } : { view: 'questions' };
    case 'verifikasi': return { view: 'review' };
    case 'master-indicators': return { view: 'masters' };
    case 'indicators': case 'faq': case 'notifications': return { view: section };
    default: return { view: 'dashboard' };
  }
}
export const pageKey = (request: PageRequest) => JSON.stringify(request);
