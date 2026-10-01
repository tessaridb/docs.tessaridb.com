import type { Hit } from "./api";

/**
 * The part of a hit's passage worth showing: the store's window when it gave
 * one, the passage's start otherwise.
 *
 * The window is in UTF-8 **bytes**, because that is what the store counts, and a
 * JavaScript string is indexed in UTF-16 code units — so slicing the string with
 * those numbers would cut a Cyrillic or accented passage in the wrong place. The
 * passage is encoded, the bytes sliced, and the slice decoded. An ellipsis marks
 * each side where the passage goes on.
 */
export function excerpt(hit: Hit): string {
  const window = hit.snippet;
  if (!window) return hit.text;
  const bytes = new TextEncoder().encode(hit.text);
  if (
    window.start < 0 ||
    window.end > bytes.length ||
    window.start >= window.end
  ) {
    return hit.text;
  }
  const shown = new TextDecoder()
    .decode(bytes.subarray(window.start, window.end))
    .trim();
  const before = window.start > 0 ? "… " : "";
  const after = window.end < bytes.length ? " …" : "";
  return `${before}${shown}${after}`;
}
