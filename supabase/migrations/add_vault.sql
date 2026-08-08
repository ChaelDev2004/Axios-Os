-- AXION OS Vault: secure credential manager

CREATE TABLE IF NOT EXISTS public.vault_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS vault_folders_user_id_idx
  ON public.vault_folders (user_id);

DROP TRIGGER IF EXISTS vault_folders_updated_at ON public.vault_folders;
CREATE TRIGGER vault_folders_updated_at
  BEFORE UPDATE ON public.vault_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vault_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own vault folders" ON public.vault_folders;
CREATE POLICY "Users can select own vault folders"
  ON public.vault_folders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own vault folders" ON public.vault_folders;
CREATE POLICY "Users can insert own vault folders"
  ON public.vault_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own vault folders" ON public.vault_folders;
CREATE POLICY "Users can update own vault folders"
  ON public.vault_folders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own vault folders" ON public.vault_folders;
CREATE POLICY "Users can delete own vault folders"
  ON public.vault_folders FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vault_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  kdf_salt TEXT NOT NULL,
  auto_lock_minutes INTEGER NOT NULL DEFAULT 5
    CHECK (auto_lock_minutes IN (0, 1, 5, 15, 30)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS vault_settings_updated_at ON public.vault_settings;
CREATE TRIGGER vault_settings_updated_at
  BEFORE UPDATE ON public.vault_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vault_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own vault settings" ON public.vault_settings;
CREATE POLICY "Users can select own vault settings"
  ON public.vault_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own vault settings" ON public.vault_settings;
CREATE POLICY "Users can insert own vault settings"
  ON public.vault_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own vault settings" ON public.vault_settings;
CREATE POLICY "Users can update own vault settings"
  ON public.vault_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own vault settings" ON public.vault_settings;
CREATE POLICY "Users can delete own vault settings"
  ON public.vault_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vault_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'login'
    CHECK (type IN (
      'login', 'password', 'api_key', 'card', 'secure_note',
      'server', 'email', 'wifi', 'custom'
    )),
  username TEXT,
  encrypted_secret TEXT,
  website TEXT,
  domain TEXT,
  icon_url TEXT,
  folder_id UUID REFERENCES public.vault_folders(id) ON DELETE SET NULL,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  encrypted_notes TEXT,
  encrypted_meta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vault_credentials_user_id_idx
  ON public.vault_credentials (user_id);
CREATE INDEX IF NOT EXISTS vault_credentials_domain_idx
  ON public.vault_credentials (user_id, domain);
CREATE INDEX IF NOT EXISTS vault_credentials_type_idx
  ON public.vault_credentials (user_id, type);
CREATE INDEX IF NOT EXISTS vault_credentials_folder_id_idx
  ON public.vault_credentials (user_id, folder_id);
CREATE INDEX IF NOT EXISTS vault_credentials_favorite_idx
  ON public.vault_credentials (user_id, favorite);
CREATE INDEX IF NOT EXISTS vault_credentials_updated_at_idx
  ON public.vault_credentials (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS vault_credentials_created_at_idx
  ON public.vault_credentials (user_id, created_at DESC);

DROP TRIGGER IF EXISTS vault_credentials_updated_at ON public.vault_credentials;
CREATE TRIGGER vault_credentials_updated_at
  BEFORE UPDATE ON public.vault_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vault_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own vault credentials" ON public.vault_credentials;
CREATE POLICY "Users can select own vault credentials"
  ON public.vault_credentials FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own vault credentials" ON public.vault_credentials;
CREATE POLICY "Users can insert own vault credentials"
  ON public.vault_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own vault credentials" ON public.vault_credentials;
CREATE POLICY "Users can update own vault credentials"
  ON public.vault_credentials FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own vault credentials" ON public.vault_credentials;
CREATE POLICY "Users can delete own vault credentials"
  ON public.vault_credentials FOR DELETE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_credentials;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_folders;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
