-- Lock down execute on the new admin helpers
REVOKE ALL ON FUNCTION public.promote_user_to_admin(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.demote_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.demote_admin(uuid) TO authenticated;