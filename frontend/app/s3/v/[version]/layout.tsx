import { ArchivedLayout } from "@/app/_routes/layouts";

export default function S3Release({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ version: string }>;
}) {
  return (
    <ArchivedLayout id="s3" params={params}>
      {children}
    </ArchivedLayout>
  );
}
