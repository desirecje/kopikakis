-- 1) Drop overly-permissive policies
DROP POLICY IF EXISTS "public read signups" ON public.session_signups;
DROP POLICY IF EXISTS "public delete own signup" ON public.session_signups;

-- 2) Admins can already read all (via "Admins update/delete signups" + we add explicit SELECT)
CREATE POLICY "Admins read all signups"
  ON public.session_signups FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) Public delete now requires matching telegram handle passed via header
CREATE POLICY "Anon delete own signup by handle"
  ON public.session_signups FOR DELETE
  TO anon, authenticated
  USING (
    lower(regexp_replace(telegram_handle, '^@', '')) =
    lower(regexp_replace(coalesce(current_setting('request.headers', true)::json->>'x-signup-handle', ''), '^@', ''))
    AND coalesce(current_setting('request.headers', true)::json->>'x-signup-handle', '') <> ''
  );

-- 4) Public RPC: per-session accepted counts (no PII)
CREATE OR REPLACE FUNCTION public.get_session_seat_counts()
RETURNS TABLE(session_id uuid, accepted_count integer, total_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT session_id,
         COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted_count,
         COUNT(*)::int AS total_count
  FROM public.session_signups
  GROUP BY session_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_session_seat_counts() TO anon, authenticated;

-- 5) Public RPC: signups for a single telegram handle (only that user's rows)
CREATE OR REPLACE FUNCTION public.get_my_signups(_handle text)
RETURNS TABLE(
  id uuid,
  session_id uuid,
  telegram_handle text,
  status text,
  session_year integer,
  session_week integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ss.id, ss.session_id, ss.telegram_handle, ss.status,
         s.year, s.week_number
  FROM public.session_signups ss
  JOIN public.sessions s ON s.id = ss.session_id
  WHERE _handle IS NOT NULL
    AND length(trim(_handle)) > 0
    AND lower(regexp_replace(ss.telegram_handle, '^@', '')) =
        lower(regexp_replace(trim(_handle), '^@', ''));
$$;

GRANT EXECUTE ON FUNCTION public.get_my_signups(text) TO anon, authenticated;

-- 6) Public RPC: lockout weeks for a handle (was accepted week N -> locked N+1)
CREATE OR REPLACE FUNCTION public.get_my_lockout_weeks(_handle text)
RETURNS TABLE(year integer, week integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN s.week_number + 1 > 52 THEN s.year + 1 ELSE s.year END AS year,
    CASE WHEN s.week_number + 1 > 52 THEN 1 ELSE s.week_number + 1 END AS week
  FROM public.session_signups ss
  JOIN public.sessions s ON s.id = ss.session_id
  WHERE _handle IS NOT NULL
    AND length(trim(_handle)) > 0
    AND ss.status = 'accepted'
    AND lower(regexp_replace(ss.telegram_handle, '^@', '')) =
        lower(regexp_replace(trim(_handle), '^@', ''));
$$;

GRANT EXECUTE ON FUNCTION public.get_my_lockout_weeks(text) TO anon, authenticated;