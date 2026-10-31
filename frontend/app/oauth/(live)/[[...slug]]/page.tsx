import { type Live, LivePage, liveMetadata } from "@/app/_routes/documentation";

export const generateMetadata = (asked: Live) => liveMetadata("oauth", asked);

export default function OAuthPage(asked: Live) {
  return <LivePage id="oauth" asked={asked} />;
}
