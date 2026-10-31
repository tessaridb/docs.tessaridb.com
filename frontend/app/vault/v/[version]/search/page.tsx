import {
  type ArchivedSearch,
  ArchivedSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function VaultReleaseSearch(asked: ArchivedSearch) {
  return <ArchivedSearchPage id="vault" asked={asked} />;
}
