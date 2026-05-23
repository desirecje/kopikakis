ALTER TABLE public.session_signups DROP CONSTRAINT IF EXISTS session_signups_status_check;
ALTER TABLE public.session_signups ADD CONSTRAINT session_signups_status_check
  CHECK (status IN ('pending','accepted','rejected','waitlisted'));