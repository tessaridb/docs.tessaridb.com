import {
  type ArchivedSearch,
  ArchivedSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function EngineReleaseSearch(asked: ArchivedSearch) {
  return <ArchivedSearchPage id="db" asked={asked} />;
}
