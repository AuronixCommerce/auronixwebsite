'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  ArrowRight,
  Menu,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

import {
  motion,
  useMotionValue,
  useSpring,
} from 'framer-motion';

import { cn } from '@/lib/utils';
import { NAV_LINKS, SHOP_URL } from '@/lib/constants';
import { MobileMenu } from './mobile-menu';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  const pathname = usePathname();

  const [scrolled, setScrolled] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [hoveredNav, setHoveredNav] =
    useState<string | null>(null);

  const headerRef =
    useRef<HTMLElement | null>(null);

  const mouseX =
    useMotionValue(0);

  const mouseY =
    useMotionValue(0);

  const springX =
    useSpring(mouseX, {
      stiffness: 120,
      damping: 22,
      mass: 0.5,
    });

  const springY =
    useSpring(mouseY, {
      stiffness: 120,
      damping: 22,
      mass: 0.5,
    });

  useEffect(() => {
    const onScroll = () => {
      setScrolled(
        window.scrollY > 18
      );
    };

    onScroll();

    window.addEventListener(
      'scroll',
      onScroll,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        'scroll',
        onScroll
      );
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (
      event: MouseEvent
    ) => {
      const header =
        headerRef.current;

      if (!header) {
        return;
      }

      const rect =
        header.getBoundingClientRect();

      mouseX.set(
        event.clientX - rect.left
      );

      mouseY.set(
        event.clientY - rect.top
      );
    };

    window.addEventListener(
      'mousemove',
      onMouseMove,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        'mousemove',
        onMouseMove
      );
    };
  }, [mouseX, mouseY]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (
    href: string
  ) => {
    if (href === '/') {
      return pathname === '/';
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  };

  return (
    <>
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-[70] px-3 pt-3 font-sans sm:px-5 lg:px-7"
        onMouseLeave={() =>
          setHoveredNav(null)
        }
      >
        <motion.div
          style={{
            x: springX,
            y: springY,
          }}
          className="pointer-events-none absolute left-0 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.07] blur-3xl"
        />

        <motion.div
          animate={{
            scale: scrolled ? 0.985 : 1,
            y: scrolled ? -1 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 28,
          }}
          className={cn(
            'relative mx-auto max-w-7xl overflow-hidden rounded-[26px] border font-sans backdrop-blur-2xl transition-all duration-500',
            scrolled
              ? 'border-white/20 bg-background/70 shadow-[0_20px_80px_rgba(0,0,0,0.16)]'
              : 'border-white/10 bg-background/55 shadow-[0_12px_45px_rgba(0,0,0,0.09)]'
          )}
        >
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.07),transparent_25%,transparent_75%,rgba(255,255,255,0.025))]" />

          <div className="relative flex min-h-[64px] items-center justify-between px-2.5 sm:px-3">

            {/* BRAND */}
            <Link
              href="/"
              aria-label="Auronix Commerce LLC"
              className="flex min-w-0 items-center gap-2.5 rounded-2xl px-2 py-1.5 font-sans"
            >
              <motion.div
                whileHover={{
                  scale: 1.06,
                  rotate: -2,
                }}
                whileTap={{
                  scale: 0.95,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 20,
                }}
                className="relative shrink-0"
              >
                <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-zinc-950 shadow-[0_8px_30px_rgba(0,0,0,0.22)] dark:border-black/10 dark:bg-white sm:h-11 sm:w-11">
                  <motion.div
                    animate={{
                      scale: [
                        0.92,
                        1,
                        0.92,
                      ],
                      opacity: [
                        0.82,
                        1,
                        0.82,
                      ],
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="h-4 w-4 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.45)] dark:bg-zinc-950 dark:shadow-[0_0_18px_rgba(0,0,0,0.22)] sm:h-[17px] sm:w-[17px]"
                  />

                  <motion.div
                    initial={{
                      x: '-160%',
                    }}
                    animate={{
                      x: '170%',
                    }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      repeatDelay: 4.5,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-y-[-30%] w-1/3 rotate-[20deg] bg-white/30 blur-[8px]"
                  />
                </div>
              </motion.div>

              {/* IMPORTANT:
                  visible on mobile too */}
              <div className="min-w-0 font-sans leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-sans text-[11px] font-extrabold tracking-[0.08em] sm:text-[13px]">
                    AURONIX
                  </span>

                  <Sparkles className="h-3 w-3 shrink-0 text-accent opacity-80" />
                </div>

                <div className="mt-1 truncate font-sans text-[7px] font-semibold uppercase tracking-[0.22em] text-foreground-muted sm:text-[8px]">
                  COMMERCE LLC
                </div>
              </div>
            </Link>

            {/* DESKTOP NAV */}
            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 xl:block"
              aria-label="Main navigation"
            >
            <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.025] p-1">
                {NAV_LINKS.map(
                  (link) => {
                    const active =
                      isActive(
                        link.href
                      );

                    return (
                      <Link
                        key={
                          link.href
                        }
                        href={
                          link.href
                        }
                        onMouseEnter={() =>
                          setHoveredNav(
                            link.href
                          )
                        }
                        className={cn(
                          'relative rounded-full px-4 py-2.5 font-sans text-[12px] font-semibold transition-colors duration-300',
                          active
                            ? 'text-foreground'
                            : 'text-foreground-muted hover:text-foreground'
                        )}
                      >
                        {hoveredNav ===
                          link.href &&
                          !active && (
                            <motion.div
                              layoutId="nav-hover"
                              className="absolute inset-0 rounded-full bg-white/[0.055]"
                              transition={{
                                type:
                                  'spring',
                                stiffness:
                                  500,
                                damping:
                                  32,
                              }}
                            />
                          )}

                        {active && (
                          <motion.div
                            layoutId="nav-active"
                            className="absolute inset-0 rounded-full border border-white/15 bg-white/[0.10]"
                            transition={{
                              type:
                                'spring',
                              stiffness:
                                500,
                              damping:
                                34,
                            }}
                          />
                        )}

                        <span className="relative z-10 font-sans">
                          {
                            link.label
                          }
                        </span>

                        {active && (
                          <motion.span
                            layoutId="nav-underline"
                            className="absolute bottom-0 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-accent"
                          />
                        )}
                      </Link>
                    );
                  }
                )}
              </div>
            </nav>

            {/* DESKTOP ACTIONS */}
            <div className="hidden items-center gap-2 xl:flex">
              <ThemeToggle />
              <a
                href={SHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 font-sans text-[11px] font-semibold text-foreground-muted transition hover:bg-white/[0.06] hover:text-foreground"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Shop
              </a>
              <Link
                href="/supplier"
                className="rounded-full px-4 py-2.5 font-sans text-[11px] font-semibold text-foreground-muted transition hover:bg-white/[0.06] hover:text-foreground"
              >
                Become a Supplier
              </Link>

              <Link
                href="/contact"
                className="group/cta relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary px-5 py-2.5 font-sans text-[11px] font-bold text-primary-foreground shadow-[0_8px_30px_rgba(0,0,0,0.20)] transition-transform hover:-translate-y-0.5"
              >
                <span className="relative z-10 font-sans">
                  Partner With Us
                </span>

                <ArrowRight className="relative z-10 h-3.5 w-3.5" />
              </Link>
            </div>

            {/* MOBILE BUTTON */}
            <div className="flex shrink-0 items-center gap-2 xl:hidden">
              <button
                type="button"
                onClick={() =>
                  setMobileOpen(
                    true
                  )
                }
                aria-label="Open navigation"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] font-sans transition hover:bg-white/[0.10] active:scale-95"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </motion.div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() =>
          setMobileOpen(false)
        }
      />
    </>
  );
}

export default Header;
