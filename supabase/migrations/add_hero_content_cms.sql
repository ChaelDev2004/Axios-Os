-- Hero section CMS (text-only, singleton row)
CREATE TABLE IF NOT EXISTS public.hero_content (
  id TEXT PRIMARY KEY DEFAULT 'default',
  term_tag TEXT NOT NULL DEFAULT 'Full Stack Developer',
  headline_top TEXT NOT NULL DEFAULT 'Create with',
  rotating_words TEXT[] NOT NULL DEFAULT ARRAY['INTENT', 'PURPOSE', 'IMPACT'],
  bio_name TEXT NOT NULL DEFAULT 'Chael',
  bio_body TEXT NOT NULL DEFAULT 'a Full Stack Developer specializing in modern web development, turning ideas into fast, secure, and engaging digital experiences.',
  stat_1_value TEXT NOT NULL DEFAULT '50+',
  stat_1_label TEXT NOT NULL DEFAULT 'Projects',
  stat_2_value TEXT NOT NULL DEFAULT '5yr',
  stat_2_label TEXT NOT NULL DEFAULT 'Experience',
  stat_3_value TEXT NOT NULL DEFAULT '∞',
  stat_3_label TEXT NOT NULL DEFAULT 'Coffee',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.hero_content (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP TRIGGER IF EXISTS hero_content_updated_at ON public.hero_content;
CREATE TRIGGER hero_content_updated_at
  BEFORE UPDATE ON public.hero_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hero_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read hero content" ON public.hero_content;
CREATE POLICY "Anyone can read hero content"
  ON public.hero_content FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update hero content" ON public.hero_content;
CREATE POLICY "Admins can update hero content"
  ON public.hero_content FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert hero content" ON public.hero_content;
CREATE POLICY "Admins can insert hero content"
  ON public.hero_content FOR INSERT
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
