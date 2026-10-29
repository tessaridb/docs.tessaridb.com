import {
  type LiveSearch,
  LiveSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function VaultSearch(asked: LiveSearch) {
  return <LiveSearchPage id="vault" asked={asked} />;
}
