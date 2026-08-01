"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CalendarClock,
  Eye,
  MoreHorizontal,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  clearCalendarSchedule,
  publishCalendarArticle,
  rescheduleCalendarArticle,
} from "@/app/admin/(protected)/calendar/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CalendarArticle } from "@/lib/admin/calendar";
import { utcIsoToIstanbulDatetimeLocal } from "@/lib/utils/date";

type CalendarItemActionsProps = {
  article: CalendarArticle;
};

export function CalendarItemActions({ article }: CalendarItemActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState(
    utcIsoToIstanbulDatetimeLocal(article.scheduled_at) || "",
  );

  const canReschedule =
    article.status === "draft" ||
    article.status === "needs_review" ||
    article.status === "scheduled";

  const canClearSchedule =
    article.status === "scheduled" || Boolean(article.scheduled_at);

  const canPublishNow = article.status !== "published";

  function run(promise: Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await promise;
      if (result.ok) {
        toast.success(result.message ?? "İşlem tamamlandı");
        router.refresh();
        return;
      }
      toast.error(result.message ?? "İşlem başarısız");
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            disabled={pending}
            aria-label="Takvim işlemleri"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/admin/articles/${article.id}`}>
              <Eye className="size-4" aria-hidden />
              Haber detayı
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {canPublishNow ? (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => run(publishCalendarArticle(article.id))}
            >
              <Upload className="size-4" aria-hidden />
              Hemen yayınla
            </DropdownMenuItem>
          ) : null}
          {canReschedule ? (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => {
                setScheduledLocal(
                  utcIsoToIstanbulDatetimeLocal(article.scheduled_at) || "",
                );
                setScheduleOpen(true);
              }}
            >
              <CalendarClock className="size-4" aria-hidden />
              Planlanan tarihi değiştir
            </DropdownMenuItem>
          ) : null}
          {canClearSchedule && article.status !== "published" ? (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => run(clearCalendarSchedule(article.id))}
            >
              <XCircle className="size-4" aria-hidden />
              Planı kaldır
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planlanan tarihi değiştir</DialogTitle>
            <DialogDescription>
              Tarih ve saat Europe/Istanbul diliminde girilir; veritabanında UTC
              olarak saklanır. Geçmiş tarihe planlama yapılamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`calendar-schedule-${article.id}`}>
              Planlanan tarih ve saat
            </Label>
            <Input
              id={`calendar-schedule-${article.id}`}
              type="datetime-local"
              value={scheduledLocal}
              onChange={(event) => setScheduledLocal(event.target.value)}
              disabled={pending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleOpen(false)}
              disabled={pending}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              disabled={pending || !scheduledLocal}
              onClick={() => {
                run(
                  rescheduleCalendarArticle({
                    id: article.id,
                    scheduledAtLocal: scheduledLocal,
                  }),
                );
                setScheduleOpen(false);
              }}
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
