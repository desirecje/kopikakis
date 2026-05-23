CREATE OR REPLACE FUNCTION public.delete_session_signup(_signup_id uuid, _owner_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.session_signups ss
  USING public.sessions s
  WHERE ss.id = _signup_id
    AND ss.owner_token = _owner_token
    AND s.id = ss.session_id
    AND s.signups_locked = false;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_session_signup(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_session_signup(uuid, uuid) TO anon, authenticated;