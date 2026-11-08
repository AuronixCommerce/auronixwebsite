import { cn } from '@/lib/utils';
/** The original Auronix ring, displayed directly from the existing brand artwork. */
export function AuronixMark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('ax-mark ax-signature-mark',className)}><svg viewBox="416 198 419 432" focusable="false"><image href="/auronix-signature.jpeg" width="1254" height="1254"/></svg></span>;
}
