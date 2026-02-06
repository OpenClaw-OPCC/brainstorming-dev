import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Script from "next/script";
import { PlausibleTracker } from "@/components/analytics/PlausibleTracker";

export const metadata: Metadata = {
  title: "Brainstorming",
  description: "Turn vague ideas into complete requirements",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shouldLoadAnalytics = process.env.NODE_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--app-primary-background)] text-[var(--app-primary-foreground)] antialiased flex flex-col">
        {shouldLoadAnalytics ? (
          <>
            <Script id="plausible-init" strategy="beforeInteractive">
              {`window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
            </Script>
            <Script
              defer
              data-domain="brainstorming.dev"
              src="https://a.raphael.app/js/script.js"
              strategy="afterInteractive"
            />
            <PlausibleTracker />
          </>
        ) : null}

        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
