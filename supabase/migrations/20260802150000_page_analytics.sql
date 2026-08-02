-- First-party page analytics for admin overview

CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  path text NOT NULL,
  article_id uuid REFERENCES public.articles (id) ON DELETE SET NULL,
  duration_seconds integer NOT NULL DEFAULT 0
    CHECK (duration_seconds >= 0 AND duration_seconds <= 7200),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT page_views_visitor_id_len CHECK (char_length(visitor_id) BETWEEN 8 AND 64),
  CONSTRAINT page_views_session_id_len CHECK (char_length(session_id) BETWEEN 8 AND 64),
  CONSTRAINT page_views_path_len CHECK (char_length(path) BETWEEN 1 AND 500)
);

CREATE INDEX page_views_created_at_idx
  ON public.page_views (created_at DESC);

CREATE INDEX page_views_article_created_idx
  ON public.page_views (article_id, created_at DESC)
  WHERE article_id IS NOT NULL;

CREATE INDEX page_views_visitor_created_idx
  ON public.page_views (visitor_id, created_at DESC);

CREATE INDEX page_views_session_created_idx
  ON public.page_views (session_id, created_at DESC);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- No public SELECT / INSERT / UPDATE / DELETE.
-- Writes go through service_role on the server.
CREATE POLICY page_views_admin_select
  ON public.page_views FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY page_views_admin_delete
  ON public.page_views FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Atomically bump articles.view_count when a tracked article view starts.
CREATE OR REPLACE FUNCTION public.increment_article_view_count(p_article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_article_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.articles
  SET view_count = view_count + 1
  WHERE id = p_article_id
    AND status = 'published';
END;
$$;

REVOKE ALL ON FUNCTION public.increment_article_view_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_article_view_count(uuid) TO service_role;
