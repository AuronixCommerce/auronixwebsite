import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/section";
import { PartnerWorkspace } from "@/components/partner/workspace";
export const metadata = {
  title: "Notification Center",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="NOTIFICATIONS"
        title={<>Keep every update close.</>}
        description="Application updates, document requests, calls, and support replies for your verified email."
      />
      <Section>
        <PartnerWorkspace notificationsOnly />
      </Section>
    </>
  );
}
