-- Lock down SECURITY DEFINER functions from direct API access
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
-- handle_new_user is only called by trigger, revoke from API roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_order_status_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.guard_cancellation_request() FROM anon, authenticated, public;

-- The pre-existing "public insert orders/signups/sessions" policies use WITH CHECK (true).
-- That's intentional (anyone can place an order / sign up for a session) but let's at least
-- prevent anonymous insertion of arbitrary sessions.
DROP POLICY IF EXISTS "public insert sessions" ON public.sessions;
CREATE POLICY "Admins insert sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
