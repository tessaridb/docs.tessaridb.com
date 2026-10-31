import {
  type ArchivedSearch,
  ArchivedSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function OAuthReleaseSearch(asked: ArchivedSearch) {
  return <ArchivedSearchPage id="oauth" asked={asked} />;
}
