import { Missing } from "@/components/Missing";
import { Shell } from "@/components/Shell";

/**
 * A path no route holds — an archived release nobody kept, most often. Drawn
 * in the live site's shell, because there is no release to draw it in.
 */
export default function NotFound() {
  return (
    <Shell archived={null}>
      <Missing home="/" />
    </Shell>
  );
}
