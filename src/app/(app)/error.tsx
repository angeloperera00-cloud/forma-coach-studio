"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/basics";
import { useI18n } from "@/lib/i18n/client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[70dvh] w-full max-w-xl place-items-center px-4">
      <EmptyState
        emoji="bell-with-slash"
        title={t("Qualcosa non ha funzionato")}
        description={t("Non è stato possibile caricare questa pagina. I tuoi dati non sono stati modificati: riprova tra un istante.")}
        action={
          <>
            <Button onClick={reset}>
              <RotateCcw /> {t("Riprova")}
            </Button>
            <Button asChild variant="outline">
              <Link href="/">{t("Torna alla dashboard")}</Link>
            </Button>
          </>
        }
      />
    </main>
  );
}
