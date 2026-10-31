import { type Live, LivePage, liveMetadata } from "@/app/_routes/documentation";

export const generateMetadata = (asked: Live) => liveMetadata("am", asked);

export default function AgentMemoryPage(asked: Live) {
  return <LivePage id="am" asked={asked} />;
}
