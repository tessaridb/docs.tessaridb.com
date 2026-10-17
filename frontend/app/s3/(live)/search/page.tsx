import {
  type LiveSearch,
  LiveSearchPage,
  searchMetadata,
} from "@/app/_routes/search";

export const generateMetadata = searchMetadata;

export default function S3Search(asked: LiveSearch) {
  return <LiveSearchPage id="s3" asked={asked} />;
}
