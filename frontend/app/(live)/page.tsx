import { LivePage, liveMetadata } from "@/app/_routes/documentation";

/**
 * The front door: a page in the store like any other, at the slug `index`, so
 * the landing page is edited the way every other page is.
 */
const asked = { params: Promise.resolve({}) };

export const generateMetadata = () => liveMetadata("db", asked);

export default function EngineHome() {
  return <LivePage id="db" asked={asked} />;
}
