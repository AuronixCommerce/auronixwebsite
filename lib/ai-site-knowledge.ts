export type SiteKnowledgeEntry = {
  path: string;
  title: string;
  visibility: 'public' | 'private';
  summary: string;
  topics: string[];
  actions?: string[];
  related?: string[];
};

export const AURONIX_SITE_KNOWLEDGE: SiteKnowledgeEntry[] = [
  {
    path: '/',
    title: 'Auronix Commerce LLC Homepage',
    visibility: 'public',
    summary:
      'The main Auronix Commerce LLC website homepage. It introduces Auronix as a commerce company focused on eCommerce operations, product sourcing, procurement, supplier relationships, distribution, marketplace operations, and long-term growth.',
    topics: [
      'company overview',
      'eCommerce',
      'procurement',
      'product sourcing',
      'supplier partnerships',
      'marketplace operations',
      'distribution',
      'commerce strategy',
    ],
    actions: [
      'learn about Auronix',
      'navigate to solutions',
      'learn about the process',
      'become a supplier',
      'become a seller',
      'contact Auronix',
    ],
    related: [
      '/about',
      '/solutions',
      '/our-process',
      '/marketplace-expertise',
      '/partners',
      '/become-a-supplier',
      '/seller/apply',
      '/contact',
    ],
  },

  {
    path: '/about',
    title: 'About Auronix Commerce LLC',
    visibility: 'public',
    summary:
      'Company information describing what Auronix Commerce LLC is, how it approaches commerce operations, and how it works with suppliers, brands, products, procurement, distribution, and marketplaces.',
    topics: [
      'company',
      'business',
      'commerce',
      'supplier relationships',
      'procurement',
      'marketplaces',
    ],
    related: [
      '/',
      '/solutions',
      '/our-process',
      '/partners',
      '/contact',
    ],
  },

  {
    path: '/solutions',
    title: 'Auronix Commerce Solutions',
    visibility: 'public',
    summary:
      'The solutions page explains Auronix Commerce capabilities across product sourcing, procurement, supplier relationships, marketplace operations, distribution, catalog operations, and commerce strategy.',
    topics: [
      'solutions',
      'procurement',
      'sourcing',
      'distribution',
      'marketplace operations',
      'catalog management',
      'commerce strategy',
    ],
    actions: [
      'learn about a solution',
      'contact Auronix',
      'explore supplier opportunities',
    ],
    related: [
      '/contact',
      '/become-a-supplier',
      '/marketplace-expertise',
    ],
  },

  {
    path: '/our-process',
    title: 'Our Process',
    visibility: 'public',
    summary:
      'The process page explains the Auronix operating journey from discovery and evaluation through supplier/product sourcing, procurement, preparation, marketplace operations, launch, optimization, and growth.',
    topics: [
      'process',
      'discovery',
      'evaluation',
      'sourcing',
      'procurement',
      'preparation',
      'launch',
      'optimization',
      'growth',
    ],
    related: [
      '/solutions',
      '/marketplace-expertise',
      '/partners',
      '/contact',
    ],
  },

  {
    path: '/why-work-with-us',
    title: 'Why Work With Auronix',
    visibility: 'public',
    summary:
      'The page explains why suppliers, brands, and business partners may work with Auronix, focusing on structured processes, quality, marketplace expertise, communication, procurement discipline, partnerships, and growth.',
    topics: [
      'partnership',
      'suppliers',
      'brands',
      'quality',
      'marketplace expertise',
      'communication',
      'growth',
    ],
    related: [
      '/partners',
      '/become-a-supplier',
      '/contact',
    ],
  },

  {
    path: '/marketplace-expertise',
    title: 'Marketplace Expertise',
    visibility: 'public',
    summary:
      'The marketplace expertise page covers product and catalog operations, listing workflows, marketplace positioning, product selection, inventory coordination, operational consistency, and optimization.',
    topics: [
      'marketplaces',
      'catalog',
      'product listings',
      'product selection',
      'inventory',
      'optimization',
      'marketplace strategy',
    ],
    related: [
      '/solutions',
      '/our-process',
      '/contact',
    ],
  },

  {
    path: '/partners',
    title: 'Partners',
    visibility: 'public',
    summary:
      'The partners page focuses on relationships with manufacturers, wholesalers, distributors, suppliers, brands, and other business partners.',
    topics: [
      'partners',
      'manufacturers',
      'wholesalers',
      'distributors',
      'suppliers',
      'brands',
      'business relationships',
    ],
    actions: [
      'contact Auronix',
      'become a supplier',
      'ask about partnerships',
    ],
    related: [
      '/become-a-supplier',
      '/contact',
      '/why-work-with-us',
    ],
  },

  {
    path: '/become-a-supplier',
    title: 'Become a Supplier',
    visibility: 'public',
    summary:
      'Supplier acquisition page explaining why suppliers may work with Auronix, what company/product information is useful, and how supplier inquiries are handled.',
    topics: [
      'supplier',
      'wholesale',
      'manufacturer',
      'brand',
      'product catalog',
      'supplier inquiry',
    ],
    actions: [
      'submit supplier interest',
      'contact Auronix',
    ],
    related: [
      '/partners',
      '/contact',
      '/company-verification',
    ],
  },

  {
    path: '/contact',
    title: 'Contact Auronix Commerce LLC',
    visibility: 'public',
    summary:
      'Business contact page for supplier inquiries, partnerships, seller inquiries, general business questions, and support.',
    topics: [
      'contact',
      'support',
      'supplier inquiry',
      'partnership inquiry',
      'seller inquiry',
      'business inquiry',
    ],
    actions: [
      'submit contact form',
      'request human support',
    ],
    related: [
      '/support',
      '/become-a-supplier',
      '/seller/apply',
    ],
  },

  {
    path: '/support',
    title: 'Support',
    visibility: 'public',
    summary:
      'Public support area for FAQs, contact support, general help, and guidance for sellers and suppliers.',
    topics: [
      'support',
      'help',
      'FAQ',
      'seller support',
      'supplier support',
    ],
    related: [
      '/faq',
      '/contact',
      '/seller/support',
    ],
  },

  {
    path: '/faq',
    title: 'Frequently Asked Questions',
    visibility: 'public',
    summary:
      'Public FAQ page containing approved business questions and answers. FAQ data is also available to the AI assistant when approved by the site.',
    topics: [
      'FAQ',
      'questions',
      'answers',
      'business information',
      'support',
    ],
    related: [
      '/contact',
      '/support',
      '/help',
    ],
  },

  {
    path: '/help',
    title: 'Help Center and Seller Troubleshooting',
    visibility: 'public',
    summary:
      'Step-by-step technical troubleshooting for seller applications, verification, invitation links, password reset, seller dashboard access, catalogs, notifications, support, maintenance, and browser site data.',
    topics: [
      'technical help',
      'seller dashboard troubleshooting',
      'verification problems',
      'account access',
      'catalog troubleshooting',
    ],
    related: [
      '/faq',
      '/support',
      '/seller/login',
      '/seller/apply',
    ],
  },

  {
    path: '/careers',
    title: 'Careers',
    visibility: 'public',
    summary:
      'Public careers page for opportunities and company roles.',
    topics: [
      'careers',
      'jobs',
      'opportunities',
      'company',
    ],
    related: [
      '/about',
      '/contact',
    ],
  },

  {
    path: '/company-verification',
    title: 'Company Verification',
    visibility: 'public',
    summary:
      'Official company information page intended to help suppliers, brands, partners, and service providers understand the business identity of Auronix Commerce LLC.',
    topics: [
      'company verification',
      'business identity',
      'company information',
      'trust',
    ],
    related: [
      '/about',
      '/contact',
      '/become-a-supplier',
    ],
  },

  {
    path: '/blog',
    title: 'Auronix Commerce Blog',
    visibility: 'public',
    summary:
      'Public blog and insights area covering eCommerce, sourcing, procurement, supplier relationships, marketplace strategy, distribution, product operations, and commerce technology.',
    topics: [
      'blog',
      'eCommerce insights',
      'procurement',
      'sourcing',
      'marketplace strategy',
      'commerce technology',
    ],
    related: [
      '/contact',
      '/solutions',
      '/marketplace-expertise',
    ],
  },

  {
    path: '/blog/[slug]',
    title: 'Blog Article',
    visibility: 'public',
    summary:
      'Dynamic individual blog article route. Published articles may contain title, summary, body, author, image, category, publication date, updated date, and dedicated SEO metadata.',
    topics: [
      'blog article',
      'eCommerce',
      'commerce insights',
    ],
    related: [
      '/blog',
    ],
  },

  {
    path: '/seller',
    title: 'Seller Information',
    visibility: 'public',
    summary:
      'Public seller information hub explaining the seller relationship and directing users to seller application, seller policy, and support.',
    topics: [
      'seller',
      'seller relationship',
      'seller application',
      'seller policy',
    ],
    actions: [
      'apply as a seller',
      'read seller policy',
      'get seller support',
    ],
    related: [
      '/seller/apply',
      '/seller/policy',
      '/seller/support',
    ],
  },

  {
    path: '/seller/apply',
    title: 'Seller Application',
    visibility: 'public',
    summary:
      'Seller application form collecting applicant/business information and required narrative information. The application includes validation and an explicit agreement/consent requirement.',
    topics: [
      'seller application',
      'business information',
      'products',
      'business type',
      'application',
      'seller screening',
    ],
    actions: [
      'apply as seller',
      'submit seller application',
    ],
    related: [
      '/seller',
      '/seller/policy',
      '/seller/support',
    ],
  },

  {
    path: '/seller/policy',
    title: 'Seller Policy',
    visibility: 'public',
    summary:
      'Public seller policy describing eligibility, seller responsibilities, verification expectations, product/business information, and policy requirements.',
    topics: [
      'seller policy',
      'eligibility',
      'seller responsibilities',
      'verification',
      'requirements',
    ],
    related: [
      '/seller',
      '/seller/apply',
      '/support',
    ],
  },

  {
    path: '/seller/login',
    title: 'Seller Login',
    visibility: 'private',
    summary:
      'Private seller authentication route.',
    topics: [
      'seller login',
      'authentication',
    ],
  },

  {
    path: '/seller/activate',
    title: 'Seller Activation',
    visibility: 'private',
    summary:
      'Seller account activation workflow.',
    topics: [
      'seller activation',
      'account activation',
    ],
  },

  {
    path: '/seller/activate/[token]',
    title: 'Seller Token Activation',
    visibility: 'private',
    summary:
      'Tokenized seller account activation route.',
    topics: [
      'activation',
      'seller account',
      'token',
    ],
  },

  {
    path: '/seller/dashboard',
    title: 'Seller Dashboard',
    visibility: 'private',
    summary:
      'Authenticated seller dashboard.',
    topics: [
      'seller dashboard',
      'seller account',
      'seller operations',
    ],
  },

  {
    path: '/seller/dashboard/catalogs',
    title: 'Seller Catalogs',
    visibility: 'private',
    summary:
      'Authenticated seller catalog management area.',
    topics: [
      'seller catalogs',
      'catalogs',
      'products',
    ],
  },

  {
    path: '/seller/dashboard/products',
    title: 'Seller Products',
    visibility: 'private',
    summary:
      'Authenticated seller product management area.',
    topics: [
      'products',
      'seller products',
      'catalog',
    ],
  },

  {
    path: '/seller/profile',
    title: 'Seller Profile',
    visibility: 'private',
    summary:
      'Authenticated seller profile management page.',
    topics: [
      'seller profile',
      'account information',
    ],
  },

  {
    path: '/seller/settings',
    title: 'Seller Settings',
    visibility: 'private',
    summary:
      'Authenticated seller account settings page.',
    topics: [
      'seller settings',
      'account',
      'preferences',
    ],
  },

  {
    path: '/seller/support',
    title: 'Seller Support',
    visibility: 'private',
    summary:
      'Seller-specific support area.',
    topics: [
      'seller support',
      'support',
      'tickets',
    ],
  },

  {
    path: '/partner-portal',
    title: 'Partner Portal',
    visibility: 'private',
    summary:
      'Controlled partner portal for authorized partners.',
    topics: [
      'partner portal',
      'partners',
      'authentication',
    ],
  },

  {
    path: '/privacy',
    title: 'Privacy Policy',
    visibility: 'public',
    summary:
      'Public privacy policy describing privacy and data handling information.',
    topics: [
      'privacy',
      'data',
      'personal information',
    ],
  },

  {
    path: '/terms',
    title: 'Terms',
    visibility: 'public',
    summary:
      'Public website terms governing use of the website and its services.',
    topics: [
      'terms',
      'website terms',
      'legal',
    ],
  },

  {
    path: '/disclaimer',
    title: 'Disclaimer',
    visibility: 'public',
    summary:
      'Public disclaimer page containing important limitations and general informational notices.',
    topics: [
      'disclaimer',
      'legal',
      'limitations',
    ],
  },

  {
    path: '/cookie-policy',
    title: 'Cookie Policy',
    visibility: 'public',
    summary:
      'Public cookie policy describing cookie-related website practices.',
    topics: [
      'cookies',
      'privacy',
      'website data',
    ],
  },

  {
    path: '/whats-new',
    title: "What's New",
    visibility: 'public',
    summary:
      'Public updates/changelog-style content explaining notable Auronix website or business updates.',
    topics: [
      'updates',
      'news',
      'changelog',
      'announcements',
    ],
    related: [
      '/',
      '/blog',
    ],
  },

  {
    path: '/forgot-password',
    title: 'Forgot Password',
    visibility: 'private',
    summary:
      'Private password recovery workflow.',
    topics: [
      'password recovery',
      'authentication',
    ],
  },

  {
    path: '/reset-password',
    title: 'Reset Password',
    visibility: 'private',
    summary:
      'Private password reset workflow.',
    topics: [
      'password reset',
      'authentication',
    ],
  },

  /*
   * ADMIN ROUTES
   * These are known to the application but must never
   * be exposed as public navigation or revealed casually.
   */

  {
    path: '/admin',
    title: 'Admin Dashboard',
    visibility: 'private',
    summary:
      'Internal Auronix administration dashboard.',
    topics: [
      'admin',
      'operations',
      'dashboard',
    ],
  },

  {
    path: '/admin/login',
    title: 'Admin Login',
    visibility: 'private',
    summary:
      'Internal administrator authentication.',
    topics: [
      'admin authentication',
      'admin login',
    ],
  },

  {
    path: '/admin/ai',
    title: 'Admin AI',
    visibility: 'private',
    summary:
      'Internal AI administration tools.',
    topics: [
      'admin AI',
      'internal AI',
    ],
  },

  {
    path: '/admin/blog',
    title: 'Admin Blog Manager',
    visibility: 'private',
    summary:
      'Internal blog management and publishing tools.',
    topics: [
      'blog management',
      'publishing',
      'admin',
    ],
  },

  {
    path: '/admin/careers',
    title: 'Admin Careers',
    visibility: 'private',
    summary:
      'Internal careers management.',
    topics: [
      'careers',
      'admin',
    ],
  },

  {
    path: '/admin/changelog',
    title: 'Admin Changelog',
    visibility: 'private',
    summary:
      'Internal change/update management.',
    topics: [
      'changelog',
      'updates',
      'admin',
    ],
  },

  {
    path: '/admin/contact',
    title: 'Admin Contact Management',
    visibility: 'private',
    summary:
      'Internal contact submission management.',
    topics: [
      'contact submissions',
      'admin',
    ],
  },

  {
    path: '/admin/faqs',
    title: 'Admin FAQ Manager',
    visibility: 'private',
    summary:
      'Internal FAQ creation and editing.',
    topics: [
      'FAQ management',
      'admin',
    ],
  },

  {
    path: '/admin/legal',
    title: 'Admin Legal Manager',
    visibility: 'private',
    summary:
      'Internal legal/policy management.',
    topics: [
      'legal',
      'policies',
      'admin',
    ],
  },

  {
    path: '/admin/newsletter',
    title: 'Admin Newsletter Manager',
    visibility: 'private',
    summary:
      'Internal newsletter subscriber, campaign, AI generation, preview, and sending management.',
    topics: [
      'newsletter',
      'campaigns',
      'subscribers',
      'AI content generation',
      'admin',
    ],
  },

  {
    path: '/admin/partners',
    title: 'Admin Partner Management',
    visibility: 'private',
    summary:
      'Internal partner relationship management.',
    topics: [
      'partners',
      'admin',
    ],
  },

  {
    path: '/admin/popup',
    title: 'Admin Popup Manager',
    visibility: 'private',
    summary:
      'Internal popup creation, scheduling, targeting, and activation management.',
    topics: [
      'popup',
      'announcements',
      'targeting',
      'admin',
    ],
  },

  {
    path: '/admin/sellers',
    title: 'Admin Seller Management',
    visibility: 'private',
    summary:
      'Internal seller application review, screening, approval, invitation, and seller management.',
    topics: [
      'seller applications',
      'seller screening',
      'seller approvals',
      'admin',
    ],
  },

  {
    path: '/admin/settings',
    title: 'Admin Settings',
    visibility: 'private',
    summary:
      'Internal administrative settings.',
    topics: [
      'settings',
      'admin',
    ],
  },

  {
    path: '/admin/settings/business',
    title: 'Business Settings',
    visibility: 'private',
    summary:
      'Internal business/company settings.',
    topics: [
      'business settings',
      'company information',
      'admin',
    ],
  },

  {
    path: '/admin/suppliers',
    title: 'Admin Supplier Management',
    visibility: 'private',
    summary:
      'Internal supplier/contact management tools.',
    topics: [
      'suppliers',
      'admin',
    ],
  },

  {
    path: '/admin/tickets',
    title: 'Admin Ticket Management',
    visibility: 'private',
    summary:
      'Internal support ticket management.',
    topics: [
      'tickets',
      'support',
      'admin',
    ],
  },

  {
    path: '/admin/users',
    title: 'Admin User Management',
    visibility: 'private',
    summary:
      'Internal user/account administration.',
    topics: [
      'users',
      'accounts',
      'admin',
    ],
  },

  {
    path: '/admin/pagesmanager',
    title: 'Admin Page Manager',
    visibility: 'private',
    summary:
      'Internal page availability manager used to inspect public routes, configure dedicated-page maintenance, schedule maintenance, manage page notices/popups, inspect failures, and control site availability.',
    topics: [
      'page maintenance',
      'scheduled maintenance',
      'full-site maintenance',
      'popup management',
      'page health',
      'admin',
    ],
  },
];

export const PUBLIC_SITE_KNOWLEDGE =
  AURONIX_SITE_KNOWLEDGE.filter(
    (entry) =>
      entry.visibility ===
      'public'
  );

export const PRIVATE_SITE_KNOWLEDGE =
  AURONIX_SITE_KNOWLEDGE.filter(
    (entry) =>
      entry.visibility ===
      'private'
  );

export function getPageKnowledge(
  pathname: string
) {
  const exact =
    AURONIX_SITE_KNOWLEDGE.find(
      (entry) =>
        entry.path === pathname
    );

  if (exact) {
    return exact;
  }

  const dynamicBlog =
    pathname.startsWith(
      '/blog/'
    );

  if (dynamicBlog) {
    return (
      AURONIX_SITE_KNOWLEDGE.find(
        (entry) =>
          entry.path ===
          '/blog/[slug]'
      ) || null
    );
  }

  const dynamicActivation =
    pathname.startsWith(
      '/seller/activate/'
    );

  if (dynamicActivation) {
    return (
      AURONIX_SITE_KNOWLEDGE.find(
        (entry) =>
          entry.path ===
          '/seller/activate/[token]'
      ) || null
    );
  }

  const dynamicSellerDashboard =
    pathname.startsWith(
      '/seller/dashboard'
    );

  if (dynamicSellerDashboard) {
    return (
      AURONIX_SITE_KNOWLEDGE.find(
        (entry) =>
          entry.path ===
          '/seller/dashboard'
      ) || null
    );
  }

  const dynamicAdmin =
    pathname.startsWith(
      '/admin/'
    );

  if (dynamicAdmin) {
    return {
      path: pathname,
      title:
        'Internal Administration Page',
      visibility:
        'private' as const,
      summary:
        'An internal Auronix administration route.',
      topics: [
        'internal administration',
      ],
    };
  }

  return null;
}

export function buildSiteKnowledgeText() {
  return PUBLIC_SITE_KNOWLEDGE
    .map(
      (entry) => {
        const actions =
          entry.actions?.length
            ? `\nActions: ${entry.actions.join(
                ', '
              )}`
            : '';

        const related =
          entry.related?.length
            ? `\nRelated routes: ${entry.related.join(
                ', '
              )}`
            : '';

        return [
          `ROUTE: ${entry.path}`,
          `TITLE: ${entry.title}`,
          `SUMMARY: ${entry.summary}`,
          `TOPICS: ${entry.topics.join(
            ', '
          )}`,
          actions,
          related,
        ]
          .filter(
            Boolean
          )
          .join(
            '\n'
          );
      }
    )
    .join(
      '\n\n---\n\n'
    );
}
