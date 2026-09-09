import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/design/breadcrumbs';
export function PageHeader({eyebrow,title,description,className}:{eyebrow?:string;title:ReactNode;description?:string;className?:string}) {return <section className={cn('ac-page-hero',className)}><div className="ac-container"><Breadcrumbs/><div className="ac-page-hero-grid"><div><span className="ac-eyebrow">{eyebrow}</span><h1>{title}</h1></div>{description&&<p>{description}</p>}</div></div></section>;}
export const PageHero=PageHeader;
