-- Local development settings. Runs on `supabase db reset` (never in production).
-- The webhook trigger reads these from Vault. host.docker.internal lets the database
-- container reach the Edge Functions running on your machine.
select vault.create_secret('http://host.docker.internal:54321', 'webhook_base_url', 'Where the database sends webhooks');
select vault.create_secret('local-dev-webhook-secret', 'webhook_secret', 'Shared secret for the member-joined webhook');
