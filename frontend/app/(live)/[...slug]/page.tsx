import { type Live, LivePage, liveMetadata } from "@/app/_routes/documentation";

export const generateMetadata = (asked: Live) => liveMetadata("db", asked);

export default function EnginePage(asked: Live) {
  return <LivePage id="db" asked={asked} />;
}
