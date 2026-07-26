-- Auth security: password lockout columns, audit log, role escalation guard

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_locked_until TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_lock_level INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_lock_level INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.auth_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_security_events_created_at_idx
  ON public.auth_security_events (created_at DESC);

CREATE INDEX IF NOT EXISTS auth_security_events_email_created_idx
  ON public.auth_security_events (email, created_at DESC);

CREATE INDEX IF NOT EXISTS auth_security_events_ip_created_idx
  ON public.auth_security_events (ip, created_at DESC);

CREATE INDEX IF NOT EXISTS auth_security_events_kind_created_idx
  ON public.auth_security_events (kind, created_at DESC);

ALTER TABLE public.auth_security_events ENABLE ROW LEVEL SECURITY;

-- Only service role / admin reads; no public policies for insert/select by users
DROP POLICY IF EXISTS "Admins can read auth security events" ON public.auth_security_events;
CREATE POLICY "Admins can read auth security events"
  ON public.auth_security_events FOR SELECT
  USING (public.is_admin());

-- Prevent users from escalating their own role via client UPDATE
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_protect_role ON public.profiles;
CREATE TRIGGER profiles_protect_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();
