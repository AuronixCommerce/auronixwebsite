"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, Search } from "lucide-react";
import { AuronixMark } from "./auronix-mark";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";
import { NAV_GROUPS, pageFor } from "@/lib/design/navigation";
import { openSearch } from "@/components/design/search-trigger";
export function MegaMenu({
  group,
  onClose,
}: {
  group: (typeof NAV_GROUPS)[number];
  onClose: () => void;
}) {
  return (
    <div className="ac-mega" id={`menu-${group.title}`}>
      <div className="ac-mega-intro">
        <span className="ac-eyebrow">Explore {group.title}</span>
        <p>{group.note}</p>
        <Link href="/contact" onClick={onClose}>
          Partner With Us <ArrowRight size={17} />
        </Link>
      </div>
      <div className="ac-mega-links">
        {group.paths.map((path) => {
          const page = pageFor(path);
          return (
            page && (
              <Link href={path} key={path} onClick={onClose}>
                <strong>{page.title}</strong>
                <span>
                  {page.category}
                  <ArrowRight size={16} />
                </span>
              </Link>
            )
          );
        })}
      </div>
    </div>
  );
}
export function Header() {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const previous = useRef(0);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    let ticking = false;
    const scroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        if (Math.abs(y - previous.current) > 8) {
          setHidden(y > 180 && y > previous.current);
          previous.current = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    setMenu(null);
    setMobile(false);
    setHidden(false);
  }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const click = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) setMenu(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        header.current
          ?.querySelector<HTMLButtonElement>(`[aria-controls="menu-${menu}"]`)
          ?.focus();
        setMenu(null);
      }
    };
    document.addEventListener("pointerdown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", click);
      document.removeEventListener("keydown", key);
    };
  }, [menu]);
  return (
    <>
      <header
        ref={header}
        className="ac-header"
        data-compressed={scrolled}
        data-hidden={hidden && !menu && !mobile}
        onFocus={() => setHidden(false)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setMenu(null);
        }}
      >
        <div className="ac-nav">
          <Link href="/" className="ac-brand" aria-label="Auronix Commerce LLC">
            <AuronixMark />
            <span>
              AURONIX<small>COMMERCE LLC</small>
            </span>
          </Link>
          <nav className="ac-desktop-nav" aria-label="Main navigation">
            {NAV_GROUPS.map((g) => (
              <button
                key={g.title}
                type="button"
                aria-expanded={menu === g.title}
                aria-controls={`menu-${g.title}`}
                onClick={() => setMenu(menu === g.title ? null : g.title)}
              >
                {g.title}
                <ChevronDown size={13} />
              </button>
            ))}
          </nav>
          <div className="ac-nav-actions">
            <button
              type="button"
              className="ac-icon-button"
              aria-label="Search Auronix"
              onClick={() => {
                setMenu(null);
                openSearch();
              }}
            >
              <Search size={19} />
            </button>
            <div className="ac-desktop-action">
              <ThemeToggle />
            </div>
            <Link href="/partner-portal" className="ac-portal-link">
              Portal
            </Link>
            <Link href="/supplier" className="ac-button ac-desktop-action">
              Become a Supplier <ArrowRight size={15} />
            </Link>
            <button
              type="button"
              className="ac-icon-button ac-menu-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
        {menu && (
          <MegaMenu
            group={NAV_GROUPS.find((g) => g.title === menu)!}
            onClose={() => setMenu(null)}
          />
        )}
      </header>
      <MobileMenu open={mobile} onClose={() => setMobile(false)} />
    </>
  );
}
export default Header;
