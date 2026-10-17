import type { ProjectId } from "@/lib/projects";

import { Mark } from "./icons";

/** The two back squares every mark in the family shares. */
const BACK =
  "M25 21 H75 A4 4 0 0 1 79 25 V75 A4 4 0 0 1 75 79 H25 A4 4 0 0 1 21 75 V25 A4 4 0 0 1 25 21 Z M 45.73 42.42 L 79.00 45.33 L 79.00 56.37 L 69.67 55.55 L 67.62 79.00 L 55.58 79.00 L 57.72 54.51 L 44.77 53.37 Z";

/** The front square with the T cut out of it — the engine's, S3's and TessariKV's. */
const FRONT_T =
  "M38 34 H88 A4 4 0 0 1 92 38 V88 A4 4 0 0 1 88 92 H38 A4 4 0 0 1 34 88 V38 A4 4 0 0 1 38 34 Z M44 44 H82 V55 H69 V82 H57 V55 H44 Z";

/** Agent Memory's front square: two agents and a record joined to them. */
const FRONT_AM =
  "M38 34 H88 A4 4 0 0 1 92 38 V88 A4 4 0 0 1 88 92 H38 A4 4 0 0 1 34 88 V38 A4 4 0 0 1 38 34 Z M57 48 H69 V58 H57 Z M71 60 H81 V68 H71 Z M43 53 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z M69 53 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z M69 75 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z";

/** The badge the S3 and TessariKV marks carry on the front square's corner. */
const BADGE =
  "M76 68 H95 A5 5 0 0 1 100 73 V91 A5 5 0 0 1 95 96 H76 A5 5 0 0 1 71 91 V73 A5 5 0 0 1 76 68 Z";

const LETTERS: Record<"s3" | "kv", string> = {
  s3: "M83.4 76.6 C82.9 75.2 81.6 74.5 79.8 74.5 C77.4 74.5 76.1 75.7 76.1 77.6 C76.1 79.7 78 80.6 80 81.3 C82.3 82.1 83.9 83.1 83.9 85.6 C83.9 88 82.2 89.5 79.7 89.5 C77.6 89.5 76.1 88.6 75.5 87 M87.3 76.4 C87.9 75.1 89.1 74.5 90.8 74.5 C93.2 74.5 94.6 75.8 94.6 77.8 C94.6 79.8 93.1 81.2 90.8 81.2 H89.8 M90.8 81.2 C93.4 81.2 95.1 82.7 95.1 85.2 C95.1 87.8 93.3 89.5 90.7 89.5 C88.8 89.5 87.5 88.7 86.9 87.4",
  kv: "M77.6 75.2 V88.8 M84.6 75.2 L77.9 82.6 M80.2 80.2 L85 88.8 M87.6 75.2 L91 88.8 L94.4 75.2",
};

/**
 * Each product's mark, drawn from the same geometry its own site uses.
 *
 * The squares are the family's violet on every one, so the four read as one
 * family in the switcher; what tells them apart is the part each product's own
 * mark already uses for that — the lettered badge on S3 and TessariKV, the cut
 * of the front square on Agent Memory — inked in the product's own accent.
 *
 * Decorative wherever it sits beside the product's name, which is how it is
 * used; the engine's mark keeps its own label for the places it stands alone.
 */
export function ProjectMark({
  id,
  size = 22,
}: {
  id: ProjectId;
  size?: number;
}) {
  if (id === "db") return <Mark size={size} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="8"
        y="8"
        width="58"
        height="58"
        rx="4"
        transform="rotate(-6 37 37)"
        fill="none"
        stroke="var(--brand-bright)"
        strokeWidth="2.5"
        opacity="0.8"
      />
      <path
        fill="var(--brand-bright)"
        opacity="0.42"
        fillRule="evenodd"
        d={BACK}
      />
      <g transform="rotate(5 63 63)">
        {id === "am" ? (
          <path fill={`var(--project-${id})`} fillRule="evenodd" d={FRONT_AM} />
        ) : (
          <>
            <path fill="var(--brand-bright)" fillRule="evenodd" d={FRONT_T} />
            <path fill={`var(--project-${id})`} d={BADGE} />
            <path
              fill="none"
              stroke="var(--bg)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              d={LETTERS[id]}
            />
          </>
        )}
      </g>
    </svg>
  );
}
