
-- Customizable option groups (e.g. "Milk", "Espresso shots", "Syrups")
CREATE TABLE public.option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  selection_type text NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single','multi')),
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.option_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  label text NOT NULL,
  price_delta numeric NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_option_choices_group ON public.option_choices(group_id);

-- Per-drink opt-in
CREATE TABLE public.menu_item_option_groups (
  menu_item_id text NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (menu_item_id, group_id)
);

CREATE INDEX idx_mi_option_groups_menu ON public.menu_item_option_groups(menu_item_id);

-- updated_at triggers
CREATE TRIGGER touch_option_groups
  BEFORE UPDATE ON public.option_groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_menu_items();

CREATE TRIGGER touch_option_choices
  BEFORE UPDATE ON public.option_choices
  FOR EACH ROW EXECUTE FUNCTION public.touch_menu_items();

-- RLS
ALTER TABLE public.option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_option_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read option groups" ON public.option_groups FOR SELECT USING (true);
CREATE POLICY "Admins manage option groups" ON public.option_groups FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read option choices" ON public.option_choices FOR SELECT USING (true);
CREATE POLICY "Admins manage option choices" ON public.option_choices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read menu item option groups" ON public.menu_item_option_groups FOR SELECT USING (true);
CREATE POLICY "Admins manage menu item option groups" ON public.menu_item_option_groups FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
