'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Menu, Search } from 'lucide-react';
import { AuronixMark } from './auronix-mark';
import { MobileMenu } from './mobile-menu';
import { ThemeToggle } from './theme-toggle';
import { NAV_GROUPS, pageFor } from '@/lib/design/navigation';
import { openSearch } from '@/components/design/search-trigger';
export function MegaMenu({group,onClose}:{group:(typeof NAV_GROUPS)[number];onClose:()=>void}) {
 return <div className="ax-mega" id={`menu-${group.title}`}><div><span className="ax-kicker">EXPLORE {group.title}</span><h2>Make your next connection.</h2><p>{group.note}</p><Link href="/contact" onClick={onClose}>Talk to Auronix <ArrowUpRight size={16}/></Link></div><div className="ax-mega-links">{group.paths.map(path=>{const page=pageFor(path);return page&&<Link key={path} href={path} onClick={onClose}><span><strong>{page.title}</strong><small>{page.category}</small></span><ArrowUpRight size={16}/></Link>})}</div></div>;
}
export function Header() {
 const pathname=usePathname(); const [mobile,setMobile]=useState(false); const [menu,setMenu]=useState<string|null>(null); const header=useRef<HTMLElement>(null);
 useEffect(()=>{setMenu(null);setMobile(false)},[pathname]);
 useEffect(()=>{if(!menu)return; const close=(e:PointerEvent)=>{if(!header.current?.contains(e.target as Node))setMenu(null)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){header.current?.querySelector<HTMLButtonElement>(`[aria-controls="menu-${menu}"]`)?.focus();setMenu(null)}}; document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key)}},[menu]);
 return <><header ref={header} className="ax-header" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setMenu(null)}}><div className="ax-wrap ax-nav"><Link href="/" className="ax-brand" aria-label="Auronix Commerce LLC"><AuronixMark/><span>Auronix<small>COMMERCE LLC</small></span></Link><nav aria-label="Main navigation" className="ax-desktop-nav"><Link href="/solutions" aria-current={pathname==='/solutions'?'page':undefined}>Solutions</Link><Link href="/portfolio" aria-current={pathname==='/portfolio'?'page':undefined}>Products</Link>{['Company','Resources'].map(title=><button type="button" key={title} aria-expanded={menu===title} aria-controls={`menu-${title}`} onClick={()=>setMenu(menu===title?null:title)}>{title}<ChevronDown size={13}/></button>)}</nav><div className="ax-nav-actions"><button type="button" className="ac-icon-button" aria-label="Search Auronix" onClick={()=>{setMenu(null);openSearch()}}><Search size={18}/></button><ThemeToggle/><Link href="/partner-portal" className="ax-sign-in">Sign in</Link><Link href="/supplier" className="ax-btn ax-header-apply">Become a supplier <ArrowUpRight size={15}/></Link><button type="button" className="ac-icon-button ax-mobile-toggle" aria-label="Open navigation" onClick={()=>setMobile(true)}><Menu size={23}/></button></div></div>{menu&&<MegaMenu group={NAV_GROUPS.find(g=>g.title===menu)!} onClose={()=>setMenu(null)}/>}</header><MobileMenu open={mobile} onClose={()=>setMobile(false)}/></>;
}
export default Header;
