import { buildNoIndexSeo } from '@/lib/seo';
export const metadata = buildNoIndexSeo('Track your seller application', 'Securely view your seller application progress and respond to review requests.', '/seller/application/track');
export default function TrackingLayout({ children }: { children: React.ReactNode }) { return children; }
