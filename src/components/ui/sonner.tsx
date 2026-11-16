"use client";

import { Toaster as Sonner } from "sonner";
import { CircleAlert, CircleCheck, Info, Loader2 } from "lucide-react";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      gap={10}
      offset={20}
      mobileOffset={{ bottom: 84 }}
      icons={{
        success: <CircleCheck className="size-[18px] text-primary" />,
        error: <CircleAlert className="size-[18px] text-destructive" />,
        info: <Info className="size-[18px] text-info" />,
        loading: <Loader2 className="size-[18px] animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        duration: 3500,
        classNames: {
          toast:
            "!rounded-2xl !border !border-border !bg-card !text-foreground !shadow-pop !px-4 !py-3.5 !gap-3 !font-sans !text-[13.5px]",
          title: "!font-semibold !text-[13.5px]",
          description: "!text-muted-foreground !text-[13px]",
          actionButton: "!rounded-lg !bg-forest !text-white !font-medium !h-8 !px-3",
          cancelButton: "!rounded-lg !bg-muted !text-foreground !h-8 !px-3",
        },
      }}
    />
  );
}
