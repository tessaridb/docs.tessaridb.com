import {
  type Archived,
  ArchivedPage,
  archivedMetadata,
} from "@/app/_routes/documentation";

export const generateMetadata = (asked: Archived) =>
  archivedMetadata("oauth", asked);

export default function OAuthReleasePage(asked: Archived) {
  return <ArchivedPage id="oauth" asked={asked} />;
}
