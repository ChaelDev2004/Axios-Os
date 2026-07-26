-- Run this in the Supabase SQL Editor, then wait a few seconds (or hard-refresh the app).

ALTER TABLE public.portfolio_projects
  ADD COLUMN IF NOT EXISTS project_url TEXT;

-- Refresh PostgREST schema cache so the API sees the new column
NOTIFY pgrst, 'reload schema';
