import {
  type Archived,
  ArchivedPage,
  archivedMetadata,
} from "@/app/_routes/documentation";

export const generateMetadata = (asked: Archived) =>
  archivedMetadata("db", asked);

/** An archived release's front door — its own `index` page. */
export default function EngineReleaseHome(asked: Archived) {
  return <ArchivedPage id="db" asked={asked} />;
}
