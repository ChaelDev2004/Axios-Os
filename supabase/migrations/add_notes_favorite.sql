-- Add favorite flag for existing notes tables
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS notes_favorite_idx
  ON public.notes (user_id, favorite);

NOTIFY pgrst, 'reload schema';
