-- Public storage bucket for article cover images (admin upload)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-covers',
  'article-covers',
  true,
  4194304,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read (bucket is public; policy still required for authenticated SELECT in some setups)
CREATE POLICY article_covers_storage_public_select
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'article-covers');

-- Admins can upload / replace / delete covers
CREATE POLICY article_covers_storage_admin_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-covers'
    AND public.is_admin()
  );

CREATE POLICY article_covers_storage_admin_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-covers'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'article-covers'
    AND public.is_admin()
  );

CREATE POLICY article_covers_storage_admin_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-covers'
    AND public.is_admin()
  );
