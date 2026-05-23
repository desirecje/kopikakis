CREATE OR REPLACE FUNCTION public.create_session_signup(
  _session_id uuid,
  _name text,
  _telegram_handle text
)
RETURNS TABLE(id uuid, owner_token uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_row public.session_signups;
BEGIN
  INSERT INTO public.session_signups (session_id, name, telegram_handle)
  VALUES (_session_id, _name, _telegram_handle)
  RETURNING * INTO new_row;

  RETURN QUERY SELECT new_row.id, new_row.owner_token, new_row.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_session_signup(uuid, text, text) TO anon, authenticated;