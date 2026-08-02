"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "bytok_vid";
const SESSION_KEY = "bytok_sid";
const HEARTBEAT_MS = 15_000;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

function getOrCreateId(storage: Storage, key: string): string {
  try {
    const existing = storage.getItem(key);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }
    const next = randomId();
    storage.setItem(key, next);
    return next;
  } catch {
    return randomId();
  }
}

function postAnalytics(body: Record<string, unknown>, keepalive = false) {
  const payload = JSON.stringify(body);
  if (keepalive && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive,
    credentials: "omit",
  }).catch(() => {
    // Analytics must never break the page.
  });
}

/**
 * Tracks public page views + dwell time for the admin overview.
 * Skips admin routes. Uses anonymous local IDs only (no cookies).
 */
export function PageTracker() {
  const pathname = usePathname() ?? "";
  const viewIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const pathRef = useRef<string>("");

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) {
      return;
    }

    const visitorId = getOrCreateId(window.localStorage, VISITOR_KEY);
    const sessionId = getOrCreateId(window.sessionStorage, SESSION_KEY);
    pathRef.current = pathname;
    startedAtRef.current = Date.now();
    viewIdRef.current = null;

    let cancelled = false;
    let heartbeatId: ReturnType<typeof setInterval> | null = null;

    const sendPing = (keepalive = false) => {
      const viewId = viewIdRef.current;
      if (!viewId || !startedAtRef.current) return;
      const durationSeconds = Math.floor(
        (Date.now() - startedAtRef.current) / 1000,
      );
      if (durationSeconds < 1) return;
      postAnalytics(
        {
          type: "ping",
          viewId,
          durationSeconds,
        },
        keepalive,
      );
    };

    const start = async () => {
      try {
        const res = await fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "start",
            visitorId,
            sessionId,
            path: pathname,
          }),
          credentials: "omit",
        });
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { ok?: boolean; viewId?: string };
        if (!data.ok || !data.viewId) return;
        viewIdRef.current = data.viewId;

        heartbeatId = setInterval(() => {
          if (document.visibilityState === "visible") {
            sendPing(false);
          }
        }, HEARTBEAT_MS);
      } catch {
        // ignore
      }
    };

    void start();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        sendPing(true);
      }
    };
    const onPageHide = () => sendPing(true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      sendPing(true);
      if (heartbeatId) clearInterval(heartbeatId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      viewIdRef.current = null;
    };
  }, [pathname]);

  return null;
}
