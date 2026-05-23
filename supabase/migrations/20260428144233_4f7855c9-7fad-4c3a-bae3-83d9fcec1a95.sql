
-- Normalize handles for uniqueness: lowercase, strip leading @
create unique index session_signups_unique_active
  on public.session_signups (session_id, lower(ltrim(telegram_handle, '@')))
  where status <> 'rejected';
