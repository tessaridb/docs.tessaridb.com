import {
  type Archived,
  ArchivedPage,
  archivedMetadata,
} from "@/app/_routes/documentation";

export const generateMetadata = (asked: Archived) =>
  archivedMetadata("s3", asked);

export default function S3ReleasePage(asked: Archived) {
  return <ArchivedPage id="s3" asked={asked} />;
}
