import {
  type ArchivedSearch,
  ArchivedSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function KvReleaseSearch(asked: ArchivedSearch) {
  return <ArchivedSearchPage id="kv" asked={asked} />;
}
