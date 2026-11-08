import { cn } from '@/lib/utils';
export function AuronixMark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('ax-mark', className)}><svg viewBox="0 0 36 36" fill="none"><path d="M18 5 32 30h-8.1L18 19.2 12.1 30H4L18 5Z" fill="currentColor"/><path d="m18 19.2 5.9 10.8h-11.8L18 19.2Z" fill="currentColor" opacity=".3"/></svg></span>;
}
