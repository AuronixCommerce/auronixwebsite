'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { NAV_LINKS } from '@/lib/constants';
import { MobileMenu } from './mobile-menu';
import { ArrowRight, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);

    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/60 h-14'
            : 'bg-transparent border-b border-transparent h-16'
        )}
      >
        <div className="max-w-7xl mx-auto h-full px-5 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group shrink-0"
            aria-label="Auronix Commerce LLC home"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm tracking-tight">
                  A
                </span>
              </div>

              <div className="flex flex-col leading-none">
                <span className="text-[13px] font-semibold tracking-tight text-foreground">
                  AURONIX
                </span>

                <span className="text-[9px] font-medium tracking-[0.15em] text-foreground-muted uppercase">
                  Commerce LLC
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden lg:flex items-center gap-1"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative px-3 py-2 text-[13px] font-medium transition-colors rounded-md',
                    active
                      ? 'text-foreground'
                      : 'text-foreground-muted hover:text-foreground'
                  )}
                >
                  {link.label}

                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-x-3 -bottom-px h-px bg-foreground"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/become-a-supplier"
              className="text-[13px] font-medium text-foreground-muted hover:text-foreground px-3 py-2 transition-colors"
            >
              Become a Supplier
            </Link>

            <Link
              href="/contact"
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Partner With Us

              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 -mr-2 text-foreground"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  );
}