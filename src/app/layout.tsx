import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { MotionProvider } from "@/components/shell/motion-provider";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n, getLocale } from "@/lib/i18n/server";
import "./globals.css";

const inter = localFont({
  src: "./fonts/InterVariable-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: "Forma — Coach Studio", template: "%s · Forma" },
    description: t("Schede di allenamento, piani alimentari e progressi dei tuoi clienti in un unico studio."),
    applicationName: "Forma",
  };
}

export const viewport: Viewport = {
  themeColor: "#f8faf8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <I18nProvider locale={locale}>
          <MotionProvider>{children}</MotionProvider>
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
