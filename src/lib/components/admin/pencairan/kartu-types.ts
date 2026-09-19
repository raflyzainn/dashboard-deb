import type { Kind, Status, Assessment } from '$lib/pencairan';

/** The card payload from GET /api/pencairan/[campus], as the browser sees it. */
export interface Review { id: string; decision: string; note: string; actorName: string; created: string; imported: boolean }
export interface DocScan { termin2Hits: string[]; highlight: number; words: number; scannedAt: string }
export interface Version { id: string; number: number; originalName: string; size: number; mime: string; origin: string; uploadedByName: string; created: string; note: string; signed: boolean; scan: DocScan | null; fields: Record<string, unknown>; fieldsByName: string; fieldsAt: string; fieldsCheckedByName: string; fieldsCheckedAt: string; fieldsSamePerson: boolean; reviews: Review[] }
export interface Note { id: string; body: string; internal: boolean; authorName: string; authorRole: string; created: string }
export interface Doc { id: string; kind: Kind; status: Status; signedReceived: boolean; signedReceivedAt: string; signedReceivedByName: string; originalReceived: boolean; originalReceivedAt: string; originalReceivedByName: string; currentVersionId: string; versions: Version[]; generated: boolean; decidedByName: string; decidedAt: string; notes: Note[] }
export interface Check { kind: Kind | 'umum'; level: 'ok' | 'warn' | 'bad' | 'info'; text: string }
export interface KartuData {
  campus: { id: string; name: string; code: string; initials: string; programYear: string; fillMode: string; signatoryName: string };
  summary: { skNumber: string; amountSen: number; limitSen: number; requestedSen: number; term2Sen: number; term1Percent: number; term2Percent: number; programTitle: string; programYear: string };
  disbursement: { id: string; stage: number; requestedSen: number; paidSen: number; paidAt: string; paidRef: string; paidByName: string; properties: Record<string, unknown>; clauseChecked: boolean; templateMode: string };
  documents: Doc[];
  bankCheck: { id: string; bankResult: string; bankNameSeen: string; checkedAt: string; evidence: boolean } | null;
  rab: { id: string; number: number; status: string; totalSen: number; term1Sen: number } | null;
  lampiranCount: number;
  checks: Check[];
  readiness: Assessment;
}
/** One dashboard row from GET /api/pencairan. */
export interface DirectoryRow {
  campus: { id: string; name: string; code: string; programYear: string; fillMode: string };
  amountSen: number; limitSen: number; stage: number; requestedSen: number; paidSen: number; paidAt: string; lampiranCount: number;
  statuses: Record<Kind, Status>; assessment: Assessment; checkedAt: string;
}
