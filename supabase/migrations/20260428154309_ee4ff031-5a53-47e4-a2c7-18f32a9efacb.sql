CREATE TABLE public.menu_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view available menu items"
  ON public.menu_items FOR SELECT
  USING (available = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage menu items"
  ON public.menu_items FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_menu_items()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_items_touch
BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.touch_menu_items();

INSERT INTO public.menu_items (id, name, description, price, sort_order) VALUES
  ('latte',        'Latte',        'Silky steamed milk over a double shot of espresso.', 5.00, 10),
  ('americano',    'Americano',    'Espresso lengthened with hot water. Bold and clean.', 4.00, 20),
  ('matcha-latte', 'Matcha Latte', 'Ceremonial-grade matcha whisked with oat milk.',      5.50, 30),
  ('mocha',        'Mocha',        'Espresso, dark chocolate, and steamed milk.',         5.50, 40);