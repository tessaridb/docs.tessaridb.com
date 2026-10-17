import {
  type Archived,
  ArchivedPage,
  archivedMetadata,
} from "@/app/_routes/documentation";

export const generateMetadata = (asked: Archived) =>
  archivedMetadata("db", asked);

export default function EngineReleasePage(asked: Archived) {
  return <ArchivedPage id="db" asked={asked} />;
}
