import { Skeleton } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";

export default async function Loading() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 md:px-6 xl:px-8" aria-busy aria-label={t("Caricamento")}>
      <div className="flex h-16 items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-56 max-lg:hidden" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[84px] rounded-2xl" />
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
      <Skeleton className="mt-5 h-72 rounded-3xl" />
    </div>
  );
}
