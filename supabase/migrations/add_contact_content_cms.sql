-- Contact section CMS (text, email, phone, social links)
CREATE TABLE IF NOT EXISTS public.contact_content (
  id TEXT PRIMARY KEY DEFAULT 'default',
  section_subtitle TEXT NOT NULL DEFAULT 'You Dream It, I Code it',
  section_title TEXT NOT NULL DEFAULT 'Contact',
  section_intro TEXT NOT NULL DEFAULT 'Got a question, idea or project Idea?
WE''D love to hear from you and discuss further!',
  email TEXT NOT NULL DEFAULT 'chaeldev@gmail.com',
  phone TEXT NOT NULL DEFAULT '09452257839',
  socials JSONB NOT NULL DEFAULT '[
    {"name":"GitHub","href":"https://github.com/"},
    {"name":"LinkedIn","href":"https://linkedin.com/"},
    {"name":"Instagram","href":"https://instagram.com/"},
    {"name":"Facebook","href":"https://facebook.com/"}
  ]'::jsonb,
  marquee_items JSONB NOT NULL DEFAULT '[
    "just imagin, I code",
    "just imagin, I code",
    "just imagin, I code",
    "just imagin, I code",
    "just imagin, I code"
  ]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.contact_content (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS contact_content_updated_at ON public.contact_content;
CREATE TRIGGER contact_content_updated_at
  BEFORE UPDATE ON public.contact_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.contact_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read contact content" ON public.contact_content;
CREATE POLICY "Anyone can read contact content"
  ON public.contact_content FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update contact content" ON public.contact_content;
CREATE POLICY "Admins can update contact content"
  ON public.contact_content FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert contact content" ON public.contact_content;
CREATE POLICY "Admins can insert contact content"
  ON public.contact_content FOR INSERT
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
