"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteAuthor,
  duplicateAuthor,
  setAuthorActive,
} from "@/app/admin/(protected)/authors/actions";
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

type AuthorActionsProps = {
  id: string;
  name: string;
  active: boolean;
  articleCount?: number;
  variant?: "menu" | "toolbar";
};

export function AuthorActions({
  id,
  name,
  active,
  articleCount = 0,
  variant = "menu",
}: AuthorActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function run(
    promise: Promise<{ ok: boolean; message?: string; data?: { id?: string } }>,
    opts?: { redirectTo?: string; useResultId?: boolean },
  ) {
    startTransition(async () => {
      const result = await promise;
      if (result.ok) {
        toast.success(result.message ?? "İşlem tamamlandı");
        if (opts?.useResultId && result.data?.id) {
          router.push(`/admin/authors/${result.data.id}`);
          router.refresh();
          return;
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
          <AlertDialogTitle>Personayı sil</AlertDialogTitle>
          <AlertDialogDescription>
            {articleCount > 0
              ? `“${name}” personasına bağlı ${articleCount} haber var. Silme engellenir; bunun yerine pasifleştirin.`
              : `“${name}” kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
          {articleCount > 0 ? (
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                run(setAuthorActive(id, false));
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
                run(deleteAuthor(id), { redirectTo: "/admin/authors" });
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
          <Link href={`/admin/authors/${id}`}>
            <Eye className="size-3.5" aria-hidden />
            Görüntüle
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/authors/${id}/edit`}>
            <Pencil className="size-3.5" aria-hidden />
            Düzenle
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(duplicateAuthor(id), { useResultId: true })}
        >
          <Copy className="size-3.5" aria-hidden />
          Çoğalt
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(setAuthorActive(id, !active))}
        >
          <Power className="size-3.5" aria-hidden />
          {active ? "Pasifleştir" : "Aktifleştir"}
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
            aria-label="Yazar işlemleri"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/admin/authors/${id}`}>
              <Eye className="size-4" aria-hidden />
              Görüntüle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/authors/${id}/edit`}>
              <Pencil className="size-4" aria-hidden />
              Düzenle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(duplicateAuthor(id), { useResultId: true })}
          >
            <Copy className="size-4" aria-hidden />
            Çoğalt
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(setAuthorActive(id, !active))}
          >
            <Power className="size-4" aria-hidden />
            {active ? "Pasifleştir" : "Aktifleştir"}
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
