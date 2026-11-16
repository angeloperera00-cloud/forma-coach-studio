import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/basics";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="mx-auto grid min-h-[70dvh] w-full max-w-xl place-items-center px-4">
      <EmptyState
        emoji="magnifying-glass-tilted-left"
        title={t("Pagina non trovata")}
        description={t("L'elemento che cerchi non esiste più o è stato eliminato.")}
        action={
          <Button asChild>
            <Link href="/">{t("Torna alla dashboard")}</Link>
          </Button>
        }
      />
    </main>
  );
}
