# Operations and safety boundary

`start.sh` is non-destructive: it never installs, migrates, seeds, starts PostgreSQL, or kills a port owner. Run `scripts/bootstrap.sh` once, review `.env`, apply approved migrations with `scripts/migrate.sh`, then start. Demo data requires `CONFIRM_DEMO_SEED=YES scripts/seed-demo.sh` and is refused in production.

The governed `/api/care-coordination` workflow is tenant-scoped and auditable. Clinical review and treatment approval require a licensed role and a recorded approval; it does not diagnose or replace a dentist. PACS/EHR, imaging, payer, prescribing, payment, calendar, and messaging integrations remain disabled until vendor contracts, credentials, privacy review, and conformance tests exist.
