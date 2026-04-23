"use client";

import { useEffect, useRef } from "react";
import type { AntiCheatEvent } from "./types";

interface Options {
  enabled: boolean;
  startedAt: number;
  onViolation: (ev: AntiCheatEvent) => void;
  onInterrupt: (reason: AntiCheatEvent) => void;
  graceMs?: number;
  /** Se true, bloqueia paste mesmo em textarea/input (modo redação). */
  strictPaste?: boolean;
}

const BLOCKED_KEYS = new Set([
  "c", "x", "v", "a", "p", "s", "u",
]);

export function useAntiCheat(opts: Options) {
  const { enabled, startedAt, onViolation, onInterrupt, graceMs = 2500, strictPaste = false } = opts;
  const interruptedRef = useRef(false);
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;
    interruptedRef.current = false;
    mountedAtRef.current = Date.now();

    const elapsed = () => Date.now() - startedAt;
    const now = () => Date.now();

    const fireInterrupt = (type: AntiCheatEvent["type"]) => {
      if (interruptedRef.current) return;
      if (Date.now() - mountedAtRef.current < graceMs) return;
      interruptedRef.current = true;
      const ev: AntiCheatEvent = { type, elapsedMs: elapsed(), at: now() };
      onInterrupt(ev);
    };

    const fireViolation = (type: AntiCheatEvent["type"]) => {
      onViolation({ type, elapsedMs: elapsed(), at: now() });
    };

    const handleVisibility = () => {
      if (document.hidden) fireInterrupt("tab_hidden");
    };
    const handleBlur = () => fireInterrupt("window_blur");
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      fireViolation("context_menu");
    };
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      fireViolation("copy_attempt");
    };
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable = target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT");
      if (isEditable && !strictPaste) return;
      e.preventDefault();
      fireViolation("paste_attempt");
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      fireViolation("copy_attempt");
    };
    const handleDragStart = (e: DragEvent) => e.preventDefault();
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      e.preventDefault();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        fireViolation("devtools_shortcut");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
        e.preventDefault();
        fireViolation("devtools_shortcut");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.has(e.key.toLowerCase())) {
        const target = e.target as HTMLElement | null;
        const inEditable = target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT");
        if (inEditable && e.key.toLowerCase() === "a" && !strictPaste) return;
        e.preventDefault();
        if (["c", "x"].includes(e.key.toLowerCase())) fireViolation("copy_attempt");
        else if (e.key.toLowerCase() === "v") fireViolation("paste_attempt");
      }
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, startedAt, onViolation, onInterrupt, graceMs, strictPaste]);
}

export async function requestFullscreen(): Promise<boolean> {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {}
}
