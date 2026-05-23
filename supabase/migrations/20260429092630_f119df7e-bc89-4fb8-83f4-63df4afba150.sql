DROP POLICY IF EXISTS "Customers insert cancel audit" ON public.order_audit_log;

CREATE POLICY "Customers insert cancel audit"
ON public.order_audit_log
FOR INSERT
TO anon, authenticated
WITH CHECK (
  to_status = 'cancellation_requested'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_audit_log.order_id
      AND o.owner_token IS NOT NULL
      AND (o.owner_token)::text = COALESCE(((current_setting('request.headers'::text, true))::json ->> 'x-owner-token'::text), '')
      AND COALESCE(((current_setting('request.headers'::text, true))::json ->> 'x-owner-token'::text), '') <> ''
  )
);