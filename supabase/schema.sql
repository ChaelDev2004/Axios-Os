-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  pin_hash TEXT,
  has_pin BOOLEAN NOT NULL DEFAULT FALSE,
  pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extend existing profiles (safe for re-runs)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_locked_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_lock_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_lock_level INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, has_pin, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    FALSE,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects (user_id, status);
CREATE INDEX IF NOT EXISTS projects_due_date_idx ON public.projects (user_id, due_date);

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks (user_id, status);
CREATE INDEX IF NOT EXISTS tasks_completed_idx ON public.tasks (user_id, completed);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks (user_id, due_date);

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Pomodoro sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pomodoro_sessions_user_id_idx ON public.pomodoro_sessions (user_id);
CREATE INDEX IF NOT EXISTS pomodoro_sessions_started_at_idx ON public.pomodoro_sessions (user_id, started_at);
CREATE INDEX IF NOT EXISTS pomodoro_sessions_completed_idx ON public.pomodoro_sessions (user_id, completed);

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  category TEXT,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON public.transactions (user_id, type);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions (user_id, transaction_date);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON public.transactions (user_id, category);

-- ---------------------------------------------------------------------------
-- Portfolio projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

ALTER TABLE public.portfolio_projects ADD COLUMN IF NOT EXISTS project_url TEXT;

CREATE INDEX IF NOT EXISTS portfolio_projects_user_id_idx ON public.portfolio_projects (user_id);
CREATE INDEX IF NOT EXISTS portfolio_projects_published_idx ON public.portfolio_projects (user_id, published);
CREATE INDEX IF NOT EXISTS portfolio_projects_slug_idx ON public.portfolio_projects (slug);

DROP TRIGGER IF EXISTS portfolio_projects_updated_at ON public.portfolio_projects;
CREATE TRIGGER portfolio_projects_updated_at
  BEFORE UPDATE ON public.portfolio_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Portfolio view events (weekly/monthly charts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_project_id UUID NOT NULL REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolio_view_events_user_id_idx ON public.portfolio_view_events (user_id);
CREATE INDEX IF NOT EXISTS portfolio_view_events_project_idx ON public.portfolio_view_events (portfolio_project_id);
CREATE INDEX IF NOT EXISTS portfolio_view_events_viewed_at_idx ON public.portfolio_view_events (user_id, viewed_at);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- AI conversations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx ON public.ai_conversations (user_id);
CREATE INDEX IF NOT EXISTS ai_conversations_created_at_idx ON public.ai_conversations (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Hero section CMS (public read, admin write)
-- ---------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS public.about_content (
  id TEXT PRIMARY KEY DEFAULT 'default',
  lead_text TEXT NOT NULL DEFAULT 'I''m Chael — a Full Stack Developer who bridges robust engineering with thoughtful design. Drag the card to explore, then scroll to see what I build with.',
  hire_button_label TEXT NOT NULL DEFAULT 'Hire Me',
  cv_button_label TEXT NOT NULL DEFAULT 'CV',
  cv_url TEXT NOT NULL DEFAULT '',
  cv_file_name TEXT NOT NULL DEFAULT '',
  cv_redirect_url TEXT NOT NULL DEFAULT '',
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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_view_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects_content ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Projects policies
DROP POLICY IF EXISTS "Users can select own projects" ON public.projects;
CREATE POLICY "Users can select own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Tasks policies
DROP POLICY IF EXISTS "Users can select own tasks" ON public.tasks;
CREATE POLICY "Users can select own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Pomodoro sessions policies
DROP POLICY IF EXISTS "Users can select own pomodoro sessions" ON public.pomodoro_sessions;
CREATE POLICY "Users can select own pomodoro sessions"
  ON public.pomodoro_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pomodoro sessions" ON public.pomodoro_sessions;
CREATE POLICY "Users can insert own pomodoro sessions"
  ON public.pomodoro_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pomodoro sessions" ON public.pomodoro_sessions;
CREATE POLICY "Users can update own pomodoro sessions"
  ON public.pomodoro_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pomodoro sessions" ON public.pomodoro_sessions;
CREATE POLICY "Users can delete own pomodoro sessions"
  ON public.pomodoro_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions policies
DROP POLICY IF EXISTS "Users can select own transactions" ON public.transactions;
CREATE POLICY "Users can select own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Portfolio projects policies
DROP POLICY IF EXISTS "Users can select own portfolio projects" ON public.portfolio_projects;
CREATE POLICY "Users can select own portfolio projects"
  ON public.portfolio_projects FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own portfolio projects" ON public.portfolio_projects;
CREATE POLICY "Users can insert own portfolio projects"
  ON public.portfolio_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own portfolio projects" ON public.portfolio_projects;
CREATE POLICY "Users can update own portfolio projects"
  ON public.portfolio_projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own portfolio projects" ON public.portfolio_projects;
CREATE POLICY "Users can delete own portfolio projects"
  ON public.portfolio_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Portfolio view events policies
DROP POLICY IF EXISTS "Users can select own portfolio view events" ON public.portfolio_view_events;
CREATE POLICY "Users can select own portfolio view events"
  ON public.portfolio_view_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own portfolio view events" ON public.portfolio_view_events;
CREATE POLICY "Users can insert own portfolio view events"
  ON public.portfolio_view_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own portfolio view events" ON public.portfolio_view_events;
CREATE POLICY "Users can delete own portfolio view events"
  ON public.portfolio_view_events FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can select own notifications" ON public.notifications;
CREATE POLICY "Users can select own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- AI conversations policies
DROP POLICY IF EXISTS "Users can select own ai conversations" ON public.ai_conversations;
CREATE POLICY "Users can select own ai conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ai conversations" ON public.ai_conversations;
CREATE POLICY "Users can insert own ai conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ai conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete own ai conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Hero content policies
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

-- About content policies
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

-- Projects content policies
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

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pomodoro_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_projects;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_view_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role bypasses RLS for auth flows (PIN login lookup)
