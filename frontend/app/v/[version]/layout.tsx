import { ArchivedLayout } from "@/app/_routes/layouts";

export default function EngineRelease({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ version: string }>;
}) {
  return (
    <ArchivedLayout id="db" params={params}>
      {children}
    </ArchivedLayout>
  );
}
