-- 1) Add owner_token column (auto-generated for existing rows)
ALTER TABLE public.session_signups
  ADD COLUMN IF NOT EXISTS owner_token uuid NOT NULL DEFAULT gen_random_uuid();

-- 2) Drop the insecure handle-based delete policy
DROP POLICY IF EXISTS "Anon delete own signup by handle" ON public.session_signups;

-- 3) Replace with token-based delete policy
CREATE POLICY "Anon delete own signup by token"
  ON public.session_signups FOR DELETE
  TO anon, authenticated
  USING (
    owner_token IS NOT NULL
    AND owner_token::text = coalesce(
      (current_setting('request.headers', true)::json ->> 'x-signup-token'),
      ''
    )
    AND coalesce(
      (current_setting('request.headers', true)::json ->> 'x-signup-token'),
      ''
    ) <> ''
  );