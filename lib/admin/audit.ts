import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin.audit");

export type AuditPayload = {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

export async function writeAuditLog(
  supabase: SupabaseClient,
  payload: AuditPayload,
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: payload.actorId,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId ?? null,
    before_data: payload.beforeData ?? null,
    after_data: payload.afterData ?? null,
    ip_address: payload.ipAddress ?? null,
  });

  if (error) {
    logger.error("Audit log yazılamadı", {
      action: payload.action,
      entityType: payload.entityType,
      reason: error.message,
    });
  }
}
