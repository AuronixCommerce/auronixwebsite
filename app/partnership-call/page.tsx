import { PageHeader } from "@/components/site/page-header";
import { Section } from "@/components/site/section";
import { PartnershipBooking } from "@/components/partner/booking";
export const metadata = {
  title: "Book a Partnership Call",
  description:
    "Choose an available Auronix partnership call time and confirm with your verified email.",
};
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="LET’S TALK"
        title={<>Make your next connection.</>}
        description="Choose a time published by our team. Tell us about your business, products, or partnership question."
      />
      <Section>
        <PartnershipBooking />
      </Section>
    </>
  );
}
