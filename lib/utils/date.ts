import { format, isValid, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type { PublishWindow } from "@/types";

export const ISTANBUL_TIMEZONE = "Europe/Istanbul";

export interface IstanbulParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getIstanbulParts(date: Date): IstanbulParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISTANBUL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) {
      throw new Error(`Istanbul zaman parçası bulunamadı: ${type}`);
    }
    return Number(value);
  };

  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
    hour: lookup("hour"),
    minute: lookup("minute"),
    second: lookup("second"),
  };
}

/** Returns a Date whose UTC fields mirror Europe/Istanbul wall-clock time. */
export function toIstanbul(date: Date | string | number): Date {
  const input = typeof date === "string" || typeof date === "number"
    ? new Date(date)
    : date;

  if (!isValid(input)) {
    throw new Error("Geçersiz tarih");
  }

  const parts = getIstanbulParts(input);
  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  );
}

export function formatIstanbul(
  date: Date | string | number,
  pattern = "dd MMM yyyy HH:mm",
): string {
  const istanbul = toIstanbul(date);
  return format(istanbul, pattern, { locale: tr });
}

export function parsePublishWindow(
  start: string,
  end: string,
  timezone: string = ISTANBUL_TIMEZONE,
): PublishWindow {
  const timePattern = /^([01]?\d|2[0-3]):([0-5]\d)$/;

  const startMatch = start.trim().match(timePattern);
  const endMatch = end.trim().match(timePattern);

  if (!startMatch || !endMatch) {
    throw new Error(
      "Yayın penceresi HH:mm formatında olmalıdır (ör. 09:00)",
    );
  }

  return {
    startHour: Number(startMatch[1]),
    startMinute: Number(startMatch[2]),
    endHour: Number(endMatch[1]),
    endMinute: Number(endMatch[2]),
    timezone,
  };
}

export function isWithinPublishWindow(
  date: Date | string | number,
  window: PublishWindow,
): boolean {
  const input = typeof date === "string" || typeof date === "number"
    ? new Date(date)
    : date;

  if (!isValid(input)) {
    return false;
  }

  const parts = getIstanbulParts(input);
  const minutes = parts.hour * 60 + parts.minute;
  const start = window.startHour * 60 + window.startMinute;
  const end = window.endHour * 60 + window.endMinute;

  if (start === end) {
    return true;
  }

  if (start < end) {
    return minutes >= start && minutes < end;
  }

  // Overnight window (e.g. 22:00–06:00)
  return minutes >= start || minutes < end;
}

export function parseIsoOrThrow(value: string): Date {
  const parsed = parseISO(value);
  if (!isValid(parsed)) {
    throw new Error(`Geçersiz ISO tarih: ${value}`);
  }
  return parsed;
}

/** Istanbul wall-clock → gerçek UTC ISO. */
export function istanbulWallToUtcIso(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): string {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = getIstanbulParts(new Date(utcGuess));
  const istanbulAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(utcGuess + (desiredAsUtc - istanbulAsUtc)).toISOString();
}

/** UTC ISO → datetime-local değeri (Europe/Istanbul). */
export function utcIsoToIstanbulDatetimeLocal(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = getIstanbulParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** datetime-local (Istanbul) → UTC ISO. */
export function istanbulDatetimeLocalToUtcIso(local: string): string | null {
  const trimmed = local.trim();
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;
  const [, y, m, d, h, min, s] = match;
  return istanbulWallToUtcIso(
    Number(y),
    Number(m),
    Number(d),
    Number(h),
    Number(min),
    Number(s ?? "0"),
  );
}
