DROP POLICY IF EXISTS "public delete own signup" ON public.session_signups;
DROP POLICY IF EXISTS "Anon delete own signup by handle" ON public.session_signups;
DROP POLICY IF EXISTS "Anon delete own signup by token" ON public.session_signups;

CREATE POLICY "Customers delete own unlocked signup by token"
  ON public.session_signups
  FOR DELETE
  TO anon, authenticated
  USING (
    owner_token IS NOT NULL
    AND COALESCE(current_setting('request.headers', true), '') <> ''
    AND owner_token::text = COALESCE(
      (current_setting('request.headers', true)::json ->> 'x-signup-token'),
      ''
    )
    AND COALESCE(
      (current_setting('request.headers', true)::json ->> 'x-signup-token'),
      ''
    ) <> ''
    AND EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = session_signups.session_id
        AND s.signups_locked = false
    )
  );