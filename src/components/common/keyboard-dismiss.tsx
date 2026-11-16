"use client";

import * as React from "react";

const FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]';
const INTERACTIVE = 'button, a, label, [role="button"], [role="option"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="switch"], summary';

/**
 * Phones: tapping anywhere outside a text field closes the keyboard. Taps on buttons, links or
 * options blur after their click has run, so the keyboard closing never moves the tap target.
 */
export function KeyboardDismiss() {
  React.useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const activeField = () => {
      const el = document.activeElement as HTMLElement | null;
      return el && el.matches(FIELD) ? el : null;
    };
    // The field that was active when the tap began: a tap that itself focuses a field
    // (e.g. opening search) must not close that new keyboard.
    let before: HTMLElement | null = null;
    const onPointerDown = () => {
      before = activeField();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const field = activeField();
      if (!field || field !== before) return;
      const target = e.target as HTMLElement | null;
      if (!field || !target || target.closest(FIELD) || target.closest(INTERACTIVE)) return;
      field.blur();
    };
    const onClick = (e: MouseEvent) => {
      const field = before;
      before = null;
      if (field !== activeField()) return;
      const target = e.target as HTMLElement | null;
      if (!field || !target || target.closest(FIELD) || target.closest("label")) return;
      // Let the button/link finish (it may focus something itself), then close the keyboard.
      window.setTimeout(() => {
        if (document.activeElement === field) field.blur();
      }, 0);
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
