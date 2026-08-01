"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowUpDown,
  Eye,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteCategory,
  setCategoryActive,
  setCategorySortOrder,
} from "@/app/admin/(protected)/categories/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CategoryActionsProps = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sortOrder: number;
  articleCount?: number;
  variant?: "menu" | "toolbar";
};

export function CategoryActions({
  id,
  name,
  slug,
  active,
  sortOrder,
  articleCount = 0,
  variant = "menu",
}: CategoryActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortValue, setSortValue] = useState(String(sortOrder));

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

  function openSortDialog() {
    setSortValue(String(sortOrder));
    setSortOpen(true);
  }

  function submitSort() {
    const parsed = Number.parseInt(sortValue, 10);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      toast.error("Sıralama tam sayı olmalı");
      return;
    }
    if (parsed < 0 || parsed > 10_000) {
      toast.error("Sıralama 0 ile 10000 arasında olmalı");
      return;
    }
    run(setCategorySortOrder(id, parsed));
    setSortOpen(false);
  }

  const sortDialog = (
    <AlertDialog open={sortOpen} onOpenChange={setSortOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sıralamayı değiştir</AlertDialogTitle>
          <AlertDialogDescription>
            “{name}” için sort_order değerini girin. Aynı değere izin verilir;
            liste sort_order, ad ve id ile stabil sıralanır.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`sort-order-${id}`}>Sıralama</Label>
          <Input
            id={`sort-order-${id}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={10_000}
            step={1}
            value={sortValue}
            onChange={(event) => setSortValue(event.target.value)}
            disabled={pending}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              submitSort();
            }}
          >
            Kaydet
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const deleteDialog = (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kategoriyi sil</AlertDialogTitle>
          <AlertDialogDescription>
            {articleCount > 0
              ? `“${name}” kategorisine bağlı ${articleCount} haber var. Silme engellenir; bunun yerine pasifleştirin.`
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
                run(setCategoryActive(id, false));
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
                run(deleteCategory(id), { redirectTo: "/admin/categories" });
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
          <Link href={`/admin/categories/${id}`}>
            <Eye className="size-3.5" aria-hidden />
            Görüntüle
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/categories/${id}/edit`}>
            <Pencil className="size-3.5" aria-hidden />
            Düzenle
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/kategori/${slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" aria-hidden />
            Public sayfa
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={openSortDialog}
        >
          <ArrowUpDown className="size-3.5" aria-hidden />
          Sıralama
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(setCategoryActive(id, !active))}
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
        {sortDialog}
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
            aria-label="Kategori işlemleri"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/admin/categories/${id}`}>
              <Eye className="size-4" aria-hidden />
              Görüntüle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/categories/${id}/edit`}>
              <Pencil className="size-4" aria-hidden />
              Düzenle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/kategori/${slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              Public sayfa
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={pending} onSelect={openSortDialog}>
            <ArrowUpDown className="size-4" aria-hidden />
            Sıralamayı değiştir
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => run(setCategoryActive(id, !active))}
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
      {sortDialog}
      {deleteDialog}
    </>
  );
}
