import {
  ISTANBUL_TIMEZONE,
  isWithinPublishWindow,
  parsePublishWindow,
  toIstanbul,
} from "@/lib/utils/date";
import type { PublishWindow } from "@/types";

export const DEFAULT_PUBLISH_WINDOW_START = "08:00";
export const DEFAULT_PUBLISH_WINDOW_END = "23:00";
export const DEFAULT_MIN_GAP_MINUTES = 45;
export const DEFAULT_MAX_PER_HOUR = 2;

export interface SlotSelectionOptions {
  now?: Date;
  /** Look ahead this many calendar days in Europe/Istanbul. */
  daysAhead?: number;
  minGapMinutes?: number;
  maxPerHour?: number;
  windowStart?: string;
  windowEnd?: string;
  timezone?: string;
  /** Slot step in minutes while scanning the window. */
  stepMinutes?: number;
  /** Higher priority prefers earlier slots (1–10). */
  priority?: number;
}

function toUtcMillis(date: Date): number {
  return date.getTime();
}

function hourBucketKey(date: Date): string {
  const istanbul = toIstanbul(date);
  return `${istanbul.getUTCFullYear()}-${istanbul.getUTCMonth()}-${istanbul.getUTCDate()}-${istanbul.getUTCHours()}`;
}

/**
 * Builds candidate slot timestamps inside the Istanbul publish window.
 * Candidates are real UTC instants corresponding to Istanbul wall-clock steps.
 */
export function generateCandidateSlots(
  from: Date,
  options: SlotSelectionOptions = {},
): Date[] {
  const daysAhead = options.daysAhead ?? 7;
  const stepMinutes = options.stepMinutes ?? 15;
  const window = parsePublishWindow(
    options.windowStart ?? DEFAULT_PUBLISH_WINDOW_START,
    options.windowEnd ?? DEFAULT_PUBLISH_WINDOW_END,
    options.timezone ?? ISTANBUL_TIMEZONE,
  );

  const startMs = from.getTime();
  const endMs = startMs + daysAhead * 24 * 60 * 60 * 1000;
  const candidates: Date[] = [];

  // Scan in UTC minutes but accept only Istanbul-window hits.
  const stepMs = stepMinutes * 60 * 1000;
  // Align to step boundary
  const aligned = Math.ceil(startMs / stepMs) * stepMs;

  for (let ts = aligned; ts <= endMs; ts += stepMs) {
    const candidate = new Date(ts);
    if (isWithinPublishWindow(candidate, window)) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

export function canPlaceSlot(
  candidate: Date,
  existingSlots: readonly Date[],
  options: SlotSelectionOptions = {},
): boolean {
  const minGapMinutes = options.minGapMinutes ?? DEFAULT_MIN_GAP_MINUTES;
  const maxPerHour = options.maxPerHour ?? DEFAULT_MAX_PER_HOUR;
  const window = parsePublishWindow(
    options.windowStart ?? DEFAULT_PUBLISH_WINDOW_START,
    options.windowEnd ?? DEFAULT_PUBLISH_WINDOW_END,
    options.timezone ?? ISTANBUL_TIMEZONE,
  );

  if (!isWithinPublishWindow(candidate, window)) {
    return false;
  }

  const candidateMs = toUtcMillis(candidate);
  const minGapMs = minGapMinutes * 60 * 1000;

  for (const existing of existingSlots) {
    if (Math.abs(toUtcMillis(existing) - candidateMs) < minGapMs) {
      return false;
    }
  }

  const bucket = hourBucketKey(candidate);
  let countInHour = 0;
  for (const existing of existingSlots) {
    if (hourBucketKey(existing) === bucket) {
      countInHour += 1;
    }
  }

  return countInHour < maxPerHour;
}

/**
 * Pure slot selection: first valid candidate after `now`, preferring earlier
 * times. Higher priority does not skip the gap rules; it only biases toward
 * the earliest feasible slot (same as default) while documenting intent.
 */
export function selectNextSlot(
  existingSlots: readonly Date[],
  options: SlotSelectionOptions = {},
): Date | null {
  const now = options.now ?? new Date();
  const priority = options.priority ?? 5;
  const candidates = generateCandidateSlots(now, options);

  // Mild priority bias: high priority starts from now; low priority adds delay.
  const delayMinutes = Math.max(0, (10 - priority) * 5);
  const earliestMs = now.getTime() + delayMinutes * 60 * 1000;

  for (const candidate of candidates) {
    if (candidate.getTime() < earliestMs) {
      continue;
    }
    if (canPlaceSlot(candidate, existingSlots, options)) {
      return candidate;
    }
  }

  return null;
}

export function getDefaultPublishWindow(): PublishWindow {
  return parsePublishWindow(
    DEFAULT_PUBLISH_WINDOW_START,
    DEFAULT_PUBLISH_WINDOW_END,
    ISTANBUL_TIMEZONE,
  );
}
