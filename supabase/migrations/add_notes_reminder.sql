-- Recurring note reminders (e.g. notify every Monday at 09:00)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS remind_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS remind_weekday SMALLINT
  CHECK (remind_weekday IS NULL OR (remind_weekday >= 0 AND remind_weekday <= 6));

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS remind_time TEXT DEFAULT '09:00';

CREATE INDEX IF NOT EXISTS notes_remind_idx
  ON public.notes (user_id, remind_enabled, remind_weekday)
  WHERE remind_enabled = TRUE;

COMMENT ON COLUMN public.notes.remind_weekday IS
  '0=Sunday … 6=Saturday (JS Date.getDay). NULL = every day when remind_enabled.';

NOTIFY pgrst, 'reload schema';
