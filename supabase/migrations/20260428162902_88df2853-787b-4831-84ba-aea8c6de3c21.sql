CREATE OR REPLACE FUNCTION public.promote_waitlist_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_id UUID;
BEGIN
  IF OLD.status <> 'accepted' THEN
    RETURN OLD;
  END IF;

  SELECT id INTO next_id
    FROM public.session_signups
    WHERE session_id = OLD.session_id
      AND status = 'waitlisted'
    ORDER BY created_at ASC
    LIMIT 1;

  IF next_id IS NOT NULL THEN
    UPDATE public.session_signups
      SET status = 'accepted'
      WHERE id = next_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS promote_waitlist_after_delete ON public.session_signups;
CREATE TRIGGER promote_waitlist_after_delete
AFTER DELETE ON public.session_signups
FOR EACH ROW
EXECUTE FUNCTION public.promote_waitlist_on_delete();

-- Also handle status downgrades (admin marks accepted -> rejected/waitlisted)
CREATE OR REPLACE FUNCTION public.promote_waitlist_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_id UUID;
BEGIN
  IF OLD.status = 'accepted' AND NEW.status <> 'accepted' THEN
    SELECT id INTO next_id
      FROM public.session_signups
      WHERE session_id = NEW.session_id
        AND status = 'waitlisted'
        AND id <> NEW.id
      ORDER BY created_at ASC
      LIMIT 1;

    IF next_id IS NOT NULL THEN
      UPDATE public.session_signups
        SET status = 'accepted'
        WHERE id = next_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promote_waitlist_after_update ON public.session_signups;
CREATE TRIGGER promote_waitlist_after_update
AFTER UPDATE OF status ON public.session_signups
FOR EACH ROW
EXECUTE FUNCTION public.promote_waitlist_on_update();