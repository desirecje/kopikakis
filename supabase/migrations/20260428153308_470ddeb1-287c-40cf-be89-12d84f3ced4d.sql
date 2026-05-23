-- Single-row site content table
CREATE TABLE public.site_content (
  id text PRIMARY KEY DEFAULT 'home',
  hero_eyebrow text NOT NULL DEFAULT 'Today''s pour',
  hero_headline text NOT NULL DEFAULT 'Slow coffee,',
  hero_headline_accent text NOT NULL DEFAULT 'made with care.',
  hero_subheading text NOT NULL DEFAULT 'Order ahead and skip the line, or join one of our weekly tasting sessions.',
  special_enabled boolean NOT NULL DEFAULT false,
  special_title text NOT NULL DEFAULT '',
  special_description text NOT NULL DEFAULT '',
  special_image_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Seed the single row
INSERT INTO public.site_content (id) VALUES ('home') ON CONFLICT DO NOTHING;

CREATE POLICY "Public can read site content"
  ON public.site_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can update site content"
  ON public.site_content FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger to bump updated_at and updated_by
CREATE OR REPLACE FUNCTION public.touch_site_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER site_content_touch
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_site_content();

-- Public storage bucket for site images (weekly special photo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Site images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-images');

CREATE POLICY "Admins can upload site images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update site images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete site images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-images' AND has_role(auth.uid(), 'admin'));