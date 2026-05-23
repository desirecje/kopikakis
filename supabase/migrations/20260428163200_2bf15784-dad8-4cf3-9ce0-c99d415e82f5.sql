DROP TRIGGER IF EXISTS assign_order_queue_number_trigger ON public.orders;
CREATE TRIGGER assign_order_queue_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.queue_number IS NULL)
EXECUTE FUNCTION public.assign_order_queue_number();

-- Backfill any existing orders that are missing a queue number
DO $$
DECLARE
  r RECORD;
  n INTEGER;
BEGIN
  FOR r IN SELECT id FROM public.orders WHERE queue_number IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.order_queue_state
      SET next_number = next_number + 1
      WHERE id = 'singleton'
      RETURNING next_number - 1 INTO n;
    UPDATE public.orders SET queue_number = n WHERE id = r.id;
  END LOOP;
END $$;