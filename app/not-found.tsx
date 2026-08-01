import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  description:
    "Aradığınız sayfa BYTOK AI’da yok veya taşınmış olabilir. Ana sayfaya dönerek haberlere ulaşabilirsiniz.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main>
      <Container size="md" className="py-16 sm:py-24">
        <EmptyState
          title="Sayfa bulunamadı"
          description="Bu adres geçersiz olabilir veya içerik kaldırılmış olabilir. Ana sayfadan güncel yapay zekâ haberlerine ulaşabilirsiniz."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="brand">
                <Link href="/">Ana sayfaya dön</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/kaynaklar">Kaynakları gör</Link>
              </Button>
            </div>
          }
        />
      </Container>
    </main>
  );
}
