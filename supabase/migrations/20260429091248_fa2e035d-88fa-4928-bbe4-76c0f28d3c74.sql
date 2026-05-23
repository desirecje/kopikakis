-- Add lock flag
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS signups_locked boolean NOT NULL DEFAULT false;

-- Replace the anon delete policy so it also requires the session to be unlocked
DROP POLICY IF EXISTS "Anon delete own signup by token" ON public.session_signups;

CREATE POLICY "Anon delete own signup by token"
  ON public.session_signups
  FOR DELETE
  TO anon, authenticated
  USING (
    owner_token IS NOT NULL
    AND owner_token::text = COALESCE(
      (current_setting('request.headers', true)::json ->> 'x-signup-token'),
      ''
    )
    AND COALESCE(
      (current_setting('request.headers', true)::json ->> 'x-signup-token'),
      ''
    ) <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_signups.session_id
        AND s.signups_locked = true
    )
  );