import {
  type Archived,
  ArchivedPage,
  archivedMetadata,
} from "@/app/_routes/documentation";

export const generateMetadata = (asked: Archived) =>
  archivedMetadata("kv", asked);

export default function KvReleasePage(asked: Archived) {
  return <ArchivedPage id="kv" asked={asked} />;
}
