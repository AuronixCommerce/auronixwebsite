"use client";
import Link from "next/link";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { NAV_GROUPS, pageFor } from "@/lib/design/navigation";
import { ThemeToggle } from "./theme-toggle";
export function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="ac-mobile-nav">
        <div className="ac-sheet-handle" />
        <div className="ac-mobile-nav-head">
          <div><DialogTitle>Auronix Commerce</DialogTitle><DialogDescription>Explore. Connect. Build together.</DialogDescription></div>
          <DialogClose asChild><button type="button" className="ac-mobile-nav-close" aria-label="Close navigation"><span>Close</span></button></DialogClose>
        </div>
        <nav aria-label="Mobile navigation">
          {NAV_GROUPS.map((group) => (
            <details key={group.title} open={group.title === "Company"}>
              <summary>
                {group.title}
                <span>+</span>
              </summary>
              <div>
                {group.paths.map((path) => {
                  const p = pageFor(path);
                  return (
                    p && (
                      <Link href={path} key={path} onClick={onClose}>
                        {p.title}
                      </Link>
                    )
                  );
                })}
              </div>
            </details>
          ))}
        </nav>
        <div className="ac-mobile-bottom">
          <ThemeToggle showLabel />
          <Link href="/supplier" onClick={onClose} className="ac-button">
            Become a Supplier
          </Link>
          <Link
            href="/partner-portal"
            onClick={onClose}
            className="ac-button ac-button-secondary"
          >
            Partner Portal
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export const MobileNav = MobileMenu;
export default MobileMenu;
