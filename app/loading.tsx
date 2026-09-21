import { Spinner } from '@/components/design/primitives';

export default function Loading() {
  return <div className="ac-page-loading" aria-busy="true"><Spinner className="w-8 h-8" label="Loading page"/></div>;
}
