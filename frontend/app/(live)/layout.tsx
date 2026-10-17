import { LiveLayout } from "@/app/_routes/layouts";

export default function Engine({ children }: { children: React.ReactNode }) {
  return <LiveLayout id="db">{children}</LiveLayout>;
}
