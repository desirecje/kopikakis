ALTER TABLE public.session_signups REPLICA IDENTITY FULL;
ALTER TABLE public.sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_signups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;