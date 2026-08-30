'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import {
  ArrowRight,
  ArrowUpRight,
  X,
  Sparkles,
} from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';

import { NAV_LINKS } from '@/lib/constants';
import { SHOP_URL } from '@/lib/constants';
import { ThemeToggle } from './theme-toggle';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const extraLinks = [
  {
    href: SHOP_URL,
    label: 'Amazon Product Shop',
    external: true,
  },
  {
    href: '/seller',
    label: 'Seller Login or Apply',
  },
  {
    href: '/supplier',
    label: 'Become a Supplier',
  },
  {
    href: '/contact',
    label: 'Contact Us',
  },
];

export function MobileMenu({
  open,
  onClose,
}: MobileMenuProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previous =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-md"
          />

          <motion.aside
            initial={{
              opacity: 0,
              x: '100%',
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: '100%',
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="fixed right-0 top-0 z-[100] flex h-[100dvh] w-[min(92vw,430px)] flex-col overflow-hidden border-l border-white/15 bg-background/90 text-foreground shadow-[-25px_0_80px_rgba(0,0,0,0.22)] backdrop-blur-3xl"
          >
            {/* ambient light */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/[0.08] blur-3xl" />

            <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-white/70 to-transparent" />

            {/* TOP */}
            <div className="relative flex items-center justify-between border-b border-border/60 px-5 py-4">

              <Link
                href="/"
                onClick={onClose}
                className="flex items-center gap-3"
              >
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-zinc-950 shadow-[0_8px_30px_rgba(0,0,0,0.22)] dark:border-black/10 dark:bg-white"
                >
                  <motion.div
                    animate={{
                      scale: [0.92, 1, 0.92],
                      opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="h-4 w-4 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.45)] dark:bg-zinc-950 dark:shadow-[0_0_18px_rgba(0,0,0,0.22)]"
                  />

                  <motion.div
                    initial={{ x: '-150%' }}
                    animate={{ x: '160%' }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      repeatDelay: 4.5,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-y-[-30%] w-1/3 rotate-[20deg] bg-white/30 blur-[8px]"
                  />
                </motion.div>

                <div className="font-sans leading-none">
                  <div className="flex items-center gap-1.5 text-[13px] font-extrabold tracking-[0.08em]">
                    AURONIX
                    <Sparkles className="h-3 w-3 text-accent" />
                  </div>

                  <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">
                    Commerce LLC
                  </div>
                </div>
              </Link>

              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ rotate: 90, scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 20,
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] font-sans shadow-inner backdrop-blur-xl"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* NAV */}
            <div className="relative flex-1 overflow-y-auto px-5 py-6">
              <div className="mb-5 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted">
                Navigation
              </div>

              <nav className="space-y-2">
                {NAV_LINKS.map(
                  (link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{
                        opacity: 0,
                        x: 24,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay:
                          0.04 * index,
                        duration: 0.35,
                      }}
                    >
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="group flex items-center justify-between rounded-2xl border border-transparent px-4 py-4 transition-all hover:border-white/10 hover:bg-white/[0.06]"
                      >
                        <span className="font-sans text-[16px] font-bold tracking-[-0.02em]">
                          {link.label}
                        </span>

                        <ArrowUpRight className="h-4 w-4 text-foreground-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </Link>
                    </motion.div>
                  )
                )}
              </nav>

              <div className="my-7 h-px bg-border/70" />

              <div className="mb-5 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted">
                Work with us
              </div>

              <div className="space-y-2">
                {extraLinks.map(
                  (link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{
                        opacity: 0,
                        x: 24,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay:
                          0.18 +
                          index * 0.05,
                        duration: 0.35,
                      }}
                    >
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={onClose}
                          className="group flex items-center justify-between rounded-2xl border border-accent/25 bg-accent/10 px-4 py-4 transition-all hover:border-accent/40 hover:bg-accent/15"
                        >
                          <span className="font-sans text-[14px] font-semibold">
                            {link.label}
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-accent transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          onClick={onClose}
                          className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card/50 px-4 py-4 transition-all hover:bg-secondary/60"
                        >
                          <span className="font-sans text-[14px] font-semibold">
                            {link.label}
                          </span>
                          <ArrowRight className="h-4 w-4 text-foreground-muted transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                      )}
                    </motion.div>
                  )
                )}
              </div>
            </div>

            {/* BOTTOM */}
            <div className="border-t border-border/60 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <ThemeToggle className="mb-3 w-full rounded-2xl" showLabel />
              <Link
                href="/contact"
                onClick={onClose}
                className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-sans text-sm font-bold text-primary-foreground shadow-[0_12px_35px_rgba(0,0,0,0.18)] transition-transform hover:-translate-y-0.5"
              >
                Partner With Us
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <p className="mt-3 text-center font-sans text-[10px] leading-5 text-foreground-muted">
                Auronix Commerce LLC
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default MobileMenu;
