-- Wipe existing data first (signups have no FK but we clear them too)
DELETE FROM public.session_signups;
DELETE FROM public.sessions;

-- Add published flag
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

-- Helpful index for the public query
CREATE INDEX IF NOT EXISTS idx_sessions_published_date
  ON public.sessions (published, session_date);