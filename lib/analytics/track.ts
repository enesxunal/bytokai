import "server-only";

import { headers } from "next/headers";

import { createServiceClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("analytics");

const MAX_PATH_LEN = 500;
const MAX_DURATION_SECONDS = 7200;
const HEARTBEAT_MIN_SECONDS = 1;

const BOT_UA =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|redditbot|applebot|semrush|ahrefs|mj12|dotbot|pingdom|uptimerobot|headless|preview/i;

export type StartPageViewInput = {
  visitorId: string;
  sessionId: string;
  path: string;
};

export type UpdatePageViewInput = {
  viewId: string;
  durationSeconds: number;
};

function isValidId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(value);
}

function normalizePath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.length > MAX_PATH_LEN) return null;
  if (trimmed.startsWith("/admin") || trimmed.startsWith("/api")) return null;
  // Strip query/hash if a client accidentally sends them
  const path = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  if (!path.startsWith("/")) return null;
  return path;
}

function extractArticleSlug(path: string): string | null {
  const match = /^\/haber\/([^/]+)\/?$/.exec(path);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export async function readRequestMeta(): Promise<{
  userAgent: string | null;
  isBot: boolean;
}> {
  try {
    const h = await headers();
    const userAgent = h.get("user-agent");
    const ua = userAgent ? userAgent.slice(0, 500) : null;
    return {
      userAgent: ua,
      isBot: ua ? BOT_UA.test(ua) : false,
    };
  } catch {
    return { userAgent: null, isBot: false };
  }
}

export async function startPageView(
  input: StartPageViewInput,
): Promise<{ ok: true; viewId: string } | { ok: false; reason: string }> {
  if (!isValidId(input.visitorId) || !isValidId(input.sessionId)) {
    return { ok: false, reason: "invalid_ids" };
  }

  const path = normalizePath(input.path);
  if (!path) {
    return { ok: false, reason: "invalid_path" };
  }

  const meta = await readRequestMeta();
  if (meta.isBot) {
    return { ok: false, reason: "bot" };
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    logger.error("Service client oluşturulamadı");
    return { ok: false, reason: "unavailable" };
  }

  let articleId: string | null = null;
  const slug = extractArticleSlug(path);
  if (slug) {
    const { data } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    articleId = data?.id ?? null;
  }

  const { data, error } = await supabase
    .from("page_views")
    .insert({
      visitor_id: input.visitorId,
      session_id: input.sessionId,
      path,
      article_id: articleId,
      duration_seconds: 0,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    logger.warn("page_view insert failed", { reason: error?.message });
    return { ok: false, reason: "insert_failed" };
  }

  if (articleId) {
    const { error: bumpError } = await supabase.rpc(
      "increment_article_view_count",
      { p_article_id: articleId },
    );
    if (bumpError) {
      logger.warn("view_count bump failed", { reason: bumpError.message });
    }
  }

  return { ok: true, viewId: data.id as string };
}

export async function updatePageViewDuration(
  input: UpdatePageViewInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const viewId = input.viewId.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      viewId,
    )
  ) {
    return { ok: false, reason: "invalid_view_id" };
  }

  const duration = Math.min(
    MAX_DURATION_SECONDS,
    Math.max(0, Math.floor(input.durationSeconds)),
  );
  if (duration < HEARTBEAT_MIN_SECONDS) {
    return { ok: true };
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  const { data: existing, error: readError } = await supabase
    .from("page_views")
    .select("id, duration_seconds")
    .eq("id", viewId)
    .maybeSingle();

  if (readError || !existing) {
    return { ok: false, reason: "not_found" };
  }

  const nextDuration = Math.max(
    Number(existing.duration_seconds) || 0,
    duration,
  );

  const { error } = await supabase
    .from("page_views")
    .update({
      duration_seconds: nextDuration,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", viewId);

  if (error) {
    logger.warn("page_view update failed", { reason: error.message });
    return { ok: false, reason: "update_failed" };
  }

  return { ok: true };
}
