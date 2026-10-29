import { LiveLayout } from "@/app/_routes/layouts";

export default function Vault({ children }: { children: React.ReactNode }) {
  return <LiveLayout id="vault">{children}</LiveLayout>;
}
