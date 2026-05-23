-- Enable RLS on realtime.messages and restrict channel subscriptions to known-safe topics.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Public/anon-readable channels (back tables that are intentionally publicly readable)
CREATE POLICY "Allow public realtime topics"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (
  realtime.topic() IN (
    'menu-items-public',
    'sessions-public',
    'site-content-home'
  )
);

-- Admin-only channels
CREATE POLICY "Allow admin realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() IN (
    'admin-orders',
    'admin-signups',
    'admin-team',
    'week-perf-prices'
  )
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);