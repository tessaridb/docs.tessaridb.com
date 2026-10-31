import {
  type Archived,
  ArchivedPage,
  archivedMetadata,
} from "@/app/_routes/documentation";

export const generateMetadata = (asked: Archived) =>
  archivedMetadata("vault", asked);

export default function VaultReleasePage(asked: Archived) {
  return <ArchivedPage id="vault" asked={asked} />;
}
