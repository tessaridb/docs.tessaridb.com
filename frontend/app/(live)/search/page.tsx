import {
  type LiveSearch,
  LiveSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function EngineSearch(asked: LiveSearch) {
  return <LiveSearchPage id="db" asked={asked} />;
}
