export const NAV_LINKS = [
  { label: 'Solutions', href: '/solutions' },
  { label: 'Our Process', href: '/our-process' },
  { label: 'Why Auronix', href: '/why-work-with-us' },
  { label: 'Marketplace', href: '/marketplace-expertise' },
  { label: 'Partners', href: '/partners' },
  { label: 'Company', href: '/about' },
] as const;

export const FOOTER_NAV = {
  Solutions: [
    { label: 'Supplier Partnerships', href: '/solutions' },
    { label: 'Procurement', href: '/solutions' },
    { label: 'Marketplace Operations', href: '/solutions' },
    { label: 'Distribution', href: '/solutions' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Company Verification', href: '/company-verification' },
    { label: 'Contact', href: '/contact' },
    { label: 'Support', href: '/support' },
  ],
  Partner: [
    { label: 'Become a Supplier', href: '/supplier' },
    { label: 'Partner Portal', href: '/partner-portal' },
  ],
  Legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Disclaimer', href: '/disclaimer' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
  ],
} as const;

export const COMPANY = {
  name: 'Auronix Commerce LLC',
  shortName: 'Auronix',
  description:
    'A modern commerce company focused on procurement, supplier relationships, distribution, and marketplace operations.',
  email: 'business@auronixcommerce.com',
  phone: '',
  website: 'https://auronixcommerce.com',
};

export const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Discover',
    description:
      'We identify supplier opportunities, evaluate market demand, and map the product landscape to find where value can be created.',
  },
  {
    number: '02',
    title: 'Evaluate',
    description:
      'Each opportunity is assessed for quality, reliability, margin potential, and marketplace fit before any commitment is made.',
  },
  {
    number: '03',
    title: 'Source',
    description:
      'We establish supplier relationships, negotiate terms, and build the procurement pipeline that supports long-term operations.',
  },
  {
    number: '04',
    title: 'Launch',
    description:
      'Products are prepared, listed, and positioned across the right marketplaces with optimized listings and pricing.',
  },
  {
    number: '05',
    title: 'Optimize',
    description:
      'We monitor performance, adjust strategy, and continuously refine operations to improve results over time.',
  },
] as const;

export const PROCESS_STEPS_FULL = [
  {
    number: '01',
    title: 'Discover',
    description:
      'We begin by identifying supplier opportunities and evaluating market demand. This phase is about understanding where value can be created â€” which products, which categories, and which marketplaces present the strongest opportunity.',
  },
  {
    number: '02',
    title: 'Evaluate',
    description:
      'Every opportunity is assessed against our quality standards, reliability criteria, and margin expectations. We look at supplier capability, product viability, and marketplace fit before making any commitment.',
  },
  {
    number: '03',
    title: 'Source',
    description:
      'Once an opportunity passes evaluation, we establish the supplier relationship. We negotiate terms, set quality expectations, and build the procurement pipeline that will support ongoing operations.',
  },
  {
    number: '04',
    title: 'Prepare',
    description:
      'Products are prepared for the marketplace. This includes catalog development, listing optimization, pricing strategy, and inventory coordination â€” everything needed for a successful launch.',
  },
  {
    number: '05',
    title: 'Launch',
    description:
      'Products go live across the right marketplaces with optimized listings, competitive positioning, and the operational infrastructure to support them.',
  },
  {
    number: '06',
    title: 'Optimize',
    description:
      'After launch, we monitor performance closely. We adjust pricing, refine listings, and respond to marketplace dynamics to improve visibility, conversion, and profitability.',
  },
  {
    number: '07',
    title: 'Scale',
    description:
      'Successful products are scaled â€” expanded to additional marketplaces, supported with deeper inventory, and built into long-term revenue streams.',
  },
] as const;

export const CAPABILITIES = [
  {
    icon: 'Search',
    title: 'Procurement',
    description:
      'Strategic sourcing that connects quality suppliers with the right market opportunities, backed by disciplined evaluation and relationship management.',
  },
  {
    icon: 'Store',
    title: 'Marketplace Operations',
    description:
      'End-to-end management of marketplace presence â€” from listing creation and optimization to performance monitoring and competitive positioning.',
  },
  {
    icon: 'Handshake',
    title: 'Supplier Partnerships',
    description:
      'Long-term relationships built on transparency, quality expectations, and mutual growth â€” not transactional, one-off deals.',
  },
  {
    icon: 'Truck',
    title: 'Distribution',
    description:
      'Coordinated logistics and inventory management that ensures products move efficiently from supplier to marketplace to customer.',
  },
] as const;

export const WHY_AURONIX = [
  {
    title: 'Focused Procurement',
    description:
      'We do not try to be everything. We focus on specific categories and marketplaces where we can build real expertise and deliver consistent results.',
  },
  {
    title: 'Marketplace Expertise',
    description:
      'Deep understanding of how marketplaces work â€” what drives visibility, what converts, and what sustains long-term performance.',
  },
  {
    title: 'Operational Discipline',
    description:
      'Every decision is grounded in process, not guesswork. We measure, we refine, and we hold ourselves to a high standard.',
  },
  {
    title: 'Long-Term Partnerships',
    description:
      'We invest in relationships that last. Suppliers and partners who work with us can expect consistency, communication, and shared goals.',
  },
  {
    title: 'Quality-First Thinking',
    description:
      'Quality is not an afterthought. It is built into how we evaluate, source, and operate â€” because quality is what sustains marketplace performance.',
  },
  {
    title: 'Structured Processes',
    description:
      'From discovery to optimization, every phase of our work follows a defined process. This is how we deliver repeatable, reliable outcomes.',
  },
] as const;

export const SOLUTIONS = [
  {
    icon: 'Handshake',
    title: 'Supplier Partnerships',
    description:
      'We build structured relationships with suppliers who can consistently deliver quality products. Our approach prioritizes long-term alignment over short-term transactions.',
    points: ['Supplier evaluation', 'Quality standards', 'Relationship management', 'Performance tracking'],
  },
  {
    icon: 'Search',
    title: 'Procurement',
    description:
      'Strategic sourcing that identifies the right products from the right suppliers at the right terms. Every procurement decision is grounded in market research and quality assessment.',
    points: ['Market research', 'Supplier vetting', 'Term negotiation', 'Pipeline management'],
  },
  {
    icon: 'Store',
    title: 'Marketplace Operations',
    description:
      'Full management of marketplace presence â€” from listing creation and optimization to ongoing performance monitoring and competitive positioning.',
    points: ['Listing optimization', 'Performance monitoring', 'Competitive analysis', 'Review management'],
  },
  {
    icon: 'FileText',
    title: 'Catalog & Product Operations',
    description:
      'We handle the details that make products sell â€” catalog structure, product data, imagery guidance, and listing quality across every channel.',
    points: ['Catalog structure', 'Product data management', 'Listing quality', 'Content optimization'],
  },
  {
    icon: 'Truck',
    title: 'Distribution',
    description:
      'Coordinated logistics that move products efficiently from supplier to marketplace to customer. We manage the flow so products are where they need to be.',
    points: ['Inventory coordination', 'Logistics planning', 'Stock management', 'Fulfillment alignment'],
  },
  {
    icon: 'TrendingUp',
    title: 'E-commerce Strategy',
    description:
      'Strategic guidance on where to sell, how to position, and how to grow. We help shape the direction of marketplace operations for sustainable results.',
    points: ['Channel strategy', 'Pricing strategy', 'Growth planning', 'Performance analysis'],
  },
] as const;

export const WHY_WORK = [
  {
    title: 'Professional Communication',
    description:
      'Clear, timely, and respectful communication is the foundation of every partnership. You will always know where things stand.',
  },
  {
    title: 'Quality-First Thinking',
    description:
      'We never compromise on quality for short-term gain. Every product, every listing, every decision is held to a high standard.',
  },
  {
    title: 'Structured Operations',
    description:
      'Our processes are documented, repeatable, and transparent. You can trust that work is being done the right way, every time.',
  },
  {
    title: 'Marketplace Knowledge',
    description:
      'We understand how marketplaces work â€” the algorithms, the competition, the customer behavior â€” and we use that knowledge to your advantage.',
  },
  {
    title: 'Operational Discipline',
    description:
      'We measure what matters, we refine what is not working, and we hold ourselves accountable to the results.',
  },
  {
    title: 'Long-Term Relationships',
    description:
      'We are not interested in one-off transactions. We invest in partnerships that grow over time and create value for everyone involved.',
  },
] as const;

export const MARKETPLACE_EXPERTISE = [
  {
    title: 'Product Selection',
    description:
      'Choosing the right products is the most important decision in marketplace commerce. We evaluate demand, competition, margin potential, and supplier reliability before committing to any category.',
  },
  {
    title: 'Catalog Preparation',
    description:
      'A well-prepared catalog drives sales. We handle product data, descriptions, imagery guidance, and listing structure to ensure every product is positioned to convert.',
  },
  {
    title: 'Marketplace Operations',
    description:
      'Day-to-day management of marketplace presence â€” monitoring listings, responding to changes, managing reviews, and keeping operations running smoothly.',
  },
  {
    title: 'Pricing & Positioning',
    description:
      'Pricing strategy that balances competitiveness with margin. We monitor the landscape and adjust positioning to maintain visibility and profitability.',
  },
  {
    title: 'Inventory Coordination',
    description:
      'Keeping the right products in stock at the right time. We coordinate with suppliers and marketplaces to prevent stockouts and overstock situations.',
  },
  {
    title: 'Performance Optimization',
    description:
      'Continuous improvement based on data. We track what is working, identify what is not, and refine our approach to drive better results over time.',
  },
] as const;

export const PARTNER_CATEGORIES = [
  'Brands',
  'Manufacturers',
  'Distributors',
  'Wholesalers',
  'Suppliers',
  'Marketplace Businesses',
] as const;

export const CONTACT_CATEGORIES = [
  'Supplier Partnership',
  'Brand Partnership',
  'Wholesale',
  'Marketplace',
  'General Inquiry',
  'Support',
] as const;

export const TICKET_CATEGORIES = [
  'Account',
  'Billing',
  'Technical',
  'Partnership',
  'General',
] as const;

export const DISTRIBUTION_MODELS = [
  'Direct from Manufacturer',
  'Wholesale Distributor',
  'Drop Ship',
  'Third-Party Fulfillment',
  'Other',
] as const;

export const BUSINESS_TYPES = [
  'Manufacturer',
  'Distributor',
  'Wholesaler',
  'Brand',
  'Retailer',
  'Service Provider',
  'Other',
] as const;

export const SELLER_STATUSES = [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'invited',
  'active',
  'suspended',
  'archived',
] as const;

export const ADMIN_NAV = [
  { label: 'Overview', href: '/admin', icon: 'LayoutDashboard' },
  { label: 'Seller Applications', href: '/admin/sellers', icon: 'UserCheck' },
  { label: 'Supplier Submissions', href: '/admin/suppliers', icon: 'Package' },
  { label: 'Contact Messages', href: '/admin/contact', icon: 'Mail' },
  { label: 'Tickets', href: '/admin/tickets', icon: 'Ticket' },
  { label: 'Blog', href: '/admin/blog', icon: 'FileText' },
  { label: 'FAQs', href: '/admin/faqs', icon: 'HelpCircle' },
  { label: 'Careers', href: '/admin/careers', icon: 'Briefcase' },
  { label: 'Partners', href: '/admin/partners', icon: 'Users' },
  { label: 'Legal', href: '/admin/legal', icon: 'Scale' },
  { label: 'AI', href: '/admin/ai', icon: 'Sparkles' },
  { label: 'Business Information', href: '/admin/settings/business', icon: 'Building2' },
  { label: 'Users', href: '/admin/users', icon: 'UsersRound' },
  { label: 'Audit Logs', href: '/admin/audit', icon: 'ScrollText' },
  { label: 'Security', href: '/admin/security', icon: 'ShieldCheck' },
  { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
] as const;

export const DEFAULT_COMPANY_INFO = {
  companyName: 'Auronix Commerce LLC',
  tagline: 'Powering the next generation of commerce.',
  publicEmail: 'auronixcommerce@gmail.com',
  supportEmail: '',
  phone: '',
  whatsapp: '',
  businessAddress: '',
  country: 'United States',
  website: 'https://auronixcommerce.com',
  linkedin: '',
  instagram: '',
  facebook: '',
  x: '',
  footerDescription:
    'A modern commerce company focused on procurement, supplier relationships, distribution, and marketplace operations.',
  legalName: 'Auronix Commerce LLC',
};

export const DEFAULT_AI_SETTINGS = {
  chatEnabled: true,
  ticketAssistantEnabled: true,
  autoResponseEnabled: false,
  model: 'llama-3.3-70b-versatile',
  maxResponseLength: 500,
  welcomeMessage:
    "Hi! I'm the Auronix assistant. How can I help you with supplier applications, partnerships, or marketplace operations today?",
  supportContext:
    'Auronix Commerce LLC is a U.S. commerce technology company specializing in procurement, supplier relationships, distribution, and marketplace operations. We connect quality suppliers, brands, and online marketplaces.',
  systemInstructions: `You are the Auronix Commerce LLC virtual assistant. Help users understand approved information about Auronix Commerce LLC, supplier applications, seller applications, partnerships, procurement, marketplace operations, FAQs, and support. Never invent company facts. Never invent statistics. Never claim an official relationship with a marketplace or brand unless the approved Auronix data explicitly confirms it. Never approve or reject an account. Never make legal, tax, financial, or regulatory decisions. Never promise an action the system has not actually completed. When the required answer is unavailable, say so clearly. Be concise, professional, friendly, and useful. Escalate to support when a human is required.`,
};
