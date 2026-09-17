import type {
  AppSession,
  DataService,
  MasterDefinition,
  ProgramProfile,
  Snapshot,
  PreviewAccount
} from '../../types';
import type { PageRequest, NavigationData } from '../../page-data';
import { periodsFrom } from '../../periods';
import { validateCategories } from '../../forum';
import { changedSinceSubmission } from '../../verification';
import { transaction, resetDemo, createCampusAccounts, type DemoState } from './store';
import { activateDemoAccount, canUseDemoPassword } from './activation';
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const text = (value: string, max = 5000) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw Error('Isi teks dengan panjang yang sesuai.');
  return value.trim();
};
const find = <T extends { id: string }>(rows: T[], key: string) => {
  const row = rows.find((r) => r.id === key);
  if (!row) throw Error('Data demo tidak ditemukan.');
  return row;
};
const activePeriod = (s: DemoState) =>
  s.data.definitions.find((d) => d.periodState === 'active')?.period || '';
const defs = (s: DemoState, period = activePeriod(s)) =>
  s.data.definitions.filter((d) => (d.period || '') === period && d.status === 'active');
const indicators = (s: DemoState, campus: string, period = activePeriod(s)) =>
  s.data.indicators.filter(
    (i) => i.campusId === campus && defs(s, period).some((d) => d.id === i.definitionId)
  );
const submissions = (s: DemoState, campus: string) =>
  (s.data.submissions || []).filter(
    (r) => r.campusId === campus && (r.period || '') === activePeriod(s)
  );
function pending(s: DemoState, campus?: string) {
  return (s.data.submissions || []).some(
    (r) =>
      (!campus || r.campusId === campus) &&
      r.status === 'pending' &&
      (r.period || '') === activePeriod(s)
  );
}
function notify(
  s: DemoState,
  campus: string,
  recipient: 'admin' | 'campus',
  title: string,
  href: string
) {
  s.data.notifications.unshift({
    id: id(),
    campusId: campus,
    recipient,
    title,
    body: title,
    href,
    createdAt: now(),
    readAt: null,
    simulated: true
  });
  s.data.activities.unshift({ id: id(), campusId: campus, text: title, createdAt: now() });
}
export function createDemoService() {
  let selected = '';
  function actor(s: DemoState): AppSession {
    if (selected === 'admin-1' || selected === 'admin-2')
      return { id: selected, name: 'Admin PF Demo', role: 'admin' };
    const campus = s.data.campuses.find((c) => c.id === selected);
    if (!campus) throw Error('Pilih akun demo terlebih dahulu.');
    return { id: selected, name: campus.name, role: 'campus', campusId: campus.id };
  }
  function run<T>(
    action: (s: DemoState, actor: AppSession) => T,
    write = false,
    role?: 'admin' | 'campus'
  ): Promise<T> {
    const key = selected;
    return transaction((s) => {
      if (selected !== key) throw Error('Pilihan akun telah berubah.');
      const user = actor(s);
      if (role && user.role !== role) throw Error('Peran demo tidak diizinkan.');
      return action(s, user);
    }, write);
  }
  function own(user: AppSession, campus: string) {
    if (user.role === 'campus' && user.campusId !== campus)
      throw Error('Data kampus lain tidak dapat diakses.');
  }
  function revision(current: number, expected: number) {
    if (current !== expected) throw Error('Data sudah berubah. Muat ulang sebelum menyimpan.');
  }
  function audit(
    s: DemoState,
    user: AppSession,
    entity: string,
    entityId: string,
    operation: string,
    before: object | null,
    after: object | null
  ) {
    s.audit.unshift({
      id: id(),
      actor: user.name,
      entity,
      entityId,
      operation,
      before: before as Record<string, unknown> | null,
      after: after as Record<string, unknown> | null,
      created: now()
    });
  }
  function navigation(s: DemoState, user: AppSession): NavigationData {
    return {
      pendingCount: (s.data.submissions || []).filter(
        (r) => r.status === 'pending' && (r.period || '') === activePeriod(s)
      ).length,
      revisionCount: s.data.feedback.filter(
        (f) =>
          f.campusId === user.campusId &&
          f.requiresRevision &&
          f.state !== 'closed' &&
          indicators(s, user.campusId || '').some((i) => i.id === f.indicatorId)
      ).length,
      unreadCount: s.data.notifications.filter(
        (n) =>
          n.recipient === user.role &&
          (user.role === 'admin' || n.campusId === user.campusId) &&
          !n.readAt
      ).length,
      campus: s.data.campuses.find((c) => c.id === user.campusId)
    };
  }
  const readinessKeys = [
    'existingEbt',
    'socialMapping',
    'conflict',
    'ikm',
    'institution',
    'landPermit',
    'siteSurvey',
    'interventionSummary',
    'intervention'
  ] as const;
  const readinessIncomplete = (s: DemoState, campusId: string) => {
    const program = find(s.data.campuses, campusId).program;
    return readinessKeys.some((key) => !String(program?.[key] ?? '').trim());
  };
  const updateReadiness = (
    campusId: string,
    values: Partial<Pick<ProgramProfile, (typeof readinessKeys)[number]>>
  ) =>
    run(
      (s, user) => {
        own(user, campusId);
        const campus = find(s.data.campuses, campusId);
        for (const key of readinessKeys) {
          const value = values[key];
          if (value !== undefined && (typeof value !== 'string' || value.length > 5000))
            throw Error('Isi indikator kesiapan terlalu panjang.');
        }
        campus.program = { ...campus.program, ...values };
      },
      true,
      'campus'
    );
  const updateIndicatorTarget = (key: string, target: number) =>
    run(
      (s) => {
        if (!Number.isFinite(target) || target <= 0) throw Error('Target harus lebih dari nol.');
        find(s.data.indicators, key).target = target;
      },
      true,
      'admin'
    );
  const service: DataService = {
    demoActivation: () =>
      transaction((s) => ({ email: s.activation.email, activated: Boolean(s.activation.password) })),
    requestDemoActivation: async (email) => {
      await transaction((s) => {
        if (s.activation.email !== email.trim().toLowerCase())
          throw Error('Gunakan email PIC demo yang tercantum pada layar aktivasi.');
      });
    },
    activateDemo: async (email, password) => {
      await transaction((s) => {
        s.activation = activateDemoAccount(email, password);
      }, true);
    },
    loginDemo: (email, password) =>
      transaction((s) => {
        if (!canUseDemoPassword(s.activation, email, password)) return null;
        const campus = s.data.campuses[0];
        return { key: campus.id, name: campus.name, role: 'campus' as const };
      }),
    masters: () => run((s) => ({ definitions: s.data.definitions }), false, 'admin'),
    masterAudit: (q = '', page = 1) =>
      run(
        (s) => {
          const rows = s.audit.filter((a) =>
            JSON.stringify(a).toLowerCase().includes(q.toLowerCase())
          );
          return {
            items: rows.slice((page - 1) * 20, page * 20),
            page,
            totalItems: rows.length,
            totalPages: Math.ceil(rows.length / 20)
          };
        },
        false,
        'admin'
      ),
    createPeriod: (name) =>
      run(
        (s, user) => {
          name = text(name, 80);
          if (periodsFrom(s.data.definitions).some((p) => p.id === name))
            throw Error('Nama periode sudah digunakan.');
          const source = defs(s);
          s.data.definitions.push(
            ...source.map((d) => ({
              ...d,
              id: id(),
              period: name,
              periodState: 'draft' as const,
              revision: 1
            }))
          );
          audit(s, user, 'period', name, 'period.created', null, { name });
        },
        true,
        'admin'
      ),
    openPeriod: (period) =>
      run(
        (s, user) => {
          if (pending(s)) throw Error('Selesaikan review pengajuan sebelum membuka periode baru.');
          const next = s.data.definitions.filter((d) => d.period === period);
          if (!next.length || next.some((d) => d.periodState !== 'draft'))
            throw Error('Pilih draft periode.');
          for (const d of s.data.definitions)
            if (d.periodState === 'active') d.periodState = 'archived';
          for (const d of next) {
            d.periodState = 'active';
            d.revision++;
            if (d.status === 'active')
              for (const c of s.data.campuses)
                s.data.indicators.push({
                  id: id(),
                  campusId: c.id,
                  definitionId: d.id,
                  baseline: d.baseline,
                  target: d.target,
                  current: 0,
                  note: '',
                  unfilled: true,
                  updatedAt: now()
                });
          }
          audit(s, user, 'period', period, 'period.opened', null, { period });
        },
        true,
        'admin'
      ),
    saveDefinition: (input) =>
      run(
        (s, user) => {
          const old = input.id ? find(s.data.definitions, input.id) : undefined;
          if (old) {
            revision(old.revision, input.revision!);
            if (old.periodState === 'archived') throw Error('Periode arsip hanya dapat dibaca.');
            if (old.status === 'active' && old.periodState === 'active' && pending(s))
              throw Error('Selesaikan review terlebih dahulu.');
          }
          const period = input.period ?? old?.period ?? activePeriod(s);
          const state = periodsFrom(s.data.definitions).find((p) => p.id === period)?.state;
          if (!state || state === 'archived') throw Error('Periode tidak dapat diubah.');
          if (
            !Number.isFinite(input.baseline) ||
            input.baseline < 0 ||
            !Number.isFinite(input.target) ||
            input.target <= 0
          )
            throw Error('Baseline dan target tidak valid.');
          if (
            s.data.definitions.some(
              (d) => d.id !== old?.id && d.period === period && d.code === input.code.trim()
            )
          )
            throw Error('Kode sudah dipakai pada periode ini.');
          const before = old ? { ...old } : null;
          const row: MasterDefinition = {
            ...input,
            id: old?.id || id(),
            code: text(input.code, 80),
            name: text(input.name, 200),
            category: text(input.category, 100),
            unit: text(input.unit, 80),
            description: input.description || '',
            period,
            periodState: state,
            status: old?.status || 'draft',
            revision: (old?.revision || 0) + 1
          };
          if (old) Object.assign(old, row);
          else s.data.definitions.push(row);
          audit(
            s,
            user,
            'definition',
            row.id,
            old ? 'definition.updated' : 'definition.created',
            before,
            row
          );
        },
        true,
        'admin'
      ),
    activateDefinition: (key, expected) =>
      run(
        (s, user) => {
          const d = find(s.data.definitions, key);
          revision(d.revision, expected);
          if (d.periodState === 'archived' || pending(s))
            throw Error('Indikator tidak dapat diaktifkan sekarang.');
          d.status = 'active';
          d.revision++;
          if (d.periodState === 'active')
            for (const c of s.data.campuses)
              if (!s.data.indicators.some((i) => i.definitionId === key && i.campusId === c.id))
                s.data.indicators.push({
                  id: id(),
                  campusId: c.id,
                  definitionId: key,
                  baseline: d.baseline,
                  target: d.target,
                  current: 0,
                  note: '',
                  unfilled: true,
                  updatedAt: now()
                });
          audit(s, user, 'definition', key, 'definition.activated', null, d);
        },
        true,
        'admin'
      ),
    deleteDefinition: (key, expected) =>
      run(
        (s, user) => {
          const d = find(s.data.definitions, key);
          revision(d.revision, expected);
          if (
            d.periodState === 'archived' ||
            pending(s) ||
            s.data.submissions?.some((r) => r.indicators.some((i) => i.definitionId === key))
          )
            throw Error('Indikator masih memiliki riwayat atau pengajuan.');
          const removed = s.data.indicators.filter((i) => i.definitionId === key).map((i) => i.id);
          s.data.indicators = s.data.indicators.filter((i) => i.definitionId !== key);
          s.data.feedback = s.data.feedback.filter((f) => !removed.includes(f.indicatorId));
          s.data.definitions = s.data.definitions.filter((d) => d.id !== key);
          audit(s, user, 'definition', key, 'definition.deleted', d, null);
        },
        true,
        'admin'
      ),
    saveCampus: (input) =>
      run(
        (s, user) => {
          const old = input.id ? find(s.data.campuses, input.id) : undefined;
          if (old) revision(old.revision || 1, input.revision!);
          const before = old ? { ...old } : null;
          const key = old?.id || id();
          const row = {
            ...input,
            id: key,
            name: text(input.name, 200),
            revision: (old?.revision || 0) + 1,
            source: 'admin' as const
          };
          if (old) Object.assign(old, row);
          else {
            s.data.campuses.push(row);
            s.accounts.push(...createCampusAccounts(row));
            for (const d of defs(s))
              s.data.indicators.push({
                id: id(),
                campusId: key,
                definitionId: d.id,
                baseline: d.baseline,
                target: d.target,
                current: 0,
                note: '',
                unfilled: true,
                updatedAt: now()
              });
          }
          const location = {
            campusId: key,
            province: input.province,
            island: input.island,
            longitude: input.longitude,
            latitude: input.latitude,
            approximate: input.approximate
          };
          s.data.locations = [
            ...(s.data.locations || []).filter((l) => l.campusId !== key),
            location
          ];
          audit(s, user, 'campus', key, old ? 'campus.updated' : 'campus.created', before, row);
        },
        true,
        'admin'
      ),
    deleteCampus: (key, expected) =>
      run(
        (s, user) => {
          const c = find(s.data.campuses, key);
          revision(c.revision || 1, expected);
          if (
            s.data.proposals.some((p) => p.campusId === key) ||
            s.data.submissions?.some((r) => r.campusId === key) ||
            s.data.questions.some((q) => q.campusId === key)
          )
            throw Error('Kampus memiliki riwayat dan tidak dapat dihapus.');
          s.data.campuses = s.data.campuses.filter((c) => c.id !== key);
          s.data.indicators = s.data.indicators.filter((i) => i.campusId !== key);
          s.data.feedback = s.data.feedback.filter((f) => f.campusId !== key);
          s.data.locations = s.data.locations?.filter((l) => l.campusId !== key);
          s.accounts = s.accounts.filter((a) => a.campusId !== key);
          audit(s, user, 'campus', key, 'campus.deleted', c, null);
        },
        true,
        'admin'
      ),
    updateIndicator: (key, current, note) =>
      run(
        (s, user) => {
          const row = find(s.data.indicators, key);
          own(user, row.campusId);
          if (
            find(s.data.definitions, row.definitionId).periodState !== 'active' ||
            pending(s, row.campusId)
          )
            throw Error('Indikator arsip atau sedang menunggu verifikasi.');
          if (!Number.isFinite(current) || current < 0 || note.length > 5000)
            throw Error('Nilai indikator tidak valid.');
          Object.assign(row, { current, note, unfilled: false, updatedAt: now() });
          s.data.feedback
            .filter((f) => f.indicatorId === key && f.state === 'open')
            .forEach((f) => {
              f.state = 'responded';
              f.updatedAt = now();
            });
        },
        true,
        'campus'
      ),
    submitDeb: () =>
      run(
        (s, user) => {
          const campus = user.campusId!;
          const rows = indicators(s, campus);
          if (
            pending(s, campus) ||
            !rows.length ||
            rows.length !== defs(s).length ||
            rows.some((i) => i.unfilled) ||
            readinessIncomplete(s, campus)
          )
            throw Error('Lengkapi indikator atau tunggu review selesai.');
          const prev = submissions(s, campus).sort((a, b) => b.version - a.version)[0];
          const snapshot = { ...s.data, definitions: defs(s), indicators: rows };
          if (prev?.status === 'approved' && !changedSinceSubmission(snapshot, prev))
            throw Error('Data terverifikasi belum berubah.');
          (s.data.submissions ??= []).push({
            id: id(),
            campusId: campus,
            period: activePeriod(s),
            version: (prev?.version || 0) + 1,
            status: 'pending',
            indicators: rows.map((i) => ({ ...find(s.data.definitions, i.definitionId), ...i })),
            submittedAt: now(),
            simulated: true
          });
          notify(s, campus, 'admin', 'Pengajuan DEB menunggu verifikasi.', '/admin/verifikasi');
        },
        true,
        'campus'
      ),
    reviewDeb: (key, decision, note) =>
      run(
        (s, user) => {
          const row = find(s.data.submissions || [], key);
          if (row.status !== 'pending' || (row.period || '') !== activePeriod(s))
            throw Error('Pengajuan sudah diputuskan atau diarsipkan.');
          if (decision === 'revision') text(note);
          if (!['approved', 'revision'].includes(decision) || note.length > 5000)
            throw Error('Tanggapan tidak valid.');
          if (
            decision === 'approved' &&
            s.data.feedback.some(
              (f) =>
                f.campusId === row.campusId &&
                f.requiresRevision &&
                f.state !== 'closed' &&
                indicators(s, row.campusId).some((i) => i.id === f.indicatorId)
            )
          )
            throw Error('Tutup feedback revisi terlebih dahulu.');
          Object.assign(row, {
            status: decision,
            decisionNote: note,
            reviewedBy: user.id,
            reviewedAt: now()
          });
          notify(
            s,
            row.campusId,
            'campus',
            decision === 'approved' ? 'Data DEB terverifikasi.' : 'Pengajuan perlu revisi.',
            '/campus/indicators'
          );
        },
        true,
        'admin'
      ),
    addFeedback: (key, note, requiresRevision) =>
      run(
        (s) => {
          const row = find(s.data.indicators, key);
          if (find(s.data.definitions, row.definitionId).periodState !== 'active')
            throw Error('Arsip hanya dapat dibaca.');
          s.data.feedback.push({
            id: id(),
            campusId: row.campusId,
            indicatorId: key,
            text: text(note),
            requiresRevision,
            state: requiresRevision ? 'open' : 'closed',
            createdAt: now(),
            updatedAt: now()
          });
          notify(
            s,
            row.campusId,
            'campus',
            'Admin memberi catatan indikator.',
            '/campus/indicators'
          );
        },
        true,
        'admin'
      ),
    closeFeedback: (key) =>
      run(
        (s) => {
          const f = find(s.data.feedback, key);
          f.state = 'closed';
          f.updatedAt = now();
        },
        true,
        'admin'
      ),
    uploadProposal: async (file, changes) => {
      const account = selected;
      if (
        !file.size ||
        file.size > 10485760 ||
        !file.name.toLowerCase().endsWith('.pdf') ||
        new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-'
      )
        throw Error('Pilih PDF valid maksimal 10 MiB.');
      if (selected !== account) throw Error('Pilihan akun telah berubah.');
      if (changes.length > 5000) throw Error('Catatan terlalu panjang.');
      await run(
        (s, user) => {
          const campus = user.campusId!;
          const key = id();
          const version =
            Math.max(
              0,
              ...s.data.proposals.filter((p) => p.campusId === campus).map((p) => p.version)
            ) + 1;
          s.data.proposals.push({
            id: key,
            campusId: campus,
            version,
            filename: file.name,
            size: file.size,
            changes,
            createdAt: now(),
            simulated: true,
            reviewRevision: 0
          });
          s.files[key] = file;
          notify(
            s,
            campus,
            'admin',
            'Versi proposal baru diunggah.',
            '/admin/campuses/' + campus + '?tab=Proposal'
          );
        },
        true,
        'campus'
      );
    },
    proposalFile: (key) =>
      run((s, user) => {
        const p = find(s.data.proposals, key);
        own(user, p.campusId);
        if (!s.files[key]) throw Error('PDF demo tidak tersedia.');
        return s.files[key];
      }),
    reviewProposal: (key, note, expected) =>
      run(
        (s) => {
          const p = find(s.data.proposals, key);
          revision(p.reviewRevision || 0, expected);
          p.reviewNote = text(note);
          p.reviewedBy = selected;
          p.reviewedAt = now();
          p.reviewRevision = (p.reviewRevision || 0) + 1;
          notify(
            s,
            p.campusId,
            'campus',
            'Admin memberi tanggapan proposal.',
            '/campus/proposal?version=' + key
          );
        },
        true,
        'admin'
      ),
    ask: (title, body, categoryIds) =>
      run(
        (s, user) => {
          const key = id();
          s.data.questions.unshift({
            id: key,
            campusId: user.campusId!,
            title: text(title, 180),
            body: text(body),
            categoryIds: validateCategories(categoryIds ?? ['umum']),
            createdAt: now()
          });
          notify(
            s,
            user.campusId!,
            'admin',
            'Pertanyaan baru dari kampus.',
            '/admin/questions/' + key
          );
          return key;
        },
        true,
        'campus'
      ),
    answer: (key, body) =>
      run(
        (s) => {
          const q = find(s.data.questions, key);
          const old = s.data.answers.find((a) => a.questionId === key);
          if (old) Object.assign(old, { body: text(body), updatedAt: now() });
          else
            s.data.answers.push({ id: id(), questionId: key, body: text(body), updatedAt: now() });
          notify(s, q.campusId, 'campus', 'Admin menjawab pertanyaan.', '/campus/questions/' + key);
        },
        true,
        'admin'
      ),
    replies: (key, cursor = {}) =>
      run((s) => {
        find(s.data.questions, key);
        const all = s.replies
          .filter(
            (r) =>
              r.questionId === key &&
              (!cursor.before || r.sequence < cursor.before) &&
              (!cursor.after || r.sequence > cursor.after)
          )
          .sort((a, b) => a.sequence - b.sequence);
        return {
          items: cursor.after ? all.slice(0, 30) : all.slice(-30),
          hasMore: all.length > 30
        };
      }),
    reply: (key, body, replyTo) =>
      run((s, user) => {
        const q = find(s.data.questions, key);
        own(user, q.campusId);
        if (!s.data.answers.some((a) => a.questionId === key))
          throw Error('Tunggu jawaban resmi admin.');
        const parent = replyTo ? find(s.replies, replyTo) : undefined;
        if (parent && parent.questionId !== key) throw Error('Balasan tidak sesuai diskusi.');
        const sequence = (q.replyCount || 0) + 1;
        s.replies.push({
          id: id(),
          questionId: key,
          sequence,
          body: text(body),
          authorRole: user.role,
          authorName: user.name,
          createdAt: now(),
          replyTo,
          quote: parent ? { authorName: parent.authorName, body: parent.body } : undefined
        });
        q.replyCount = sequence;
        q.lastReplyRole = user.role;
        notify(
          s,
          q.campusId,
          user.role === 'admin' ? 'campus' : 'admin',
          'Balasan diskusi baru.',
          '/' + (user.role === 'admin' ? 'campus' : 'admin') + '/questions/' + key
        );
      }, true),
    setLike: (key, liked) =>
      run(
        (s, user) => {
          find(s.data.questions, key);
          s.data.likes = s.data.likes.filter(
            (l) => !(l.questionId === key && l.campusId === user.campusId)
          );
          if (liked) s.data.likes.push({ id: id(), questionId: key, campusId: user.campusId! });
        },
        true,
        'campus'
      ),
    promoteFaq: (key) =>
      run(
        (s) => {
          const q = find(s.data.questions, key),
            a = s.data.answers.find((a) => a.questionId === key);
          if (!a) throw Error('Jawab pertanyaan terlebih dahulu.');
          if (!s.data.faq.some((f) => f.questionId === key))
            s.data.faq.push({
              id: id(),
              questionId: key,
              question: q.title,
              answer: a.body,
              order: s.data.faq.length
            });
        },
        true,
        'admin'
      ),
    saveFaq: (input) =>
      run(
        (s) => {
          const fields = { question: text(input.question, 180), answer: text(input.answer) };
          if (input.id) Object.assign(find(s.data.faq, input.id), fields);
          else s.data.faq.push({ id: id(), ...fields, order: s.data.faq.length });
        },
        true,
        'admin'
      ),
    moveFaq: (key, direction) =>
      run(
        (s) => {
          const rows = s.data.faq.sort((a, b) => a.order - b.order);
          const i = rows.findIndex((r) => r.id === key),
            j = i + direction;
          if (i < 0 || j < 0 || j >= rows.length) return;
          [rows[i], rows[j]] = [rows[j], rows[i]];
          rows.forEach((r, index) => (r.order = index));
        },
        true,
        'admin'
      ),
    deleteFaq: (key) =>
      run(
        (s) => {
          s.data.faq = s.data.faq.filter((f) => f.id !== key);
        },
        true,
        'admin'
      ),
    readNotifications: (keys) =>
      run((s, user) => {
        s.data.notifications
          .filter(
            (n) =>
              n.recipient === user.role &&
              (user.role === 'admin' || n.campusId === user.campusId) &&
              (!keys || keys.includes(n.id))
          )
          .forEach((n) => (n.readAt = now()));
      }, true)
  };
  return {
    ...service,
    updateReadiness,
    updateIndicatorTarget,
    selectAccount(key: string) {
      selected = key;
    },
    session: () =>
      run((s, user) => ({
        session: user,
        capabilities: { readOnly: false },
        navigation: navigation(s, user)
      })),
    navigation: () => run((s, user) => navigation(s, user)),
    accounts: () =>
      transaction(
        (s) =>
          [
            ...s.data.campuses.map((c) => ({ key: c.id, name: c.name, role: 'campus' as const })),
            { key: 'admin-1', name: 'Admin PF Demo', role: 'admin' as const }
          ] satisfies PreviewAccount[]
      ),
    page: (request: PageRequest) =>
      run((s, user) => {
        if (request.campus) own(user, request.campus);
        const period = request.period ?? activePeriod(s);
        const periods = periodsFrom(s.data.definitions);
        const selectedPeriod = periods.find((p) => p.id === period);
        if (!selectedPeriod) throw Error('Periode tidak ditemukan.');
        const data: Snapshot = {
          ...s.data,
          definitions: defs(s, period),
          periods,
          period: selectedPeriod
        };
        const campus = user.role === 'campus' ? user.campusId : request.campus;
        const ids = new Set(data.definitions.map((d) => d.id));
        data.indicators = s.data.indicators.filter(
          (i) => ids.has(i.definitionId) && (!campus || i.campusId === campus)
        );
        data.submissions = (s.data.submissions || []).filter(
          (r) => (r.period || '') === period && (!campus || r.campusId === campus)
        );
        data.feedback = s.data.feedback.filter((f) =>
          data.indicators.some((i) => i.id === f.indicatorId)
        );
        data.proposals = s.data.proposals.filter((p) => !campus || p.campusId === campus);
        data.activities = s.data.activities.filter((a) => !campus || a.campusId === campus);
        data.notifications = s.data.notifications.filter(
          (n) =>
            n.recipient === user.role && (user.role === 'admin' || n.campusId === user.campusId)
        );
        return { data, loadedAt: now() };
      }),
    reset: resetDemo,
    accountsAdmin: (
      path: string,
      body?: { changes?: { id: string; name: string; email: string; revision: number }[] }
    ) =>
      run(
        (s) => {
          if (body) {
            for (const change of body.changes || []) {
              const a = s.accounts.find((a) => a.id === change.id);
              if (!a) throw Error('Akun tidak ditemukan.');
              revision(a.revision, change.revision);
              if (change.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(change.email))
                throw Error('Email tidak valid.');
              if (
                change.email &&
                s.accounts.some(
                  (other) =>
                    other.id !== a.id && other.email.toLowerCase() === change.email.toLowerCase()
                )
              )
                throw Error('Email sudah digunakan.');
              Object.assign(a, {
                name: change.name,
                email: change.email.toLowerCase(),
                revision: a.revision + 1,
                status: change.email ? 'Aktif' : 'Email belum diisi',
                active: !!change.email
              });
            }
            return { ok: true };
          }
          const params = new URLSearchParams(path.replace(/^\?/, '')),
            q = (params.get('q') || '').toLowerCase(),
            status = params.get('status');
          const rows = s.accounts
            .map((a) => ({
              ...a,
              campus: s.data.campuses.find((c) => c.id === a.campusId)?.name || a.campus
            }))
            .sort((a, b) => a.campus.localeCompare(b.campus, 'id') || a.slot - b.slot)
            .filter(
              (a) =>
                (a.campus + ' ' + a.name + ' ' + a.email).toLowerCase().includes(q) &&
                (!status || a.status === status)
            );
          const page = Math.max(1, Number(params.get('page')) || 1);
          const campusIds = [...new Set(rows.map((a) => a.campusId))];
          const selectedCampuses = campusIds.slice((page - 1) * 10, page * 10);
          return {
            items: selectedCampuses.flatMap((campusId) =>
              s.accounts
                .filter((a) => a.campusId === campusId)
                .sort((a, b) => a.slot - b.slot)
                .map((a) => ({
                  ...a,
                  campus: s.data.campuses.find((c) => c.id === campusId)?.name || a.campus
                }))
            ),
            page,
            total: campusIds.length,
            stats: {
              total: s.accounts.length,
              campuses: s.data.campuses.length,
              email: s.accounts.filter((a) => a.email).length,
              waiting: 0,
              active: s.accounts.filter((a) => a.active).length
            }
          };
        },
        !!body,
        'admin'
      )
  };
}
