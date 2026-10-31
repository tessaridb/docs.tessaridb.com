import { ArchivedLayout } from "@/app/_routes/layouts";

export default function OAuthRelease({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ version: string }>;
}) {
  return (
    <ArchivedLayout id="oauth" params={params}>
      {children}
    </ArchivedLayout>
  );
}
