import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getCategories } from "@/lib/database/categories";
import { getSiteSettings } from "@/lib/database/settings";

import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: {
      default: settings.site_name,
      template: `%s · ${settings.site_name}`,
    },
    description: settings.site_description,
    metadataBase: new URL(settings.site_url),
    openGraph: {
      title: settings.site_name,
      description: settings.site_description,
      siteName: settings.site_name,
      locale: "tr_TR",
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const isAdminShell = headerList.get("x-bytok-admin") === "1";

  if (isAdminShell) {
    return (
      <html
        lang="tr"
        suppressHydrationWarning
        className={`${ibmPlexSans.variable} ${sourceSerif.variable} ${ibmPlexMono.variable} h-full`}
      >
        <body className="flex min-h-full flex-col bg-mesh">
          <ThemeProvider>
            <div className="flex flex-1 flex-col">{children}</div>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    );
  }

  const [settings, categories] = await Promise.all([
    getSiteSettings(),
    getCategories(),
  ]);

  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${sourceSerif.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-mesh">
        <ThemeProvider>
          <SiteHeader categories={categories} />
          <div className="flex-1">{children}</div>
          <SiteFooter settings={settings} categories={categories} />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
