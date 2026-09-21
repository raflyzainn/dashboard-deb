# Prompt lanjutan sesi

Tempel teks di bawah ini ke sesi Claude Code baru yang dibuka di `D:\repos\monev-deb`. Isi tiga jawaban di bagian akhir bila sudah ada, atau biarkan "belum dijawab".

```text
You are continuing an existing project. Assume you remember nothing. Do not build, migrate, commit, push, or contact any external service until you have done the reading below and I have answered you.

PROJECT
Dashboard DEB (Desa Energi Berdikari) for Pertamina Foundation. Repo: D:\repos\monev-deb, branch "production" only. We are building the real Pencairan Termin 1 module for the 23 funded campuses, all input and output done by admins. The design is already agreed and fully decided. Nothing has been built yet.

READ FIRST, IN THIS ORDER, COMPLETELY
1. D:\repos\monev-deb\.claude\CLAUDE.md
2. D:\repos\monev-deb\AGENTS.md
3. D:\repos\monev-deb\docs\pencairan-deb\README.md
4. D:\repos\monev-deb\docs\pencairan-deb\03-keputusan.md
5. D:\repos\monev-deb\docs\pencairan-deb\02-proses-bisnis-termin-1.md
6. D:\repos\monev-deb\docs\pencairan-deb\04-rancangan-sistem.md
7. D:\repos\monev-deb\docs\pencairan-deb\05-layar-dan-ux.md
8. D:\repos\monev-deb\docs\pencairan-deb\06-rab-dan-lpj.md
9. D:\repos\monev-deb\docs\pencairan-deb\07-rencana-bangun.md
10. D:\repos\monev-deb\docs\pencairan-deb\08-catatan-sesi.md
11. D:\repos\monev-deb\docs\pencairan-deb\01-konteks-dan-sumber-data.md
Also check your memory folder C:\Users\Mukti\.claude\projects\D--repos-monev-deb\memory\ (start with MEMORY.md and deb-handoff-docs.md) if it is available.
The agreed visual design is the private artifact https://claude.ai/artifact/4dp8q3i6dbPM7wWz1ikHpA (version 6). Its source copy is docs\pencairan-deb\blueprint.html. To change it: read it with the Artifact tool by url, edit, publish with the same url.

THEN, BEFORE ANYTHING ELSE
Reply with a short summary in your own words of: the seven steps of Termin 1, the money rule, the roles and sign in, where files and data live, how the audit trail is shown, how the PKS is generated and customised, what is deliberately NOT in the app, and the build order. Keep it under 25 lines. I will use it to check that you have not drifted. Then list anything in the docs that looks contradictory or unclear. Wait for my reply.

HARD RULES
- Align before building: for anything substantial, show it in the artifact first with options and a recommendation, then wait. I hate self baked thought and builds. Small, clearly specified changes can be done directly.
- The documents in docs\pencairan-deb are the source of truth. If what you are about to build differs from them, stop and ask. If a decision changes, update 03-keputusan.md and the related documents in the same turn.
- Never invent example figures. Every number must trace to the source files in D:\deb.
- No migration, provisioning, seed, or any call to PocketBase or Cloudflare R2 without my explicit instruction. No commit until I say so. No push unless I say so in that same message. Never wait for a deploy.
- Follow AGENTS.md: no terminal tests, npm run check, lint, format check or verification builds unless I ask. QA through the browser (Playwright as a library against my dev server at http://127.0.0.1:5176, never localhost).
- Personal data stays in D:\deb. No KTP numbers, home addresses, bank account numbers or personal names in the repo, docs, artifacts, logs or UI lists. Never print .env values.
- UI text in Indonesian, stating only the rule and the next action. No vendor names, no derivations, no reasoning. Code in English. Repo docs in Indonesian.
- Never use em dashes or en dashes anywhere, and never use hyphens as separators in prose. This applies to chat, docs, UI and artifacts.
- The working tree holds about 70 uncommitted paths of earlier work. Do not discard or reset them.
- Windows: write scripts with the Write tool (large heredocs and multi line python -c fail), use $null in PowerShell, never create a file named nul.

THINGS THAT MUST NOT APPEAR IN THE APP
An import screen for the review spreadsheet (it is a one time backend load by script). A dedicated audit page (history sits at the bottom of each page). Document download without a live preview. Rounding of the 70% or money stored as decimals (store integer sen). Full account numbers, KTP numbers or home addresses in any list.

WHERE WE STOPPED
Design agreed (decisions K1 to K8, N1 to N7, P1 to P3, Q1 to Q4 all locked). Waiting for my "go" and three facts. My answers:
1. Is the PocketBase at deb-api.pertaminafoundation.org empty? -> belum dijawab
2. Is the R2 bucket pf-monev-deb empty? -> belum dijawab
3. Will deb.pertaminafoundation.org run on Cloudflare Pages? -> belum dijawab
Go ahead to start building: -> belum

If I have given the go ahead above, do not start coding immediately. First propose the concrete plan for Phase 1 (Fondasi) from 07-rencana-bangun.md: files to add or change, collections to create with their fields and rules, the sign in routes, and how you will verify it in the browser. Wait for my approval of that plan, then build Phase 1 only.
```
