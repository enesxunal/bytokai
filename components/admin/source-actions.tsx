"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Power,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  checkSourceNow,
  deleteSource,
  resetSourceFailureCount,
  setSourceEnabled,
} from "@/app/admin/(protected)/sources/actions";
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

type SourceActionsProps = {
  id: string;
  name: string;
  enabled: boolean;
  consecutiveFailures: number;
  rawArticleCount?: number;
  variant?: "menu" | "toolbar";
};

export function SourceActions({
  id,
  name,
  enabled,
  rawArticleCount = 0,
  variant = "menu",
}: SourceActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function run(
    promise: Promise<{
      ok: boolean;
      message?: string;
      data?: unknown;
    }>,
    opts?: { redirectTo?: string },
  ) {
    startTransition(async () => {
      const result = await promise;
      if (result.ok) {
        const data = result.data as { status?: string } | undefined;
        const failedCheck = data?.status === "failed";
        if (failedCheck) {
          toast.error(result.message ?? "Kontrol başarısız");
        } else {
          toast.success(result.message ?? "İşlem tamamlandı");
        }
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
          <AlertDialogTitle>Kaynağı sil</AlertDialogTitle>
          <AlertDialogDescription>
            {rawArticleCount > 0
              ? `“${name}” kaynağına bağlı ${rawArticleCount} ham haber var. Silme engellenir; bunun yerine pasifleştirin.`
              : `“${name}” kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
          {rawArticleCount > 0 ? (
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                run(setSourceEnabled(id, false));
                setDeleteOpen(false);
              }}
            >
              Pasifleştir
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                run(deleteSource(id), { redirectTo: "/admin/sources" });
                setDeleteOpen(false);
              }}
            >
              Sil
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (variant === "toolbar") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/sources/${id}`}>
            <Eye className="size-3.5" aria-hidden />
            Görüntüle
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/sources/${id}/edit`}>
            <Pencil className="size-3.5" aria-hidden />
            Düzenle
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(checkSourceNow(id))}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Şimdi kontrol et
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(setSourceEnabled(id, !enabled))}
        >
          <Power className="size-3.5" aria-hidden />
          {enabled ? "Pasifleştir" : "Aktifleştir"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(resetSourceFailureCount(id))}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Hata sayacını sıfırla
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
            aria-label="Kaynak işlemleri"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={`/admin/sources/${id}`}>
              <Eye className="size-4" aria-hidden />
              Görüntüle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/sources/${id}/edit`}>
              <Pencil className="size-4" aria-hidden />
              Düzenle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(checkSourceNow(id))}
          >
            <RefreshCw className="size-4" aria-hidden />
            Şimdi kontrol et
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(setSourceEnabled(id, !enabled))}
          >
            <Power className="size-4" aria-hidden />
            {enabled ? "Pasifleştir" : "Aktifleştir"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(resetSourceFailureCount(id))}
          >
            <RotateCcw className="size-4" aria-hidden />
            Hata sayacını sıfırla
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
