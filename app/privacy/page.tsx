import { DeveloperLegalNotice } from "@/components/developers/legal-notice";
import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Auronix Commerce LLC.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <DeveloperLegalNotice privacy />
      <LegalPage
        slug="privacy"
        eyebrow="Legal"
        title="Privacy Policy"
        description="How Auronix Commerce LLC collects, uses, and protects information."
      />
    </>
  );
}
