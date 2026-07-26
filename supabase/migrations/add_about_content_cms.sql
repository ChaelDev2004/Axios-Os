-- About section CMS (text-only, singleton row)
CREATE TABLE IF NOT EXISTS public.about_content (
  id TEXT PRIMARY KEY DEFAULT 'default',
  lead_text TEXT NOT NULL DEFAULT 'I''m Chael — a Full Stack Developer who bridges robust engineering with thoughtful design. Drag the card to explore, then scroll to see what I build with.',
  hire_button_label TEXT NOT NULL DEFAULT 'Hire Me',
  cv_button_label TEXT NOT NULL DEFAULT 'CV',
  lanyard_hint TEXT NOT NULL DEFAULT 'Drag It!',
  feature_1_num TEXT NOT NULL DEFAULT '01',
  feature_1_title TEXT NOT NULL DEFAULT 'Clean Architecture',
  feature_1_desc TEXT NOT NULL DEFAULT 'Scalable, maintainable systems built with modern patterns — from database schema to API design.',
  feature_2_num TEXT NOT NULL DEFAULT '02',
  feature_2_title TEXT NOT NULL DEFAULT 'Performance First',
  feature_2_desc TEXT NOT NULL DEFAULT 'Every interaction optimized for speed — lazy loading, caching, and lean bundles by default.',
  feature_3_num TEXT NOT NULL DEFAULT '03',
  feature_3_title TEXT NOT NULL DEFAULT 'Secure by Design',
  feature_3_desc TEXT NOT NULL DEFAULT 'Authentication, validation, and data handling built with security as a first-class concern.',
  feature_4_num TEXT NOT NULL DEFAULT '04',
  feature_4_title TEXT NOT NULL DEFAULT 'Pixel-Perfect UI',
  feature_4_desc TEXT NOT NULL DEFAULT 'Interfaces crafted with motion and detail — every hover, transition, and layout intentional.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.about_content (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS about_content_updated_at ON public.about_content;
CREATE TRIGGER about_content_updated_at
  BEFORE UPDATE ON public.about_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.about_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read about content" ON public.about_content;
CREATE POLICY "Anyone can read about content"
  ON public.about_content FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update about content" ON public.about_content;
CREATE POLICY "Admins can update about content"
  ON public.about_content FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert about content" ON public.about_content;
CREATE POLICY "Admins can insert about content"
  ON public.about_content FOR INSERT
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
