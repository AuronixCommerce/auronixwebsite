'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { NAV_LINKS } from '@/lib/constants';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex items-center justify-between h-16 px-5 border-b border-border">
              <Link href="/" onClick={onClose} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">A</span>
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[13px] font-semibold tracking-tight">AURONIX</span>
                  <span className="text-[9px] font-medium tracking-[0.15em] text-foreground-muted uppercase">
                    Commerce LLC
                  </span>
                </div>
              </Link>
              <button onClick={onClose} aria-label="Close menu" className="p-2 -mr-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <motion.nav
              className="flex flex-col px-5 py-6"
              initial="closed"
              animate="open"
              variants={{
                open: {
                  transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05, delayChildren: 0.1 },
                },
                closed: {},
              }}
            >
              {NAV_LINKS.map((link) => (
                <motion.div
                  key={link.href}
                  variants={{
                    closed: { opacity: 0, x: -20 },
                    open: { opacity: 1, x: 0 },
                  }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="flex items-center justify-between py-4 text-2xl font-semibold tracking-tight text-foreground border-b border-border/50"
                  >
                    {link.label}
                    <ArrowRight className="w-5 h-5 text-foreground-muted" />
                  </Link>
                </motion.div>
              ))}

              <motion.div
                className="flex flex-col gap-3 mt-8"
                variants={{
                  closed: { opacity: 0 },
                  open: { opacity: 1 },
                }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.3, delay: 0.4 }}
              >
                <Link
                  href="/become-a-supplier"
                  onClick={onClose}
                  className="text-center rounded-full border border-border px-5 py-3 text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Become a Supplier
                </Link>
                <Link
                  href="/contact"
                  onClick={onClose}
                  className="text-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
                >
                  Partner With Us
                </Link>
              </motion.div>
            </motion.nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
