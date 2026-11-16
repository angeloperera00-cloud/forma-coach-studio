"use client";

import * as React from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { recheckApprovalAction, signOutAction } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

export function PendingActions({ disabled }: { disabled: boolean }) {
  const { t } = useI18n();
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);
  return (
    <div className="mt-6 flex flex-col gap-2.5">
      {!disabled && (
        <Button
          size="lg"
          className="h-12 rounded-full"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await recheckApprovalAction();
              if (res && !res.ok) setMessage(res.error);
            })
          }
        >
          {!pending && <RefreshCw />} {t("Controlla di nuovo")}
        </Button>
      )}
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="lg" className="h-12 w-full rounded-full">
          <LogOut /> {t("Esci")}
        </Button>
      </form>
      {message && (
        <p role="status" className="text-center text-[13px] text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
