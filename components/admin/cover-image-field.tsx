"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { uploadArticleCover } from "@/app/admin/(protected)/articles/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COVER_IMAGE_GUIDANCE } from "@/lib/admin/cover-image-constants";
import { cn } from "@/lib/utils/cn";

type CoverImageFieldProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
  error?: string;
};

export function CoverImageField({
  value,
  onChange,
  disabled,
  id = "cover-image",
  label = "Kapak görseli",
  error,
}: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [previewError, setPreviewError] = useState(false);

  const showPreview = Boolean(value) && !previewError;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > COVER_IMAGE_GUIDANCE.maxBytes) {
      toast.error(
        `Görsel en fazla ${COVER_IMAGE_GUIDANCE.maxBytes / (1024 * 1024)} MB olabilir`,
      );
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadArticleCover(formData);
      if (!result.ok) {
        toast.error(result.message ?? "Yükleme başarısız");
        return;
      }
      setPreviewError(false);
      onChange(result.data.url);
      toast.success(result.message ?? "Görsel yüklendi");
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">
          Tavsiye edilen ölçü:{" "}
          <span className="font-medium text-foreground">
            {COVER_IMAGE_GUIDANCE.width} × {COVER_IMAGE_GUIDANCE.height} px
          </span>{" "}
          ({COVER_IMAGE_GUIDANCE.aspectLabel}, yatay). Minimum genişlik{" "}
          {COVER_IMAGE_GUIDANCE.minWidth} px. Format:{" "}
          {COVER_IMAGE_GUIDANCE.acceptLabel}, en fazla{" "}
          {COVER_IMAGE_GUIDANCE.maxBytes / (1024 * 1024)} MB. Haber detayında
          görsel 21:9 oranında kırpılır; önemli içeriği ortada tutun.
        </p>
      </div>

      <div
        className={cn(
          "relative aspect-[16/9] overflow-hidden rounded-lg border border-dashed border-border bg-muted/30",
          showPreview && "border-solid",
        )}
      >
        {showPreview ? (
          <Image
            src={value}
            alt="Kapak önizleme"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 480px"
            unoptimized={value.startsWith("blob:") || value.startsWith("data:")}
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <ImagePlus
              className="size-8 text-muted-foreground/70"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">
              {value && previewError
                ? "Önizleme yüklenemedi — URL’yi kontrol edin"
                : "Henüz görsel yok"}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={COVER_IMAGE_GUIDANCE.accept}
          className="sr-only"
          disabled={disabled || pending}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Yükleniyor…
            </>
          ) : (
            <>
              <ImagePlus className="size-3.5" aria-hidden />
              Görsel yükle
            </>
          )}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || pending}
            onClick={() => {
              setPreviewError(false);
              onChange("");
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Kaldır
          </Button>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-url`} className="text-muted-foreground">
          veya görsel URL’si
        </Label>
        <Input
          id={`${id}-url`}
          value={value}
          disabled={disabled || pending}
          placeholder="https://… veya /yol/gorsel.jpg"
          onChange={(event) => {
            setPreviewError(false);
            onChange(event.target.value);
          }}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
