'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FOOTER_NAV } from '@/lib/constants';
import { DEFAULT_COMPANY_INFO } from '@/lib/constants';
import { getData } from '@/lib/firebase-db';
import type { CompanyInfo } from '@/lib/types';
import { Linkedin, Twitter, Facebook, Instagram, ArrowUpRight, MapPin, Mail, Phone } from 'lucide-react';

const FOOTER_NAV_UPDATED = {
  ...FOOTER_NAV,
  Partner: [
    { label: 'Become a Supplier', href: '/become-a-supplier' },
    { label: 'Seller Portal', href: '/seller' },
    { label: 'Partner Portal', href: '/partner-portal' },
  ],
};

export function Footer() {
  const year = new Date().getFullYear();
  const [info, setInfo] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    getData<CompanyInfo>('site/settings/company')
      .then(setInfo)
      .catch(() => {});
  }, []);

  const company = info || DEFAULT_COMPANY_INFO;

  return (
    <footer className="border-t border-border bg-background-subtle">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-16 lg:py-24">
        {/* Top section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm tracking-tight">A</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-semibold tracking-tight">AURONIX</span>
                <span className="text-[10px] font-medium tracking-[0.15em] text-foreground-muted uppercase">
                  Commerce LLC
                </span>
              </div>
            </Link>
            <p className="text-sm text-foreground-muted leading-relaxed max-w-xs">
              {company.footerDescription || company.tagline}
            </p>

            {/* Contact info */}
            <div className="mt-5 space-y-2">
              {company.publicEmail && (
                <a
                  href={`mailto:${company.publicEmail}`}
                  className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {company.publicEmail}
                </a>
              )}
              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {company.phone}
                </a>
              )}
              {company.businessAddress && (
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                  <MapPin className="w-3.5 h-3.5" />
                  {company.businessAddress}
                </div>
              )}
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3 mt-6">
              {company.linkedin && (
                <a
                  href={company.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:border-border-strong transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              {company.x && (
                <a
                  href={company.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X"
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:border-border-strong transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {company.facebook && (
                <a
                  href={company.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:border-border-strong transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {company.instagram && (
                <a
                  href={company.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:border-border-strong transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Nav columns */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {Object.entries(FOOTER_NAV_UPDATED).map(([heading, links]) => (
              <div key={heading}>
                <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground-muted mb-4">
                  {heading}
                </h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground transition-colors"
                      >
                        {link.label}
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-foreground-muted">
            &copy; {year} {company.companyName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-xs text-foreground-muted hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-foreground-muted hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/cookie-policy" className="text-xs text-foreground-muted hover:text-foreground transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
