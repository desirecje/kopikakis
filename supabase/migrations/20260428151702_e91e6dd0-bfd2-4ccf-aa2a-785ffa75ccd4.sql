-- Prevent deleting the last admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'admin' THEN
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin'
        USING errcode = 'check_violation';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_last_admin ON public.user_roles;
CREATE TRIGGER guard_last_admin
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_removal();

-- Promote a user to admin by email (admin-only).
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;

  SELECT id INTO target_id FROM public.profiles WHERE lower(email) = lower(_email);
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email %', _email;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN target_id;
END;
$$;

-- Demote an admin (admin-only). Trigger will block if it would leave 0 admins.
CREATE OR REPLACE FUNCTION public.demote_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can demote users';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = 'admin';
END;
$$;