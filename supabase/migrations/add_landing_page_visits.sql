-- Public landing page visit events (anonymous tracking via API / service role)
CREATE TABLE IF NOT EXISTS public.landing_page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  path TEXT NOT NULL DEFAULT '/',
  referrer TEXT NOT NULL DEFAULT '',
  session_id TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS landing_page_visits_visited_at_idx
  ON public.landing_page_visits (visited_at DESC);

CREATE INDEX IF NOT EXISTS landing_page_visits_session_id_idx
  ON public.landing_page_visits (session_id);

ALTER TABLE public.landing_page_visits ENABLE ROW LEVEL SECURITY;

-- Admins can read all landing visits for dashboard analytics
DROP POLICY IF EXISTS "Admins can select landing visits" ON public.landing_page_visits;
CREATE POLICY "Admins can select landing visits"
  ON public.landing_page_visits FOR SELECT
  USING (public.is_admin());

-- No public insert from anon key — use service-role API route instead
DROP POLICY IF EXISTS "Service role inserts landing visits" ON public.landing_page_visits;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_page_visits;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
