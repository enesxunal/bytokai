import { NextResponse } from "next/server";
import { z } from "zod";

import {
  startPageView,
  updatePageViewDuration,
} from "@/lib/analytics/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startSchema = z.object({
  type: z.literal("start"),
  visitorId: z.string().min(8).max(64),
  sessionId: z.string().min(8).max(64),
  path: z.string().min(1).max(500),
});

const pingSchema = z.object({
  type: z.literal("ping"),
  viewId: z.string().uuid(),
  durationSeconds: z.number().finite().min(0).max(7200),
});

const bodySchema = z.discriminatedUnion("type", [startSchema, pingSchema]);

const memoryHits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function allowRequest(key: string): boolean {
  const now = Date.now();
  const current = memoryHits.get(key);
  if (!current || current.resetAt <= now) {
    memoryHits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = parsed.data;
  const rateKey =
    payload.type === "start"
      ? `start:${payload.visitorId}`
      : `ping:${payload.viewId}`;

  if (!allowRequest(rateKey)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  if (payload.type === "start") {
    const result = await startPageView({
      visitorId: payload.visitorId,
      sessionId: payload.sessionId,
      path: payload.path,
    });

    if (!result.ok) {
      const status =
        result.reason === "bot" || result.reason === "invalid_path"
          ? 204
          : result.reason === "unavailable"
            ? 503
            : 400;
      if (status === 204) {
        return new NextResponse(null, { status: 204 });
      }
      return NextResponse.json({ ok: false }, { status });
    }

    return NextResponse.json({ ok: true, viewId: result.viewId });
  }

  const result = await updatePageViewDuration({
    viewId: payload.viewId,
    durationSeconds: payload.durationSeconds,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
