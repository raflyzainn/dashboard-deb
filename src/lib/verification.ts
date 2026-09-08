import type { DebSubmission, Snapshot, VerificationStatus } from './types';

export const verificationLabel: Record<VerificationStatus, string> = {
  pending: 'Menunggu verifikasi', approved: 'Terverifikasi', revision: 'Perlu revisi'
};

export function demoSubmissions(data: Snapshot): DebSubmission[] {
  return data.campuses.slice(1, 7).map(c => ({
    id: `demo-submission-${c.id}`, campusId: c.id, version: 1,
    status: 'pending', submittedAt: '2026-09-08T01:00:00.000Z', simulated: true,
    indicators: data.indicators.filter(i => i.campusId === c.id).map(i => ({ ...i }))
  }));
}

export function latestSubmission(data: Snapshot, campusId: string) {
  return data.submissions?.filter(s => s.campusId === campusId).sort((a, b) => b.version - a.version)[0];
}

export function changedSinceSubmission(data: Snapshot, submission: DebSubmission) {
  const current = data.indicators.filter(i => i.campusId === submission.campusId);
  return current.length !== submission.indicators.length || current.some(i => {
    const submitted = submission.indicators.find(s => s.id === i.id);
    return !submitted || i.current !== submitted.current || i.note !== submitted.note || i.target !== submitted.target || i.baseline !== submitted.baseline;
  });
}
