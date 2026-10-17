"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A button that opens a list, built to the listbox pattern — the behaviour the
 * release picker and the product switcher share.
 *
 * Keyboard: Enter, Space or the arrows open it; the arrows, Home and End move;
 * Enter or Space chooses; Escape and Tab close it and give focus back to the
 * button. Opened from the keyboard it appears at once — an animation on a
 * keyboard action only delays the reader who is already moving fastest. A
 * pointer press anywhere outside closes it.
 *
 * `current` is the position of what is being read, which is where the
 * highlight starts each time the list opens.
 */
export function useListbox(
  count: number,
  current: number,
  choose: (at: number) => void,
) {
  const listId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const [active, setActive] = useState(Math.max(0, current));

  function show(fromKeyboard: boolean) {
    setInstant(fromKeyboard);
    setActive(Math.max(0, current));
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function pick(at: number) {
    close(true);
    choose(at);
  }

  // The list takes focus when it opens so the arrows act on it at once.
  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!box.current?.contains(event.target as globalThis.Node))
        setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function onButtonClick(event: React.MouseEvent) {
    // `detail` is 0 for a click the keyboard made.
    if (open) close(false);
    else show(event.detail === 0);
  }

  function onButtonKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show(true);
    }
  }

  function onListKey(event: React.KeyboardEvent) {
    const last = count - 1;
    const moves: Record<string, () => number> = {
      ArrowDown: () => Math.min(last, active + 1),
      ArrowUp: () => Math.max(0, active - 1),
      Home: () => 0,
      End: () => last,
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setActive(move());
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(active);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Tab") close(false);
  }

  return {
    listId,
    button,
    list,
    box,
    open,
    instant,
    active,
    setActive,
    pick,
    onButtonClick,
    onButtonKey,
    onListKey,
  };
}
