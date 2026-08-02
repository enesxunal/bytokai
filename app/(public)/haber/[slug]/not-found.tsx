import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ArticleNotFound() {
  return (
    <main>
      <Container size="md" className="py-16">
        <EmptyState
          title="Haber bulunamadı"
          description="Bu bağlantıya ait yayınlanmış bir haber yok veya kaldırılmış olabilir."
          action={
            <Button asChild variant="brand">
              <Link href="/">Ana sayfaya dön</Link>
            </Button>
          }
        />
      </Container>
    </main>
  );
}
