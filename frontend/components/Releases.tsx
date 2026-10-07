"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { inRelease } from "@/lib/version";
import { Check, Chevron } from "./icons";

/**
 * Which release of the documentation is on screen, and the way to another.
 *
 * A button that opens a list, built to the listbox pattern: the button says
 * what is being read, the list names every release with the newest marked and
 * the current one checked. Choosing one keeps the page — the same path in that
 * release — so a reader comparing two releases does not have to find their
 * place again. `latest` is the live site's release; it is listed once even when
 * an archive of it exists, and choosing it goes to the live URLs.
 *
 * Keyboard: Enter, Space or the arrows open it; the arrows, Home and End move;
 * Enter or Space chooses; Escape and Tab close it and give focus back to the
 * button. Opened from the keyboard it appears at once — an animation on a
 * keyboard action only delays the reader who is already moving fastest.
 */
export function Releases({
  latest,
  archived,
  shown,
}: {
  latest: string;
  archived: string[];
  shown: string | null;
}) {
  const router = useRouter();
  const here = usePathname();
  const listId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);

  const labels = [latest, ...archived.filter((label) => label !== latest)];
  const current = shown ?? latest;
  const [active, setActive] = useState(Math.max(0, labels.indexOf(current)));

  function show(fromKeyboard: boolean) {
    setInstant(fromKeyboard);
    setActive(Math.max(0, labels.indexOf(current)));
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function choose(label: string) {
    close(true);
    if (label === current) return;
    router.push(inRelease(here, label === latest ? null : label));
  }

  // The list takes focus when it opens so the arrows act on it at once.
  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!box.current?.contains(event.target as globalThis.Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function onButtonKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show(true);
    }
  }

  function onListKey(event: React.KeyboardEvent) {
    const last = labels.length - 1;
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
      const label = labels[active];
      if (label !== undefined) choose(label);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Tab") close(false);
  }

  return (
    <div className="releases" ref={box} data-open={open ? "yes" : undefined}>
      <button
        ref={button}
        type="button"
        className="releases-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Documentation version: ${current}`}
        onClick={(event) => (open ? close(false) : show(event.detail === 0))}
        onKeyDown={onButtonKey}
      >
        <span className="releases-current">{current}</span>
        {current === latest ? <span className="releases-tag">latest</span> : null}
        <Chevron size={13} />
      </button>

      <ul
        ref={list}
        id={listId}
        role="listbox"
        tabIndex={-1}
        className="releases-list"
        data-instant={instant ? "yes" : undefined}
        aria-label="Documentation version"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onKeyDown={onListKey}
      >
        {labels.map((label, at) => (
          <li
            key={label}
            id={`${listId}-${at}`}
            role="option"
            aria-selected={label === current}
            data-active={at === active ? "yes" : undefined}
            className="releases-option"
            onPointerEnter={() => setActive(at)}
            onClick={() => choose(label)}
          >
            <span className="releases-mark" aria-hidden="true">
              {label === current ? <Check size={14} /> : null}
            </span>
            <span className="releases-label">{label}</span>
            {label === latest ? <span className="releases-tag">latest</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
