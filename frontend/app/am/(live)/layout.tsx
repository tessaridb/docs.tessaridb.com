import { LiveLayout } from "@/app/_routes/layouts";

export default function AgentMemory({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LiveLayout id="am">{children}</LiveLayout>;
}
