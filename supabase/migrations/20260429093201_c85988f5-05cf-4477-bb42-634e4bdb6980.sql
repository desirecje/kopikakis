CREATE OR REPLACE FUNCTION public.create_session_signup(_session_id uuid, _name text, _telegram_handle text)
 RETURNS TABLE(id uuid, owner_token uuid, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_row public.session_signups;
  is_locked boolean;
BEGIN
  SELECT signups_locked INTO is_locked FROM public.sessions WHERE sessions.id = _session_id;
  IF is_locked THEN
    RAISE EXCEPTION 'Signups are locked for this session'
      USING errcode = 'check_violation';
  END IF;

  INSERT INTO public.session_signups (session_id, name, telegram_handle)
  VALUES (_session_id, _name, _telegram_handle)
  RETURNING * INTO new_row;

  RETURN QUERY SELECT new_row.id, new_row.owner_token, new_row.status;
END;
$function$;