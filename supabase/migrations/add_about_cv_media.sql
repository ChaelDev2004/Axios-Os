-- About CMS: CV file URL, display name, and optional redirect link
ALTER TABLE public.about_content
  ADD COLUMN IF NOT EXISTS cv_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cv_file_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cv_redirect_url TEXT NOT NULL DEFAULT '';

-- Public media bucket for CV / site files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media',
  'site-media',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Anyone can read site media" ON storage.objects;
CREATE POLICY "Anyone can read site media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-media');

DROP POLICY IF EXISTS "Admins can upload site media" ON storage.objects;
CREATE POLICY "Admins can upload site media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-media' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update site media" ON storage.objects;
CREATE POLICY "Admins can update site media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'site-media' AND public.is_admin())
  WITH CHECK (bucket_id = 'site-media' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete site media" ON storage.objects;
CREATE POLICY "Admins can delete site media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'site-media' AND public.is_admin());

NOTIFY pgrst, 'reload schema';
