-- Site branding CMS (app name, page title, favicon)
CREATE TABLE IF NOT EXISTS public.site_branding (
  id TEXT PRIMARY KEY DEFAULT 'default',
  app_name TEXT NOT NULL DEFAULT 'AXIOS OS',
  page_title TEXT NOT NULL DEFAULT 'AXIOS OS',
  favicon_url TEXT NOT NULL DEFAULT '/favicon.ico',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.site_branding (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS site_branding_updated_at ON public.site_branding;
CREATE TRIGGER site_branding_updated_at
  BEFORE UPDATE ON public.site_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site branding" ON public.site_branding;
CREATE POLICY "Anyone can read site branding"
  ON public.site_branding FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update site branding" ON public.site_branding;
CREATE POLICY "Admins can update site branding"
  ON public.site_branding FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert site branding" ON public.site_branding;
CREATE POLICY "Admins can insert site branding"
  ON public.site_branding FOR INSERT
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
