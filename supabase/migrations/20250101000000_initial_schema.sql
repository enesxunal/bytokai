-- BYTOK AI — initial schema
-- Complete production schema: tables, indexes, triggers, RPCs, RLS

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'editor'
    CHECK (role IN ('admin', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper: is_admin() for RLS (profiles tablosundan sonra tanımlanmalı)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- authors
-- ---------------------------------------------------------------------------
CREATE TABLE public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  role text NOT NULL,
  short_bio text NOT NULL DEFAULT '',
  full_bio text NOT NULL DEFAULT '',
  expertise text[] NOT NULL DEFAULT '{}',
  tone text NOT NULL DEFAULT '',
  writing_rules text NOT NULL DEFAULT '',
  system_prompt text NOT NULL DEFAULT '',
  avatar_seed text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX authors_active_idx ON public.authors (active);
CREATE INDEX authors_slug_idx ON public.authors (slug);

CREATE TRIGGER authors_set_updated_at
  BEFORE UPDATE ON public.authors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  homepage_url text NOT NULL,
  section_url text NOT NULL,
  feed_url text,
  ingestion_type text NOT NULL DEFAULT 'rss'
    CHECK (ingestion_type IN ('rss', 'html', 'manual')),
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  default_language text NOT NULL DEFAULT 'en',
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  is_unhealthy boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sources_enabled_idx ON public.sources (enabled);
CREATE INDEX sources_priority_idx ON public.sources (priority);

CREATE TRIGGER sources_set_updated_at
  BEFORE UPDATE ON public.sources
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#6366f1',
  theme text NOT NULL DEFAULT 'default',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX categories_active_sort_idx ON public.categories (active, sort_order);

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- raw_articles
-- ---------------------------------------------------------------------------
CREATE TABLE public.raw_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE CASCADE,
  external_id text,
  original_url text NOT NULL,
  canonical_url text NOT NULL,
  original_title text NOT NULL DEFAULT '',
  original_excerpt text,
  original_author text,
  original_published_at timestamptz,
  original_image_url text,
  raw_content text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'processing',
      'processed',
      'rejected',
      'failed',
      'skipped'
    )),
  discovered_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT raw_articles_canonical_url_key UNIQUE (canonical_url)
);

CREATE UNIQUE INDEX raw_articles_source_external_id_uidx
  ON public.raw_articles (source_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX raw_articles_status_idx ON public.raw_articles (status);
CREATE INDEX raw_articles_source_id_idx ON public.raw_articles (source_id);
CREATE INDEX raw_articles_discovered_at_idx ON public.raw_articles (discovered_at DESC);
CREATE INDEX raw_articles_content_hash_idx ON public.raw_articles (content_hash);

CREATE TRIGGER raw_articles_set_updated_at
  BEFORE UPDATE ON public.raw_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_article_id uuid UNIQUE REFERENCES public.raw_articles (id) ON DELETE SET NULL,
  author_id uuid REFERENCES public.authors (id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text NOT NULL DEFAULT '',
  content_markdown text NOT NULL DEFAULT '',
  content_html text NOT NULL DEFAULT '',
  cover_image_url text,
  source_name text,
  source_url text,
  source_published_at timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'needs_review',
      'scheduled',
      'published',
      'archived',
      'failed'
    )),
  featured boolean NOT NULL DEFAULT false,
  breaking boolean NOT NULL DEFAULT false,
  ai_generated boolean NOT NULL DEFAULT true,
  ai_model text,
  ai_confidence_score numeric(5, 4),
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  reading_time_minutes integer NOT NULL DEFAULT 1,
  scheduled_at timestamptz,
  published_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX articles_status_idx ON public.articles (status);
CREATE INDEX articles_published_at_idx ON public.articles (published_at DESC NULLS LAST);
CREATE INDEX articles_scheduled_at_idx ON public.articles (scheduled_at ASC NULLS LAST);
CREATE INDEX articles_category_id_idx ON public.articles (category_id);
CREATE INDEX articles_author_id_idx ON public.articles (author_id);
CREATE INDEX articles_featured_idx ON public.articles (featured) WHERE featured = true;
CREATE INDEX articles_status_published_at_idx
  ON public.articles (status, published_at DESC)
  WHERE status = 'published';

CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- article_tags
-- ---------------------------------------------------------------------------
CREATE TABLE public.article_tags (
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags (id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX article_tags_tag_id_idx ON public.article_tags (tag_id);

-- ---------------------------------------------------------------------------
-- publishing_slots
-- ---------------------------------------------------------------------------
CREATE TABLE public.publishing_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_at timestamptz NOT NULL,
  article_id uuid REFERENCES public.articles (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reserved', 'published', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX publishing_slots_scheduled_at_idx ON public.publishing_slots (scheduled_at);
CREATE INDEX publishing_slots_status_idx ON public.publishing_slots (status);
CREATE INDEX publishing_slots_article_id_idx ON public.publishing_slots (article_id);

CREATE TRIGGER publishing_slots_set_updated_at
  BEFORE UPDATE ON public.publishing_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ingestion_runs
-- ---------------------------------------------------------------------------
CREATE TABLE public.ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.sources (id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  discovered_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX ingestion_runs_started_at_idx ON public.ingestion_runs (started_at DESC);
CREATE INDEX ingestion_runs_source_id_idx ON public.ingestion_runs (source_id);

-- ---------------------------------------------------------------------------
-- job_runs
-- ---------------------------------------------------------------------------
CREATE TABLE public.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  processed_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX job_runs_started_at_idx ON public.job_runs (started_at DESC);
CREATE INDEX job_runs_job_type_idx ON public.job_runs (job_type);

-- ---------------------------------------------------------------------------
-- ai_generations
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_article_id uuid REFERENCES public.raw_articles (id) ON DELETE SET NULL,
  article_id uuid REFERENCES public.articles (id) ON DELETE SET NULL,
  model text NOT NULL,
  prompt_version text NOT NULL DEFAULT 'v1',
  request_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed')),
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_generations_raw_article_id_idx ON public.ai_generations (raw_article_id);
CREATE INDEX ai_generations_article_id_idx ON public.ai_generations (article_id);
CREATE INDEX ai_generations_created_at_idx ON public.ai_generations (created_at DESC);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs (actor_id);

-- ---------------------------------------------------------------------------
-- site_settings
-- ---------------------------------------------------------------------------
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER site_settings_set_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- newsletter_subscribers
-- ---------------------------------------------------------------------------
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  created_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  CONSTRAINT newsletter_subscribers_email_key UNIQUE (email)
);

CREATE OR REPLACE FUNCTION public.normalize_newsletter_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email = lower(trim(NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER newsletter_subscribers_normalize_email
  BEFORE INSERT OR UPDATE OF email ON public.newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_newsletter_email();

-- ---------------------------------------------------------------------------
-- system_locks
-- ---------------------------------------------------------------------------
CREATE TABLE public.system_locks (
  lock_key text PRIMARY KEY,
  locked_by text NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX system_locks_expires_at_idx ON public.system_locks (expires_at);

-- ---------------------------------------------------------------------------
-- RPC: claim_scheduled_articles
-- Atomically claim and publish due scheduled articles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_scheduled_articles(p_limit int DEFAULT 10)
RETURNS SETOF public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT a.id
    FROM public.articles a
    WHERE a.status = 'scheduled'
      AND a.scheduled_at IS NOT NULL
      AND a.scheduled_at <= now()
    ORDER BY a.scheduled_at ASC
    LIMIT GREATEST(COALESCE(p_limit, 10), 0)
    FOR UPDATE SKIP LOCKED
  ),
  published AS (
    UPDATE public.articles a
    SET
      status = 'published',
      published_at = COALESCE(a.published_at, now()),
      updated_at = now()
    FROM due d
    WHERE a.id = d.id
    RETURNING a.*
  ),
  slot_update AS (
    UPDATE public.publishing_slots ps
    SET
      status = 'published',
      updated_at = now()
    WHERE ps.article_id IN (SELECT id FROM published)
      AND ps.status IN ('open', 'reserved')
    RETURNING ps.id
  )
  SELECT p.*
  FROM published p;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: acquire_system_lock
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acquire_system_lock(
  p_key text,
  p_owner text,
  p_ttl_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_ttl int := GREATEST(COALESCE(p_ttl_seconds, 60), 1);
  v_expires timestamptz := v_now + make_interval(secs => v_ttl);
  v_existing public.system_locks%ROWTYPE;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'lock key is required';
  END IF;
  IF p_owner IS NULL OR length(trim(p_owner)) = 0 THEN
    RAISE EXCEPTION 'lock owner is required';
  END IF;

  -- Remove expired lock for this key
  DELETE FROM public.system_locks
  WHERE lock_key = p_key
    AND expires_at <= v_now;

  SELECT * INTO v_existing
  FROM public.system_locks
  WHERE lock_key = p_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.locked_by = p_owner THEN
      UPDATE public.system_locks
      SET
        locked_at = v_now,
        expires_at = v_expires
      WHERE lock_key = p_key;
      RETURN true;
    END IF;
    RETURN false;
  END IF;

  BEGIN
    INSERT INTO public.system_locks (lock_key, locked_by, locked_at, expires_at)
    VALUES (p_key, p_owner, v_now, v_expires);
    RETURN true;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN false;
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: release_system_lock
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_system_lock(
  p_key text,
  p_owner text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM public.system_locks
  WHERE lock_key = p_key
    AND locked_by = p_owner;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_locks ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own_or_admin
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_update_own_or_admin
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_admin_insert
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY profiles_admin_delete
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- authors: public read active; admin manage all
CREATE POLICY authors_public_read_active
  ON public.authors FOR SELECT
  TO anon, authenticated
  USING (active = true OR public.is_admin());

CREATE POLICY authors_admin_insert
  ON public.authors FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY authors_admin_update
  ON public.authors FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY authors_admin_delete
  ON public.authors FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- sources: public read enabled (public fields via table select); admin manage
CREATE POLICY sources_public_read_enabled
  ON public.sources FOR SELECT
  TO anon, authenticated
  USING (enabled = true OR public.is_admin());

CREATE POLICY sources_admin_insert
  ON public.sources FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY sources_admin_update
  ON public.sources FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY sources_admin_delete
  ON public.sources FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- categories: public read active; admin manage
CREATE POLICY categories_public_read_active
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (active = true OR public.is_admin());

CREATE POLICY categories_admin_insert
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY categories_admin_update
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY categories_admin_delete
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- tags: public read; admin manage
CREATE POLICY tags_public_read
  ON public.tags FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY tags_admin_insert
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY tags_admin_update
  ON public.tags FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY tags_admin_delete
  ON public.tags FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- raw_articles: admin only
CREATE POLICY raw_articles_admin_all
  ON public.raw_articles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- articles: public read published; admin manage
CREATE POLICY articles_public_read_published
  ON public.articles FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR public.is_admin());

CREATE POLICY articles_admin_insert
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY articles_admin_update
  ON public.articles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY articles_admin_delete
  ON public.articles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- article_tags: public read when article published; admin manage
CREATE POLICY article_tags_public_read
  ON public.article_tags FOR SELECT
  TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.articles a
      WHERE a.id = article_tags.article_id
        AND a.status = 'published'
    )
  );

CREATE POLICY article_tags_admin_insert
  ON public.article_tags FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY article_tags_admin_update
  ON public.article_tags FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY article_tags_admin_delete
  ON public.article_tags FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- publishing_slots: admin only
CREATE POLICY publishing_slots_admin_all
  ON public.publishing_slots FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ingestion_runs: admin only
CREATE POLICY ingestion_runs_admin_all
  ON public.ingestion_runs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- job_runs: admin only
CREATE POLICY job_runs_admin_all
  ON public.job_runs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ai_generations: admin only
CREATE POLICY ai_generations_admin_all
  ON public.ai_generations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- audit_logs: admin only
CREATE POLICY audit_logs_admin_all
  ON public.audit_logs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- site_settings: public can read display settings; admin manage
CREATE POLICY site_settings_public_read
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY site_settings_admin_insert
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY site_settings_admin_update
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY site_settings_admin_delete
  ON public.site_settings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- newsletter_subscribers: anon insert only; not readable by anon; admin manage
CREATE POLICY newsletter_anon_insert
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'active'
    AND email IS NOT NULL
    AND length(trim(email)) > 3
  );

CREATE POLICY newsletter_admin_select
  ON public.newsletter_subscribers FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY newsletter_admin_update
  ON public.newsletter_subscribers FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY newsletter_admin_delete
  ON public.newsletter_subscribers FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- system_locks: admin only (service role bypasses RLS for cron)
CREATE POLICY system_locks_admin_all
  ON public.system_locks FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grant execute on RPCs
GRANT EXECUTE ON FUNCTION public.claim_scheduled_articles(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.acquire_system_lock(text, text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_system_lock(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
