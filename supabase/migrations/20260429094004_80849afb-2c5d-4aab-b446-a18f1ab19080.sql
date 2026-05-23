DROP POLICY IF EXISTS "Customers read own signup by token" ON public.session_signups;

CREATE POLICY "Customers read own signup by token"
  ON public.session_signups
  FOR SELECT
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
  );