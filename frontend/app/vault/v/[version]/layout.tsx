import { ArchivedLayout } from "@/app/_routes/layouts";

export default function VaultRelease({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ version: string }>;
}) {
  return (
    <ArchivedLayout id="vault" params={params}>
      {children}
    </ArchivedLayout>
  );
}
