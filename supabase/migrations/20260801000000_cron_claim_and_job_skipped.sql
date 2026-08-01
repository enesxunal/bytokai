-- Cron support: pending raw claim + skipped job_runs status

ALTER TABLE public.job_runs
  DROP CONSTRAINT IF EXISTS job_runs_status_check;

ALTER TABLE public.job_runs
  ADD CONSTRAINT job_runs_status_check
  CHECK (status IN ('running', 'success', 'partial', 'failed', 'skipped'));

CREATE OR REPLACE FUNCTION public.claim_pending_raw_articles(p_limit int DEFAULT 5)
RETURNS SETOF public.raw_articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT r.id
    FROM public.raw_articles r
    WHERE r.status = 'pending'
      AND r.failure_count < 5
    ORDER BY r.discovered_at ASC
    LIMIT GREATEST(COALESCE(p_limit, 5), 0)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.raw_articles r
  SET
    status = 'processing',
    updated_at = now()
  FROM due d
  WHERE r.id = d.id
  RETURNING r.*;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_pending_raw_articles(int) TO service_role;
