"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Ban,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Newspaper,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteRawArticle,
  rejectRawArticle,
  reprocessRawArticle,
  requeueRawArticle,
} from "@/app/admin/(protected)/raw-articles/actions";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DbRawArticleStatus } from "@/lib/database/types";

type RawArticleActionsProps = {
  id: string;
  title: string;
  status: DbRawArticleStatus;
  originalUrl: string;
  linkedArticleId: string | null;
  variant?: "menu" | "toolbar";
};

const REQUEUEABLE: DbRawArticleStatus[] = ["failed", "rejected", "skipped"];

export function RawArticleActions({
  id,
  title,
  status,
  originalUrl,
  linkedArticleId,
  variant = "menu",
}: RawArticleActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canRequeue = REQUEUEABLE.includes(status);

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

  const deleteDialog = (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ham haberi sil</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” kalıcı olarak silinecek. Bağlı bir haber varsa silme
            engellenir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              run(deleteRawArticle(id), { redirectTo: "/admin/raw-articles" });
              setDeleteOpen(false);
            }}
          >
            Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const sourceLink = (
    <a
      href={originalUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-2"
    >
      <ExternalLink className="size-4" aria-hidden />
      Kaynağı aç
    </a>
  );

  if (variant === "toolbar") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/raw-articles/${id}`}>
            <Eye className="size-3.5" aria-hidden />
            Görüntüle
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Kaynağı aç
          </a>
        </Button>
        {linkedArticleId ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/articles/${linkedArticleId}`}>
              <Newspaper className="size-3.5" aria-hidden />
              İlgili haber
            </Link>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(reprocessRawArticle(id))}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          AI ile yeniden işle
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(rejectRawArticle(id))}
        >
          <Ban className="size-3.5" aria-hidden />
          Reddet
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || !canRequeue}
          onClick={() => run(requeueRawArticle(id))}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Kuyruğa geri al
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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={`/admin/raw-articles/${id}`}>
              <Eye className="size-4" aria-hidden />
              Görüntüle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>{sourceLink}</DropdownMenuItem>
          {linkedArticleId ? (
            <DropdownMenuItem asChild>
              <Link href={`/admin/articles/${linkedArticleId}`}>
                <Newspaper className="size-4" aria-hidden />
                İlgili haber
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(reprocessRawArticle(id))}
          >
            <RefreshCw className="size-4" aria-hidden />
            AI ile yeniden işle
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(rejectRawArticle(id))}
          >
            <Ban className="size-4" aria-hidden />
            Reddet
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending || !canRequeue}
            onSelect={() => run(requeueRawArticle(id))}
          >
            <RotateCcw className="size-4" aria-hidden />
            Kuyruğa geri al
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
      {deleteDialog}
    </>
  );
}
