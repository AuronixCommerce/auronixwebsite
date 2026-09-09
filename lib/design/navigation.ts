import { SITE_PAGES } from "@/lib/site-pages";
export const NAV_GROUPS = [
  {
    title: "Company",
    note: "The people, principles, and processes behind Auronix.",
    paths: [
      "/about",
      "/our-process",
      "/why-work-with-us",
      "/company-verification",
      "/careers",
      "/blog",
    ],
  },
  {
    title: "Commerce",
    note: "From supplier relationships to marketplace operations.",
    paths: ["/solutions", "/marketplace-expertise", "/partners"],
  },
  {
    title: "Partners",
    note: "Start a relationship. Manage your next step.",
    paths: ["/supplier", "/seller", "/seller/apply", "/partner-portal"],
  },
  {
    title: "Resources",
    note: "Answers, guidance, and company policies.",
    paths: [
      "/support",
      "/help",
      "/faq",
      "/contact",
      "/privacy",
      "/terms",
      "/disclaimer",
      "/cookie-policy",
      "/seller/policy",
    ],
  },
];
export const PUBLIC_PAGES = [
  ...SITE_PAGES.filter((p) => !["/services", "/portfolio"].includes(p.path)),
  {
    id: "blog",
    path: "/blog",
    title: "Blog & Insights",
    category: "Company",
    section: "company",
  },
  {
    id: "partners",
    path: "/partners",
    title: "Partners",
    category: "Partners",
    section: "partners",
  },
  {
    id: "whats-new",
    path: "/whats-new",
    title: "What’s New",
    category: "Company",
    section: "company",
  },
];
export const pageFor = (path: string) =>
  PUBLIC_PAGES.find((p) => p.path === path);
