ALTER TABLE public.option_groups
  ADD COLUMN IF NOT EXISTS menu_item_id text;

DO $$
DECLARE
  link RECORD;
  new_group_id uuid;
  current_owner text;
BEGIN
  FOR link IN
    SELECT mig.menu_item_id, mig.group_id, mig.sort_order
    FROM public.menu_item_option_groups mig
    ORDER BY mig.menu_item_id, mig.sort_order
  LOOP
    SELECT menu_item_id INTO current_owner
    FROM public.option_groups
    WHERE id = link.group_id;

    IF current_owner IS NULL THEN
      UPDATE public.option_groups
        SET menu_item_id = link.menu_item_id,
            sort_order = link.sort_order
        WHERE id = link.group_id;
    ELSE
      INSERT INTO public.option_groups (name, selection_type, required, sort_order, menu_item_id)
      SELECT name, selection_type, required, link.sort_order, link.menu_item_id
        FROM public.option_groups WHERE id = link.group_id
      RETURNING id INTO new_group_id;

      INSERT INTO public.option_choices (group_id, label, price_delta, is_default, sort_order)
      SELECT new_group_id, label, price_delta, is_default, sort_order
        FROM public.option_choices WHERE group_id = link.group_id;
    END IF;
  END LOOP;
END
$$;

DELETE FROM public.option_choices
  WHERE group_id IN (SELECT id FROM public.option_groups WHERE menu_item_id IS NULL);
DELETE FROM public.option_groups WHERE menu_item_id IS NULL;

ALTER TABLE public.option_groups
  ALTER COLUMN menu_item_id SET NOT NULL;

ALTER TABLE public.option_groups
  ADD CONSTRAINT option_groups_menu_item_id_fkey
  FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS option_groups_menu_item_id_idx
  ON public.option_groups(menu_item_id);

DROP TABLE IF EXISTS public.menu_item_option_groups;
