import { Spinner } from '@/components/design/primitives';
import { Skeleton } from '@/components/ui/skeleton';
export default function Loading(){return <div className="ac-container py-16" aria-busy="true"><div className="flex items-center gap-3 mb-10"><Spinner/><span>Loading…</span></div><Skeleton className="h-14 w-3/4 max-w-xl mb-5"/><Skeleton className="h-5 w-full max-w-lg mb-16"/><div className="grid gap-6 sm:grid-cols-2"><Skeleton className="h-64 rounded-3xl"/><Skeleton className="h-64 rounded-3xl"/></div></div>;}
