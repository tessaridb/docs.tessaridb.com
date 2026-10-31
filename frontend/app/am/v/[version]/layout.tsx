import { ArchivedLayout } from "@/app/_routes/layouts";

export default function AgentMemoryRelease({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ version: string }>;
}) {
  return (
    <ArchivedLayout id="am" params={params}>
      {children}
    </ArchivedLayout>
  );
}
