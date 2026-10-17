import {
  type Archived,
  ArchivedPage,
  archivedMetadata,
} from "@/app/_routes/documentation";

export const generateMetadata = (asked: Archived) =>
  archivedMetadata("am", asked);

export default function AgentMemoryReleasePage(asked: Archived) {
  return <ArchivedPage id="am" asked={asked} />;
}
