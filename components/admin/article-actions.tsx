"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Archive,
  CalendarClock,
  Eye,
  MoreHorizontal,
  Pencil,
  Star,
  StarOff,
  Trash2,
  Upload,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

import {
  archiveArticle,
  deleteArticle,
  publishArticleNow,
  scheduleArticle,
  setArticleFeatured,
  unpublishArticle,
} from "@/app/admin/(protected)/articles/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import type { DbArticleStatus } from "@/lib/database/types";
import { utcIsoToIstanbulDatetimeLocal } from "@/lib/utils/date";

type ArticleActionsProps = {
  id: string;
  title: string;
  status: DbArticleStatus;
  featured: boolean;
  scheduledAt: string | null;
  variant?: "menu" | "toolbar";
};

export function ArticleActions({
  id,
  title,
  status,
  featured,
  scheduledAt,
  variant = "menu",
}: ArticleActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState(
    utcIsoToIstanbulDatetimeLocal(scheduledAt) || "",
  );

  function run(
    promise: Promise<{ ok: boolean; message?: string }>,
    opts?: { redirectTo?: string },
  ) {
    startTransition(async () => {
      const result = await promise;
      if (result.ok) {
        toast.success(result.message ?? "İşlem tamamlandı");
        if (opts?.redirectTo) {
          router.push(opts.redirectTo);
          router.refresh();
          return;
        }
        router.refresh();
        return;
      }
      toast.error(result.message ?? "İşlem başarısız");
    });
  }

  const scheduleDialog = (
    <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yayın planla</DialogTitle>
          <DialogDescription>
            Tarih ve saat Europe/Istanbul saat diliminde girilir; veritabanında
            UTC olarak saklanır.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`schedule-${id}`}>Planlanan tarih ve saat</Label>
          <Input
            id={`schedule-${id}`}
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
                scheduleArticle({
                  id,
                  scheduledAtLocal: scheduledLocal,
                }),
              );
              setScheduleOpen(false);
            }}
          >
            Planla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const deleteDialog = (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Haberi sil</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              run(deleteArticle(id), { redirectTo: "/admin/articles" });
              setDeleteOpen(false);
            }}
          >
            Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (variant === "toolbar") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/articles/${id}`}>
            <Eye className="size-3.5" aria-hidden />
            Görüntüle
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/articles/${id}/edit`}>
            <Pencil className="size-3.5" aria-hidden />
            Düzenle
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(publishArticleNow(id))}
        >
          <Upload className="size-3.5" aria-hidden />
          Hemen yayınla
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            setScheduledLocal(
              utcIsoToIstanbulDatetimeLocal(scheduledAt) || "",
            );
            setScheduleOpen(true);
          }}
        >
          <CalendarClock className="size-3.5" aria-hidden />
          Planla
        </Button>
        {status === "published" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(unpublishArticle(id))}
          >
            <Ban className="size-3.5" aria-hidden />
            Yayından kaldır
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(setArticleFeatured(id, !featured))}
        >
          {featured ? (
            <StarOff className="size-3.5" aria-hidden />
          ) : (
            <Star className="size-3.5" aria-hidden />
          )}
          {featured ? "Öne çıkarmayı kaldır" : "Öne çıkar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(archiveArticle(id))}
        >
          <Archive className="size-3.5" aria-hidden />
          Arşivle
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Sil
        </Button>
        {scheduleDialog}
        {deleteDialog}
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={pending}
            aria-label="İşlemler"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/admin/articles/${id}`}>
              <Eye className="size-4" aria-hidden />
              Görüntüle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/articles/${id}/edit`}>
              <Pencil className="size-4" aria-hidden />
              Düzenle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(publishArticleNow(id))}
          >
            <Upload className="size-4" aria-hidden />
            Hemen yayınla
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => {
              setScheduledLocal(
                utcIsoToIstanbulDatetimeLocal(scheduledAt) || "",
              );
              setScheduleOpen(true);
            }}
          >
            <CalendarClock className="size-4" aria-hidden />
            Planla
          </DropdownMenuItem>
          {status === "published" ? (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => run(unpublishArticle(id))}
            >
              <Ban className="size-4" aria-hidden />
              Yayından kaldır
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(setArticleFeatured(id, !featured))}
          >
            {featured ? (
              <StarOff className="size-4" aria-hidden />
            ) : (
              <Star className="size-4" aria-hidden />
            )}
            {featured ? "Öne çıkarmayı kaldır" : "Öne çıkar"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(archiveArticle(id))}
          >
            <Archive className="size-4" aria-hidden />
            Arşivle
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending}
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {scheduleDialog}
      {deleteDialog}
    </>
  );
}
