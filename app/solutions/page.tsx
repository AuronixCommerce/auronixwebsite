import type { Metadata } from "next";
import { SiteLayout } from "@/components/site/site-layout";
import { PageHeader } from "@/components/site/page-header";
import { Section, SectionHeading } from "@/components/site/section";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/reveal";
import { CTASection } from "@/components/site/cta-section";
import { SOLUTIONS } from "@/lib/constants";
import {
  Handshake,
  Search,
  Store,
  FileText,
  Truck,
  TrendingUp,
  Check,
  ArrowRight,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: 'Solutions',
  description:
    'Commerce solutions from Auronix: supplier partnerships, procurement, marketplace operations, catalog management, distribution, and e-commerce strategy.',
  alternates: { canonical: '/solutions' },
};

const ICON_MAP: Record<string, LucideIcon> = {
  Handshake,
  Search,
  Store,
  FileText,
  Truck,
  TrendingUp,
};

const LAYOUTS = [
  "split-right",
  "split-left",
  "full",
  "split-right",
  "split-left",
  "full",
];

export default function SolutionsPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Solutions"
        title={<>Commerce solutions designed to move products forward.</>}
        description="From supplier partnerships to marketplace operations, Auronix provides the capabilities that move quality products from source to sale."
      />

      <Section className="border-t border-border">
        <div className="ac-solutions">
          <nav aria-label="Solutions">
            {SOLUTIONS.map((solution, i) => (
              <a key={solution.title} href={`#solution-${i}`}>
                {solution.title}
              </a>
            ))}
          </nav>
          <div>
            {SOLUTIONS.map((solution, i) => (
              <article
                key={solution.title}
                id={`solution-${i}`}
                className="ac-solution"
              >
                <span>
                  {String(i + 1).padStart(2, "0")} /{" "}
                  {String(SOLUTIONS.length).padStart(2, "0")}
                </span>
                <div>
                  <h2>{solution.title}</h2>
                  <p>{solution.description}</p>
                  <ul>
                    {solution.points.map((point) => (
                      <li key={point}>
                        <Check size={16} />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <CTASection
        title="Let's build what's next."
        description="Whether you are a supplier looking for a marketplace partner or a brand seeking distribution expertise, we would like to hear from you."
        buttonText="Contact Auronix"
        buttonHref="/contact"
      />
    </SiteLayout>
  );
}
