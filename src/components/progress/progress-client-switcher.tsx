"use client";

import { useRouter } from "next/navigation";
import type { ClientOption } from "@/lib/domain/types";
import { ClientPicker } from "@/components/common/client-picker";
import { useI18n } from "@/lib/i18n/client";

/** Client selector for the progress page on small screens (the list is shown on desktop). */
export function ProgressClientSwitcher({ clients, value, className }: { clients: ClientOption[]; value: string; className?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <ClientPicker
      clients={clients}
      value={value}
      label={t("Cliente")}
      onChange={(id) => id && router.push(`/progress?client=${id}`, { scroll: false })}
      className={className}
    />
  );
}
