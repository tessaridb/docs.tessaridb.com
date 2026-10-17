import {
  type ArchivedSearch,
  ArchivedSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function AgentMemoryReleaseSearch(asked: ArchivedSearch) {
  return <ArchivedSearchPage id="am" asked={asked} />;
}
