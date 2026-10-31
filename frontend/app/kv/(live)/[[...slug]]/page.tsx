import { type Live, LivePage, liveMetadata } from "@/app/_routes/documentation";

export const generateMetadata = (asked: Live) => liveMetadata("kv", asked);

export default function KvPage(asked: Live) {
  return <LivePage id="kv" asked={asked} />;
}
