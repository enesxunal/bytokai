-- Book publishing submissions + private storage bucket

CREATE TABLE public.book_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  book_title text NOT NULL,
  book_genre text NOT NULL,
  estimated_word_count integer,
  manuscript_status text NOT NULL,
  synopsis text NOT NULL,
  author_bio text NOT NULL,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL CHECK (file_size > 0),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'contacted', 'accepted', 'rejected', 'archived')),
  admin_notes text,
  consent_at timestamptz NOT NULL,
  ip_hash text,
  user_agent text,
  notification_status text NOT NULL DEFAULT 'pending'
    CHECK (notification_status IN ('pending', 'sent', 'partial', 'failed')),
  notification_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT book_submissions_genre_check CHECK (char_length(book_genre) BETWEEN 1 AND 80),
  CONSTRAINT book_submissions_status_ms_check CHECK (
    manuscript_status IN (
      'Tamamlandı',
      'İlk taslak',
      'Düzenleme aşamasında',
      'Fikir/proje aşamasında'
    )
  ),
  CONSTRAINT book_submissions_word_count_check CHECK (
    estimated_word_count IS NULL
    OR (estimated_word_count >= 0 AND estimated_word_count <= 5000000)
  )
);

CREATE INDEX book_submissions_created_at_idx
  ON public.book_submissions (created_at DESC);

CREATE INDEX book_submissions_status_idx
  ON public.book_submissions (status);

CREATE INDEX book_submissions_email_created_idx
  ON public.book_submissions (email, created_at DESC);

CREATE INDEX book_submissions_ip_hash_created_idx
  ON public.book_submissions (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_book_submissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER book_submissions_set_updated_at
  BEFORE UPDATE ON public.book_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_book_submissions_updated_at();

ALTER TABLE public.book_submissions ENABLE ROW LEVEL SECURITY;

-- No public SELECT / INSERT / UPDATE / DELETE.
-- All writes go through service_role on the server.
CREATE POLICY book_submissions_admin_select
  ON public.book_submissions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY book_submissions_admin_update
  ON public.book_submissions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Private storage bucket for manuscripts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-submissions',
  'book-submissions',
  false,
  15728640,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage: no public access; admins can read via signed URLs (service role bypasses RLS)
CREATE POLICY book_submissions_storage_admin_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'book-submissions'
    AND public.is_admin()
  );
