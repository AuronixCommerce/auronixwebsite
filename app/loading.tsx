import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="ac-page-skeleton" aria-busy="true" aria-label="Loading page">
      <span className="sr-only">Loading page</span>
      <div className="ac-page-skeleton-copy">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-12 w-full max-w-2xl" />
        <Skeleton className="h-5 w-full max-w-xl" />
        <Skeleton className="h-5 w-4/5 max-w-lg" />
      </div>
      <div className="ac-page-skeleton-lines">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
