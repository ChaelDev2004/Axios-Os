-- Projects section CMS (text, links, tags; existing images remain in code)
CREATE TABLE IF NOT EXISTS public.projects_content (
  id TEXT PRIMARY KEY DEFAULT 'default',
  section_subtitle TEXT NOT NULL DEFAULT 'Logic meets Aesthetics, Seamlessly',
  section_title TEXT NOT NULL DEFAULT 'Projects',
  section_intro TEXT NOT NULL DEFAULT 'Featured projects that have been meticulously
crafted with passion to drive
results and impact.',
  projects JSONB NOT NULL DEFAULT '[
    {"id":1,"name":"Blanc Cafe Point Landing Page","description":"On Sale System for Blanc Cafe Point","href":"https://restaurant-pos-one-swart.vercel.app/","frameworks":["React.js","Tailwind CSS","Supabase"]},
    {"id":2,"name":"Jazz MotoLab E-Commerce & Point of Sale System","description":"E-Commerce & Point of Sale System for Jazz MotoLab","href":"https://jazzmotolab.com/","frameworks":["Next.js","React.js","PostgreSQL"]},
    {"id":3,"name":"CNCI Church Management System","description":"Church Management System for CNCI Church","href":"","frameworks":["Laravel","MySQL","Php"]},
    {"id":4,"name":"BodySync Gym Management System","description":"BodySync Gym Management System","href":"https://campus.example.com/","frameworks":["Vue.js","Laravel","MySQL"]},
    {"id":5,"name":"Kids Castle Enrollment System","description":"Kids Camp Enrollment System for Kids Camp","href":"https://games-reviews.example.com/","frameworks":["Laravel","Bootstrap","MySQL"]},
    {"id":6,"name":"Blanc Cafe Point on Sale System","description":"On Sale System for Blanc Cafe Point","href":"https://gaming-hub.example.com/","frameworks":["React.js","Express","Redis"]},
    {"id":7,"name":"BodySync Fitness Workout App","description":"Workout tracker with daily programs, exercise guides, and calorie tracking.","href":"","frameworks":["Flutter","Rest API","Firebase"]},
    {"id":8,"name":"Spiderman Portfolio Website Clone","description":"Portfolio Website for Spiderman","href":"","frameworks":["React.js","Tailwind Css","Gsap"]}
  ]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.projects_content (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS projects_content_updated_at ON public.projects_content;
CREATE TRIGGER projects_content_updated_at
  BEFORE UPDATE ON public.projects_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read projects content" ON public.projects_content;
CREATE POLICY "Anyone can read projects content"
  ON public.projects_content FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update projects content" ON public.projects_content;
CREATE POLICY "Admins can update projects content"
  ON public.projects_content FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert projects content" ON public.projects_content;
CREATE POLICY "Admins can insert projects content"
  ON public.projects_content FOR INSERT
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
