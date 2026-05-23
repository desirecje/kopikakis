-- Restrict listing the site-images bucket to admins; individual public URLs still work via Supabase's public URL signing
DROP POLICY IF EXISTS "Site images are publicly readable" ON storage.objects;

CREATE POLICY "Public can view individual site images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'site-images');