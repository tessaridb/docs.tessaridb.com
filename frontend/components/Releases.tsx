"use client";

import { usePathname, useRouter } from "next/navigation";

import { inRelease } from "@/lib/version";
import { Check, Chevron } from "./icons";
import { useListbox } from "./useListbox";

/**
 * Which release of the product's documentation is on screen, and the way to
 * another.
 *
 * A button that opens a list (see `useListbox` for the keyboard): the button
 * says what is being read, the list names every release with the newest marked
 * and the current one checked. Choosing one keeps the page — the same path in
 * that release — so a reader comparing two releases does not have to find
 * their place again. `latest` is the release the live pages describe; it is
 * listed once even when an archive of it exists, and choosing it goes to the
 * live URLs.
 *
 * The releases are one product's: TessariKV's `0.0.1` and the engine's
 * `0.34.0` are different documentation, and each product's picker lists its own.
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

  const labels = [latest, ...archived.filter((label) => label !== latest)];
  const current = shown ?? latest;
  const box = useListbox(labels.length, labels.indexOf(current), (at) => {
    const label = labels[at];
    if (label === undefined || label === current) return;
    router.push(inRelease(here, label === latest ? null : label));
  });

  return (
    <div
      className="releases"
      ref={box.box}
      data-open={box.open ? "yes" : undefined}
    >
      <button
        ref={box.button}
        type="button"
        className="releases-button"
        aria-haspopup="listbox"
        aria-expanded={box.open}
        aria-controls={box.listId}
        aria-label={`Documentation version: ${current}`}
        onClick={box.onButtonClick}
        onKeyDown={box.onButtonKey}
      >
        <span className="releases-current">{current}</span>
        {current === latest ? (
          <span className="releases-tag">latest</span>
        ) : null}
        <Chevron size={13} />
      </button>

      <ul
        ref={box.list}
        id={box.listId}
        role="listbox"
        tabIndex={-1}
        className="releases-list"
        data-instant={box.instant ? "yes" : undefined}
        aria-label="Documentation version"
        aria-activedescendant={
          box.open ? `${box.listId}-${box.active}` : undefined
        }
        onKeyDown={box.onListKey}
      >
        {labels.map((label, at) => (
          <li
            key={label}
            id={`${box.listId}-${at}`}
            role="option"
            aria-selected={label === current}
            data-active={at === box.active ? "yes" : undefined}
            className="releases-option"
            onPointerEnter={() => box.setActive(at)}
            onClick={() => box.pick(at)}
          >
            <span className="releases-mark" aria-hidden="true">
              {label === current ? <Check size={14} /> : null}
            </span>
            <span className="releases-label">{label}</span>
            {label === latest ? (
              <span className="releases-tag">latest</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
