"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

export function BookPublishingCta() {
  const pathname = usePathname() ?? "";
  if (pathname === "/kitap-yayinlat" || pathname.startsWith("/kitap-yayinlat/")) {
    return null;
  }

  return (
    <section
      aria-labelledby="kitap-yayin-cta-heading"
      className="border-t border-border/60"
    >
      <Container className="py-8 sm:py-10">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-[#0b1220] text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 0% 0%, rgba(21,101,239,0.32), transparent 55%), linear-gradient(135deg, #070b14 0%, #0b1220 50%, #0d1b33 100%)",
            }}
            aria-hidden
          />
          <div className="relative grid gap-6 px-5 py-8 sm:px-8 sm:py-9 lg:grid-cols-[1.3fr_auto] lg:items-center lg:gap-10 lg:px-10">
            <div className="min-w-0 space-y-3">
              <h2
                id="kitap-yayin-cta-heading"
                className="font-serif text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]"
              >
                Kitabınızı BYTOK AI ile yayımlayın.
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                Dosyanızı ve yayın projenizi bize iletin. Editoryal ekibimiz
                başvurunuzu inceleyerek sizinle iletişime geçsin.
              </p>
            </div>
            <div className="lg:justify-self-end">
              <Button
                asChild
                className="h-11 w-full bg-white px-6 text-[#0b1220] hover:bg-white/90 sm:w-auto"
              >
                <Link href="/kitap-yayinlat">Yayın başvurusu yap</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
