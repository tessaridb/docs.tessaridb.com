import { type Live, LivePage, liveMetadata } from "@/app/_routes/documentation";

export const generateMetadata = (asked: Live) => liveMetadata("s3", asked);

export default function S3Page(asked: Live) {
  return <LivePage id="s3" asked={asked} />;
}
