import {
  type ArchivedSearch,
  ArchivedSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function S3ReleaseSearch(asked: ArchivedSearch) {
  return <ArchivedSearchPage id="s3" asked={asked} />;
}
