import { ArchivedLayout } from "@/app/_routes/layouts";

export default function KvRelease({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ version: string }>;
}) {
  return (
    <ArchivedLayout id="kv" params={params}>
      {children}
    </ArchivedLayout>
  );
}
