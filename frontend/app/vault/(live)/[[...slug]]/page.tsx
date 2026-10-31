import { type Live, LivePage, liveMetadata } from "@/app/_routes/documentation";

export const generateMetadata = (asked: Live) => liveMetadata("vault", asked);

export default function VaultPage(asked: Live) {
  return <LivePage id="vault" asked={asked} />;
}
