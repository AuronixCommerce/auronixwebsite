'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { auth } from '@/lib/firebase';

export function AdminCommandPalette({ items, onOpenChange }: { items: readonly { label: string; href: string }[]; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [results, setResults] = useState<any[]>([]); const [loading, setLoading] = useState(false); const router = useRouter();
  const changeOpen = useCallback((value: boolean) => { setOpen(value); onOpenChange?.(value); if (!value) setQuery(''); }, [onOpenChange]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); changeOpen(!open); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [changeOpen, open]);
  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); return; }
    const controller = new AbortController(); const timer = window.setTimeout(async () => {
      setLoading(true);
      try { const token = await auth.currentUser?.getIdToken(); const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' }); const data = await response.json(); if (response.ok) setResults(data.results || []); }
      catch (error: any) { if (error?.name !== 'AbortError') setResults([]); }
      finally { setLoading(false); }
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [open, query]);
  const pages = useMemo(() => items.filter(item => item.label.toLowerCase().includes(query.toLowerCase())).map(item => ({ id: `page:${item.href}`, category: 'Admin pages', title: item.label, subtitle: item.href, href: item.href })), [items, query]);
  const all = [...pages, ...results];
  const groups = all.reduce<Record<string, any[]>>((value, item) => { (value[item.category] ||= []).push(item); return value; }, {});
  const choose = (href: string) => { changeOpen(false); router.push(href); };
  return <><button type="button" className="ac-search-field" aria-label="Search all admin records" onClick={() => changeOpen(true)}><Search size={17} /><span>Search everything</span><kbd>⌘K</kbd></button><Dialog open={open} onOpenChange={changeOpen}><DialogContent className="ac-admin-command"><DialogTitle className="sr-only">Admin command center</DialogTitle><DialogDescription className="sr-only">Search applications, suppliers, partners, users, tickets, and admin pages.</DialogDescription><Command shouldFilter={false} loop><CommandInput autoFocus placeholder="Search applications, suppliers, tickets, users…" value={query} onValueChange={setQuery} /><CommandList><CommandEmpty>{loading ? 'Searching Auronix…' : query.length < 2 ? 'Type at least two characters.' : 'No matching records.'}</CommandEmpty>{Object.entries(groups).map(([category, group]) => <CommandGroup key={category} heading={category}>{group.map((item: any) => <CommandItem key={item.id} value={item.id} onSelect={() => choose(item.href)}><div><strong>{item.title}</strong><p>{item.subtitle}</p></div><ArrowUpRight className="ml-auto h-4 w-4" /></CommandItem>)}</CommandGroup>)}</CommandList><footer className="ac-command-hint"><span>↑↓ Navigate</span><span>↵ Open</span><span>Esc Close</span></footer></Command></DialogContent></Dialog></>;
}
