import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/section";
import { PartnerWorkspace } from "@/components/partner/workspace";
export const metadata = {
  title: "Supplier Workspace",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="SUPPLIER WORKSPACE"
        title={
          <>
            Your partnership,
            <br />
            one clear view.
          </>
        }
        description="Resume a saved application, follow review updates, and send requested documents securely."
      />
      <Section>
        <PartnerWorkspace />
      </Section>
    </>
  );
}
