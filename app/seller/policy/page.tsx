import Link from 'next/link';

export const metadata = {
  title: 'Seller Policy | Auronix Commerce LLC',
  description:
    'Seller policies and requirements for businesses applying to work with Auronix Commerce LLC.',
};

export default function SellerPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* HERO */}
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            AURONIX COMMERCE LLC
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Seller Policy
          </h1>

          <p className="mt-5 text-base leading-7 text-foreground-muted sm:text-lg">
            This Seller Policy explains the requirements and standards
            applicable to businesses that apply to work with Auronix
            Commerce LLC as sellers, suppliers, vendors, brands,
            manufacturers, distributors, or other commercial partners.
          </p>

          <div className="mt-5 text-sm text-foreground-muted">
            <strong>Last Updated:</strong> August 15, 2026
          </div>
        </div>

        {/* POLICY */}
        <div className="mt-12 space-y-6">
          <PolicySection
            number="01"
            title="Eligibility"
          >
            <p>
              Applicants must provide accurate and complete information
              about themselves and their business. Auronix Commerce LLC
              may evaluate applications based on the information provided,
              business suitability, product relevance, commercial
              opportunities, and other internal criteria.
            </p>

            <p>
              Submission of an application does not guarantee approval,
              seller account creation, purchasing activity, product
              listing, or a business relationship with Auronix Commerce
              LLC.
            </p>
          </PolicySection>

          <PolicySection
            number="02"
            title="Accurate Information"
          >
            <p>
              Sellers are responsible for ensuring that all information
              submitted to Auronix is accurate, complete, current, and
              not misleading.
            </p>

            <p>
              This includes business names, contact information,
              addresses, email addresses, websites, product categories,
              business descriptions, catalogs, and other information
              supplied during the application or onboarding process.
            </p>

            <p>
              Providing false, fabricated, misleading, impersonated, or
              intentionally incomplete information may result in
              rejection, suspension, or termination of the application or
              seller relationship.
            </p>
          </PolicySection>

          <PolicySection
            number="03"
            title="Business Email and Personal Email"
          >
            <p>
              Applicants may provide both a business email address and a
              personal email address. A personal email address may use a
              free provider such as Gmail, Outlook, Yahoo, iCloud, or
              another consumer email service.
            </p>

            <p>
              A free personal email address is not, by itself, evidence
              of fraud or misuse. A business email using a consumer email
              provider may be considered as one quality signal during
              internal review, but it does not by itself establish that an
              application is fraudulent or invalid.
            </p>

            <p>
              Applicants may select their preferred email address for
              Auronix communications and seller account invitations.
            </p>
          </PolicySection>

          <PolicySection
            number="04"
            title="Business Information"
          >
            <p>
              Applicants should provide meaningful information about their
              business, products, customers, sourcing or distribution
              activities, and commercial capabilities where applicable.
            </p>

            <p>
              Auronix may request additional information or documentation
              when necessary to evaluate an application or potential
              commercial relationship.
            </p>
          </PolicySection>

          <PolicySection
            number="05"
            title="Products and Catalogs"
          >
            <p>
              Sellers are responsible for ensuring that product
              information and catalogs they provide are accurate,
              authorized, and suitable for commercial review.
            </p>

            <p>
              Product descriptions, specifications, pricing, availability,
              product identifiers, documentation, images, packaging
              information, and other submitted materials should be
              truthful and current.
            </p>

            <p>
              Auronix may decline products that do not fit its commercial
              requirements, marketplace strategy, compliance standards,
              product categories, or business objectives.
            </p>
          </PolicySection>

          <PolicySection
            number="06"
            title="Prohibited Conduct"
          >
            <p>
              Applicants and sellers must not use Auronix systems for
              fraudulent, deceptive, malicious, abusive, unlawful, or
              unauthorized activity.
            </p>

            <ul className="list-disc space-y-2 pl-6">
              <li>
                Impersonating another person or business.
              </li>

              <li>
                Submitting fabricated business or identity information.
              </li>

              <li>
                Providing intentionally misleading product information.
              </li>

              <li>
                Attempting to gain unauthorized access to Auronix systems
                or accounts.
              </li>

              <li>
                Sending malicious links, malware, phishing content, or
                credential requests.
              </li>

              <li>
                Using automated systems to abuse application or support
                processes.
              </li>
            </ul>
          </PolicySection>

          <PolicySection
            number="07"
            title="AI-Assisted Application Review"
          >
            <p>
              Auronix may use automated systems and artificial intelligence
              to assist with application screening, quality assessment,
              consistency checks, spam detection, and internal decision
              support.
            </p>

            <p>
              AI screening is an internal assessment tool and does not, by
              itself, establish legal identity, ownership, licensing,
              incorporation status, or real-world business authenticity.
            </p>

            <p>
              Applications may be automatically classified for internal
              review purposes, while certain applications may require
              additional human review.
            </p>
          </PolicySection>

          <PolicySection
            number="08"
            title="Verification and Additional Information"
          >
            <p>
              Auronix may request additional information or documentation
              before establishing or continuing a seller relationship.
              Applicants and sellers agree to provide requested
              information accurately and within a reasonable period.
            </p>

            <p>
              Failure to provide requested information may delay,
              restrict, or prevent approval or continued participation.
            </p>
          </PolicySection>

          <PolicySection
            number="09"
            title="Approval and Account Creation"
          >
            <p>
              Approval of a seller application is determined by Auronix
              Commerce LLC according to its internal requirements and
              business objectives.
            </p>

            <p>
              An approved application may receive an account creation or
              activation invitation using the email address selected by
              the applicant during the application process.
            </p>

            <p>
              Account creation or an invitation does not guarantee
              purchasing activity, product approval, marketplace listing,
              sales volume, or any minimum commercial relationship.
            </p>
          </PolicySection>

          <PolicySection
            number="10"
            title="Seller Responsibilities"
          >
            <p>
              Sellers are responsible for maintaining accurate business
              information and communicating material changes to Auronix
              when appropriate.
            </p>

            <p>
              Sellers should promptly notify Auronix of significant changes
              to business ownership, contact information, product
              availability, catalog information, or other material
              information previously submitted.
            </p>
          </PolicySection>

          <PolicySection
            number="11"
            title="Suspension or Termination"
          >
            <p>
              Auronix Commerce LLC may reject an application, suspend an
              account, restrict participation, or terminate a seller
              relationship where appropriate, including in cases involving
              inaccurate information, policy violations, suspicious
              activity, abuse, security concerns, or failure to meet
              applicable requirements.
            </p>
          </PolicySection>

          <PolicySection
            number="12"
            title="Policy Changes"
          >
            <p>
              Auronix Commerce LLC may update this Seller Policy from time
              to time to reflect changes to business practices, technology,
              security requirements, operational processes, or applicable
              requirements.
            </p>

            <p>
              The current version published on this page will represent the
              version applicable to new applications unless otherwise
              stated.
            </p>
          </PolicySection>

          <PolicySection
            number="13"
            title="No Guarantee of Partnership"
          >
            <p>
              Application review and account approval do not create a
              guarantee of a purchasing relationship, distribution
              agreement, marketplace placement, sales volume, revenue,
              exclusivity, or other commercial outcome.
            </p>
          </PolicySection>

          <PolicySection
            number="14"
            title="Contact"
          >
            <p>
              Questions regarding the Seller Policy or seller applications
              may be directed to Auronix Commerce LLC through the contact
              and support channels provided on the website.
            </p>

            <p>
              Seller applicants should use accurate contact information so
              that Auronix can communicate application-related decisions,
              requests, or next steps.
            </p>
          </PolicySection>
        </div>

        {/* FOOTER ACTION */}
        <div className="ac-content-panel mt-12 p-6 sm:p-8">
          <h2 className="text-xl font-semibold">
            Ready to apply?
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
            Applicants will be required to review and explicitly agree to
            this Seller Policy before submitting an application.
          </p>

          <div className="mt-5">
            <Link
              href="/seller/apply"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Apply to Become a Seller
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function PolicySection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ac-content-panel p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-xs font-semibold">
          {number}
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">
            {title}
          </h2>

          <div className="mt-4 space-y-4 text-sm leading-7 text-foreground-muted">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
