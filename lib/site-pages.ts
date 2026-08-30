export type SitePageDefinition = {
  id: string;
  path: string;
  title: string;
  category:
    | 'Main'
    | 'Company'
    | 'Commerce'
    | 'Partners'
    | 'Seller'
    | 'Support'
    | 'Legal';
  section:
    | 'main'
    | 'company'
    | 'commerce'
    | 'partners'
    | 'seller'
    | 'support'
    | 'legal';
};

export const SITE_PAGES: SitePageDefinition[] = [
  {
    id: 'home',
    path: '/',
    title: 'Homepage',
    category: 'Main',
    section: 'main',
  },
  {
    id: 'about',
    path: '/about',
    title: 'About',
    category: 'Company',
    section: 'company',
  },
  {
    id: 'our-process',
    path: '/our-process',
    title: 'Our Process',
    category: 'Company',
    section: 'company',
  },
  {
    id: 'why-work-with-us',
    path: '/why-work-with-us',
    title: 'Why Work With Us',
    category: 'Company',
    section: 'company',
  },
  {
    id: 'company-verification',
    path: '/company-verification',
    title: 'Company Verification',
    category: 'Company',
    section: 'company',
  },
  {
    id: 'careers',
    path: '/careers',
    title: 'Careers',
    category: 'Company',
    section: 'company',
  },
  {
    id: 'marketplace-expertise',
    path: '/marketplace-expertise',
    title: 'Marketplace Expertise',
    category: 'Commerce',
    section: 'commerce',
  },
  {
    id: 'services',
    path: '/services',
    title: 'Services',
    category: 'Commerce',
    section: 'commerce',
  },
  {
    id: 'solutions',
    path: '/solutions',
    title: 'Solutions',
    category: 'Commerce',
    section: 'commerce',
  },
  {
    id: 'portfolio',
    path: '/portfolio',
    title: 'Portfolio',
    category: 'Commerce',
    section: 'commerce',
  },
  {
    id: 'contact',
    path: '/contact',
    title: 'Contact',
    category: 'Support',
    section: 'support',
  },
  {
    id: 'support',
    path: '/support',
    title: 'Support',
    category: 'Support',
    section: 'support',
  },
  {
    id: 'faq',
    path: '/faq',
    title: 'FAQ',
    category: 'Support',
    section: 'support',
  },
  {
    id: 'help',
    path: '/help',
    title: 'Help Center',
    category: 'Support',
    section: 'support',
  },
  {
    id: 'partner-portal',
    path: '/partner-portal',
    title: 'Partner Portal',
    category: 'Partners',
    section: 'partners',
  },
  {
    id: 'become-a-supplier',
    path: '/become-a-supplier',
    title: 'Become a Supplier',
    category: 'Partners',
    section: 'partners',
  },
  {
    id: 'supplier',
    path: '/supplier',
    title: 'Supplier',
    category: 'Partners',
    section: 'partners',
  },
  {
    id: 'seller',
    path: '/seller',
    title: 'Seller Hub',
    category: 'Seller',
    section: 'seller',
  },
  {
    id: 'seller-apply',
    path: '/seller/apply',
    title: 'Seller Application',
    category: 'Seller',
    section: 'seller',
  },
  {
    id: 'seller-policy',
    path: '/seller/policy',
    title: 'Seller Policy',
    category: 'Seller',
    section: 'seller',
  },
  {
    id: 'privacy',
    path: '/privacy',
    title: 'Privacy Policy',
    category: 'Legal',
    section: 'legal',
  },
  {
    id: 'terms',
    path: '/terms',
    title: 'Terms of Service',
    category: 'Legal',
    section: 'legal',
  },
  {
    id: 'disclaimer',
    path: '/disclaimer',
    title: 'Disclaimer',
    category: 'Legal',
    section: 'legal',
  },
  {
    id: 'cookies',
    path: '/cookie-policy',
    title: 'Cookie Policy',
    category: 'Legal',
    section: 'legal',
  },
];

export function findSitePage(
  path: string
) {
  return SITE_PAGES.find(
    (page) => page.path === path
  );
}
