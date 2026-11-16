"use client";

import { useMediaQuery } from "./use-media-query";

const TOUCH_QUERY = "(pointer: coarse)";

/** True on phones/tablets. Server/hydration value is `true` so nothing auto-focuses before we know. */
export function useTouchDevice(): boolean {
  return useMediaQuery(TOUCH_QUERY, true);
}

/** Non-hook check for event handlers. */
export function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia(TOUCH_QUERY).matches;
}

/**
 * For Radix dialogs/sheets/popovers: on touch devices, focus the panel itself instead of its first
 * field, so the keyboard only opens when the user taps a field.
 */
export function touchSafeAutoFocus(handler?: (event: Event) => void) {
  return (event: Event) => {
    handler?.(event);
    if (event.defaultPrevented || !isTouchDevice()) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement | null)?.focus?.({ preventScroll: true });
  };
}
