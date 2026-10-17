import {
  type LiveSearch,
  LiveSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function KvSearch(asked: LiveSearch) {
  return <LiveSearchPage id="kv" asked={asked} />;
}
