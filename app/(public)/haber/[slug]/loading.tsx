import { Container } from "@/components/shared/container";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function ArticleLoading() {
  return (
    <main>
      <Container size="md" className="py-8 sm:py-12">
        <LoadingSkeleton variant="article-detail" />
      </Container>
    </main>
  );
}
