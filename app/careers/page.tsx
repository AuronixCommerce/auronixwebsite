"use client";

import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  MapPin,
  Clock3,
  Building2,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { SiteLayout } from "@/components/site/site-layout";
import { Section, SectionHeading } from "@/components/site/section";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/reveal";

import { db } from "@/lib/firebase";
import {
  ref,
  onValue,
  off,
  type DataSnapshot,
} from "firebase/database";

type Career = {
  id: string;
  title?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  type?: string;
  description?: string;
  requirements?: string;
  applicationInstructions?: string;
  instructions?: string;
  status?: string;
  createdAt?: number;
};

function valueOf(
  career: Career,
  ...keys: (keyof Career)[]
): string {
  for (const key of keys) {
    const value = career[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function isOpen(career: Career) {
  const status = valueOf(career, "status").toLowerCase();

  return (
    status === "" ||
    status.includes("open") ||
    status.includes("accepting") ||
    status.includes("active") ||
    status.includes("hiring")
  );
}

function CareerCard({ career }: { career: Career }) {
  const title =
    valueOf(career, "title", "jobTitle") ||
    "Career Opportunity";

  const department =
    valueOf(career, "department") ||
    "E-commerce Operations";

  const location =
    valueOf(career, "location") ||
    "Remote / United States";

  const employmentType =
    valueOf(career, "employmentType", "type") ||
    "Full-Time";

  const description =
    valueOf(career, "description") ||
    "Join Auronix Commerce LLC and contribute to our growing e-commerce and marketplace operations.";

  const requirements =
    valueOf(career, "requirements") ||
    "Strong communication skills, attention to detail, professionalism, and an interest in e-commerce.";

  const instructions =
    valueOf(
      career,
      "applicationInstructions",
      "instructions"
    ) ||
    "Submit your resume/CV and a brief introduction through the Auronix careers application process.";

  const status =
    valueOf(career, "status") ||
    "Open — Accepting Applications";

  return (
    <article className="group rounded-3xl border border-border bg-card p-7 sm:p-9 transition-all duration-500 hover:-translate-y-1 hover:shadow-premium-lg">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            {status}
          </div>

          <h2 className="mt-5 text-2xl sm:text-3xl font-semibold tracking-tight">
            {title}
          </h2>
        </div>

        <div className="w-12 h-12 shrink-0 rounded-2xl border border-border bg-background flex items-center justify-center transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
          <BriefcaseBusiness className="w-5 h-5 text-accent" />
        </div>
      </div>

      <div className="mt-7 grid sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <Building2 className="w-4 h-4" />
            Department
          </div>
          <p className="mt-2 text-sm font-medium">{department}</p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <MapPin className="w-4 h-4" />
            Location
          </div>
          <p className="mt-2 text-sm font-medium">{location}</p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <Clock3 className="w-4 h-4" />
            Employment
          </div>
          <p className="mt-2 text-sm font-medium">{employmentType}</p>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em]">
            Description
          </h3>
          <p className="mt-3 text-sm text-foreground-muted leading-relaxed whitespace-pre-line">
            {description}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em]">
            Requirements
          </h3>
          <p className="mt-3 text-sm text-foreground-muted leading-relaxed whitespace-pre-line">
            {requirements}
          </p>
        </div>
      </div>

      <div className="mt-8 pt-7 border-t border-border">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em]">
          Application Instructions
        </h3>

        <p className="mt-3 text-sm text-foreground-muted leading-relaxed whitespace-pre-line">
          {instructions}
        </p>

        <a
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:gap-3"
        >
          Apply / Contact Auronix
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </article>
  );
}

export default function CareersPage() {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const careersRef = ref(db, "careers");

    const handleSnapshot = (snapshot: DataSnapshot) => {
      const data = snapshot.val();

      if (!data) {
        setCareers([]);
        setLoading(false);
        return;
      }

      const items: Career[] = Object.entries(data).map(
        ([id, value]) => ({
          id,
          ...(value as Omit<Career, "id">),
        })
      );

      items.sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      );

      setCareers(items.filter(isOpen));
      setLoading(false);
    };

    onValue(careersRef, handleSnapshot);

    return () => {
      off(careersRef, "value", handleSnapshot);
    };
  }, []);

  return (
    <SiteLayout>
      <section className="relative overflow-hidden pt-20 lg:pt-28 pb-20 lg:pb-28">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Careers
            </span>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="mt-6 max-w-4xl text-[clamp(2.75rem,6vw,5.5rem)] font-semibold tracking-[-0.03em] leading-[1.02] text-balance">
              Build what comes next.
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-7 max-w-2xl text-lg lg:text-xl text-foreground-muted leading-relaxed">
              Explore opportunities to work with Auronix Commerce LLC
              across e-commerce operations, marketplace distribution,
              supplier partnerships, and technology.
            </p>
          </Reveal>
        </div>
      </section>

      <Section className="border-t border-border bg-background-subtle">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            eyebrow="Open Positions"
            title="Opportunities at Auronix."
            description="Our careers are managed directly through our administrative system. Published positions appear here automatically."
          />

          {loading ? (
            <div className="mt-14 flex justify-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-sm text-foreground-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading opportunities...
              </div>
            </div>
          ) : careers.length === 0 ? (
            <Reveal delay={0.1}>
              <div className="mt-14 rounded-3xl border border-border bg-card p-10 sm:p-14 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl border border-border bg-background flex items-center justify-center">
                  <BriefcaseBusiness className="w-6 h-6 text-accent" />
                </div>

                <h2 className="mt-6 text-2xl font-semibold">
                  No open positions right now.
                </h2>

                <p className="mt-3 max-w-lg mx-auto text-sm text-foreground-muted leading-relaxed">
                  We are not currently advertising an open position.
                  Please check back later for new opportunities.
                </p>
              </div>
            </Reveal>
          ) : (
            <StaggerGroup className="mt-14 space-y-6">
              {careers.map((career) => (
                <StaggerItem key={career.id}>
                  <CareerCard career={career} />
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}
        </div>
      </Section>
    </SiteLayout>
  );
}
