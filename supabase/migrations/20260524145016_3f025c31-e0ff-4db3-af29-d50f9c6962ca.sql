ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cover_image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Project images publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-images');

CREATE POLICY "Boss can upload project images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'boss'::public.app_role));

CREATE POLICY "Boss can update project images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'boss'::public.app_role));

CREATE POLICY "Boss can delete project images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'boss'::public.app_role));