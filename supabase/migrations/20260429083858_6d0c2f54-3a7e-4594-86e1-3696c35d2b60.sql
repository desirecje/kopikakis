-- 1. Add owner_token column to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS owner_token uuid;

-- Backfill existing orders with random tokens so they're not orphaned
UPDATE public.orders SET owner_token = gen_random_uuid() WHERE owner_token IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN owner_token SET NOT NULL,
  ALTER COLUMN owner_token SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_orders_owner_token ON public.orders(owner_token);

-- 2. Replace permissive SELECT policy with owner-scoped + admin
DROP POLICY IF EXISTS "public read orders" ON public.orders;

CREATE POLICY "Admins read all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners read their order by token"
  ON public.orders FOR SELECT
  TO anon, authenticated
  USING (
    owner_token IS NOT NULL
    AND owner_token::text = current_setting('request.headers', true)::json->>'x-owner-token'
  );

-- 3. Replace permissive cancellation UPDATE policy with token-scoped
DROP POLICY IF EXISTS "Customers can request cancellation" ON public.orders;

CREATE POLICY "Owners can request cancellation"
  ON public.orders FOR UPDATE
  TO anon, authenticated
  USING (
    status = ANY (ARRAY['pending'::text, 'preparing'::text])
    AND owner_token IS NOT NULL
    AND owner_token::text = current_setting('request.headers', true)::json->>'x-owner-token'
  )
  WITH CHECK (
    cancellation_requested = true
    AND status = ANY (ARRAY['pending'::text, 'preparing'::text])
    AND owner_token::text = current_setting('request.headers', true)::json->>'x-owner-token'
  );

-- 4. Restrict order_audit_log SELECT (was public read) to admins only
DROP POLICY IF EXISTS "public read audit" ON public.order_audit_log;

CREATE POLICY "Admins read audit log"
  ON public.order_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));