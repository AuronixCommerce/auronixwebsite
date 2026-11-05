'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { NAV_LINKS } from '@/lib/constants';

export function FloatingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <header className={`fph-header${scrolled ? ' is-scrolled' : ''}`} aria-label="Primary">
        <div className="fph-inner">
          <Link href="/" className="fph-logo">
            <span className="fph-logo-mark">A</span>
            <span className="fph-logo-text">AURONIX</span>
          </Link>
          <nav className="fph-nav" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="fph-link">{link.label}</Link>
            ))}
          </nav>
          <div className="fph-actions">
            <Link href="/contact" className="fph-cta">
              Partner With Us <ArrowUpRight className="fph-cta-arrow" size={14} />
            </Link>
            <button type="button" className="fph-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div key="mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="fph-mobile">
            <div className="fph-mobile-inner">
              {NAV_LINKS.map((link, i) => (
                <motion.div key={link.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                  <Link href={link.href} className="fph-mobile-link" onClick={() => setOpen(false)}>{link.label}</Link>
                </motion.div>
              ))}
              <Link href="/contact" className="fph-mobile-cta" onClick={() => setOpen(false)}>Partner With Us <ArrowUpRight size={16} /></Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
