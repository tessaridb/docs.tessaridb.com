import { LiveLayout } from "@/app/_routes/layouts";

export default function OAuth({ children }: { children: React.ReactNode }) {
  return <LiveLayout id="oauth">{children}</LiveLayout>;
}
