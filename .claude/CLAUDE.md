# CLAUDE.md

Dashboard DEB (Desa Energi Berdikari), Pertamina Foundation. Repo: `gitlab.com/pf-digitalisasi/dashboard-deb`, branch **`production`** only (other branches are detached; never merge them in). Indonesian UI and docs, English code.

## Read this first, every session

1. `AGENTS.md` (repo rules, they bind Claude too).
2. `docs/pencairan-deb/README.md`, then the numbered documents in that folder. They are the source of truth for the current work: **Pencairan Termin 1 for the 23 funded campuses**. Older docs in `docs/` describe a demo that is being replaced.
3. The agreed visual design: https://claude.ai/artifact/4dp8q3i6dbPM7wWz1ikHpA (private, version 9; the earlier link V8ARRRNth1ed8szPFQKVrw is dead). Local copy of its source: `docs/pencairan-deb/blueprint.html`. To update it from a new session: Artifact `read` with the url, edit, publish with the same `url`.

## Current status (19 September 2026, late night)

Built on the real backend and **rebuilt to artifact version 11: one screen per campus** (decisions 27 to 31 in `docs/pencairan-deb/03-keputusan.md`). The user rejected version 9's card, panel and separate pages ("wall of text", "jumping back and forth", "two clicks instead of immediate right or wrong"). Now: `Layar.svelte` = item list left (SK first, then the eight sheet columns, then Tanda tangan, Lampiran, Pembayaran), document in the middle, one action bar with typed values, at most two automatic chips and a one click decision (green right, grey wrong with a note). Dashboard = the grid and one filter row. Public verification page. PocketBase (36 collections) and R2 loaded, SK scan loaded. Committed and pushed to `production` on 20 September 2026 (build passes); Pages deployment is the user's step. Open items: `docs/pencairan-deb/07-rencana-bangun.md`, "Kondisi pembangunan versi 11". Never bring back cards with paragraphs or sliding panels. The review note is one editable field beside the decision buttons (decision 33). Focus for the coming user onboarding: the nine item checklist of Tahap 1; everything else is continuous development on request.

## Rules that prevent drift

- **Align before building.** For anything substantial, show it in the artifact first (findings, mock screens, options with a recommendation) and wait. The user: "I really hate self-baked thought and builds." Small, clearly specified changes can be done directly.
- If what you are about to build differs from `docs/pencairan-deb/`, stop and ask. When a decision changes, update `03-keputusan.md` and the related documents in the same turn.
- Never invent example figures. Every number must trace back to the source files in `D:\deb`.
- No migration, provisioning, seed, or any call to PocketBase or R2 without an explicit instruction. No commit until asked. No push unless asked in that same message. Never wait for a deploy.
- Per `AGENTS.md`: do not run tests, `npm run check`, lint, `format:check` or verification builds from the terminal unless asked. QA through the browser.
- Personal data stays in `D:\deb`: no KTP numbers, home addresses, bank account numbers or personal names in the repo, docs, artifacts, logs or UI lists. Never print `.env` values.
- UI copy: Indonesian, the rule and the next action only. No vendor names, no derivations, no reasoning. No em or en dashes anywhere, no hyphens as separators in prose (this applies to docs and chat too).

## The design in one paragraph

One screen per campus. Nine items in the sheet's order with the SK first (SK, Draft PKS, RAB 70%, Permohonan, Kuitansi, Invois, Format laporan Termin 1, Buku rekening, Surat kuasa), any order, any person, who and when recorded, nothing locked. The document is the page; the bar under it holds the two or four values typed from the file (saved on blur, per version), one or two automatic results, and two buttons: green is the right answer for that item (Sesuai; Nilai sesuai dengan SK; Sesuai: jadikan nominal Tahap 1; Nama sesuai di bank; Nama cocok), grey is the wrong one and asks for one note to the campus. Done = Sesuai or Tidak diperlukan (surat kuasa when the account holder is the PKS signatory). Lengkap = all done and no red check; then the closing rows Tanda tangan (final letters with QR on every page, signed scans, originals), Lampiran (one PDF, QR on every page, SHA-256 on the public verification page), Pembayaran. Money: Batas Tahap 1 is exactly 70% of Nilai SK in integer sen; the approved RAB 70% total is the Tahap 1 amount; the three letters carry exactly that amount; the remainder is Tahap 2. Every upload is a new version, the old one stays. The RAB item shows the managed RAB as a table with the original Excel as a second tab; later phases are fully digital. Sign in Microsoft Entra or password; roles baru, campus, admin, super_admin; the browser never talks to PocketBase; files in R2. Campus view = the same screen read only with an upload button. LPJ and Tahap 2 are placeholders.

## Codebase facts

- SvelteKit 2, Svelte 5 runes, TypeScript, Tailwind CSS 4. `production` now runs `adapter-cloudflare` with SSR off for pages; data comes from the app server (`src/routes/api/**`, `src/lib/server/deb/**`, superuser PocketBase client, signed `deb_session` cookie) through `createHttpService()` in `src/lib/data/service.ts` (`dataService.api.get/post/patch` for the new modules). The old IndexedDB demo code under `src/lib/data/demo/` is kept only for its fixtures.
- Server modules: `access.ts` (secured endpoints with roles), `audit.ts`, `oauth.ts`, `r2.ts` (private storage, files streamed through the server), `pencairan.ts` (disbursements, documents, versions, reviews, typed fields, checks), plus `rab.ts`, `rekening.ts`, `lampiran.ts`, `generate.ts`. Schema: `scripts/pocketbase/deb-schema.ts`; provisioning `scripts/pocketbase/provision-deb.ts --apply` (idempotent); one time load `scripts/pencairan/initial-load.ts --apply` (idempotent, already run). `origin/main` is reference only; never merge it.
- Shared UI built in this project: `src/lib/components/ui/{Button,EditableSection,ReadField,RegionSelect,LocationPicker,Icon}.svelte`, `src/lib/contacts.ts`, `src/lib/location.ts`, `src/lib/components/shared/profile/*`, region data in `static/data/regions/**`. Forms are read only first with an Ubah button per section.
- Typography: system font stack, root 16px, body 14 to 15px, nothing under 10px, weights 500/600/700, contrast at least 4.5:1, `--muted:#475569`. PF Series (`D:\repos\PFseries`) is the reference, a paradigm, not a code source.
- Logo: solid white `/logo-pf-white.png` on coloured backgrounds, full colour only on white.
- `.env` (gitignored) holds `PB_URL` (https), PocketBase superuser credentials, `DEB_PUBLIC_URL`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
- Working tree has about 70 uncommitted paths (typography, forms, directories, docs). Do not discard them.

## Source material outside the repo

`D:\deb`: the SK scan, `Review draft DEB PF.xlsx`, the campus files folder, `Ekstraksi RAB\RAB terstandar DEB 2025-2026.xlsx` (1.464 budget lines from 19 campuses, import ready), and `Analisis\` (scripts and derived JSON: status matrix, file inventory, PKS comparison, RAB extraction). See `docs/pencairan-deb/08-catatan-sesi.md`.

## Environment quirks (Windows)

Large bash heredocs and multi line `python -c` fail: write scripts with the Write tool. No poppler: read scanned PDFs with pypdf and PIL. GNU tar needs `--force-local` for `D:` paths. Use `sys.stdout.reconfigure(encoding='utf-8')`. Visual checks: Playwright as a library with `channel: 'chrome'` against the user's dev server at `http://127.0.0.1:5176` (not `localhost`, which resolves to another project's server).
