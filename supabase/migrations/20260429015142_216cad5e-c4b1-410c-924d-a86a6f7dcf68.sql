ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_size_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_size_check
  CHECK (size = ANY (ARRAY['Iced'::text, 'Hot'::text, 'S'::text, 'M'::text, 'L'::text]));