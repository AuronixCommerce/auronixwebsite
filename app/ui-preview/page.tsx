import { notFound } from 'next/navigation';
import { InterfacePreview } from '@/components/design/interface-preview';
export default function PreviewPage(){if(process.env.NODE_ENV!=='development')notFound();return <InterfacePreview/>;}
