import {
  type LiveSearch,
  LiveSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function AgentMemorySearch(asked: LiveSearch) {
  return <LiveSearchPage id="am" asked={asked} />;
}
