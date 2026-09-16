# Assessment periods and compact sidebar

Goal: Admin prepares a copied period, adjusts its indicators, then opens it for fresh campus input. Preserve old values, definitions, submissions and feedback as a read-only archive. No new PocketBase collections.

Architecture: `indicator_definitions.period` groups definitions; `periodState` is draft/active/archived (empty means legacy active). `deb_submissions.period` scopes versions. `campus_indicators.unfilled` distinguishes untouched values from zero. Existing collection-scoped REST transactions serialize transitions and concurrent saves. Empty period labels on existing records represent "Periode awal", avoiding a destructive backfill.

- [x] Add a failing workflow test for draft copy, role checks, pending-review blocking, activation, fresh input, and immutable archive.
- [x] Extend existing schema fields, indexes and visibility rules; add an idempotent schema-only upgrade script for an existing local database. Keep production migration explicit.
- [x] Implement atomic period operations and scope all indicator writes, reads, submission versions, feedback and dashboard metrics.
- [x] Add period selection and admin preparation controls using existing master editing UI. Key campus forms by period; preserve unsaved-navigation protection.
- [x] Compact shared sidebar for admin/campus without removing menus or changing mobile access.
- [x] Validate unit tests, real disposable PocketBase transitions, browser role/archive/autosave flows, responsive sidebar, Svelte check and build.

Transition rules: only one draft and one active period; opening the draft requires at least one enabled indicator and no pending submissions. Old period becomes archived in the same transaction that creates new campus inputs. Archive mutations are rejected server-side. Proposal/forum/accounts are not reset. Atomic batch size remains bounded and fails without partial writes.

## Verification and schema rollout

Validated locally: 41 unit tests, Playwright admin/campus period and autosave flows, mobile sidebars, page payloads, Svelte check, and Cloudflare build. The schema-only migration was applied twice to the disposable database without changing business records or collection count.

For existing local development data, run `npx tsx scripts/pocketbase/period-schema.ts` before starting the updated application. This was applied to the main local development database to resolve the session HTTP 400 caused by missing period fields. The CLI deliberately accepts only the configured local instance. Production has not been changed: back up and apply the equivalent three-collection schema update before deploying the application; do not reseed existing records. Large period transitions exceeding the existing atomic batch limit are rejected without partial writes.
