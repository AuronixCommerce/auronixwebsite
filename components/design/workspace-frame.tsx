'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode, type ElementType } from 'react';
import { LogOut, Menu, ArrowUpRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AuronixMark } from '@/components/site/auronix-mark';
import { ThemeToggle } from '@/components/site/theme-toggle';
import { WorkspaceNav } from './workspace-nav';
type Item = { label: string; href: string; icon: ElementType; badge?: ReactNode };
export function WorkspaceFrame({ title, email, items, onSignOut, children }: { title: 'Admin' | 'Seller'; email?: string; items: Item[]; onSignOut: () => Promise<void>; children: ReactNode }) {
  const pathname = usePathname(); const [open, setOpen] = useState(false);
  const active = [...items].sort((a,b)=>b.href.length-a.href.length).find(i=>pathname===i.href || (i.href!=='/admin' && i.href!=='/seller/dashboard' && pathname?.startsWith(`${i.href}/`)));
  const links = <nav className="ac-workspace-links" aria-label={`${title} navigation`}>{items.map(({icon:Icon,...item})=><Link key={item.href} href={item.href} aria-label={item.label} title={item.label} aria-current={active?.href===item.href?'page':undefined} onClick={()=>setOpen(false)}><Icon size={19}/><span>{item.label}</span>{item.badge}</Link>)}</nav>;
  return <div className={`ac-workspace ac-admin-shell ${title==='Seller'?'ac-seller-shell':''}`}>
    <aside className="ac-workspace-sidebar"><Link className="ac-workspace-brand" href="/"><AuronixMark/><span>AURONIX<small>{title==='Admin'?'Operations':'Seller workspace'}</small></span></Link>{links}<div className="ac-workspace-account"><span title={email}>{email}</span><button onClick={onSignOut}><LogOut size={18}/>Sign out</button><Link href="/">Visit website <ArrowUpRight size={16}/></Link></div></aside>
    <main className="ac-workspace-main"><header className="ac-workspace-toolbar"><div className="ac-workspace-location"><button className="ac-icon-button ac-workspace-menu" aria-label={`Open ${title} navigation`} onClick={()=>setOpen(true)}><Menu size={21}/></button><span>{title} / <strong>{active?.label || 'Workspace'}</strong></span></div><div className="ac-workspace-tools"><WorkspaceNav items={items} title={title}/><ThemeToggle/></div></header><div className="ac-workspace-content">{children}</div></main>
    <nav className="ac-workspace-dock" aria-label="Quick navigation">{items.filter((_,i)=>title==='Seller'?[0,2,3,5].includes(i):[0,1,2].includes(i)).map(({icon:Icon,...item})=><Link key={item.href} href={item.href} aria-current={active?.href===item.href?'page':undefined}><Icon size={21}/><span>{item.label}</span></Link>)}<button onClick={()=>setOpen(true)}><Menu size={21}/><span>More</span></button></nav>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="ac-workspace-sheet"><DialogTitle>{title} workspace</DialogTitle><DialogDescription>Choose where you want to work.</DialogDescription>{links}<button className="ac-button ac-button-secondary" onClick={onSignOut}><LogOut size={17}/>Sign out</button></DialogContent></Dialog>
  </div>;
}
