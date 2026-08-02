import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getSiteSettings } from "@/lib/database/settings";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteUrl = settings.site_url.replace(/\/$/, "");

  return {
    title: {
      default: settings.site_name,
      template: `%s · ${settings.site_name}`,
    },
    description: settings.site_description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: siteUrl,
    },
    verification: {
      google: "fEP7CfPu5_wWap1XmsG_rI7I91uKtZk21392QZitnig",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: settings.site_name,
      description: settings.site_description,
      siteName: settings.site_name,
      locale: "tr_TR",
      type: "website",
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: settings.site_name,
      description: settings.site_description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${inter.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-mesh">
        <ThemeProvider>
          <div className="flex min-h-full flex-1 flex-col">{children}</div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
