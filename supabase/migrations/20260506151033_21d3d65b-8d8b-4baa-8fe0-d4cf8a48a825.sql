
DROP POLICY IF EXISTS "Authenticated insert own comments" ON public.comments;
CREATE POLICY "Non-viewers insert own comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND NOT public.has_role(auth.uid(), 'viewer'));
