-- Receipt scanner: merchant, payment method, scan metadata, receipt image
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS merchant TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS scan_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS receipt_image_path TEXT,
  ADD COLUMN IF NOT EXISTS ocr_text TEXT,
  ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(5, 2);

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_merchant_length;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_merchant_length CHECK (merchant IS NULL OR char_length(merchant) <= 120);

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_payment_method_check CHECK (
    payment_method IS NULL
    OR payment_method IN ('cash', 'card', 'gcash', 'maya', 'bank_transfer', 'other')
  );

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_scan_source_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_scan_source_check CHECK (scan_source IN ('manual', 'scanner'));

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_receipt_image_path_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_receipt_image_path_check CHECK (
    receipt_image_path IS NULL
    OR (char_length(receipt_image_path) <= 255 AND split_part(receipt_image_path, '/', 1) = user_id::text)
  );

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_ocr_text_length;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_ocr_text_length CHECK (ocr_text IS NULL OR char_length(ocr_text) <= 20000);

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_ocr_confidence_range;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_ocr_confidence_range CHECK (
    ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 100)
  );

-- Private bucket; each user owns the folder named after their user id
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', false, 2097152, ARRAY['image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can read own receipts" ON storage.objects;
CREATE POLICY "Users can read own receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

NOTIFY pgrst, 'reload schema';
