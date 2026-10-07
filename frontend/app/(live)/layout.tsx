import { Shell } from "@/components/Shell";

/** The live site: the newest release, at the URLs it has always had. */
export default function Live({ children }: { children: React.ReactNode }) {
  return <Shell archived={null}>{children}</Shell>;
}
