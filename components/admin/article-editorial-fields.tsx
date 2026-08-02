"use client";

import { useRef, type ChangeEvent } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { markdownToSafeHtml } from "@/lib/utils/markdown";

type SelectionRange = { start: number; end: number };

function getLineBounds(value: string, index: number) {
  const start = value.lastIndexOf("\n", Math.max(0, index - 1)) + 1;
  let end = value.indexOf("\n", index);
  if (end === -1) end = value.length;
  return { start, end };
}

function applyLinePrefix(
  value: string,
  selection: SelectionRange,
  prefix: string,
): { value: string; selection: SelectionRange } {
  const { start: lineStart, end: lineEnd } = getLineBounds(
    value,
    selection.start,
  );
  const line = value.slice(lineStart, lineEnd);
  const stripped = line.replace(/^#{1,6}\s+/, "").replace(/^>\s+/, "");
  const nextLine = `${prefix}${stripped || "Başlık"}`;
  const nextValue =
    value.slice(0, lineStart) + nextLine + value.slice(lineEnd);
  const cursor = lineStart + nextLine.length;
  return { value: nextValue, selection: { start: cursor, end: cursor } };
}

function wrapInline(
  value: string,
  selection: SelectionRange,
  before: string,
  after: string,
  placeholder: string,
): { value: string; selection: SelectionRange } {
  const selected = value.slice(selection.start, selection.end);
  const text = selected || placeholder;
  const nextValue =
    value.slice(0, selection.start) +
    before +
    text +
    after +
    value.slice(selection.end);
  if (selected) {
    return {
      value: nextValue,
      selection: {
        start: selection.start,
        end: selection.start + before.length + text.length + after.length,
      },
    };
  }
  return {
    value: nextValue,
    selection: {
      start: selection.start + before.length,
      end: selection.start + before.length + text.length,
    },
  };
}

function applyList(
  value: string,
  selection: SelectionRange,
  ordered: boolean,
): { value: string; selection: SelectionRange } {
  const { start: lineStart, end: lineEnd } = getLineBounds(
    value,
    selection.start,
  );
  const blockEnd =
    selection.end > lineEnd
      ? getLineBounds(value, selection.end).end
      : lineEnd;
  const block = value.slice(lineStart, blockEnd);
  const lines = block.split("\n");
  const nextLines = lines.map((line, index) => {
    const stripped = line
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/^\s*\d+\.\s+/, "");
    const marker = ordered ? `${index + 1}. ` : "- ";
    return `${marker}${stripped || "Madde"}`;
  });
  const nextBlock = nextLines.join("\n");
  const nextValue =
    value.slice(0, lineStart) + nextBlock + value.slice(blockEnd);
  return {
    value: nextValue,
    selection: {
      start: lineStart,
      end: lineStart + nextBlock.length,
    },
  };
}

type ToolbarAction =
  | "h2"
  | "h3"
  | "bold"
  | "italic"
  | "ul"
  | "ol"
  | "quote";

function runToolbarAction(
  value: string,
  selection: SelectionRange,
  action: ToolbarAction,
) {
  switch (action) {
    case "h2":
      return applyLinePrefix(value, selection, "## ");
    case "h3":
      return applyLinePrefix(value, selection, "### ");
    case "bold":
      return wrapInline(value, selection, "**", "**", "kalın metin");
    case "italic":
      return wrapInline(value, selection, "*", "*", "italik metin");
    case "ul":
      return applyList(value, selection, false);
    case "ol":
      return applyList(value, selection, true);
    case "quote":
      return applyLinePrefix(value, selection, "> ");
  }
}

const TOOLBAR_ITEMS: {
  action: ToolbarAction;
  label: string;
  hint: string;
  icon: typeof Bold;
}[] = [
  {
    action: "h2",
    label: "Bölüm başlığı",
    hint: "İçerikte büyük alt başlık (##)",
    icon: Heading2,
  },
  {
    action: "h3",
    label: "Alt başlık",
    hint: "Daha küçük bölüm başlığı (###)",
    icon: Heading3,
  },
  {
    action: "bold",
    label: "Kalın",
    hint: "Seçili metni kalın yapar",
    icon: Bold,
  },
  {
    action: "italic",
    label: "İtalik",
    hint: "Seçili metni italik yapar",
    icon: Italic,
  },
  {
    action: "ul",
    label: "Liste",
    hint: "Madde işaretli liste",
    icon: List,
  },
  {
    action: "ol",
    label: "Numaralı",
    hint: "Numaralı liste",
    icon: ListOrdered,
  },
  {
    action: "quote",
    label: "Alıntı",
    hint: "Alıntı satırı",
    icon: Quote,
  },
];

function hasBodyH1(markdown: string) {
  return /(^|\n)\s*#\s+\S/.test(markdown);
}

export function EditorialTitleInput({
  value,
  onChange,
  disabled,
  id,
  name,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  onBlur?: () => void;
}) {
  return (
    <div className="space-y-2">
      <textarea
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onBlur={onBlur}
        rows={2}
        placeholder="Haber başlığını yazın…"
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-3 shadow-sm transition-colors",
          "font-serif text-2xl font-semibold tracking-tight text-balance sm:text-3xl",
          "placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />
      <p className="text-xs text-muted-foreground">
        Boyut ve font sitede otomatik ayarlanır. Buraya yalnızca metni yazın;
        punto veya stil seçmeniz gerekmez.
      </p>
    </div>
  );
}

export function EditorialMarkdownEditor({
  value,
  onChange,
  disabled,
  id,
  name,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  onBlur?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyAction(action: ToolbarAction) {
    const el = textareaRef.current;
    const selection = {
      start: el?.selectionStart ?? value.length,
      end: el?.selectionEnd ?? value.length,
    };
    const next = runToolbarAction(value, selection, action);
    onChange(next.value);
    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      target.focus();
      target.setSelectionRange(next.selection.start, next.selection.end);
    });
  }

  return (
    <div className="space-y-2">
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/30 p-1">
          {TOOLBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.action}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="h-8 gap-1.5 px-2 text-xs"
                    onClick={() => applyAction(item.action)}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{item.hint}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      <Textarea
        ref={textareaRef}
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onBlur={onBlur}
        rows={18}
        placeholder="Haberi yazmaya başlayın. Bölüm başlığı için üstteki düğmeleri kullanın."
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          onChange(event.target.value)
        }
        className="min-h-[20rem] resize-y text-sm leading-relaxed"
      />

      <p className="text-xs text-muted-foreground">
        Ana haber başlığı üstteki alandadır. İçerikte bölümleri ayırmak için
        “Bölüm başlığı” veya “Alt başlık” düğmelerini kullanın.
      </p>

      {hasBodyH1(value) ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Gövde metninde tek diyez (#) ile başlık var. Ana başlık üstteki
          alandadır; içerikte “Bölüm başlığı” (##) kullanın.
        </p>
      ) : null}
    </div>
  );
}

export function EditorialLivePreview({
  title,
  excerpt,
  contentMarkdown,
}: {
  title: string;
  excerpt: string;
  contentMarkdown: string;
}) {
  let previewHtml = "";
  if (contentMarkdown.trim()) {
    try {
      previewHtml = markdownToSafeHtml(contentMarkdown);
    } catch {
      previewHtml = "";
    }
  }

  const showEmpty =
    !title.trim() && !excerpt.trim() && !contentMarkdown.trim();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Sitedeki görünüm</p>
      <div className="min-h-[20rem] overflow-auto rounded-md border border-border bg-card/40 p-4 sm:p-6">
        {showEmpty ? (
          <p className="text-sm text-muted-foreground">
            Başlık ve içerik yazıldıkça burada haberin sitedeki hali görünür.
          </p>
        ) : (
          <div className="space-y-5">
            {title.trim() ? (
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                {title}
              </h1>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Başlık henüz yazılmadı
              </p>
            )}
            {excerpt.trim() ? (
              <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
                {excerpt}
              </p>
            ) : null}
            {previewHtml ? (
              <div
                className="prose-bytok"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                İçerik yazıldıkça gövde burada görünür.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
