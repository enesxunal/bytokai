"use client";

import { useEffect } from "react";

import { Container } from "@/components/shared/container";
import { ErrorState } from "@/components/shared/error-state";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function HomeError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <Container className="py-16">
        <ErrorState
          title="Ana sayfa yüklenemedi"
          description="Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi deneyin."
          onRetry={reset}
        />
      </Container>
    </main>
  );
}
