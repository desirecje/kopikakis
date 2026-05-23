CREATE POLICY "public delete own signup"
ON public.session_signups
FOR DELETE
TO public
USING (true);