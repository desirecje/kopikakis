-- A profile is visible in discovery by default, so existing users keep the
-- behaviour they had before this setting existed.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_discoverable boolean NOT NULL DEFAULT true;

-- Row Level Security (RLS) is the database-level privacy lock.  The app's
-- filters improve the UI, but RLS prevents a direct database request from
-- exposing a hidden profile.  A user may still see their own profile, someone
-- they already have a buddy request with, an accepted kaki, or an admin.
DROP POLICY IF EXISTS "Profiles viewable by self" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;

CREATE POLICY "Profiles visible according to privacy setting"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR is_discoverable
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.buddy_requests
      WHERE (sender_id = auth.uid() AND receiver_id = profiles.id)
         OR (receiver_id = auth.uid() AND sender_id = profiles.id)
    )
  );
