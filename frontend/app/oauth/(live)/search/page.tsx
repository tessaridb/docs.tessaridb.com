import {
  type LiveSearch,
  LiveSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function OAuthSearch(asked: LiveSearch) {
  return <LiveSearchPage id="oauth" asked={asked} />;
}
