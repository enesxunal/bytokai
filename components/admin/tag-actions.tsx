"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Eye,
  ExternalLink,
  GitMerge,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteTag,
  getMergeTagOptions,
  mergeTags,
} from "@/app/admin/(protected)/tags/actions";
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
import { Label } from "@/components/ui/label";

type MergeOption = { id: string; name: string; slug: string };

type TagActionsProps = {
  id: string;
  name: string;
  slug: string;
  articleCount?: number;
  variant?: "menu" | "toolbar";
};

export function TagActions({
  id,
  name,
  slug,
  articleCount = 0,
  variant = "menu",
}: TagActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeOptions, setMergeOptions] = useState<MergeOption[]>([]);
  const [targetId, setTargetId] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);

  function run(
    promise: Promise<{ ok: boolean; message?: string; data?: { id?: string } }>,
    opts?: { redirectTo?: string; useResultId?: boolean },
  ) {
    startTransition(async () => {
      const result = await promise;
      if (result.ok) {
        toast.success(result.message ?? "İşlem tamamlandı");
        if (opts?.useResultId && result.data?.id) {
          router.push(`/admin/tags/${result.data.id}`);
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

  async function openMergeDialog() {
    setMergeOpen(true);
    setTargetId("");
    setLoadingOptions(true);
    const result = await getMergeTagOptions(id);
    setLoadingOptions(false);
    if (!result.ok) {
      toast.error(result.message ?? "Hedef etiketler yüklenemedi");
      setMergeOptions([]);
      return;
    }
    setMergeOptions(result.data);
  }

  function submitMerge() {
    if (!targetId) {
      toast.error("Hedef etiket seçin");
      return;
    }
    if (targetId === id) {
      toast.error("Etiket kendisiyle birleştirilemez");
      return;
    }
    run(mergeTags(id, targetId), {
      useResultId: true,
    });
    setMergeOpen(false);
  }

  const mergeDialog = (
    <AlertDialog open={mergeOpen} onOpenChange={setMergeOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Etiketi birleştir</AlertDialogTitle>
          <AlertDialogDescription>
            “{name}” kaynağındaki tüm haber ilişkileri seçtiğiniz hedef etikete
            aktarılır; ardından kaynak etiket silinir. Duplicate ilişkiler
            oluşmaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`merge-target-${id}`}>Hedef etiket</Label>
          <select
            id={`merge-target-${id}`}
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            disabled={pending || loadingOptions}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">
              {loadingOptions ? "Yükleniyor…" : "Hedef seçin"}
            </option>
            {mergeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.slug})
              </option>
            ))}
          </select>
          {!loadingOptions && mergeOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Birleştirilecek başka etiket yok.
            </p>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || loadingOptions || !targetId}
            onClick={(event) => {
              event.preventDefault();
              submitMerge();
            }}
          >
            Birleştir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const deleteDialog = (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Etiketi sil</AlertDialogTitle>
          <AlertDialogDescription>
            {articleCount > 0
              ? `“${name}” etiketine bağlı ${articleCount} haber var. Doğrudan silme engellenir; önce başka bir etiketle birleştirin.`
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
                setDeleteOpen(false);
                void openMergeDialog();
              }}
            >
              Birleştir
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                run(deleteTag(id), { redirectTo: "/admin/tags" });
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
          <Link href={`/admin/tags/${id}`}>
            <Eye className="size-3.5" aria-hidden />
            Görüntüle
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/tags/${id}/edit`}>
            <Pencil className="size-3.5" aria-hidden />
            Düzenle
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/etiket/${slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" aria-hidden />
            Public sayfa
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => void openMergeDialog()}
        >
          <GitMerge className="size-3.5" aria-hidden />
          Birleştir
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
        {mergeDialog}
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
            aria-label="Etiket işlemleri"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/admin/tags/${id}`}>
              <Eye className="size-4" aria-hidden />
              Görüntüle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/tags/${id}/edit`}>
              <Pencil className="size-4" aria-hidden />
              Düzenle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/etiket/${slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              Public sayfa
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending}
            onSelect={() => void openMergeDialog()}
          >
            <GitMerge className="size-4" aria-hidden />
            Başka etiketle birleştir
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
      {mergeDialog}
      {deleteDialog}
    </>
  );
}
