-- 1. Add queue_number to orders + counter table for resets
CREATE TABLE IF NOT EXISTS public.order_queue_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  next_number INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.order_queue_state (id) VALUES ('singleton') ON CONFLICT DO NOTHING;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS queue_number INTEGER;

ALTER TABLE public.order_queue_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read queue state" ON public.order_queue_state;
CREATE POLICY "Public read queue state" ON public.order_queue_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins update queue state" ON public.order_queue_state;
CREATE POLICY "Admins update queue state" ON public.order_queue_state FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function: assign queue number on insert (only for orders created after the latest reset)
CREATE OR REPLACE FUNCTION public.assign_order_queue_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_n INTEGER;
BEGIN
  UPDATE public.order_queue_state
    SET next_number = next_number + 1
    WHERE id = 'singleton'
    RETURNING next_number - 1 INTO next_n;
  NEW.queue_number := next_n;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_queue_number ON public.orders;
CREATE TRIGGER trg_assign_queue_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_order_queue_number();

-- Function: reset queue (admin only via RLS on UPDATE; called from app)
CREATE OR REPLACE FUNCTION public.reset_order_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can reset the queue';
  END IF;
  UPDATE public.order_queue_state
    SET next_number = 1, reset_at = now()
    WHERE id = 'singleton';
END;
$$;

-- 2. Session signups: auto-accept up to capacity, waitlist after,
--    block multiple slots same week, waitlist if accepted previous week.
-- Add 'waitlisted' as an allowed status (no enum, just text — already free-form)

CREATE OR REPLACE FUNCTION public.assign_signup_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  sess_year INTEGER;
  sess_week INTEGER;
  sess_capacity INTEGER;
  accepted_count INTEGER;
  norm_handle TEXT;
  same_week_exists BOOLEAN;
  prev_week_accepted BOOLEAN;
BEGIN
  -- Skip if admin override (walk-ins keep their explicit status)
  IF NEW.admin_override = true THEN
    RETURN NEW;
  END IF;

  -- Normalise telegram handle
  norm_handle := lower(regexp_replace(NEW.telegram_handle, '^@', ''));

  -- Look up session details
  SELECT year, week_number, max_capacity
    INTO sess_year, sess_week, sess_capacity
    FROM public.sessions WHERE id = NEW.session_id;

  IF sess_year IS NULL THEN
    RETURN NEW;
  END IF;

  -- Block same handle from polling two slots in the same week
  SELECT EXISTS (
    SELECT 1
      FROM public.session_signups ss
      JOIN public.sessions s ON s.id = ss.session_id
     WHERE s.year = sess_year
       AND s.week_number = sess_week
       AND lower(regexp_replace(ss.telegram_handle, '^@', '')) = norm_handle
       AND ss.status <> 'rejected'
       AND ss.id <> NEW.id
  ) INTO same_week_exists;

  IF same_week_exists THEN
    RAISE EXCEPTION 'You already signed up for another slot this week'
      USING errcode = 'check_violation';
  END IF;

  -- Was this handle accepted last week? -> waitlist
  SELECT EXISTS (
    SELECT 1
      FROM public.session_signups ss
      JOIN public.sessions s ON s.id = ss.session_id
     WHERE lower(regexp_replace(ss.telegram_handle, '^@', '')) = norm_handle
       AND ss.status = 'accepted'
       AND (
         (s.year = sess_year AND s.week_number = sess_week - 1)
         OR (sess_week = 1 AND s.year = sess_year - 1)  -- coarse year wrap
       )
  ) INTO prev_week_accepted;

  IF prev_week_accepted THEN
    NEW.status := 'waitlisted';
    RETURN NEW;
  END IF;

  -- Auto-accept up to capacity, otherwise waitlist
  SELECT COUNT(*) INTO accepted_count
    FROM public.session_signups
    WHERE session_id = NEW.session_id AND status = 'accepted';

  IF accepted_count < sess_capacity THEN
    NEW.status := 'accepted';
  ELSE
    NEW.status := 'waitlisted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_signup_status ON public.session_signups;
CREATE TRIGGER trg_assign_signup_status
  BEFORE INSERT ON public.session_signups
  FOR EACH ROW EXECUTE FUNCTION public.assign_signup_status();